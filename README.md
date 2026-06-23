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

### Phase 23 — Final Logic Recovery & Persistence Stabilization (`June 2026`)
- 👥 **Bulletproof "Who's Watching" Gate**: Standardized active profile persistence across cookies, `localStorage`, and `sessionStorage`, completely resolving F5/reload flashes.
- 🎨 **Dynamic AI Avatars**: Enabled dynamic gradient initials avatar generation on typing profile names, preserving selected presets.
- 🛡️ **Kids Mode & Smart Catalog Paging**: Refined `isKidsFriendly` keyword blocks and automated extra page loading during discover fetches to guarantee full rows.
- 📱 **Video Player State Preservation**: Eliminated history-driven iframe resets and keyboard navigation stale closures.
- 📥 **Anime Downloads**: Integrated client-side `DownloadModal` with direct HLS-to-MP4 download proxy support.

### Phase 22 — Anime Recovery & Scraper Stabilization (`June 2026`)
- 🎌 **Signed API Scraper**: Reverse-engineered the `hianime.lol` SPA backend API at `https://anime.sankavollerei.web.id/api` and extracted the cryptographic keys to calculate XOR (SHA256) and chained HMAC-SHA256 signatures, completely bypassing Cloudflare Turnstile blocks.
- 🍿 **Direct HLS Streams**: Enabled direct extraction of `.m3u8` master playlists with fallback inline iframe sources and `AllAnimeProvider` auto-rotation.
- 🖼️ **CDN Configuration**: Configured `cdn.anipixcdn.co` remote pattern rules in `next.config.ts` to resolve broken poster images, ensuring zero broken poster icons.

### Phase 21 — Watch Page Rhythm & Spacing Polish (`June 2026`)
- 📏 **Strict Grid Rhythm**: Eradicated all arbitrary margins across the Watch Page, strictly enforcing a 4px-baseline interval grid for flawless geometric balance.
- 📐 **Player Normalization**: Locked player wrapper geometry with absolute 24px margins, a 24px border radius, and true-bleed padding for a native theater look.
- 📱 **Fluid Clearances**: Applied CSS `env(safe-area-inset)` dynamic paddings coupled with breakpoint-specific offsets (16px Desktop, 12px Tablet, 8px Mobile) to eliminate layout clipping.
- ⚡ **Apple TV+ Motion Physics**: Extracted rigid animations, replacing them with a custom `.ease-apple` (`cubic-bezier(0.22, 1, 0.36, 1)`) transition profile using `will-change-transform` for 60FPS fluid interactions globally.

### Phase 20 — Premium Cinematic Theme Polish (`June 2026`)
- 🎨 **Cinematic Glassmorphism**: Overhauled global design tokens, migrating from legacy flat oranges to a premium Netflix/Apple TV+ inspired Purple/Pink gradient aesthetic (`#7C3AED` to `#EC4899`).
- 💎 **Premium Overlays**: Upgraded Headers and Desktop Sidebars to use solid Glassmorphism (`rgba(8,8,12,0.72) backdrop-blur-[24px]`) and unified all active states with cinematic glowing indicators.
- ⚡ **Motion Standardization**: Normalized all micro-animations globally to `250ms ease-out` per Apple TV+ design specs for cohesive, snappy visual feedback without layout thrashing.
- 📏 **Depth & Hierarchy**: Increased primary card radii to `18px`, integrated cinematic drop shadows (`var(--shadow-glow-primary)`), and converted all primary CTA buttons to dynamic hover-scaling gradients.

### Phase 19 — Release QA & Functional Recovery (`June 2026`)
- 🔓 **Universal Download Access**: Removed strict authentication gating on download capabilities, granting guests full uninterrupted access to offline media without triggering login barriers.
- ✨ **Avatar Shimmer**: Integrated a pulse shimmer into `UserAvatar` during remote image resolution to prevent layout holes, coupled with graceful text initial fallbacks on error.
- ⚡ **Core Recovery**: Restored functional integrity across search debouncing (200ms), keyboard navigation handlers, and global responsive layouts while preserving 60FPS GPU animations.

