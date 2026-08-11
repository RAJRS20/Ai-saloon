using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using Aura.Api.Options;

namespace Aura.Api.Services;

/// <summary>
/// Uses Cloudflare Workers AI inpainting model for free hair transformation.
/// Model: @cf/runwayml/stable-diffusion-v1-5-inpainting
///
/// Strategy: Generate a white hair-region mask (top 45% of portrait = hair),
/// keep face/body masked black (unchanged), run inpainting with the hair prompt.
/// This preserves the face and only edits the hair area.
///
/// Free tier: 10,000 neurons/day — no credit card needed.
/// </summary>
public class CloudflareAiImageService
{
    private readonly CloudflareAiOptions _options;
    private readonly HttpClient _http;
    private readonly ILogger<CloudflareAiImageService> _logger;

    // Switch to inpainting model — designed for localized edits with mask support
    private const string Model = "@cf/runwayml/stable-diffusion-v1-5-inpainting";

    // SD v1.5 native resolution
    private const int TargetSize = 512;

    // Fraction of image height treated as the "hair zone" (white mask region)
    // 0.52 covers top of head down through forehead & temples to replace bangs
    private const double HairZoneFraction = 0.52;

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

        // Prepare: resize image + build hair mask
        var (imageInts, maskInts) = PrepareImageAndMask(imageBytes);
        _logger.LogInformation("Image: {ImgLen} ints | Mask: {MaskLen} ints", imageInts.Length, maskInts.Length);

        var payload = new
        {
            prompt,
            negative_prompt = "long messy hair, unkempt hair, long bangs, shaggy hair, unchanged original hair, blurry, bad quality, deformed face, ugly face, wrong anatomy",
            image = imageInts,
            mask  = maskInts,
            num_steps     = Math.Clamp(_options.NumSteps > 0 ? _options.NumSteps : 20, 1, 20),
            guidance      = 12.0f,  // High guidance forces SD to follow the new haircut prompt
            strength      = 0.99f   // inpainting: repaint the masked hair area fully
        };

        var json = JsonSerializer.Serialize(payload);
        _logger.LogInformation("Sending {Len} chars to Cloudflare", json.Length);

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

        return ExtractImageBytes(responseBytes);
    }

    /// <summary>
    /// Parses Cloudflare Workers AI JSON response to extract the base64 image string from result.image,
    /// or returns raw bytes if already a binary PNG/JPEG.
    /// </summary>
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
                            _logger.LogInformation("Extracted Base64 image ({Len} chars) from Cloudflare JSON response", b64.Length);
                            return Convert.FromBase64String(b64);
                        }
                    }
                    else if (resultProp.ValueKind == JsonValueKind.String)
                    {
                        var b64 = resultProp.GetString();
                        if (!string.IsNullOrEmpty(b64))
                        {
                            _logger.LogInformation("Extracted Base64 image ({Len} chars) from Cloudflare string response", b64.Length);
                            return Convert.FromBase64String(b64);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not parse Cloudflare response as JSON base64 image; returning raw bytes.");
            }
        }

        return responseBytes;
    }

    /// <summary>
    /// Decodes + resizes the source image to 512×512 PNG → int[].
    /// Also generates a binary hair mask: top 52% white (change), rest black (preserve face).
    /// </summary>
    private static (int[] imageInts, int[] maskInts) PrepareImageAndMask(byte[] imageBytes)
    {
        // ── Source image ────────────────────────────────────────────────────────
        using var src = new MemoryStream(imageBytes);
        using var img = Image.Load<Rgb24>(src);
        img.Mutate(x => x.Resize(TargetSize, TargetSize));

        using var imgStream = new MemoryStream();
        img.SaveAsPng(imgStream);
        var imageInts = imgStream.ToArray().Select(b => (int)b).ToArray();

        // ── Hair mask ───────────────────────────────────────────────────────────
        // White (255) = areas to repaint (top 52% = hair + forehead)
        // Black (0)   = areas to preserve (face, body)
        using var mask = new Image<L8>(TargetSize, TargetSize);
        mask.Mutate(ctx =>
        {
            ctx.Fill(new SixLabors.ImageSharp.Drawing.Processing.SolidBrush(Color.Black));

            int hairHeight = (int)(TargetSize * HairZoneFraction);
            ctx.Fill(
                new SixLabors.ImageSharp.Drawing.Processing.SolidBrush(Color.White),
                new SixLabors.ImageSharp.Rectangle(0, 0, TargetSize, hairHeight));
        });

        using var maskStream = new MemoryStream();
        mask.SaveAsPng(maskStream);
        var maskInts = maskStream.ToArray().Select(b => (int)b).ToArray();

        return (imageInts, maskInts);
    }

    /// <summary>Builds an inpainting prompt for SD v1.5 hair transformation.</summary>
    public static string BuildPrompt(string hairstyleName, string promptDetails, string hairColor)
    {
        var colorPart = hairColor.Equals("natural", StringComparison.OrdinalIgnoreCase)
            ? "natural dark hair"
            : $"{hairColor} hair";

        return $"fresh short haircut, professional {hairstyleName} hairstyle, {colorPart}, {promptDetails}, " +
               "short faded hair on sides, neat clean hair texture, sharp hairline, realistic barber haircut, 8k resolution, detailed hair";
    }
}
