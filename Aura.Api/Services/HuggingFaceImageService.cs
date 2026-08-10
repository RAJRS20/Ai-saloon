using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Aura.Api.Options;

namespace Aura.Api.Services;

/// <summary>
/// Calls the Hugging Face Inference API for hairstyle image-to-image transformation.
/// Model: timbrooks/instruct-pix2pix — instruction-based image editing, no mask needed.
/// 100% FREE — just requires a free HuggingFace account token.
/// Sign up at https://huggingface.co → Settings → Access Tokens → New Token (read access).
/// </summary>
public class HuggingFaceImageService
{
    private readonly HuggingFaceOptions _options;
    private readonly HttpClient _http;
    private readonly ILogger<HuggingFaceImageService> _logger;

    // Model that accepts an image + text instruction and edits the image accordingly
    private const string DefaultModel = "timbrooks/instruct-pix2pix";

    public HuggingFaceImageService(
        IOptions<HuggingFaceOptions> options,
        IHttpClientFactory httpFactory,
        ILogger<HuggingFaceImageService> logger)
    {
        _options = options.Value;
        _http = httpFactory.CreateClient("huggingface");
        _logger = logger;
    }

    /// <summary>
    /// Edits the portrait image using an instruction-based diffusion model.
    /// Returns the resulting image as raw bytes.
    /// </summary>
    public async Task<byte[]> EditImageAsync(
        byte[] imageBytes,
        string mimeType,
        string prompt,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiToken))
            throw new InvalidOperationException(
                "Hugging Face API token is not configured. " +
                "Sign up free at https://huggingface.co → Settings → Access Tokens. " +
                "Then set HuggingFace__ApiToken in appsettings.json.");

        var model = string.IsNullOrWhiteSpace(_options.Model) ? DefaultModel : _options.Model;

        // HuggingFace migrated to the new Inference Router endpoint in 2025
        var url = $"https://router.huggingface.co/hf-inference/models/{model}";

        _logger.LogInformation("Calling Hugging Face Router API: model={Model}", model);

        // For instruct-pix2pix: send image as base64 with prompt in inputs string
        // Format: { "inputs": "base64_image", "parameters": { "prompt": "...", ... } }
        var payload = new
        {
            inputs = Convert.ToBase64String(imageBytes),
            parameters = new
            {
                prompt = prompt,
                num_inference_steps = _options.InferenceSteps,
                guidance_scale = 7.5,
                image_guidance_scale = 1.5
            }
        };

        var json = JsonSerializer.Serialize(payload);
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiToken);
        // Wait for model to load instead of getting a 503 immediately
        request.Headers.TryAddWithoutValidation("X-Wait-For-Model", "true");

        using var response = await _http.SendAsync(request, ct);

        // HF returns the image as raw bytes directly (not JSON) on success
        if (response.IsSuccessStatusCode)
        {
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
            if (contentType.StartsWith("image/"))
            {
                var imageData = await response.Content.ReadAsByteArrayAsync(ct);
                _logger.LogInformation("HuggingFace returned image data ({Length} bytes)", imageData.Length);
                return imageData;
            }

            // Some models return JSON with base64 — handle that too
            var bodyText = await response.Content.ReadAsStringAsync(ct);
            try
            {
                var doc = JsonNode.Parse(bodyText);
                // Try array response format
                var b64 = doc?[0]?["generated_image"]?.GetValue<string>()
                       ?? doc?["generated_image"]?.GetValue<string>();
                if (!string.IsNullOrEmpty(b64))
                {
                    var imageData = Convert.FromBase64String(b64);
                    _logger.LogInformation("HuggingFace returned JSON image ({Length} bytes)", imageData.Length);
                    return imageData;
                }
            }
            catch { /* Not JSON, fall through */ }

            // Treat the body bytes as raw image
            var rawBytes = await response.Content.ReadAsByteArrayAsync(ct);
            if (rawBytes.Length > 1000)
            {
                _logger.LogInformation("HuggingFace returned raw bytes ({Length} bytes)", rawBytes.Length);
                return rawBytes;
            }
        }

        var errorBody = await response.Content.ReadAsStringAsync(ct);

        // Model still loading — give user a friendly message
        if ((int)response.StatusCode == 503)
        {
            _logger.LogWarning("HuggingFace model is loading (cold start). Body: {Body}", errorBody);
            throw new InvalidOperationException(
                "The AI model is warming up (cold start). Please wait 20–30 seconds and try again.");
        }

        if ((int)response.StatusCode == 429)
        {
            throw new InvalidOperationException(
                "Hugging Face rate limit reached. Please wait a moment and try again.");
        }

        _logger.LogError("HuggingFace API error {Status}: {Body}", (int)response.StatusCode, errorBody);
        throw new HttpRequestException(
            $"Hugging Face API error {(int)response.StatusCode}: {errorBody}");
    }

    /// <summary>Builds the instruction prompt for the instruct-pix2pix model.</summary>
    public static string BuildPrompt(string hairstyleName, string promptDetails, string hairColor)
    {
        var colorLine = hairColor.Equals("natural", StringComparison.OrdinalIgnoreCase)
            ? ""
            : $" with {hairColor} hair color";

        return $"Change this person's hairstyle to a {hairstyleName}{colorLine}. " +
               $"{promptDetails}. " +
               $"Keep the person's face, skin, eyes, and clothing exactly the same. " +
               $"Only change the hair. Photorealistic result.";
    }
}
