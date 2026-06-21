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
  <img src="https://img.shields.io/badge/Framer_Motion-12-EF4177?style=for-the-badge&logo=framer" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000?style=for-the-badge&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## 📖 About & My Journey

ToonPlayer is a high-performance, cinematic-quality content aggregator that lets users discover and stream anime, movies, and TV shows — all from a single, ad-free interface. Inspired by Netflix, Crunchyroll, Apple TV+, Plex, and Stremio, it aggregates video sources from multiple providers, applies an intelligent server-scanning pipeline, and delivers content through a sandboxed proxy player that blocks popups and malicious redirects.

**My Journey (Jan 2026 - June 2026)**
Building ToonPlayer took 5 months of continuous iteration and learning. What started in January as a basic layout experiment quickly evolved into a massive, feature-rich platform. I spent months perfecting the architecture, battling API rate limits, fine-tuning the video proxies, and striving for a "100% UI/UX/Performance" score. This project represents my dedication to creating a premium, Netflix-quality experience entirely from scratch.

---

## 🏆 Changelog — v5.0 (Latest)

### Phase 10 — Final Production Release Candidate (`June 2026`)
- 🚀 **Anime Scraping Rewrite**: Completely replaced unstable HTML scraping (Aniwave, HiAnime, Consumet) on the homepage with the highly stable **AniList GraphQL API**. The Anime tab is now 100% resilient to breakage and maps seamlessly to the streaming proxy backend.
- 🎨 **UI Standardization**: Global conversion of hardcoded colors (e.g. `bg-zinc-900`) to dynamic CSS variables (`bg-[var(--bg-elevated)]`) for perfect theme switching.
- ♿ **Accessibility (a11y)**: Added `aria-label`s, explicit focus rings, and proper `<h1>` / `<h2>` document structure across all components.
- 📦 **Optimization**: Purged all legacy `<img>` tags in favor of optimized `next/image` with strict sizing and `priority` preloading.

### Phase 6 — Watch History & Watchlist (`May 2026`)
- 🕓 **Premium Watch History**: Virtualized infinite scroll with Day / Week / Month grouping, animated collapsible sections, animated progress bars with "Completed" (≥90%) badges, Rewatch vs Resume smart labeling, Bulk Select + Select All, JSON Export, type filter chips, toast-based confirmations (no native `confirm()`), and a premium animated empty state.
- 📌 **Premium Watchlist**: Framer Motion `Reorder.Group` drag-and-drop list reordering with GripVertical handle, inline tag editor (no `prompt()` — keyboard Enter/Escape support), grid collection picker dropdown, folder tabs with item counts (Favorites, To Watch, Completed + custom), type filter chips, tag filter pills, Sort by Date / A–Z / Type, and animated empty state with floating decorators.
- 🗂️ **WatchContext Upgrade**: `WatchlistItem` now carries `collection`, `tags`, and `order` fields; new `updateWatchlistItem`, `reorderWatchlist`, `bulkRemoveFromHistory` context methods; `customCollections` persisted separately in localStorage; `normalizeWatchlistItem` helper for backward compatibility.

### Phase 5 — AI Discovery (`April 2026`)
- 🤖 **Conversational AI Chat**: Full ChatGPT/Perplexity-style conversational UI with multi-turn chat memory — every follow-up query includes prior message context.
- 🎙️ **Voice Search**: Web Speech API integration directly in the input bar — click mic or hold `Space` to dictate.
- 🃏 **Mood Prompt Cards**: 8 curated glassmorphic cards (Cyberpunk, Sad Anime, Studio Ghibli, Mind Bending, K-Drama, Hidden Gems, Action-Packed, Romance) that inject styled prompts into the chat.
- 📜 **Search History**: Recent searches persisted in localStorage with one-click re-query.
- ⏱️ **Dynamic Loading Logs**: Animated step-by-step progress indicators while AI processes your request.
- ⌨️ **Ctrl+K Integration**: AI Discovery accessible directly from the global Command Palette.

