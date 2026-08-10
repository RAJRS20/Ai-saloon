using Aura.Api.Data;
using Aura.Api.DTOs;
using Aura.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Aura.Api.Services;

public interface IHairstyleService
{
    Task<List<HairstyleDto>> GetAllAsync(string? category = null);
    Task<HairstyleDto?> GetByIdAsync(int id);
    Task<List<string>> GetCategoriesAsync();
}

public class HairstyleService : IHairstyleService
{
    private readonly AppDbContext _db;

    public HairstyleService(AppDbContext db) => _db = db;

    public async Task<List<HairstyleDto>> GetAllAsync(string? category = null)
    {
        var query = _db.Hairstyles.Where(h => h.IsActive);
        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(h => h.Category == category);

        var hairstyles = await query.OrderBy(h => h.SortOrder).ToListAsync();
        return hairstyles.Select(MapToDto).ToList();
    }

    public async Task<HairstyleDto?> GetByIdAsync(int id)
    {
        var h = await _db.Hairstyles.FindAsync(id);
        return h is null || !h.IsActive ? null : MapToDto(h);
    }

    public async Task<List<string>> GetCategoriesAsync()
    {
        return await _db.Hairstyles
            .Where(h => h.IsActive)
            .Select(h => h.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }

    private static HairstyleDto MapToDto(Hairstyle h) => new(
        h.Id, h.Name, h.Slug, h.Category, h.Description,
        h.PromptDetails,
        h.RecommendedFaceShapes.Split(',', StringSplitOptions.RemoveEmptyEntries),
        h.HairTypes.Split(',', StringSplitOptions.RemoveEmptyEntries),
        h.Length, h.MaintenanceLevel, h.ReferenceImageUrl,
        h.IsActive, h.SortOrder,
        h.ProviderMode, h.ProviderStyle
    );
}
