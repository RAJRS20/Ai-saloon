using Microsoft.AspNetCore.Identity;

namespace Aura.Api.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<TryOnJob> TryOnJobs { get; set; } = new List<TryOnJob>();
}

public class HairstyleCategory
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class Hairstyle
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Detailed prompt text injected into the AI hair-change prompt.</summary>
    public string PromptDetails { get; set; } = string.Empty;

    /// <summary>fal.ai provider mode: "freeform" (default) or "structured".</summary>
    public string ProviderMode { get; set; } = "freeform";

    /// <summary>fal.ai structured endpoint style key (e.g. "side_part", "buzz_cut"). Used when ProviderMode=structured.</summary>
    public string ProviderStyle { get; set; } = string.Empty;

    /// <summary>Comma-separated face shapes, e.g. "oval,square,heart"</summary>
    public string RecommendedFaceShapes { get; set; } = string.Empty;

    /// <summary>Comma-separated hair types, e.g. "straight,wavy"</summary>
    public string HairTypes { get; set; } = string.Empty;

    /// <summary>short | medium | long</summary>
    public string Length { get; set; } = "short";

    /// <summary>low | medium | high</summary>
    public string MaintenanceLevel { get; set; } = "medium";

    public string ReferenceImageUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum JobStatus
{
    Pending,
    Validating,
    Generating,
    StoringResult,
    Completed,
    Failed
}

public class TryOnJob
{
    public string JobId { get; set; } = Guid.NewGuid().ToString();
    public string? UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public int? HairstyleId { get; set; }
    public Hairstyle? Hairstyle { get; set; }

    public JobStatus Status { get; set; } = JobStatus.Pending;
    public string? ErrorMessage { get; set; }

    public string? SourceImagePath { get; set; }
    public string? ResultImagePath { get; set; }

    public string HairColor { get; set; } = "natural";

    /// <summary>fal.ai queue request ID for polling job status.</summary>
    public string? ProviderRequestId { get; set; }
    public string Quality { get; set; } = "high";

    public int ProgressPercent { get; set; }
    public string ProgressMessage { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
