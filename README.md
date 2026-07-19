# Linguist

An offline-friendly book translation tool supporting PDF, TXT, and EPUB files. No API keys required — translation runs entirely via a direct algorithmic engine with a free Google Translate fallback.

---

## Features

- **Multi-format support** — Upload PDF, TXT, EPUB (with chapter navigation) and image files
- **Offline translation** — Built-in dictionary and heuristic suffix rules for English, Spanish, French, German, Italian, and Latin
- **Online fallback** — Automatic Google Translate API integration when offline mode is unavailable
- **Chapter-by-chapter** — EPUB chapter navigation with optional full-book sequential translation
- **Export** — Download translated content as TXT, styled PDF, or standards-compliant EPUB
- **OCR** — Image text extraction and translation (requires server-side OCR support)
- **Formatting presets** — Clean spacing, novel indentation, and Markdown output modes

## Getting Started

### Prerequisites

- Node.js >= 18

### Install & Run

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```sh
npm run build
npm start
```

---

## How It Works

1. **Upload** a manuscript (PDF, EPUB, TXT, or image)
2. **Select** target language
3. **Translate** — the engine first tries Google Translate (free, no key), then falls back to offline algorithmic translation
4. **Export** — download the result as TXT, styled PDF, or EPUB

## Supported Languages

Translation is available to/from any language supported by Google Translate. Offline mode (when the network is blocked) supports:

| Language | Code |
|----------|------|
| English  | en   |
| Spanish  | es   |
| French   | fr   |
| German   | de   |
| Italian  | it   |
| Latin    | la   |

## Scripts

| Command           | Description                        |
|-------------------|------------------------------------|
| `npm run dev`     | Start dev server (hot reload)      |
| `npm run build`   | Build frontend + bundle server     |
| `npm start`       | Run production server              |
| `npm run lint`    | Type-check with TypeScript         |
| `npm run clean`   | Remove dist/ and build artifacts   |

## Deploy on Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New +** → **Web Service**
3. Connect your GitHub repo
4. Use these settings:

   | Setting | Value |
   |---------|-------|
   | **Name** | `linguist` |
   | **Region** | Choose closest |
   | **Branch** | `main` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Plan** | **Free** |

5. Click **Create Web Service**

It'll deploy in a few minutes. Free tier spins down after 15 min of inactivity — first request after idle takes ~30s to wake up.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, Lucide icons
- **Backend:** Express, pdf-parse, jsPDF, JSZip
- **Language:** TypeScript

## License

MIT
