using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Aura.Api.Options;

namespace Aura.Api.Services;

public interface IGeminiImageService
{
    Task<byte[]> EditImageAsync(byte[] imageBytes, string mimeType, string prompt, CancellationToken ct = default);
}

/// <summary>Thrown when Gemini returns 429 — quota exceeded, typically needs billing enabled.</summary>
public class GeminiQuotaException(string message, int retryAfterSeconds = 60) : Exception(message)
{
    public int RetryAfterSeconds { get; } = retryAfterSeconds;
}

public class GeminiImageService : IGeminiImageService
{
    private readonly GeminiOptions _options;
    private readonly HttpClient _http;
    private readonly ILogger<GeminiImageService> _logger;

    public GeminiImageService(
        IOptions<GeminiOptions> options,
        IHttpClientFactory httpFactory,
        ILogger<GeminiImageService> logger)
    {
        _options = options.Value;
        _http = httpFactory.CreateClient("gemini");
        _logger = logger;
    }

    /// <summary>
    /// Calls the Gemini REST API directly (no SDK) to avoid BaseUrl routing issues.
    /// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
    /// </summary>
    public async Task<byte[]> EditImageAsync(byte[] imageBytes, string mimeType, string prompt, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new InvalidOperationException("Gemini API key is not configured. Set Gemini__ApiKey in appsettings.json.");

        var baseUrl = (_options.BaseUrl ?? "https://generativelanguage.googleapis.com/v1beta").TrimEnd('/');
        var model = (_options.Model ?? "gemini-3.1-flash-image").Trim();
        var url = $"{baseUrl}/models/{model}:generateContent?key={_options.ApiKey}";

        _logger.LogInformation("Calling Gemini REST API: {Url}", url.Replace(_options.ApiKey, "***"));

        // Build the JSON request body directly — matches the REST spec exactly
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new object[]
                    {
                        new
                        {
                            inline_data = new
                            {
                                mime_type = mimeType,
                                data = Convert.ToBase64String(imageBytes)
                            }
                        },
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                responseModalities = new[] { "IMAGE", "TEXT" },
                temperature = 1.0
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Gemini REST error {Status}: {Body}", (int)response.StatusCode, body);

            if ((int)response.StatusCode == 429)
            {
                throw new GeminiQuotaException(
                    "Gemini image quota exceeded. This model requires billing to be enabled on your Google Cloud project. " +
                    "Visit https://console.cloud.google.com/billing to set up billing, then retry.", 60);
            }

            throw new HttpRequestException($"Gemini API error: Request failed with status code {(int)response.StatusCode}: {response.ReasonPhrase}. Body: {body}");
        }

        // Parse response — image is in candidates[0].content.parts[].inlineData.data
        var doc = JsonNode.Parse(body);
        var parts = doc?["candidates"]?[0]?["content"]?["parts"]?.AsArray();
        if (parts != null)
        {
            foreach (var part in parts)
            {
                var b64 = part?["inlineData"]?["data"]?.GetValue<string>()
                       ?? part?["inline_data"]?["data"]?.GetValue<string>();
                if (!string.IsNullOrEmpty(b64))
                {
                    var imageData = Convert.FromBase64String(b64);
                    _logger.LogInformation("Gemini returned image data ({Length} bytes)", imageData.Length);
                    return imageData;
                }
            }
        }

        _logger.LogWarning("Gemini response had no image data. Body: {Body}", body);
        throw new InvalidOperationException("Gemini response did not contain image data. Check model name and API key permissions.");
    }

    /// <summary>
    /// Builds the full hairstyle transformation prompt.
    /// </summary>
    public static string BuildHairstylePrompt(string hairstyleName, string promptDetails, string hairColor)
    {
        var colorInstruction = hairColor.Equals("natural", StringComparison.OrdinalIgnoreCase)
            ? "Match the original hair color."
            : $"Apply {hairColor} hair color.";

        return $"""
Edit the provided portrait to show the selected hairstyle on the SAME PERSON.

SELECTED HAIRSTYLE: {hairstyleName}

HAIR DETAILS: {promptDetails}

STRICT PRESERVATION:
- Preserve the person's identity and facial geometry.
- Do not change eyes, eyebrows, nose, lips, jaw, chin, ears, skin tone or apparent age.
- Do not change clothing, body, pose, camera angle or background.
- Change the hairstyle/hair region only.
- Keep lighting direction and exposure consistent with the original photo.

HAIR COLOR: {colorInstruction}

REALISM:
- Photorealistic human hair.
- Natural scalp-to-hair transition.
- Realistic individual strands and density.
- Realistic fade/blending where applicable.
- Natural hairline for the person's head shape.
- Match shadows, highlights and ambient light to the original image.
- The result must look like a real photograph taken after the haircut, not a pasted overlay, wig, illustration or CGI render.

OUTPUT:
A single realistic edited portrait with the requested hairstyle.
""";
    }
}
