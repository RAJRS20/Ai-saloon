namespace Aura.Api.Services;

/// <summary>
/// Wraps OpenAiImageService as an ITryOnProvider so the OpenAI gpt-image-1 model
/// can be used as the primary hair-change provider.
/// </summary>
public class OpenAiTryOnProvider : ITryOnProvider
{
    private readonly OpenAiImageService _openAi;
    private readonly IImageStorageService _storage;
    private readonly ILogger<OpenAiTryOnProvider> _logger;

    public OpenAiTryOnProvider(
        OpenAiImageService openAi,
        IImageStorageService storage,
        ILogger<OpenAiTryOnProvider> logger)
    {
        _openAi = openAi;
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
        _logger.LogInformation("OpenAiTryOnProvider: generating hairstyle via OpenAI gpt-image-1");

        // Build a detailed prompt using the hairstyle name (providerMode) and details (prompt)
        var fullPrompt = OpenAiImageService.BuildPrompt(
            hairstyleName: providerMode,
            promptDetails: prompt,
            hairColor: hairColor);

        // Call OpenAI to get edited image bytes
        var resultBytes = await _openAi.EditImageAsync(imageBytes, mimeType, fullPrompt, ct);

        // Save locally and return relative path
        var (resultPath, _) = await _storage.SaveImageAsync(resultBytes, ".png", "results");

        _logger.LogInformation("OpenAiTryOnProvider: saved result to {Path}", resultPath);

        return $"/uploads/{resultPath.Replace('\\', '/')}";
    }
}
