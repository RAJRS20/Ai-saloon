using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Aura.Api.Models;

namespace Aura.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Hairstyle> Hairstyles => Set<Hairstyle>();
    public DbSet<HairstyleCategory> HairstyleCategories => Set<HairstyleCategory>();
    public DbSet<TryOnJob> TryOnJobs => Set<TryOnJob>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Hairstyle>(e =>
        {
            e.HasKey(h => h.Id);
            e.Property(h => h.Name).HasMaxLength(100).IsRequired();
            e.Property(h => h.Slug).HasMaxLength(100).IsRequired();
            e.HasIndex(h => h.Slug).IsUnique();
            e.Property(h => h.PromptDetails).HasMaxLength(2000);
            e.Property(h => h.Description).HasMaxLength(500);
        });

        builder.Entity<TryOnJob>(e =>
        {
            e.HasKey(j => j.JobId);
            e.Property(j => j.JobId).HasMaxLength(50);
            e.Property(j => j.Status).HasConversion<string>();
            e.HasOne(j => j.Hairstyle).WithMany().HasForeignKey(j => j.HairstyleId);
            e.HasOne(j => j.User).WithMany(u => u.TryOnJobs).HasForeignKey(j => j.UserId).IsRequired(false);
        });
    }
}
