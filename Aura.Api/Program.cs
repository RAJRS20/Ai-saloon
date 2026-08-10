using Aura.Api.Data;
using Aura.Api.Models;
using Aura.Api.Options;
using Aura.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ─── Configuration ────────────────────────────────────────────────────────────
builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection(GeminiOptions.Section));
builder.Services.Configure<FalOptions>(builder.Configuration.GetSection(FalOptions.Section));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.Section));
builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection(OpenAiOptions.Section));
builder.Services.Configure<HuggingFaceOptions>(builder.Configuration.GetSection(HuggingFaceOptions.Section));
builder.Services.Configure<CloudflareAiOptions>(builder.Configuration.GetSection(CloudflareAiOptions.Section));

// ─── Database ─────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─── Identity & Auth ─────────────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(opts =>
{
    opts.Password.RequireDigit = true;
    opts.Password.RequiredLength = 8;
    opts.Password.RequireNonAlphanumeric = false;
    opts.Password.RequireUppercase = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "aura-ai-super-secret-jwt-key-change-in-production-2026";
builder.Services.AddAuthentication(opts =>
{
    opts.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opts.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opts =>
{
    opts.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "aura-api",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "aura-frontend",
        ValidateLifetime = true,
    };
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opts => opts.AddDefaultPolicy(policy =>
    policy
        .WithOrigins(
            "http://localhost:5173",
            "http://localhost:3000",
            builder.Configuration["Frontend:BaseUrl"] ?? "https://your-app.vercel.app")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
));

// ─── HTTP Client for fal.ai ──────────────────────────────────────────────────
builder.Services.AddHttpClient("fal", client =>
{
    client.Timeout = TimeSpan.FromSeconds(
        builder.Configuration.GetValue<int>("Fal:TimeoutSeconds", 120));
});

// ─── HTTP Client for Gemini REST API ─────────────────────────────────────────
builder.Services.AddHttpClient("gemini", client =>
{
    client.Timeout = TimeSpan.FromSeconds(
        builder.Configuration.GetValue<int>("Gemini:TimeoutSeconds", 120));
    client.DefaultRequestHeaders.Accept.Add(
        new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
});

// ─── HTTP Client for OpenAI API ──────────────────────────────────────────────
builder.Services.AddHttpClient("openai", client =>
{
    client.Timeout = TimeSpan.FromSeconds(
        builder.Configuration.GetValue<int>("OpenAI:TimeoutSeconds", 120));
    client.DefaultRequestHeaders.Accept.Add(
        new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
});

// ─── HTTP Client for Hugging Face API ──────────────────────────────────────────
builder.Services.AddHttpClient("huggingface", client =>
{
    client.Timeout = TimeSpan.FromSeconds(
        builder.Configuration.GetValue<int>("HuggingFace:TimeoutSeconds", 120));
});

// ─── HTTP Client for Cloudflare Workers AI ────────────────────────────────────
builder.Services.AddHttpClient("cloudflare", client =>
{
    client.Timeout = TimeSpan.FromSeconds(
        builder.Configuration.GetValue<int>("CloudflareAi:TimeoutSeconds", 120));
    client.DefaultRequestHeaders.Accept.Add(
        new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
});

// ─── Application Services ─────────────────────────────────────────────────────
builder.Services.AddScoped<IHairstyleService, HairstyleService>();
builder.Services.AddSingleton<ITryOnService, TryOnService>();
// ── Active AI Provider: Cloudflare Workers AI (free, 10k neurons/day) ────────────
builder.Services.AddScoped<CloudflareAiImageService>();
builder.Services.AddScoped<ITryOnProvider, CloudflareAiTryOnProvider>();
// ── Inactive providers (registered for easy switching) ───────────────────────
builder.Services.AddScoped<HuggingFaceImageService>();
builder.Services.AddScoped<HuggingFaceTryOnProvider>();
builder.Services.AddScoped<OpenAiImageService>();
builder.Services.AddScoped<OpenAiTryOnProvider>();
builder.Services.AddScoped<IGeminiImageService, GeminiImageService>();
builder.Services.AddScoped<GeminiTryOnProvider>();
builder.Services.AddScoped<FalHairChangeService>();
builder.Services.AddScoped<SimulationHairService>();
builder.Services.AddScoped<IImageStorageService, LocalImageStorageService>();

// ─── Controllers & API ───────────────────────────────────────────────────────
builder.Services.AddControllers(opts =>
{
    opts.Conventions.Add(new Microsoft.AspNetCore.Mvc.ApplicationModels.RouteTokenTransformerConvention(
        new SlugifyParameterTransformer()));
})
.AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Aura AI API",
        Version = "v1",
        Description = "Photorealistic hairstyle virtual try-on powered by fal.ai Hair Change"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ─── Database Initialization ─────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        await SeedData.SeedAsync(db);
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Database migration failed — running without database. Ensure SQL Server is configured.");
    }
}

// ─── Middleware Pipeline ──────────────────────────────────────────────────────
// Swagger available in all environments for easy API exploration
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Aura AI API v1");
    c.RoutePrefix = "swagger";
});

// Only redirect to HTTPS in production — avoids failures when no dev cert is trusted
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles(); // serves wwwroot/uploads/
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "Aura AI API", timestamp = DateTime.UtcNow }));

app.Run();

/// <summary>Converts PascalCase controller/action names to lowercase for REST URLs.</summary>
public class SlugifyParameterTransformer : Microsoft.AspNetCore.Routing.IOutboundParameterTransformer
{
    public string? TransformOutbound(object? value)
        => value?.ToString()?.ToLowerInvariant();
}

