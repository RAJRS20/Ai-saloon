# Aura AI — Realistic Hairstyle Virtual Try-On

> See yourself with any hairstyle — powered by Google Gemini AI

**Aura AI** is a full-stack hairstyle virtual try-on platform. Upload or capture a portrait, select a haircut, and get a photorealistic AI-generated result in seconds — with your identity fully preserved.

---

## ✨ Features

- 📸 **Camera capture** with real-time MediaPipe face guidance
- 🖼️ **Photo upload** fallback (JPG, PNG, WebP up to 20MB)
- ✂️ **12+ curated hairstyles** — Fades, Crops, Classics, Long, Curly
- 🤖 **Gemini image-editing AI** — photorealistic transformations
- ↔️ **Before/after comparison slider**
- 🔄 **Regenerate** with one click
- ⬇️ **Download** your result
- 🔐 **JWT authentication** (optional)

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Face Analysis | MediaPipe Face Landmarker |
| Backend | ASP.NET Core 8 Web API |
| Database | SQL Server + EF Core |
| AI | Google Gemini Image Editing API |
| Storage | Local filesystem (MVP) → Cloudinary/S3 |
| Auth | JWT + ASP.NET Core Identity |

---

## 🚀 Quick Start

### Prerequisites
- Node.js LTS
- .NET 8 SDK
- SQL Server or SQL Server LocalDB (ships with Visual Studio 2022)
- A **Gemini API key** from [aistudio.google.com](https://aistudio.google.com)

### 1. Frontend

```bash
cd aura-frontend
npm install
npm run dev
# → http://localhost:5173
```

### 2. Backend

First, set your Gemini API key in `Aura.Api/appsettings.Development.json`:

```json
{
  "Gemini": {
    "ApiKey": "YOUR_GEMINI_API_KEY_HERE"
  }
}
```

Then:

```bash
cd Aura.Api
dotnet restore
dotnet ef database update    # creates the database + seeds hairstyles
dotnet run
# → http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

---

## 📁 Project Structure

```
Ai-saloon/
├── aura-frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/          # CameraCapture, FaceGuide, HairstyleCard, BeforeAfter, GenerationProgress
│   │   ├── pages/               # Home, TryOn, Result
│   │   ├── services/            # api.ts, hairstyleService.ts
│   │   ├── hooks/               # useFaceLandmarker.ts
│   │   └── types/               # hairstyle.ts
│   └── vite.config.ts
│
└── Aura.Api/                    # ASP.NET Core 8
    ├── Controllers/             # HairstyleController, TryOnController, AuthController
    ├── Services/                # GeminiImageService, TryOnService, HairstyleService, ImageStorageService
    ├── Data/                    # AppDbContext, SeedData
    ├── Models/                  # Hairstyle, TryOnJob, ApplicationUser
    ├── DTOs/                    # Request/Response DTOs
    ├── Options/                 # GeminiOptions, StorageOptions
    └── Program.cs
```

---

## 🔒 Security Notes

- The Gemini API key is **never exposed to the frontend**
- All generation is server-side only
- Use HTTPS in production
- Set a strong `Jwt:Secret` in production
- Images are stored locally (MVP) — configure Cloudinary/S3 for production

---

## 🗺️ Roadmap

- [x] Phase 1: Foundation (frontend + backend scaffold)
- [x] Phase 2: Camera capture with MediaPipe guidance
- [x] Phase 3: Hairstyle catalog
- [x] Phase 4: Gemini AI integration
- [x] Phase 5: Before/after result viewer
- [ ] Phase 6: User accounts + history
- [ ] Phase 7: Cloudinary/S3 image storage
- [ ] Phase 8: Production deployment (Vercel + Azure)
- [ ] Phase 9: Real-time AR hairstyle overlay

---

## 📄 License

MIT
