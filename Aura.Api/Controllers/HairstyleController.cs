using Aura.Api.DTOs;
using Aura.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Aura.Api.Controllers;

[ApiController]
[Route("api/hairstyle")]
public class HairstyleController : ControllerBase
{
    private readonly IHairstyleService _service;

    public HairstyleController(IHairstyleService service) => _service = service;

    /// <summary>Get all active hairstyles, optionally filtered by category.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<HairstyleDto>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] string? category)
    {
        var hairstyles = await _service.GetAllAsync(category);
        return Ok(hairstyles);
    }

    /// <summary>Get a single hairstyle by ID.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(HairstyleDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(int id)
    {
        var h = await _service.GetByIdAsync(id);
        return h is null ? NotFound() : Ok(h);
    }

    /// <summary>Get all distinct hairstyle categories.</summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(List<string>), 200)]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _service.GetCategoriesAsync();
        return Ok(categories);
    }
}