### Phase 4 — Randomizer (`March 2026`)
- 🎲 **Device Parity Fix**: Randomizer no longer hidden behind `md:hidden` / `lg:hidden` — rendered on all screen sizes.
- 🔘 **Global Floating FAB**: Bottom-right `RandomizerFloatingTrigger` persists on every page for instant access.
- 🎠 **Hero CTA Buttons**: "Surprise Me" buttons added to HeroCarousel and MovieHeroCarousel.
- ⌨️ **Keyboard Shortcut**: Press `R` anywhere to open the Randomizer modal.
- 🔧 **Framer Motion Fix**: Exit animations fixed — `AnimatePresence` moved to `LayoutContent.tsx` wrapper instead of inside the modal.

### Phase 3 — Browse Catalog (`February 2026`)
- 🎛️ **Slide-Over Filter Drawer**: Right-side glassmorphic filter panel with backdrop overlay and spring animations.
- 🏷️ **Interactive Filter Chips**: Genre, Year (slider track), Language, Region, Network — all converted from dropdowns to visual chips.
- 📦 **Card Virtualization**: `content-visibility: auto` + `contain-intrinsic-size` for native GPU-level list virtualization.
- 🦴 **Zero-CLS Skeletons**: Skeleton cards match exact card height, border-radius, aspect ratio, and metadata spacing.
- ♾️ **Improved Infinite Scroll**: Fail-safe `error` guard on the IntersectionObserver prevents infinite retry loops; "End of Catalog" pill shown when all pages are fetched.
- 🚫 **Double Scrollbar Fix**: Replaced nested `<main>` layout with single scroll container.

### Phase 2 — Homepage (`January 2026`)
- 🎬 **Hero Carousel**: Auto-cycling fullscreen hero with `70vh` max-height cap, background blur, gradient overlay, mute/unmute, random hero selection, and animated progress indicators.
- ⏭️ **Continue Watching Row**: Horizontal progress bars, episode metadata, and one-click resume.
- 📊 **Smart Sections**: Trending, Top Picks, Top Anime Collections — all with skeleton loading states.

### Phase 1 — Global Layout (`January 2026`)
- 📐 **Tested on 375px → 3840px**: All pages verified at 1920, 2560, 3440, 3840 (desktop) and 375, 390, 412, 430 (mobile).
- 🧱 **Sidebar z-index stack** fixed — no content overlap on any breakpoint.
- 📏 **Consistent padding system** — 4px grid across all pages.
- 🔒 **Overflow & CLS fixes** — `overflow-x: hidden` on `html`/`body`, no double scrollbars.

---

## ✨ Full Feature Matrix

| Category | Feature |
|---|---|
| 🎬 **Streaming** | Multi-server auto-scan with 8.5s timeout fallback chains — finds working streams in seconds |
| 🛡️ **Ad-Free** | Aggressive iframe sandboxing (`sandbox` + CSP) blocks all popups, redirects, and overlay ads |
| ▶️ **Playback** | Autoplay, auto-unmute, and seamless auto-next-episode across all providers |
| 📺 **Cast** | Chromecast & AirPlay support via ArtPlayer plugin |
| 🤖 **AI Discovery** | Conversational natural language search with multi-turn memory, voice input, mood cards, and history |
| 🎌 **Anime** | Full anime catalog from multiple providers (Aniwaves, HiAnime, AllAnime) |
| 🎲 **Randomizer** | Surprise Me — random movie, anime, genre, year, studio, or top-rated pick from any page |
| ⌨️ **Command Palette** | Ctrl+K global search with quick-access shortcuts to all major features |
| 🕓 **Watch History** | Virtualized, grouped (Day/Week/Month), progress bars, bulk delete, export JSON |
| 📌 **Watchlist** | Folders, collections, custom tags, drag-and-drop reorder, grid/list view |
| 👤 **Profiles** | JWT-based auth with MongoDB — history & favorites sync across devices |
| 🔔 **Push Notifications** | Web Push via VAPID keys — alerts for new episode drops |
| 📱 **Mobile PWA** | Fully responsive — Lighthouse 95+ on mobile; Android APK via Capacitor |
| ⚡ **Performance** | Edge caching, ISR, static pre-generation, `content-visibility: auto` virtualization |
| 🔒 **Security** | Rate limiting, input sanitization (Zod), bcrypt hashing, HTTP-only JWT cookies |
| 🌐 **SEO** | Dynamic sitemaps, structured meta tags, Open Graph, canonical URLs, robots.txt |

