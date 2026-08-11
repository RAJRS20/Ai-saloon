using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using Aura.Api.Options;

namespace Aura.Api.Services;

/// <summary>
/// Uses Cloudflare Workers AI inpainting model for hair transformation.
/// Model: @cf/runwayml/stable-diffusion-v1-5-inpainting
///
/// Pipeline:
///   1. Letterbox-resize image to 512×512 preserving aspect ratio
///   2. Generate a feathered gradient hair mask (top ~48%)
///   3. Run SD v1.5 inpainting via Cloudflare
///   4. Post-process: composite original face/body back onto AI result
///      so the face is pixel-perfect from the source photo
/// </summary>
public class CloudflareAiImageService
{
    private readonly CloudflareAiOptions _options;
    private readonly HttpClient _http;
    private readonly ILogger<CloudflareAiImageService> _logger;

    private const string Model = "@cf/runwayml/stable-diffusion-v1-5-inpainting";
    private const int TargetSize = 512;

    // Hair zone: top 45% is full white mask (repaint), 45–58% is gradient blend, below is black (preserve)
    private const double HairZoneEnd       = 0.45;  // Full repaint up to here
    private const double TransitionZoneEnd = 0.58;  // Gradient blend down to here

    public CloudflareAiImageService(
        IOptions<CloudflareAiOptions> options,
        IHttpClientFactory httpFactory,
        ILogger<CloudflareAiImageService> logger)
    {
        _options = options.Value;
        _http = httpFactory.CreateClient("cloudflare");
        _logger = logger;
    }

