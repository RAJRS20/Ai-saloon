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

        _logger.LogInformation(
            "Generate request state: ModelStateValid={ModelStateValid}, HairstyleId={HId}, HairColor={HairColor}, Quality={Quality}, ImagePresent={ImagePresent}, ImageFileName={ImageFileName}",
            ModelState.IsValid,
            request?.HairstyleId,
            request?.HairColor,
            request?.Quality,
            image != null,
            image?.FileName);

        if (!ModelState.IsValid)
        {
            var modelStateErrors = ModelState
                .Where(kvp => kvp.Value?.Errors.Count > 0)
                .ToDictionary(kvp => kvp.Key, kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

            _logger.LogWarning("Generate rejected: ModelState invalid. Errors={@ModelStateErrors}", modelStateErrors);
            return BadRequest(new { error = "Invalid request.", details = modelStateErrors });
        }

        if (image == null || image.Length == 0)
        {
            _logger.LogWarning("Generate rejected: No image provided. ImageIsNull={ImageIsNull}, ImageLength={ImageLength}",
                image == null, image?.Length);
            var response = "No image provided.";
            _logger.LogError("Generate returning 400. Error={Error}", response);
            return BadRequest(response);
        }

        var ct = image.ContentType?.ToLower() ?? "";
        if (!AllowedMimeTypes.Contains(ct) && !ct.StartsWith("image/"))
        {
            _logger.LogWarning("Generate rejected: Unsupported ContentType '{CT}'.", image.ContentType);
            var response = $"Unsupported image type '{image.ContentType}'.";
            _logger.LogError("Generate returning 400. Error={Error}", response);
            return BadRequest(response);
        }

        if (image.Length > 20 * 1024 * 1024)
        {
            _logger.LogWarning("Generate rejected: Image size {Length} bytes exceeds 20MB limit.", image.Length);
            var response = "Image too large. Maximum 20MB.";
            _logger.LogError("Generate returning 400. Error={Error}", response);
            return BadRequest(response);
        }

        if (request == null || request.HairstyleId <= 0)
        {
            _logger.LogWarning("Generate rejected: Invalid HairstyleId {HId}.", request?.HairstyleId);
            var response = "Invalid hairstyle ID.";
            _logger.LogError("Generate returning 400. Error={Error}", response);
            return BadRequest(response);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        try
        {
            _logger.LogInformation(
                "Generate processing job: HairstyleId={HId}, HairColor={HairColor}, Quality={Quality}, UserId={UserId}, ImageContentType={CT}, ImageLength={Length}",
                request.HairstyleId, request.HairColor, request.Quality, userId, image.ContentType, image.Length);

            var job = await _tryOn.CreateJobAsync(
                image, request.HairstyleId, request.HairColor, request.Quality, userId);

            _logger.LogInformation("Generate succeeded: JobId={JobId}, Status={Status}. Returning 200.", job.JobId, job.Status);
            return Ok(MapJobToDto(job));
        }
        catch (ArgumentException ex)
        {
            _logger.LogError(ex,
                "Generate failed with ArgumentException. HairstyleId={HId}, HairColor={HairColor}, Quality={Quality}, UserId={UserId}, Message={Message}, StackTrace={StackTrace}, InnerException={InnerException}",
                request.HairstyleId, request.HairColor, request.Quality, userId, ex.Message, ex.StackTrace, ex.InnerException?.ToString());

            _logger.LogError("Generate returning 400. Error={Error}", ex.Message);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Generate failed with unhandled exception. HairstyleId={HId}, HairColor={HairColor}, Quality={Quality}, UserId={UserId}, Message={Message}, StackTrace={StackTrace}, InnerException={InnerException}",
                request.HairstyleId, request.HairColor, request.Quality, userId, ex.Message, ex.StackTrace, ex.InnerException?.ToString());

            var response = "An unexpected error occurred while processing the request.";
            _logger.LogError("Generate returning 500. Error={Error}", response);
            return StatusCode(500, response);
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
