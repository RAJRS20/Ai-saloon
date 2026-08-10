namespace Aura.Api.Services;

/// <summary>
/// Abstraction for AI hair-change providers.
/// Implementations: FalHairChangeService (active), GeminiImageService (legacy fallback).
/// </summary>
public interface ITryOnProvider
{
    /// <summary>
    /// Upload the source image and generate a new hairstyle.
    /// Returns the public URL of the generated result image.
    /// </summary>
    Task<string> GenerateHairAsync(
        byte[] imageBytes,
        string mimeType,
        string prompt,
        string hairColor,
        string providerMode = "freeform",
        string providerStyle = "",
        CancellationToken ct = default);
}
