namespace Aura.Api.Options;

public class GeminiOptions
{
    public const string Section = "Gemini";

    /// <summary>Gemini API key — kept for future fallback use.</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Model name for image-editing.</summary>
    public string Model { get; set; } = "gemini-3.1-flash-image";

    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";

    public int MaxRetries { get; set; } = 2;

    public int TimeoutSeconds { get; set; } = 120;
}

public class FalOptions
{
    public const string Section = "Fal";

    /// <summary>
    /// fal.ai API key — get from https://fal.ai/dashboard/keys
    /// Set via environment variable Fal__ApiKey or appsettings.json.
    /// NEVER expose this in frontend code or VITE_* variables.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Timeout in seconds for the full fal.ai job (upload + generation + polling).</summary>
    public int TimeoutSeconds { get; set; } = 120;
}

public class StorageOptions
{
    public const string Section = "Storage";

    /// <summary>local | cloudinary | s3</summary>
    public string Provider { get; set; } = "local";

    /// <summary>Base URL for serving uploaded images (local provider only).</summary>
    public string LocalBaseUrl { get; set; } = "/uploads";

    // Cloudinary settings (optional)
    public string CloudName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
}

public class OpenAiOptions
{
    public const string Section = "OpenAI";

    /// <summary>OpenAI API key (sk-proj-...).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Model to use for image editing.
    /// gpt-image-1 supports image input + editing via the /v1/images/edits endpoint.
    /// </summary>
    public string Model { get; set; } = "gpt-image-1";

    public int TimeoutSeconds { get; set; } = 120;
}

public class HuggingFaceOptions
{
    public const string Section = "HuggingFace";

    /// <summary>
    /// Free HuggingFace API token.
    /// Get one free at: https://huggingface.co → Settings → Access Tokens → New Token (read).
    /// No credit card needed — ever.
    /// </summary>
    public string ApiToken { get; set; } = string.Empty;

    /// <summary>
    /// HuggingFace model to use for image editing.
    /// Default: timbrooks/instruct-pix2pix (instruction-based image editing).
    /// </summary>
    public string Model { get; set; } = "timbrooks/instruct-pix2pix";

    /// <summary>Number of diffusion steps. Higher = better quality but slower. Default: 20.</summary>
    public int InferenceSteps { get; set; } = 20;

    public int TimeoutSeconds { get; set; } = 120;
}

public class CloudflareAiOptions
{
    public const string Section = "CloudflareAi";

    /// <summary>
    /// Your Cloudflare Account ID.
    /// Find it at: https://dash.cloudflare.com → Workers &amp; Pages → Account ID (right panel).
    /// </summary>
    public string AccountId { get; set; } = string.Empty;

    /// <summary>
    /// Cloudflare API Token with Workers AI permission.
    /// Create at: Profile → API Tokens → Create Token → "Workers AI" template.
    /// FREE: 10,000 neurons/day — no credit card needed.
    /// </summary>
    public string ApiToken { get; set; } = string.Empty;

    /// <summary>How much to change the image. 0 = no change, 1 = full change. Default: 0.65</summary>
    public float Strength { get; set; } = 0.65f;

    /// <summary>Number of diffusion steps. Default: 20.</summary>
    public int NumSteps { get; set; } = 20;

    /// <summary>Classifier-free guidance scale. Default: 7.5</summary>
    public float Guidance { get; set; } = 7.5f;

    public int TimeoutSeconds { get; set; } = 120;
}