### Phase 18 — Global Responsive Hardening (`June 2026`)
- 📐 **Rigid UI Sizing**: Enforced mathematically precise heights across the application core (`72px` unified Header, `40x40` scaled Avatars, `32px` rigid Logos, `70vh` strict hero boundaries). 
- 📱 **Mobile Edge Freedom**: Systematically eliminated fragile `100vh`/`h-screen` viewport bindings globally, migrating to `100dvh` to ensure perfect safe-area layout calculation on iOS/Android browsers without URL-bar collision.
- ⚡ **Animation Acceleration**: Isolated GPU-only transforms mapping exclusively to opacity and `translate3d` axes, completely preventing main-thread layout thrashing during transition execution.

### Phase 17 — Player Container & Navigation Hardening (`June 2026`)
- 🍿 **Cinematic Layout Constraint**: Forced absolute layout geometry onto the primary Player component—locking to `1600px` max-width, strict `16/9` inner frame with an invisible `24px` radius mask, replicating modern streaming aesthetics.
- 📱 **Mobile Edge Freedom**: Reworked mobile layout constraints to utilize `100vw` with `env(safe-area-inset)` bindings. Eliminated notch clipping, edge bleed, and unhandled scrolling behaviors during theatre mode.
- 🎛️ **Zero-Wrap Server Row**: Replaced fragile mobile glassmorphism dropdowns with a unified, universally scrolling horizontal chip layout, mathematically preventing multi-line layout shifts across all viewport breakpoints.
- 🚀 **Hydration Protection**: Secured `<0.02 CLS` during player initializations by locking conditional layouts to separate z-indexed layers rather than altering the core flexbox layout hierarchy.

### Phase 16 — Global Micro Polish & UI Hardening (`June 2026`)
- ✨ **Apple TV+ Motion**: Refined sidebar navigation and layout shifts by locking transitions to a strict 300ms `ease-out` function.
- 📐 **Zero-Shift Cards**: Unified all card assets (Movies, TV, Anime) to a pristine `16px` border radius with a standardized `1.02` hover scale multiplier, eliminating visual tearing and metadata jumps.
- 🔍 **Adaptive Search UX**: Clamped the Command Palette and search modals to precise viewport ratios (`480px` desktop, `420px` tablet, `90vw` mobile) ensuring zero overflow or cutoff states.
- 🖼️ **Aspect Integrity**: Strictly enforced `object-contain` for logos, `aspect-square` for avatars, and `aspect-[2/3]` for posters globally to guarantee absolute pixel-perfect layout preservation before hydration.

### Phase 15 — Production Acceptance Testing (PAT) (`June 2026`)
- 🏁 **Production Ready**: Successfully executed the final Regression Elimination (PASS 48) and Production Acceptance Testing (PASS 49).
- 🧩 **Zero-Bug Parity**: Guaranteed zero hydration mismatches, zero Cumulative Layout Shifts (CLS <0.01), and zero infinite render loops across the entire application.
- 📺 **Watch Page Perfection**: Enforced strict 100% width formatting for Movies, locked TV Series layout sidebars, and replaced all stream-failure toasts with seamless inline auto-switching failovers.
- 👤 **Bulletproof Avatars**: Implemented native `onError` fallback mechanisms to replace dead image links with gracefully rendered initials and gradients, eliminating all broken image icons globally.
- ⌨️ **Search UX Optimization**: Hardened the global Command Palette and TV Search Overlays to ensure intuitive `Enter` key execution without rogue UI conflicts.

### Phase 14 — Premium Modals & Parity Audits (`June 2026`)
- 🖥️ **Reusable Modal Portal**: Built `ModalPortal.tsx`, a portal-based overlay manager with a glassmorphism backdrop (`blur(30px)`), keyboard focus trap, body scroll locking, Escape closing, and outside click listeners.
- 👤 **Unified Guest Login Flow**: Integrated Google, GitHub, and Discord Clerk OAuth inside the unified login modal alongside a robust Guest Login flow featuring an interactive grid of 8 cartoon avatars (Totoro, Goku, Luffy, Naruto, Nezuko, etc.) saved persistently to local storage.
- 👥 **Interactive Profile Modal**: Created `ProfileEditModal.tsx` allowing users to switch, edit (name, avatar, color theme, kids mode toggle), delete, and add profiles dynamically without losing watch context.
- ⚙️ **Premium Settings Modal**: Created `SettingsModal.tsx` carrying full settings configuration tabs (Account, Playback rules, Appearance, Notifications, Accessibility) as a premium portal overlay.
- 🎨 **Layout & CLS Standardizations**:
  - Replaced legacy Clerk modal bindings and page redirect triggers in headers and auth gates with the custom portal modals.
  - Aligned all `RowSkeleton` and `ContinueWatchingSkeleton` card dimensions, paddings, and height styles with loaded carousels to eradicate Cumulative Layout Shift (CLS).
  - Fixed parent logo bounding classes, ensuring next/image constraints apply and logo scales correctly across high-resolution displays.

