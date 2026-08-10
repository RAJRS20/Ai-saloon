using Aura.Api.Options;
using Microsoft.Extensions.Options;

namespace Aura.Api.Services;

/// <summary>
/// Wraps GeminiImageService as an ITryOnProvider so Gemini AI can be used
/// as the primary hair-change provider in place of fal.ai.
/// </summary>
public class GeminiTryOnProvider : ITryOnProvider
{
    private readonly IGeminiImageService _gemini;
    private readonly IImageStorageService _storage;
    private readonly ILogger<GeminiTryOnProvider> _logger;

    public GeminiTryOnProvider(
        IGeminiImageService gemini,
        IImageStorageService storage,
        ILogger<GeminiTryOnProvider> logger)
    {
        _gemini = gemini;
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
        _logger.LogInformation("GeminiTryOnProvider: generating hairstyle via Gemini AI");

        // Build the detailed hairstyle prompt
        var fullPrompt = GeminiImageService.BuildHairstylePrompt(
            hairstyleName: providerMode, // providerMode holds the style name when structured
            promptDetails: prompt,
            hairColor: hairColor);

        // Call Gemini to get edited image bytes
        var resultBytes = await _gemini.EditImageAsync(imageBytes, mimeType, fullPrompt, ct);

        // Save locally and return a local path (TryOnService will turn it into a URL)
        var (resultPath, _) = await _storage.SaveImageAsync(resultBytes, ".jpg", "results");

        _logger.LogInformation("GeminiTryOnProvider: saved result to {Path}", resultPath);

        return $"/uploads/{resultPath.Replace('\\', '/')}";
    }
}
