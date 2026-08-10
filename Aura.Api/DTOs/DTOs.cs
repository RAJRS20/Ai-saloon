namespace Aura.Api.DTOs;

// ─── Hairstyle DTOs ───────────────────────────────────────────────────────────

public record HairstyleDto(
    int Id,
    string Name,
    string Slug,
    string Category,
    string Description,
    string PromptDetails,
    string[] RecommendedFaceShapes,
    string[] HairTypes,
    string Length,
    string MaintenanceLevel,
    string ReferenceImageUrl,
    bool IsActive,
    int SortOrder,
    string ProviderMode = "freeform",
    string ProviderStyle = ""
);

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

public record RegisterRequest(string Email, string Password, string DisplayName);

public record LoginRequest(string Email, string Password);

public record AuthResponse(string Token, UserDto User);

public record UserDto(string Id, string Email, string DisplayName, DateTime CreatedAt);

// ─── Try-On DTOs ──────────────────────────────────────────────────────────────

public record GenerationRequestDto
{
    public int HairstyleId { get; init; }
    public string HairColor { get; init; } = "natural";
    public string Quality { get; init; } = "high";
}

public record TryOnJobDto(
    string JobId,
    string Status,
    string? ResultImageUrl,
    string? SourceImageUrl,
    HairstyleDto? Hairstyle,
    string? ErrorMessage,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    int ProgressPercent,
    string ProgressMessage
);

public record ValidatePhotoResponse(bool IsValid, string[] Issues);
