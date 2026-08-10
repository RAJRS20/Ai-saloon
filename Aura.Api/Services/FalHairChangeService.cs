using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Aura.Api.Options;

namespace Aura.Api.Services;

/// <summary>
/// fal.ai Hair Change provider. Implements <see cref="ITryOnProvider"/>.
/// Supports both:
///   1. Freeform endpoint: fal-ai/image-editing/hair-change
///   2. Structured endpoint: fal-ai/image-apps-v2/hair-change
/// Flow:
///   1. Upload source image to storage.fal.run → public URL
///   2. Submit job to queue.fal.run/{endpoint}
///   3. Poll until COMPLETED or FAILED
///   4. Return result image URL
/// </summary>
public class FalHairChangeService : ITryOnProvider
{
    private const string StorageUploadUrl = "https://storage.fal.run/";
    private const string FreeformEndpoint = "fal-ai/image-editing/hair-change";
    private const string StructuredEndpoint = "fal-ai/image-apps-v2/hair-change";

    private readonly HttpClient _http;
    private readonly FalOptions _options;
    private readonly ILogger<FalHairChangeService> _logger;

    public FalHairChangeService(
        IHttpClientFactory httpFactory,
        IOptions<FalOptions> options,
        IConfiguration config,
        ILogger<FalHairChangeService> logger)
    {
        _http = httpFactory.CreateClient("fal");
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _options.ApiKey = config["Fal:ApiKey"]
                ?? config["Fal__ApiKey"]
                ?? Environment.GetEnvironmentVariable("FAL_KEY")
                ?? Environment.GetEnvironmentVariable("Fal__ApiKey")
                ?? string.Empty;
        }
        _logger = logger;
    }

    public async Task<string> GenerateHairAsync(
        byte[] imageBytes,
        string mimeType,
        string prompt,
        string hairColor,
        string providerMode = "freeform",
        string providerStyle = "",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new InvalidOperationException(
                "fal.ai API key is not configured. Set Fal__ApiKey in appsettings.json or environment variables.");

        // ── Step 1: Convert source image to data URI ─────────────────────────
        // fal.ai natively accepts data URIs (data:image/jpeg;base64,...), eliminating external upload dependencies.
        _logger.LogInformation("Encoding source image as data URI ({Bytes} bytes)", imageBytes.Length);
        var imageUrl = $"data:{mimeType};base64,{Convert.ToBase64String(imageBytes)}";

        // ── Step 2: Determine endpoint and build payload ───────────────────────
        var isStructured = providerMode.Equals("structured", StringComparison.OrdinalIgnoreCase)
                           && !string.IsNullOrWhiteSpace(providerStyle);

        var endpoint = isStructured ? StructuredEndpoint : FreeformEndpoint;
        var queueSubmitUrl = $"https://queue.fal.run/{endpoint}";

        object requestBody = isStructured
            ? new
            {
                image_url = imageUrl,
                target_hairstyle = providerStyle,
                hair_color = NormalizeHairColor(hairColor),
                aspect_ratio = "3:4"
            }
            : new
            {
                image_url = imageUrl,
                prompt = BuildPrompt(prompt, hairColor),
                output_format = "jpeg",
                aspect_ratio = "3:4"
            };

        var submitJson = JsonSerializer.Serialize(requestBody);
        using var submitRequest = new HttpRequestMessage(HttpMethod.Post, queueSubmitUrl)
        {
            Content = new StringContent(submitJson, Encoding.UTF8, "application/json")
        };
        AddFalAuth(submitRequest);

        _logger.LogInformation("Submitting hair-change job to fal.ai ({Endpoint}, isStructured={IsStructured})",
            endpoint, isStructured);
        using var submitResponse = await _http.SendAsync(submitRequest, ct);

        if (!submitResponse.IsSuccessStatusCode)
        {
            var errBody = await submitResponse.Content.ReadAsStringAsync(ct);
            _logger.LogError("fal.ai submit error {Status}: {Body}", submitResponse.StatusCode, errBody);
            ThrowFromStatus((int)submitResponse.StatusCode, errBody);
        }

        var submitBody = await submitResponse.Content.ReadAsStringAsync(ct);
        var submitDoc = JsonNode.Parse(submitBody);
        var requestId = submitDoc?["request_id"]?.GetValue<string>()
            ?? throw new InvalidOperationException("fal.ai did not return a request_id.");

        _logger.LogInformation("fal.ai job submitted. RequestId={RequestId}", requestId);

        // ── Step 3: Poll until complete ─────────────────────────────────────────
        var resultUrl = await PollForResultAsync(endpoint, requestId, ct);
        _logger.LogInformation("fal.ai job completed. ResultUrl={Url}", resultUrl);

        return resultUrl;
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private async Task<string> UploadImageAsync(byte[] imageBytes, string mimeType, CancellationToken ct)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(imageBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(mimeType);
        content.Add(fileContent, "file", $"source.{GetExtension(mimeType)}");

        using var request = new HttpRequestMessage(HttpMethod.Post, StorageUploadUrl) { Content = content };
        AddFalAuth(request);

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("fal.ai storage upload failed {Status}: {Body}", response.StatusCode, body);
            ThrowFromStatus((int)response.StatusCode, body);
        }

        var doc = JsonNode.Parse(body);
        return doc?["url"]?.GetValue<string>()
            ?? doc?.GetValue<string>()
            ?? throw new InvalidOperationException($"fal.ai storage upload returned unexpected response: {body}");
    }

    private async Task<string> PollForResultAsync(string endpoint, string requestId, CancellationToken ct)
    {
        var statusUrl = $"https://queue.fal.run/{endpoint}/requests/{requestId}/status";
        var resultUrl = $"https://queue.fal.run/{endpoint}/requests/{requestId}";
        var pollIntervalMs = 2000;
        var maxAttempts = 60; // 2s × 60 = 2 min max

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            await Task.Delay(pollIntervalMs, ct);

            using var statusRequest = new HttpRequestMessage(HttpMethod.Get, statusUrl);
            AddFalAuth(statusRequest);
            using var statusResponse = await _http.SendAsync(statusRequest, ct);
            var statusBody = await statusResponse.Content.ReadAsStringAsync(ct);

            if (!statusResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("fal.ai status poll error {Status} (attempt {N}): {Body}",
                    statusResponse.StatusCode, attempt + 1, statusBody);
                continue;
            }

            var statusDoc = JsonNode.Parse(statusBody);
            var status = statusDoc?["status"]?.GetValue<string>() ?? "";

            _logger.LogInformation("fal.ai poll attempt {N}: status={Status}", attempt + 1, status);

            if (status == "COMPLETED")
            {
                using var resultRequest = new HttpRequestMessage(HttpMethod.Get, resultUrl);
                AddFalAuth(resultRequest);
                using var resultResponse = await _http.SendAsync(resultRequest, ct);
                var resultBody = await resultResponse.Content.ReadAsStringAsync(ct);

                if (!resultResponse.IsSuccessStatusCode)
                    throw new InvalidOperationException($"fal.ai result fetch failed: {resultBody}");

                var resultDoc = JsonNode.Parse(resultBody);

                // Response can be { "images": [{ "url": "..." }] } or { "image": { "url": "..." } }
                var imageUrl = resultDoc?["images"]?[0]?["url"]?.GetValue<string>()
                    ?? resultDoc?["image"]?["url"]?.GetValue<string>()
                    ?? resultDoc?["output"]?["url"]?.GetValue<string>();

                if (string.IsNullOrEmpty(imageUrl))
                    throw new InvalidOperationException(
                        $"fal.ai completed but no image URL found in response: {resultBody}");

                return imageUrl;
            }

            if (status == "FAILED")
            {
                var error = statusDoc?["error"]?.GetValue<string>() ?? "Unknown error";
                throw new InvalidOperationException($"fal.ai generation failed: {error}");
            }

            if (attempt > 10) pollIntervalMs = 4000;
        }

        throw new TimeoutException("fal.ai hair-change job timed out after 2 minutes.");
    }

    private void AddFalAuth(HttpRequestMessage request)
        => request.Headers.Authorization = new AuthenticationHeaderValue("Key", _options.ApiKey);

    private static string NormalizeHairColor(string hairColor)
    {
        var lc = hairColor.ToLowerInvariant().Trim();
        return lc switch
        {
            "natural" or "" => "natural",
            "black" or "jet black" => "black",
            "dark brown" or "brown" => "dark_brown",
            "blonde" or "platinum" => "blonde",
            "silver" or "grey" or "gray" => "silver",
            "red" or "auburn" => "red",
            _ => lc
        };
    }

    private static string BuildPrompt(string hairstylePrompt, string hairColor)
    {
        var colorLine = hairColor.Equals("natural", StringComparison.OrdinalIgnoreCase)
            ? "Match the original hair color exactly."
            : $"Apply {hairColor} hair color.";

        return $"""
Change ONLY the hairstyle.

{hairstylePrompt}

{colorLine}

Preserve the same person's identity and facial geometry.
Do not change eyes, eyebrows, nose, lips, jaw, chin, ears, skin tone or apparent age.
Do not change clothing, body, pose, camera angle or background.
Create photorealistic human hair:
- natural hairline
- realistic density and individual strands
- believable scalp transition
- physically believable volume
- lighting and shadows matching the source photo
The final image must look like a real photograph of the same person after receiving the haircut.
Avoid wigs, pasted overlays, plastic hair, CGI appearance, or distorted facial features.
""";
    }

    private static string GetExtension(string mimeType) => mimeType switch
    {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "jpg"
    };

    private static void ThrowFromStatus(int statusCode, string body)
    {
        if (statusCode == 429)
            throw new FalRateLimitException(
                "fal.ai rate limit exceeded. Please wait and try again.");

        if (statusCode == 403)
            throw new InvalidOperationException(
                "fal.ai access error (403): Account balance exhausted. Please add credits at https://fal.ai/dashboard/billing to enable generation.");

        if (statusCode == 401)
            throw new InvalidOperationException(
                "fal.ai authentication failed (401). Check your FAL_KEY in appsettings.json.");

        throw new HttpRequestException($"fal.ai error {statusCode}: {body}");
    }
}

/// <summary>Thrown when fal.ai returns 429 rate-limit.</summary>
public class FalRateLimitException : Exception
{
    public FalRateLimitException(string message) : base(message) { }
}

