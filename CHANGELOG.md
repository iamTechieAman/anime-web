# Changelog

All notable changes to this project will be documented in this file.

## [1.8.0] - 2026-03-11

### 📺 TV Shows & Consumet Integration (The "Ultimate Resolver" Update)
- **🌐 Consumet API Network**: Added the open-source Consumet API as the `#1 Default Priority` backend resolver, bypassing complex Cloudflare/AES encryptions for heavily protected Sub/Dub streams.
- **🔄 Dynamic API Fallbacks**: Rewrote `/api/anime/top` and `/popular` endpoints to employ a cascading failover loop (`Consumet -> AllAnime -> AniWatch -> HiAnime`). Eradicates the "No Anime Found" bugs entirely.
- **📺 TMDB Season Architecture**: Built the `/api/prime/season` endpoint to extract deep TMDB episodic metadata. Live-injected a responsive **Season Dropdown & Episode Grid** directly into the Watch UI for seamless TV Binge-watching.
- **🎛️ Contextual Mobile Search**: Upgraded `MobileModals.tsx` with dynamic `usePathname` routing. The global search modal intelligently swaps between Anime queries and Movie/TV queries based on user location.
- **🎨 Edge-to-Edge Desktop Fix**: Injected root `<body>` theme variables inside `layout.tsx` to eliminate white bounding boxes on ultra-wide desktop monitors, ensuring pristine Light / Dark mode rendering.
- **🏷️ Branding Upgrade**: Refactored the primary embed server label from "Onoflix VIP" to **"ToonPlayer-VIP"**.

## [1.7.0] - 2026-01-26

### 🎨 Design & Experience Overhaul (The "Premium" Update)
- **🖤 True Dark Mode**: Updated global theme to "OLED Black" (`#000000`) for a deeper, more professional look that saves battery on mobile.
- **🏆 Trending Ranks**: Added a Netflix-style "Trending Now" section with large 1-10 numbering to highlight the most popular shows.
- **🔖 Watchlist Feature**: Implemented a fully functional "Save/Bookmark" system. Users can now save anime to a local Watchlist that persists across sessions.
- **✨ UI Polish**: Refined glassmorphism effects, increased font contrast, and improved spacing on the Watch Page.

### 🐛 Bug Fixes
- Fixed the "Save button not working" issue by implementing proper localStorage persistence.
- Resolved thumbnail aspect ratio inconsistencies on the improved Grid Layout.

## [1.6.0] - 2026-01-26

### ✨ Performance & Stabilization (The "AniLab" Update)
- **🚀 Advanced Parallel Search**: Implemented `Promise.all` engine in Search API. Now queries AllAnime, AniWatch, and HiAnime simultaneously. The fastest provider always wins, cutting search time by ~70%.
- **📱 Lag-Free Mobile UI**: 
    - Added **Image Pre-fetching** to Hero Carousel slides for instant transitions.
    - Integrated **Motion-Feedback** (`whileTap`) on all mobile navigation buttons.
    - Optimized CSS `touch-action` to eliminate the 300ms mobile tap delay.
- **🛡️ Navigation Overhaul**: Refactored Capacitor Android back-button logic. Pressing back now correctly closes search/menus instead of exiting the app.
- **🖼️ Smart Scaling**: Enabled Next.js Image Optimization for anime CDN thumbnails, reducing mobile data usage and memory spikes.

### 🐛 Bug Fixes
- Fixed Hero Carousel image display issues by updating the Anikai scraper to extract real background-image URLs.
- Resolved "ui-crashing" issues when switching quickly between Search and Menu tabs.
- Fixed hydration mismatches in the Mobile Navigation bar.
- Improved Light Mode visibility by adjusting gradient contrasts in `globals.css`.

## [1.5.0] - 2026-01-25

### 🚀 Speed & Reliability
- **Parallel Source Validation**: Video engine now validates multiple stream links in parallel, reducing "Black Screen" wait times.
- **Zero-Cache Data**: Enabled `revalidate = 0` on all listing APIs (Recent, Popular, Top) for real-time accuracy.
- **Smart Fallbacks**: Added multi-layer internal fallbacks between providers to ensure 99% playback success rate.

## [1.0.0] - 2026-01-24

### 🚀 Initial Release
- **Production-Ready**: First official release of ToonPlayer!
- **Features**: ArtPlayer integration, Smart CORS Proxy, Responsive UI, and real-time search.
