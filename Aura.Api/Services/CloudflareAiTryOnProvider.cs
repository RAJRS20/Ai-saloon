namespace Aura.Api.Services;

/// <summary>
/// Wraps CloudflareAiImageService as an ITryOnProvider.
/// Uses Cloudflare Workers AI — 10,000 free neurons/day, no credit card.
/// </summary>
public class CloudflareAiTryOnProvider : ITryOnProvider
{
    private readonly CloudflareAiImageService _cf;
    private readonly IImageStorageService _storage;
    private readonly ILogger<CloudflareAiTryOnProvider> _logger;

    public CloudflareAiTryOnProvider(
        CloudflareAiImageService cf,
        IImageStorageService storage,
        ILogger<CloudflareAiTryOnProvider> logger)
    {
        _cf = cf;
        _storage = storage;
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
        _logger.LogInformation("CloudflareAiTryOnProvider: generating via SD v1.5 img2img");

        var fullPrompt = CloudflareAiImageService.BuildPrompt(
            hairstyleName: providerMode,
            promptDetails: prompt,
            hairColor: hairColor);

        var resultBytes = await _cf.EditImageAsync(imageBytes, mimeType, fullPrompt, ct);

        var (resultPath, _) = await _storage.SaveImageAsync(resultBytes, ".png", "results");

        _logger.LogInformation("CloudflareAiTryOnProvider: saved result to {Path}", resultPath);

        return $"/uploads/{resultPath.Replace('\\', '/')}";
    }
}
