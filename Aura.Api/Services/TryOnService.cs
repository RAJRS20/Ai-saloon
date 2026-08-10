using Aura.Api.Data;
using Aura.Api.DTOs;
using Aura.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Aura.Api.Services;

public interface ITryOnService
{
    Task<TryOnJob> CreateJobAsync(IFormFile image, int hairstyleId, string hairColor, string quality, string? userId);
    Task ProcessJobAsync(string jobId);
    Task<TryOnJob?> GetJobAsync(string jobId);
    Task<TryOnJob> RegenerateAsync(string jobId, int? newHairstyleId);
}

public class TryOnService : ITryOnService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TryOnService> _logger;

    public TryOnService(
        IServiceScopeFactory scopeFactory,
        ILogger<TryOnService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<TryOnJob> CreateJobAsync(
        IFormFile image, int hairstyleId, string hairColor, string quality, string? userId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IImageStorageService>();

        // Validate hairstyle exists
        var hairstyle = await db.Hairstyles.FindAsync(hairstyleId)
            ?? throw new ArgumentException($"Hairstyle {hairstyleId} not found.");

        // Save source image locally
        var imageBytes = await ReadFormFileAsync(image);
        var ext = GetExtension(image.ContentType);
        var (sourcePath, _) = await storage.SaveImageAsync(imageBytes, ext, "sources");

        var job = new TryOnJob
        {
            JobId = Guid.NewGuid().ToString("N"),
            UserId = userId,
            HairstyleId = hairstyleId,
            HairColor = hairColor,
            Quality = quality,
            SourceImagePath = sourcePath,
            Status = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        };

        db.TryOnJobs.Add(job);
        await db.SaveChangesAsync();

        // Fire-and-forget — runs in its own scope so no DbContext lifetime issues
        var jobId = job.JobId;
        _ = Task.Run(() => ProcessJobAsync(jobId));

        return job;
    }

    public async Task ProcessJobAsync(string jobId)
    {
        // Each background task gets its own DI scope
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var provider = scope.ServiceProvider.GetRequiredService<ITryOnProvider>();
        var storage = scope.ServiceProvider.GetRequiredService<IImageStorageService>();
        var http = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>().CreateClient();

        var job = await db.TryOnJobs
            .Include(j => j.Hairstyle)
            .FirstOrDefaultAsync(j => j.JobId == jobId);

        if (job == null) return;

        try
        {
            // ── Step 1: Validating ────────────────────────────────────────────
            job.Status = JobStatus.Validating;
            job.ProgressPercent = 10;
            job.ProgressMessage = "Checking your photo...";
            await db.SaveChangesAsync();

            if (job.SourceImagePath == null || job.Hairstyle == null)
            {
                await FailJobAsync(db, job, "Source image or hairstyle not found.");
                return;
            }

            var sourceBytes = await storage.ReadImageAsync(job.SourceImagePath);
            var mimeType = GetMimeTypeFromPath(job.SourceImagePath);

            // ── Step 2: Uploading to fal.ai ───────────────────────────────────
            job.Status = JobStatus.Generating;
            job.ProgressPercent = 25;
            job.ProgressMessage = "Uploading your photo to AI...";
            await db.SaveChangesAsync();

            // ── Step 3: Generating hairstyle ──────────────────────────────────
            job.ProgressPercent = 40;
            job.ProgressMessage = "AI is styling your hair — this takes 20–60 seconds...";
            await db.SaveChangesAsync();

            string resultImageUrl = await provider.GenerateHairAsync(
                sourceBytes,
                mimeType,
                job.Hairstyle.PromptDetails,
                job.HairColor,
                job.Hairstyle.ProviderMode,
                job.Hairstyle.ProviderStyle);

            // ── Step 4: Store result ──────────────────────────────────────────
            job.Status = JobStatus.StoringResult;
            job.ProgressPercent = 85;
            job.ProgressMessage = "Saving your result...";
            await db.SaveChangesAsync();

            byte[] resultBytes;
            if (resultImageUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                resultImageUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                resultBytes = await http.GetByteArrayAsync(resultImageUrl);
                var (resultPath, _) = await storage.SaveImageAsync(resultBytes, ".jpg", "results");
                job.ResultImagePath = resultPath;
            }
            else
            {
                var relPath = resultImageUrl.TrimStart('/').Replace("uploads/", "");
                job.ResultImagePath = relPath;
            }

            // ── Complete ──────────────────────────────────────────────────────
            job.Status = JobStatus.Completed;
            job.ProgressPercent = 100;
            job.ProgressMessage = "Your new look is ready!";
            job.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            _logger.LogInformation("Job {JobId} completed successfully.", jobId);
        }
        catch (FalRateLimitException)
        {
            _logger.LogWarning("Job {JobId} hit fal.ai rate limit", jobId);
            await FailJobAsync(db, job,
                "fal.ai rate limit reached — please wait a moment and try again.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Job {JobId} failed", jobId);
            await FailJobAsync(db, job, ex.Message);
        }
    }

    public async Task<TryOnJob?> GetJobAsync(string jobId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.TryOnJobs
            .Include(j => j.Hairstyle)
            .FirstOrDefaultAsync(j => j.JobId == jobId);
    }

    public async Task<TryOnJob> RegenerateAsync(string jobId, int? newHairstyleId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var originalJob = await db.TryOnJobs.FindAsync(jobId)
            ?? throw new ArgumentException($"Job {jobId} not found.");

        var hairstyleId = newHairstyleId ?? originalJob.HairstyleId ?? 0;

        var newJob = new TryOnJob
        {
            JobId = Guid.NewGuid().ToString("N"),
            UserId = originalJob.UserId,
            HairstyleId = hairstyleId,
            HairColor = originalJob.HairColor,
            Quality = originalJob.Quality,
            SourceImagePath = originalJob.SourceImagePath,
            Status = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        };

        db.TryOnJobs.Add(newJob);
        await db.SaveChangesAsync();

        var newJobId = newJob.JobId;
        _ = Task.Run(() => ProcessJobAsync(newJobId));

        return newJob;
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private static async Task FailJobAsync(AppDbContext db, TryOnJob job, string errorMessage)
    {
        job.Status = JobStatus.Failed;
        job.ErrorMessage = errorMessage;
        job.ProgressMessage = "Generation failed.";
        job.CompletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static async Task<byte[]> ReadFormFileAsync(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        return ms.ToArray();
    }

    private static string GetExtension(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => ".jpg"
    };

    private static string GetMimeTypeFromPath(string path)
    {
        var ext = Path.GetExtension(path).ToLower();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };
    }
}
