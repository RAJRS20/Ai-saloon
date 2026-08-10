namespace Aura.Api.Services;

/// <summary>
/// Wraps HuggingFaceImageService as an ITryOnProvider.
/// Uses the free Hugging Face Inference API — no credit card required.
/// </summary>
public class HuggingFaceTryOnProvider : ITryOnProvider
{
    private readonly HuggingFaceImageService _hf;
    private readonly IImageStorageService _storage;
    private readonly ILogger<HuggingFaceTryOnProvider> _logger;

    public HuggingFaceTryOnProvider(
        HuggingFaceImageService hf,
        IImageStorageService storage,
        ILogger<HuggingFaceTryOnProvider> logger)
    {
        _hf = hf;
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
        _logger.LogInformation("HuggingFaceTryOnProvider: generating via instruct-pix2pix");

        var fullPrompt = HuggingFaceImageService.BuildPrompt(
            hairstyleName: providerMode,
            promptDetails: prompt,
            hairColor: hairColor);

        var resultBytes = await _hf.EditImageAsync(imageBytes, mimeType, fullPrompt, ct);

        var (resultPath, _) = await _storage.SaveImageAsync(resultBytes, ".png", "results");

        _logger.LogInformation("HuggingFaceTryOnProvider: saved result to {Path}", resultPath);

        return $"/uploads/{resultPath.Replace('\\', '/')}";
    }
}
