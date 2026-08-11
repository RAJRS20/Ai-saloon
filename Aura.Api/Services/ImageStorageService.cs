using Microsoft.Extensions.Options;
using Aura.Api.Options;

namespace Aura.Api.Services;

public interface IImageStorageService
{
    Task<(string StoragePath, string PublicUrl)> SaveImageAsync(byte[] imageBytes, string extension, string subfolder = "results");
    Task<byte[]> ReadImageAsync(string storagePath);
    Task DeleteImageAsync(string storagePath);
    string GetPublicUrl(string storagePath);
}

/// <summary>
/// Local filesystem image storage — saves files to wwwroot/uploads/.
/// For production, replace with CloudinaryImageService or S3ImageService.
/// </summary>
public class LocalImageStorageService : IImageStorageService
{
    private readonly string _uploadsRoot;
    private readonly string _baseUrl;
    private readonly ILogger<LocalImageStorageService> _logger;

    public LocalImageStorageService(
        IWebHostEnvironment env,
        IOptions<StorageOptions> options,
        ILogger<LocalImageStorageService> logger)
    {
        // WebRootPath is null on Railway (no pre-existing wwwroot) — fall back to
        // ContentRootPath so Path.Combine never receives a null first argument.
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        _uploadsRoot = Path.Combine(webRoot, "uploads");
        _baseUrl = options.Value.LocalBaseUrl;
        _logger = logger;

        // Ensure the uploads directory exists
        Directory.CreateDirectory(_uploadsRoot);
    }

    public async Task<(string StoragePath, string PublicUrl)> SaveImageAsync(byte[] imageBytes, string extension, string subfolder = "results")
    {
        var dir = Path.Combine(_uploadsRoot, subfolder);
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(dir, fileName);

        await File.WriteAllBytesAsync(filePath, imageBytes);
        _logger.LogInformation("Saved image to {FilePath} ({Size} bytes)", filePath, imageBytes.Length);

        var relativePath = Path.Combine(subfolder, fileName).Replace('\\', '/');
        var publicUrl = $"{_baseUrl}/{relativePath}";
        return (relativePath, publicUrl);
    }

    public async Task<byte[]> ReadImageAsync(string storagePath)
    {
        var fullPath = Path.Combine(_uploadsRoot, storagePath);
        return await File.ReadAllBytesAsync(fullPath);
    }

    public async Task DeleteImageAsync(string storagePath)
    {
        var fullPath = Path.Combine(_uploadsRoot, storagePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            _logger.LogInformation("Deleted image {Path}", fullPath);
        }
        await Task.CompletedTask;
    }

    public string GetPublicUrl(string storagePath)
        => $"{_baseUrl}/{storagePath.Replace('\\', '/')}";
}
