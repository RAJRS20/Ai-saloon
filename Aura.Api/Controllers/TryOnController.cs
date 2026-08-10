using Aura.Api.DTOs;
using Aura.Api.Models;
using Aura.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.Api.Controllers;

[ApiController]
[Route("api/try-on")]
public class TryOnController : ControllerBase
{
    private readonly ITryOnService _tryOn;
    private readonly ILogger<TryOnController> _logger;

    private static readonly string[] AllowedMimeTypes =
    ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "application/octet-stream"];

    public TryOnController(ITryOnService tryOn, ILogger<TryOnController> logger)
    {
        _tryOn = tryOn;
        _logger = logger;
    }

    /// <summary>Validate an uploaded photo (size, type, basic checks).</summary>
    [HttpPost("validate")]
    [ProducesResponseType(typeof(ValidatePhotoResponse), 200)]
    public IActionResult Validate(IFormFile image)
    {
        var issues = new List<string>();

        if (image == null || image.Length == 0)
            issues.Add("No image provided.");
        else
        {
            var ct = image.ContentType?.ToLower() ?? "";
            if (!AllowedMimeTypes.Contains(ct) && !ct.StartsWith("image/"))
                issues.Add($"Unsupported file type ({image.ContentType}). Please upload a JPG, PNG or WebP image.");

            if (image.Length > 20 * 1024 * 1024)
                issues.Add("Image too large. Maximum size is 20MB.");
        }

        return Ok(new ValidatePhotoResponse(issues.Count == 0, issues.ToArray()));
    }

    /// <summary>Start a hairstyle generation job.</summary>
    [HttpPost("generate")]
    [RequestSizeLimit(25 * 1024 * 1024)] // 25MB
    [ProducesResponseType(typeof(TryOnJobDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Generate([FromForm] GenerationRequestDto request, IFormFile image)
    {
        _logger.LogInformation("Generate called: ContentType={CT}, Length={Length}, HairstyleId={HId}",
            image?.ContentType, image?.Length, request?.HairstyleId);

        if (image == null || image.Length == 0)
        {
            _logger.LogWarning("Generate rejected: No image provided.");
            return BadRequest("No image provided.");
        }

        var ct = image.ContentType?.ToLower() ?? "";
        if (!AllowedMimeTypes.Contains(ct) && !ct.StartsWith("image/"))
        {
            _logger.LogWarning("Generate rejected: Unsupported ContentType '{CT}'.", image.ContentType);
            return BadRequest($"Unsupported image type '{image.ContentType}'.");
        }

        if (image.Length > 20 * 1024 * 1024)
        {
            _logger.LogWarning("Generate rejected: Image size {Length} bytes exceeds 20MB limit.", image.Length);
            return BadRequest("Image too large. Maximum 20MB.");
        }

        if (request == null || request.HairstyleId <= 0)
        {
            _logger.LogWarning("Generate rejected: Invalid HairstyleId {HId}.", request?.HairstyleId);
            return BadRequest("Invalid hairstyle ID.");
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        try
        {
            var job = await _tryOn.CreateJobAsync(
                image, request.HairstyleId, request.HairColor, request.Quality, userId);

            return Ok(MapJobToDto(job));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Get job status and result.</summary>
    [HttpGet("{jobId}")]
    [ProducesResponseType(typeof(TryOnJobDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetJob(string jobId)
    {
        var job = await _tryOn.GetJobAsync(jobId);
        return job is null ? NotFound() : Ok(MapJobToDto(job));
    }

    /// <summary>Regenerate a result with the same source image.</summary>
    [HttpPost("regenerate")]
    [ProducesResponseType(typeof(TryOnJobDto), 200)]
    public async Task<IActionResult> Regenerate([FromBody] RegenerateRequest request)
    {
        try
        {
            var job = await _tryOn.RegenerateAsync(request.JobId, request.HairstyleId);
            return Ok(MapJobToDto(job));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private TryOnJobDto MapJobToDto(TryOnJob job)
    {
        HairstyleDto? hairstyleDto = null;
        if (job.Hairstyle != null)
        {
            var h = job.Hairstyle;
            hairstyleDto = new HairstyleDto(
                h.Id, h.Name, h.Slug, h.Category, h.Description,
                h.PromptDetails,
                h.RecommendedFaceShapes.Split(',', StringSplitOptions.RemoveEmptyEntries),
                h.HairTypes.Split(',', StringSplitOptions.RemoveEmptyEntries),
                h.Length, h.MaintenanceLevel, h.ReferenceImageUrl,
                h.IsActive, h.SortOrder,
                h.ProviderMode, h.ProviderStyle
            );
        }

        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
        if (scheme == "http" && (Request.IsHttps || !HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment()))
        {
            scheme = "https";
        }

        string? sourceUrl = job.SourceImagePath != null
            ? $"{scheme}://{host}/uploads/{job.SourceImagePath.Replace('\\', '/')}"
            : null;

        string? resultUrl = job.ResultImagePath != null
            ? $"{scheme}://{host}/uploads/{job.ResultImagePath.Replace('\\', '/')}"
            : null;

        var statusString = job.Status switch
        {
            JobStatus.StoringResult => "STORING_RESULT",
            _ => job.Status.ToString().ToUpperInvariant()
        };

        return new TryOnJobDto(
            job.JobId,
            statusString,
            resultUrl,
            sourceUrl,
            hairstyleDto,
            job.ErrorMessage,
            job.CreatedAt,
            job.CompletedAt,
            job.ProgressPercent,
            job.ProgressMessage
        );
    }
}

public record RegenerateRequest(string JobId, int? HairstyleId);
