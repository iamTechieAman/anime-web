<p align="center">
  <img src="public/logo.webp" alt="ToonPlayer Logo" width="80" />
</p>

<h1 align="center">ToonPlayer</h1>
<p align="center">
  <strong>Free Anime & Movies Streaming Aggregator</strong>
</p>

<p align="center">
  <a href="https://toonplayer.in"><img src="https://img.shields.io/badge/Live-toonplayer.in-blueviolet?style=for-the-badge" alt="Live Site" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000?style=for-the-badge&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## 📖 About

ToonPlayer is a high-performance content aggregator that lets users discover and stream anime, movies, and TV shows — all from a single, ad-free interface. It aggregates video sources from multiple providers, applies an intelligent server-scanning pipeline, and delivers content through a sandboxed proxy player that blocks popups and malicious redirects.

### 🏆 Recent Releases & Major System Upgrades (v4.0+)

- 🚀 **Centralized Self-Healing Stream Provider Engine (v4.0)**: Built-in automated provider health checking, smart loading timeout rotators (8.5-second fallback triggers), Axios-level failover chains, silent mirror redirections, and unified notification toast alerts.
- 🎨 **Premium UI Optimization & Crunchyroll-Style Polish**: GPU hardware-accelerated transforms (`translate3d(0, -6px, 0)`), 15-20% vertical spacing compression for massive above-the-fold catalog visibility, custom 3-column CSS Grid navbar layout, and increased sidebar z-index stack handling (`z-[60]`) to completely remove content overlapping.

---

## ✨ Features

| Category | Feature |
|---|---|
| 🎬 **Streaming** | Multi-server auto-scan with smart fallback — finds a working stream in seconds |
| 🛡️ **Ad-Free** | Aggressive iframe sandboxing blocks all popups, redirects, and overlay ads |
| ▶️ **Playback** | Autoplay, auto-unmute, and seamless auto-next-episode across all servers |
| 📺 **Cast** | Chromecast & AirPlay support via ArtPlayer plugin |
| 🔍 **AI Discovery** | Natural language search — describe what you want to watch and get smart recommendations |
| 🎌 **Anime** | Full anime catalog scraped from multiple providers (Aniwaves, HiAnime, AllAnime) |
| 👤 **Profiles** | JWT-based authentication with MongoDB — watch history & favorites sync across devices |
| 🔔 **Push Notifications** | Web Push via VAPID keys — get notified when new episodes drop |
| 📱 **Mobile** | Fully responsive PWA with native Android APK available via Capacitor |
| ⚡ **Performance** | Edge caching, ISR, static data pre-generation — optimized for Vercel Free Tier |
| 🔒 **Security** | Rate limiting, input sanitization (Zod), bcrypt hashing, HTTP-only JWT cookies |
| 🌐 **SEO** | Dynamic sitemaps, structured meta tags, canonical URLs, robots.txt |

---

## 🛠️ Tech Stack

```
Frontend        → Next.js 16, React 19, Tailwind CSS 4, Framer Motion
Video Players   → ArtPlayer, HLS.js, VidStack
Backend/API     → Next.js API Routes (serverless), Cheerio (scraping), Axios
Database        → MongoDB Atlas (Mongoose ODM)
Auth            → Custom JWT (jose) + bcryptjs
Push            → Web Push API + VAPID (web-push)
Deployment      → Vercel (primary), Cloudflare (optional via OpenNext)
Mobile          → Capacitor (Android APK)
Monitoring      → Vercel Analytics, Speed Insights, Puppeteer automated audits
```

---

## 📂 Project Structure

```
anime-web/
├── public/                  # Static assets, service worker, logo
├── scripts/                 # Build-time helpers & dev tools
│   ├── generate-static-data.js   # Pre-fetches data at build time
│   ├── generate-keys.js          # VAPID key generator
│   ├── health-check.js           # Production endpoint tester
│   ├── notify-users.js           # Push notification dispatcher
│   └── puppeteer-audit.js        # Automated browser audit
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/             # All backend endpoints
│   │   │   ├── anime/       # Anime scraping APIs (home, search, genre, servers, source)
│   │   │   ├── auth/        # Login & registration (MongoDB + JWT)
│   │   │   ├── prime/       # TMDB movie/TV APIs
│   │   │   ├── user/        # History, favorites, profile sync
│   │   │   ├── discover/    # AI-powered recommendation engine
│   │   │   └── subscribe/   # Web Push subscription
│   │   ├── watch/           # Video player pages (movie/TV & anime)
│   │   ├── search/          # Unified search with genre filters
│   │   ├── discover/        # AI Discovery UI
│   │   ├── profile/         # User profile dashboard
│   │   ├── error.tsx        # Global error boundary
│   │   └── not-found.tsx    # Custom 404 page
│   ├── components/          # Reusable UI components
│   ├── context/             # React contexts (Watch, Notifications, AdBlock)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core utilities
│   │   ├── providers/       # Anime provider adapters (Aniwaves, HiAnime, AllAnime, etc.)
│   │   ├── db.ts            # MongoDB connection singleton
│   │   ├── auth.ts          # JWT sign/verify
│   │   ├── security.ts      # Rate limiting & event logging
│   │   └── scraper-client.ts # Unified scraper interface
│   └── models/              # Mongoose schemas (User)
├── vercel.json              # Edge caching & deployment config
├── .env.local               # Environment variables (not committed)
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A free **MongoDB Atlas** cluster (optional — the app works without it, auth features will be disabled)

### Installation

```bash
# Clone the repository
git clone https://github.com/iamTechieAman/anime-web.git
cd anime-web

# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local   # Or create manually (see below)
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Database (free tier: https://cloud.mongodb.com)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/toonplayer

# Authentication
JWT_SECRET=your-random-secret-string-here

# Push Notifications — generate with: node scripts/generate-keys.js
NEXT_PUBLIC_VAPID_KEY=
VAPID_PRIVATE_KEY=

# TMDB API (default key included, but you can use your own)
TMDB_API_KEY=your_tmdb_api_key
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## ☁️ Deployment (Vercel)

1. Push your code to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Add your environment variables in the Vercel Dashboard → Settings → Environment Variables.
4. Every push to `main` will trigger an automatic deployment.

**Manual deploy via CLI:**
```bash
npx vercel --prod
```

---

## 🧪 Health Checks & Testing

```bash
# TypeScript type-check
npx tsc --noEmit

# Lint
npm run lint

# Production API health check
node scripts/health-check.js

# Full browser audit (requires Chrome)
node scripts/puppeteer-audit.js

# Generate VAPID keys for push notifications
node scripts/generate-keys.js
```

---

## 🤝 Contributing

Contributions are welcome! Please read our guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to your branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

---

## ⚠️ Disclaimer

> ToonPlayer is a **content aggregator** built for **educational and research purposes only**. It does not host, store, or distribute any copyrighted media. All video streams are sourced from third-party providers and are displayed via publicly accessible embeds. The developers are not responsible for any content served by external sources.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/iamTechieAman">Aman Kumar</a>
</p>