    public async Task<byte[]> EditImageAsync(
        byte[] imageBytes,
        string mimeType,
        string prompt,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.AccountId) || string.IsNullOrWhiteSpace(_options.ApiToken))
            throw new InvalidOperationException(
                "Cloudflare Workers AI credentials are not configured. " +
                "Sign up free at https://cloudflare.com, then add AccountId + ApiToken under 'CloudflareAi' in appsettings.json.");

        var url = $"https://api.cloudflare.com/client/v4/accounts/{_options.AccountId}/ai/run/{Model}";
        _logger.LogInformation("Calling Cloudflare Inpainting: {Model}", Model);

        // Step 1: Letterbox-resize original to 512×512 (no squish) and build mask
        var (resizedBytes, maskBytes, letterboxInfo) = PrepareImageAndMask(imageBytes);

        var payload = new
        {
            prompt,
            negative_prompt = "blurry, bad quality, low resolution, dark image, black image, black background, overexposed, underexposed, noise, grain, artifacts, deformed face, cartoon, anime",
            image = resizedBytes.Select(b => (int)b).ToArray(),
            mask  = maskBytes.Select(b => (int)b).ToArray(),
            num_steps = Math.Clamp(_options.NumSteps > 0 ? _options.NumSteps : 20, 1, 20),
            guidance  = 7.5f,
            strength  = 0.80f
        };

        var json = JsonSerializer.Serialize(payload);
        _logger.LogInformation("Payload size: {Len} chars", json.Length);

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiToken);

        using var response = await _http.SendAsync(request, ct);
        var responseBytes = await response.Content.ReadAsByteArrayAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            var err = Encoding.UTF8.GetString(responseBytes);
            _logger.LogError("Cloudflare error {Status}: {Body}", (int)response.StatusCode, err);

            if ((int)response.StatusCode is 401 or 403)
                throw new InvalidOperationException("Cloudflare auth failed. Check AccountId/ApiToken in appsettings.json.");
            if ((int)response.StatusCode == 429)
                throw new InvalidOperationException("Cloudflare daily limit hit. Try again tomorrow.");

            throw new HttpRequestException($"Cloudflare AI error {(int)response.StatusCode}: {err}");
        }

        _logger.LogInformation("Cloudflare returned {Len} bytes", responseBytes.Length);

        // Step 2: Extract actual image bytes from JSON response if needed
        var aiResultBytes = ExtractImageBytes(responseBytes);

        // Step 3: Post-process — composite original face/body back onto AI hair result
        var finalBytes = PostProcessBlend(resizedBytes, aiResultBytes, letterboxInfo);

        return finalBytes;
    }

    // ─── Post-Processing Blend ────────────────────────────────────────────────

    /// <summary>
    /// Composites the original photo's face/body onto the AI hair result.
    /// - Top HairZoneEnd: 100% AI (new hair)
    /// - HairZoneEnd → TransitionZoneEnd: smooth gradient blend
    /// - Below TransitionZoneEnd: 100% original (face, neck, body perfectly preserved)
    /// This ensures identity preservation even when SD v1.5 drifts on the face.
    /// </summary>
    private byte[] PostProcessBlend(byte[] originalResizedBytes, byte[] aiResultBytes, LetterboxInfo info)
    {
        try
        {
            using var original = Image.Load<Rgba32>(new MemoryStream(originalResizedBytes));
            using var aiResult = Image.Load<Rgba32>(new MemoryStream(aiResultBytes));

            // Resize AI result to match original dimensions if different
            if (aiResult.Width != original.Width || aiResult.Height != original.Height)
                aiResult.Mutate(x => x.Resize(original.Width, original.Height));

            int hairZoneEndPx    = (int)(original.Height * HairZoneEnd);
            int transitionEndPx  = (int)(original.Height * TransitionZoneEnd);
            int transitionHeight = transitionEndPx - hairZoneEndPx;

            for (int y = hairZoneEndPx; y < original.Height; y++)
            {
                for (int x = 0; x < original.Width; x++)
                {
                    var origPixel = original[x, y];
                    var aiPixel   = aiResult[x, y];

                    float blendFactor; // 0 = full AI, 1 = full original
                    if (y >= transitionEndPx)
                    {
                        blendFactor = 1.0f; // 100% original below transition
                    }
                    else
                    {
                        blendFactor = (float)(y - hairZoneEndPx) / transitionHeight;
                        // Ease-in-out curve for smoother transition
                        blendFactor = blendFactor * blendFactor * (3f - 2f * blendFactor);
                    }

                    aiResult[x, y] = new Rgba32(
                        (byte)(aiPixel.R * (1f - blendFactor) + origPixel.R * blendFactor),
                        (byte)(aiPixel.G * (1f - blendFactor) + origPixel.G * blendFactor),
                        (byte)(aiPixel.B * (1f - blendFactor) + origPixel.B * blendFactor),
                        255
                    );
                }
            }

            // Crop out letterbox bars if any before returning
            if (info.PadTop > 0 || info.PadLeft > 0)
            {
                aiResult.Mutate(x => x.Crop(new Rectangle(
                    info.PadLeft, info.PadTop,
                    Math.Min(info.ScaledWidth,  aiResult.Width  - info.PadLeft),
                    Math.Min(info.ScaledHeight, aiResult.Height - info.PadTop)
                )));
            }

            using var output = new MemoryStream();
            aiResult.SaveAsJpeg(output, new JpegEncoder { Quality = 92 });
            _logger.LogInformation("Post-process blend complete. Output: {Bytes} bytes", output.Length);
            return output.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Post-process blend failed — returning raw AI result");
            return aiResultBytes;
        }
    }

    // ─── Image & Mask Preparation ─────────────────────────────────────────────

    /// <summary>
    /// Letterbox-resizes to 512×512 preserving aspect ratio, generates gradient hair mask.
    /// Returns (resized PNG bytes, mask PNG bytes, letterbox info for later crop).
    /// </summary>
    private static (byte[] imageBytes, byte[] maskBytes, LetterboxInfo info) PrepareImageAndMask(byte[] imageBytes)
    {
        using var src = new MemoryStream(imageBytes);
        using var img = Image.Load<Rgba32>(src);

        // Letterbox resize: fit image inside 512×512 without distortion
        float scale    = Math.Min((float)TargetSize / img.Width, (float)TargetSize / img.Height);
        int scaledW    = (int)(img.Width  * scale);
        int scaledH    = (int)(img.Height * scale);
        int padLeft    = (TargetSize - scaledW) / 2;
        int padTop     = (TargetSize - scaledH) / 2;

        img.Mutate(x => x.Resize(scaledW, scaledH));

        using var canvas = new Image<Rgba32>(TargetSize, TargetSize, new Rgba32(30, 30, 30, 255));
        canvas.Mutate(x => x.DrawImage(img, new Point(padLeft, padTop), 1f));

        using var imgStream = new MemoryStream();
        canvas.SaveAsPng(imgStream);

        // ── Gradient Hair Mask ───────────────────────────────────────────────
        // White = repaint (hair/head), Black = preserve (face/body)
        // Feathered gradient at transition for natural blending
        int hairEnd       = (int)(TargetSize * HairZoneEnd);
        int transitionEnd = (int)(TargetSize * TransitionZoneEnd);

        using var mask = new Image<L8>(TargetSize, TargetSize);
        mask.ProcessPixelRows(accessor =>
        {
            for (int y = 0; y < TargetSize; y++)
            {
                byte pixVal;
                if (y <= hairEnd)
                {
                    pixVal = 255; // Full white — repaint
                }
                else if (y <= transitionEnd)
                {
                    float t = (float)(y - hairEnd) / (transitionEnd - hairEnd);
                    float eased = t * t * (3f - 2f * t); // smooth-step
                    pixVal = (byte)(255 * (1f - eased));
                }
                else
                {
                    pixVal = 0; // Full black — preserve
                }

                var row = accessor.GetRowSpan(y);
                for (int x = 0; x < TargetSize; x++)
                    row[x] = new L8(pixVal);
            }
        });

        using var maskStream = new MemoryStream();
        mask.SaveAsPng(maskStream);

        var info = new LetterboxInfo(padLeft, padTop, scaledW, scaledH);
        return (imgStream.ToArray(), maskStream.ToArray(), info);
    }

    // ─── Response Parsing ─────────────────────────────────────────────────────

    private byte[] ExtractImageBytes(byte[] responseBytes)
    {
        if (responseBytes == null || responseBytes.Length == 0)
            return Array.Empty<byte>();

        var firstByte = responseBytes.FirstOrDefault(b => !char.IsWhiteSpace((char)b));
        if (firstByte == (byte)'{' || firstByte == (byte)'[')
        {
            try
            {
                var text = Encoding.UTF8.GetString(responseBytes);
                using var doc = JsonDocument.Parse(text);
                var root = doc.RootElement;

                if (root.TryGetProperty("result", out var resultProp))
                {
                    if (resultProp.ValueKind == JsonValueKind.Object && resultProp.TryGetProperty("image", out var imgProp))
                    {
                        var b64 = imgProp.GetString();
                        if (!string.IsNullOrEmpty(b64))
                        {
                            _logger.LogInformation("Extracted Base64 image ({Len} chars) from JSON response", b64.Length);
                            return Convert.FromBase64String(b64);
                        }
                    }
                    else if (resultProp.ValueKind == JsonValueKind.String)
                    {
                        var b64 = resultProp.GetString();
                        if (!string.IsNullOrEmpty(b64))
                            return Convert.FromBase64String(b64);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not parse Cloudflare response as JSON — returning raw bytes");
            }
        }

        return responseBytes;
    }

    // ─── Prompt Builder ───────────────────────────────────────────────────────

    public static string BuildPrompt(string hairstyleName, string promptDetails, string hairColor)
    {
        var colorPart = hairColor.Equals("natural", StringComparison.OrdinalIgnoreCase)
            ? "natural dark hair"
            : $"{hairColor} hair";

        return $"professional {hairstyleName} hairstyle, {colorPart}, {promptDetails}, " +
               "sharp clean hairline, realistic hair texture, photorealistic portrait, " +
               "high quality photo, 8k, studio lighting, barber precision cut";
    }

    private record LetterboxInfo(int PadLeft, int PadTop, int ScaledWidth, int ScaledHeight);
}
