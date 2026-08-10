using System.Net.Http.Headers;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Aura.Api.Options;

namespace Aura.Api.Services;

/// <summary>
/// Calls the OpenAI Images Edit API (gpt-image-1) to perform hairstyle transformations.
/// POST https://api.openai.com/v1/images/edits
/// Uses multipart/form-data with the source image + text prompt.
/// </summary>
public class OpenAiImageService
{
    private readonly OpenAiOptions _options;
    private readonly HttpClient _http;
    private readonly ILogger<OpenAiImageService> _logger;

    public OpenAiImageService(
        IOptions<OpenAiOptions> options,
        IHttpClientFactory httpFactory,
        ILogger<OpenAiImageService> logger)
    {
        _options = options.Value;
        _http = httpFactory.CreateClient("openai");
        _logger = logger;
    }

    /// <summary>
    /// Edits an image using the OpenAI gpt-image-1 model.
    /// Returns the generated image as raw bytes (PNG).
    /// </summary>
    public async Task<byte[]> EditImageAsync(
        byte[] imageBytes,
        string mimeType,
        string prompt,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new InvalidOperationException(
                "OpenAI API key is not configured. Set OpenAI__ApiKey in appsettings.json.");

        var model = _options.Model ?? "gpt-image-1";
        _logger.LogInformation("Calling OpenAI Images Edit API: model={Model}", model);

        // Build multipart form — OpenAI /v1/images/edits requires form-data
        var ext = mimeType switch
        {
            "image/png" => "png",
            "image/webp" => "webp",
            _ => "jpg"
        };

        using var form = new MultipartFormDataContent();

        // image field
        var imageContent = new ByteArrayContent(imageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue(mimeType);
        form.Add(imageContent, "image", $"photo.{ext}");

        // prompt
        form.Add(new StringContent(prompt), "prompt");

        // model
        form.Add(new StringContent(model), "model");

        // size (supported by gpt-image-1)
        form.Add(new StringContent("1024x1024"), "size");

        // n = 1 image
        form.Add(new StringContent("1"), "n");

        using var request = new HttpRequestMessage(HttpMethod.Post,
            "https://api.openai.com/v1/images/edits")
        {
            Content = form
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI API error {Status}: {Body}", (int)response.StatusCode, body);

            if ((int)response.StatusCode == 429)
                throw new InvalidOperationException(
                    "OpenAI rate limit hit. Please wait a moment and try again.");

            if ((int)response.StatusCode == 401)
                throw new InvalidOperationException(
                    "OpenAI authentication failed (401). Check your API key in appsettings.json.");

            throw new HttpRequestException(
                $"OpenAI API error {(int)response.StatusCode}: {body}");
        }

        // gpt-image-1 can return either b64_json or url at data[0]
        var doc = JsonNode.Parse(body);
        var dataItem = doc?["data"]?[0];

        // Try b64_json first
        var b64 = dataItem?["b64_json"]?.GetValue<string>();
        if (!string.IsNullOrEmpty(b64))
        {
            var imageData = Convert.FromBase64String(b64);
            _logger.LogInformation("OpenAI returned image data ({Length} bytes, b64_json)", imageData.Length);
            return imageData;
        }

        // Fall back to url
        var url = dataItem?["url"]?.GetValue<string>();
        if (!string.IsNullOrEmpty(url))
        {
            _logger.LogInformation("OpenAI returned URL, downloading image...");
            return await _http.GetByteArrayAsync(url, ct);
        }

        _logger.LogWarning("OpenAI response had no image data. Body: {Body}", body);
        throw new InvalidOperationException(
            "OpenAI response did not contain image data. Check model name and API key permissions.");
    }

    /// <summary>Builds the hairstyle transformation prompt for OpenAI.</summary>
    public static string BuildPrompt(string hairstyleName, string promptDetails, string hairColor)
    {
        var colorLine = hairColor.Equals("natural", StringComparison.OrdinalIgnoreCase)
            ? "Keep the original hair color."
            : $"Change the hair color to {hairColor}.";

        return $"""
You are a professional hair stylist. Edit this portrait photo to show the person with a new hairstyle.

NEW HAIRSTYLE: {hairstyleName}
STYLE DETAILS: {promptDetails}
HAIR COLOR: {colorLine}

IMPORTANT RULES:
- Only change the hair. Preserve the person's face, identity, skin tone, eyes, nose, lips, and age exactly.
- Do not change clothing, background, body, or pose.
- The result must look like a real photograph of the same person after getting this haircut.
- Use photorealistic hair: natural hairline, realistic individual strands, proper lighting and shadows.
- Do not make it look like a wig, CGI, illustration, or pasted overlay.
""";
    }
}