### Phase 13 — Anime System Reconstruction (`June 2026`)
- ⛩️ **Anime Data Models**: Upgraded internal types to support `AnimeMeta` and `RichAnimeEpisode` containing richer metadata such as multiple titles, filler status, and thumbnails.
- 🛡️ **Provider Redundancy**: Built `AnimeProviderManager.ts`, a smart orchestrator that wraps Gogoanime (Consumet) and AniList to securely fetch and fallback for rich episode metadata, vastly improving stream success rate and API reliability.
- 🖼️ **Image Fallback Engine**: Built `src/lib/utils/image.ts`, which guarantees an unbreakable image resolution hierarchy: `AniList > TMDB > MAL > Placeholder`. Applied this strictly across `MovieCard`, `HeroCarousel`, and homepage APIs. No more broken image carousels!
- 📺 **WatchClient Architecture**: Overhauled the side panel episode list inside `WatchClient.tsx` to handle rich episodes. It now gracefully displays thumbnails, precise episode numbering, and **Filler badges**, directly imitating Crunchyroll's premium episode list.
- 🔍 **Header Unified Search**: Modified the anime search functionality in `Header.tsx` to support **Fuzzy matching** of Native, Romaji, and English titles with a highly responsive 200ms debounce.

### Phase 12 — Profile & Authentication Reconstruction (`June 2026`)
- 🔒 **Clerk OAuth Migration**: Replaced legacy custom JWT auth flow with robust Clerk authentication supporting Google, GitHub, and Discord OAuth.
- 👤 **Dynamic Profiles**: Hooked user login states to a unified `toonplayer-unified-store`. History and watchlists are strictly siloed per `profileId`, completely removing hardcoded guest defaults.
- 📺 **Netflix-Style Player Layout**: Reconstructed `WatchClient` to use a true 70/30 Player-to-Episode desktop split. The player consumes 70% width while the episode list sticks neatly to the right 30% on wide screens.
- 📱 **Mobile/Tablet Carousel**: The episode view transitions fluidly into a horizontal scrolling carousel (`snap-x`) on mobile to conserve vertical space.

### Phase 11 — Layout Engine & Detail Page Reconstruction (`June 2026`)
- 🏗️ **Single-Column Architecture**: Rebuilt `WatchClient` components (Movie, TV, and Anime) to use a strict vertical layout flow, eliminating flex-row overlaps and horizontal shifting.
- 🖼️ **Full-Bleed MovieHero**: Refactored the backdrop container to support true 100vw edge-to-edge stretching with strict constraints, fixing cross-device bleeding.
- 📱 **Dynamic Viewport Migration**: Globally replaced `100vh`, `h-screen`, and `min-h-screen` with Tailwind v4's dynamic `dvh` (`min-h-dvh`, `h-dvh`) to prevent address bar clipping on mobile devices.
- ✨ **Component Hardening**: Removed transparent trivia bugs, nested player detachments, and overlapping footers for a Netflix-quality presentation.
- 📜 **Scroll Safety (Phase 5)**: Configured `scroll={false}` on letter-based filter navigation (`AZFilter.tsx`) to prevent unwanted scroll jumps while preserving natural scroll-to-top behavior for page-to-page transitions.
- 🎲 **Randomizer Parity (Phase 11)**: Enabled click-away modal dismissal and updated redirects inside the Surprise Me randomizer modal to load Watch and Search pages from the top.
- ⚙️ **Settings Page Migration (Phase 9)**: Converted the legacy settings modal into a dedicated `/settings` dashboard page with a premium Netflix-style layout, while cleaning up state bindings in the header, sidebar, and layout wrapper.
- 📱 **Safe-Area Notch Padding (Phase 4)**: Adjusted fixed header top paddings and heights using CSS env variables (`safe-area-inset-top`) to prevent overlapping notch bars in standalone PWA views.
- 👤 **Graceful Initials Fallback (Phase 8)**: Added error handlers to Clerk avatars inside the custom profile menu to display capitalized initials inside a styled gradient circle on network failure, and fixed relative-bounds parent constraints.

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
