using Aura.Api.DTOs;
using Aura.Api.Models;
using Aura.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TryOnController : ControllerBase
{
    private readonly ITryOnService _tryOn;
    private readonly ILogger<TryOnController> _logger;

    private static readonly string[] AllowedMimeTypes =
        ["image/jpeg", "image/png", "image/webp"];

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
            if (!AllowedMimeTypes.Contains(image.ContentType.ToLower()))
                issues.Add("Unsupported file type. Please upload a JPG, PNG or WebP image.");

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
        if (image == null || image.Length == 0)
            return BadRequest("No image provided.");

        if (!AllowedMimeTypes.Contains(image.ContentType.ToLower()))
            return BadRequest("Unsupported image type.");

        if (image.Length > 20 * 1024 * 1024)
            return BadRequest("Image too large. Maximum 20MB.");

        if (request.HairstyleId <= 0)
            return BadRequest("Invalid hairstyle ID.");

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

        string? sourceUrl = job.SourceImagePath != null
            ? $"{Request.Scheme}://{Request.Host}/uploads/{job.SourceImagePath.Replace('\\', '/')}"
            : null;

        string? resultUrl = job.ResultImagePath != null
            ? $"{Request.Scheme}://{Request.Host}/uploads/{job.ResultImagePath.Replace('\\', '/')}"
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