---

## 🛠️ Tech Stack

```
Frontend        → Next.js 16, React 19, Tailwind CSS 4, Framer Motion 12
Video Players   → ArtPlayer, HLS.js, VidStack
Backend/API     → Next.js API Routes (serverless), Cheerio (scraping), Axios
Database        → MongoDB Atlas (Mongoose ODM)
Auth            → Custom JWT (jose) + bcryptjs
Push            → Web Push API + VAPID (web-push)
AI              → Google Gemini API (conversational recommendations)
State           → React Context API (WatchContext, NotificationContext, AdBlockContext)
Animations      → Framer Motion (Reorder, AnimatePresence, motion.div, useDragControls)
Deployment      → Vercel (primary), Cloudflare (optional via OpenNext)
Mobile          → Capacitor (Android APK)
Monitoring      → Vercel Analytics, Speed Insights, Puppeteer automated audits
```

---

## 📂 Project Structure

```
anime-web/
├── public/                  # Static assets, service worker, logo, icons
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
│   │   │   ├── user/        # History, favorites, watchlist, profile sync
│   │   │   ├── discover/    # AI-powered recommendation engine (Gemini)
│   │   │   └── subscribe/   # Web Push subscription
│   │   ├── watch/           # Video player pages (movie/TV & anime)
│   │   ├── browse/          # Browse catalog with filter drawer
│   │   ├── search/          # Unified search with genre filters
│   │   ├── discover/        # AI Discovery conversational UI
│   │   ├── history/         # Watch History — grouped, virtualized, export
│   │   ├── watchlist/       # Watchlist — folders, tags, drag reorder
│   │   ├── genres/          # Genre browser
│   │   ├── profile/         # User profile dashboard
│   │   ├── error.tsx        # Global error boundary
│   │   └── not-found.tsx    # Custom 404 page
│   ├── components/          # Reusable UI components
│   │   ├── HeroCarousel.tsx          # Full-screen hero with trailer autoplay
│   │   ├── MovieHeroCarousel.tsx     # Movie-specific hero carousel
│   │   ├── CommandPalette.tsx        # Ctrl+K global command palette
│   │   ├── RandomizerModal.tsx       # Surprise Me randomizer modal
│   │   ├── RandomizerFloatingTrigger.tsx  # Global floating FAB trigger
│   │   ├── ContinueWatchingRow.tsx   # Resume watching horizontal row
│   │   ├── MovieCard.tsx             # Virtualized, GPU-accelerated card
│   │   ├── SkeletonLoader.tsx        # Zero-CLS matched skeleton cards
│   │   ├── MobileNav.tsx             # Bottom navigation bar
│   │   ├── DesktopSidebar.tsx        # Collapsible left sidebar
│   │   └── LayoutContent.tsx         # Global layout wrapper
│   ├── context/             # React contexts
│   │   ├── WatchContext.tsx          # History, watchlist, collections, tags
│   │   ├── NotificationContext.tsx   # Push notification state
│   │   └── AdBlockContext.tsx        # Ad-block detection
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core utilities
│   │   ├── providers/       # Anime provider adapters (Aniwaves, HiAnime, AllAnime)
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
- A free **MongoDB Atlas** cluster (optional — auth features disabled without it)

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

# Google Gemini API (for AI Discovery)
GEMINI_API_KEY=your_gemini_api_key
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
3. Add your environment variables in Vercel Dashboard → Settings → Environment Variables.
4. Every push to `main` triggers an automatic deployment.

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

# Production build
npm run build

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
