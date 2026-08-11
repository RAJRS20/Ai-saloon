using Aura.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Aura.Api.Data;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var count = await db.Hairstyles.CountAsync();
        if (count >= 15)
        {
            // All hairstyles present — patch any missing ProviderMode fields
            var existing = await db.Hairstyles.ToListAsync();
            var needsSave = false;
            foreach (var h in existing)
            {
                if (string.IsNullOrEmpty(h.ProviderMode))
                {
                    h.ProviderMode = "freeform";
                    needsSave = true;
                }
            }
            if (needsSave) await db.SaveChangesAsync();
            return;
        }

        // Partial or empty — delete whatever is there and re-seed cleanly
        if (count > 0)
        {
            db.Hairstyles.RemoveRange(db.Hairstyles);
            await db.SaveChangesAsync();
        }

        var hairstyles = new List<Hairstyle>
        {
            new()
            {
                Name = "Low Fade + Textured Crop",
                Slug = "low-fade-textured-crop",
                Category = "Fade",
                Description = "Clean low skin fade that seamlessly blends into a textured forward crop.",
                PromptDetails = "Low skin fade around lower sides and nape, gradual clean blending into a modern textured crop on top with forward-styled blunt fringe, natural volume, individual hair strands, clean natural hairline.",
                ProviderMode = "freeform",
                ProviderStyle = "short_hair",
                RecommendedFaceShapes = "oval,round,heart",
                HairTypes = "straight,wavy",
                Length = "short",
                MaintenanceLevel = "low",
                SortOrder = 1
            },
            new()
            {
                Name = "Mid Fade + Quiff",
                Slug = "mid-fade-quiff",
                Category = "Fade",
                Description = "Versatile mid-skin fade with a textured, upswept quiff.",
                PromptDetails = "Mid-level skin fade on sides and back, sharp transitions, textured quiff swept upward and slightly back at the front with natural matte finish and believable density.",
                ProviderMode = "freeform",
                ProviderStyle = "short_hair",
                RecommendedFaceShapes = "oval,oblong,heart",
                HairTypes = "straight,wavy",
                Length = "medium",
                MaintenanceLevel = "medium",
                SortOrder = 2
            },
            new()
            {
                Name = "High Fade + Pompadour",
                Slug = "high-fade-pompadour",
                Category = "Fade",
                Description = "Bold high skin fade contrasting with a classic high-volume pompadour.",
                PromptDetails = "High skin fade starting above temples, high-volume pompadour swept smoothly up and back, clean edges, subtle natural shine, realistic scalp transition.",
                ProviderMode = "freeform",
                ProviderStyle = "short_hair",
                RecommendedFaceShapes = "oval,square",
                HairTypes = "straight,wavy",
                Length = "medium",
                MaintenanceLevel = "high",
                SortOrder = 3
            },
            new()
            {
                Name = "Low Taper + Side Part",
                Slug = "low-taper-side-part",
                Category = "Classic",
                Description = "Sharp gentlemen's defined side part with a subtle low taper.",
                PromptDetails = "Classic defined hard side part with combed-over top, low subtle taper at sideburns and neckline, natural hair volume and polished finish.",
                ProviderMode = "structured",
                ProviderStyle = "side_part",
                RecommendedFaceShapes = "oval,oblong,diamond",
                HairTypes = "straight,wavy",
                Length = "medium",
                MaintenanceLevel = "medium",
                SortOrder = 4
            },
            new()
            {
                Name = "French Crop",
                Slug = "french-crop",
                Category = "Crop",
                Description = "Authoritative horizontal blunt fringe with tight tapered sides.",
                PromptDetails = "Short French crop with a defined horizontal blunt fringe across forehead, high skin fade on sides, textured top with natural separation.",
                ProviderMode = "freeform",
                ProviderStyle = "short_hair",
                RecommendedFaceShapes = "oblong,heart,diamond",
                HairTypes = "straight,wavy",
                Length = "short",
                MaintenanceLevel = "low",
                SortOrder = 5
            },
            new()
            {
                Name = "Crew Cut",
                Slug = "crew-cut",
                Category = "Classic",
                Description = "Clean, low-maintenance military-inspired crew cut with textured top.",
                PromptDetails = "Classic crew cut, slightly longer on top with subtle texture, tapering cleanly down to short faded sides and clean hairline.",
                ProviderMode = "freeform",
                ProviderStyle = "short_hair",
                RecommendedFaceShapes = "oval,square,diamond",
                HairTypes = "straight,wavy,coily",
                Length = "short",
                MaintenanceLevel = "low",
                SortOrder = 6
            },
            new()
            {
                Name = "Buzz Cut",
                Slug = "buzz-cut",
                Category = "Classic",
                Description = "Ultra-short uniform all-over buzz cut emphasizing facial structure.",
                PromptDetails = "Very short uniform buzz cut (#2 guard equivalent), subtle clean taper at hairline, natural scalp-to-hair transition with visible texture.",
                ProviderMode = "structured",
                ProviderStyle = "buzz_cut",
                RecommendedFaceShapes = "oval,square",
                HairTypes = "straight,wavy,coily",
                Length = "short",
                MaintenanceLevel = "low",
                SortOrder = 7
            },
            new()
            {
                Name = "Slick Back",
                Slug = "slick-back",
                Category = "Classic",
                Description = "Sophisticated swept-back look with clean tapered sides.",
                PromptDetails = "Medium length hair combed straight back with natural flow and texture, tapered sides, sophisticated gentleman styling with natural sheen.",
                ProviderMode = "freeform",
                ProviderStyle = "medium_long_hair",
                RecommendedFaceShapes = "oval,square,diamond",
                HairTypes = "straight,wavy",
                Length = "medium",
                MaintenanceLevel = "medium",
                SortOrder = 8
            },
            new()
            {
                Name = "Curly Top + Fade",
                Slug = "curly-top-fade",
                Category = "Curly",
                Description = "Defined natural curls on top with a clean mid fade on the sides.",
                PromptDetails = "Defined springy natural curls with realistic texture and coil definition on top, blended into a clean mid drop fade on sides and back.",
                ProviderMode = "structured",
                ProviderStyle = "curly_hair",
                RecommendedFaceShapes = "oblong,heart,diamond,oval",
                HairTypes = "curly,coily",
                Length = "medium",
                MaintenanceLevel = "medium",
                SortOrder = 9
            },
            new()
            {
                Name = "Messy Textured Hair",
                Slug = "messy-textured",
                Category = "Modern",
                Description = "Effortless casual messy texture with layered volume and natural movement.",
                PromptDetails = "Medium length piecey textured hair with effortless tousled volume, layered cutting, textured fringe and casual tapered sides.",
                ProviderMode = "freeform",
                ProviderStyle = "medium_long_hair",
                RecommendedFaceShapes = "oval,heart,square",
                HairTypes = "straight,wavy",
                Length = "medium",
                MaintenanceLevel = "medium",
                SortOrder = 10
            },
            new()
            {
                Name = "Medium Layered",
                Slug = "medium-layered",
                Category = "Modern",
                Description = "Versatile medium length flow with soft face-framing layers.",
                PromptDetails = "Medium length layered haircut falling gently around ears and forehead, natural flow, soft texture with realistic strands and movement.",
                ProviderMode = "freeform",
                ProviderStyle = "medium_long_hair",
                RecommendedFaceShapes = "oval,heart,oblong",
                HairTypes = "straight,wavy",
                Length = "medium",
                MaintenanceLevel = "medium",
                SortOrder = 11
            },
            new()
            {
                Name = "Long Wavy",
                Slug = "long-wavy",
                Category = "Long",
                Description = "Lush shoulder-length wavy hair with natural body and bounce.",
                PromptDetails = "Shoulder-length flowing wavy hair with natural volume, soft defined waves, face-framing pieces and healthy realistic sheen.",
                ProviderMode = "structured",
                ProviderStyle = "wavy_hair",
                RecommendedFaceShapes = "oval,square,heart,round",
                HairTypes = "wavy,straight",
                Length = "long",
                MaintenanceLevel = "medium",
                SortOrder = 12
            },
            new()
            {
                Name = "Classic Bob Cut",
                Slug = "bob-cut",
                Category = "Modern",
                Description = "Chic chin-length bob cut with sleek lines and gentle inward taper.",
                PromptDetails = "Classic chin-length bob haircut, clean blunt or softly beveled ends, natural volume, polished and elegant silhouette.",
                ProviderMode = "structured",
                ProviderStyle = "bob_cut",
                RecommendedFaceShapes = "oval,heart,diamond",
                HairTypes = "straight,wavy",
                Length = "short",
                MaintenanceLevel = "medium",
                SortOrder = 13
            },
            new()
            {
                Name = "Pixie Cut",
                Slug = "pixie-cut",
                Category = "Modern",
                Description = "Bold, chic short pixie cut with soft textured layers around the crown.",
                PromptDetails = "Feminine cropped pixie cut with soft textured top layers, delicately tapered sides and nape, emphasizing facial features.",
                ProviderMode = "structured",
                ProviderStyle = "pixie_cut",
                RecommendedFaceShapes = "oval,heart,round",
                HairTypes = "straight,wavy",
                Length = "short",
                MaintenanceLevel = "low",
                SortOrder = 14
            },
            new()
            {
                Name = "Classic Braids",
                Slug = "braids",
                Category = "Braids",
                Description = "Neat, stylish braids with crisp parting and uniform tension.",
                PromptDetails = "Clean, neatly sectioned braids with crisp scalp partings, uniform braid pattern, realistic hair luster and tidy hairline.",
                ProviderMode = "structured",
                ProviderStyle = "braids",
                RecommendedFaceShapes = "oval,square,heart,diamond",
                HairTypes = "coily,curly,straight",
                Length = "long",
                MaintenanceLevel = "low",
                SortOrder = 15
            }
        };

        await db.Hairstyles.AddRangeAsync(hairstyles);
        await db.SaveChangesAsync();
    }
}
