# 📺 ToonPlayer - Premium Anime&Movies Streaming WebApp 

###  WebSite Link (https://www.toonplayer.in/)



**ToonPlayer** is a modern, premium, and lightning-fast streaming platform designed to be the ultimate, ad-free alternative for watching both Anime and global Movies/TV Shows. 

Built with **Next.js 15 (Turbopack)** and **React 19**, it isn't just a simple website—it's a highly sophisticated aggregator and video player engine that ensures you never hit a dead link or a broken stream.

Here is a breakdown of what makes ToonPlayer so incredibly unique and powerful:

### 🌟 1. The "Zero Maintenance" Fallback Network
Unlike traditional streaming sites that break when a server goes down, ToonPlayer features a **Cascading Fallback Network**. If you try to watch a show and the primary server (`vidsrc` or `consumet`) fails, gets blocked by an ad-blocker, or returns a 404 error, the player *instantly and invisibly* cycles to the next best server in the background (like `VidLink` or `VidBinge`). You never have to refresh the page.

### ⚙️ 2. Zero-Latency App Settings
The platform features a deeply integrated, real-time "App Settings" dashboard where users can globally customize their viewing experience. As soon as you flip a toggle—whether it's **Smart Server Switching**, **Auto-Skip Intros**, **Prioritize Multi-Audio (for Dual Audio/Dubs)**, or **Autoplay Next Episode**—the entire web application instantly adopts the rule without ever needing to refresh the page or even click a "Save" button.

### 🎨 3. Premium, Studio-Grade UI/UX
The aesthetics of ToonPlayer are designed to rival top-tier streaming services like Netflix or Crunchyroll.
- **Glassmorphism & OLED Dark Mode:** The UI utilizes sleek blurred backgrounds, vibrant accent colors, and deep blacks for comfortable night viewing.
- **Framer Motion Animations:** Everything from opening a modal to hovering over an anime card feels buttery smooth and alive.
- **Responsive Design:** The app dynamically morphs from a widescreen desktop theater experience down to a perfectly optimized mobile-app layout.

### 📊 4. Real-Time Scraping & Integrations
ToonPlayer never shows stale or out-of-date content. It utilizes intelligent server-side scrapers and direct API hooks into **TMDB** (The Movie Database) and **AniList**. This allows the app to dynamically generate:
- Live "Trending Movies" and "Popular Anime" carousels.
- Deep metadata, including cast/crew information, episode titles, user ratings, and exact season breakdowns.
- Instant, multi-source Search engines.

### 🚀 5. Native Android Compatibility
Because we built the application with highly optimized, mobile-first web components, ToonPlayer easily compiled into a lightning-fast native **Android APK** using Capacitor, bringing the entire ecosystem directly to smartphones with native back-button routing and full screen hardware-accelerated video playback.

***

In short, **ToonPlayer** isn't just an anime website—it's a production-ready, highly resilient streaming engine wrapped in a gorgeous, modern frontend.

## 📸 Screenshots

| App Settings & Preferences | Explore Genres |
|:---:|:---:|
| ![](/public/screenshots/app_settings.png) | ![](/public/screenshots/genres.png) |

| Popular Grid | Search & Filters |
|:---:|:---:|
| ![](/public/screenshots/popular.png) | ![](/public/screenshots/search.png) |

### 🎬 Featured Sections (Hero Carousels)

| Trending Movies | Trending Stars |
|:---:|:---:|
| ![](/public/screenshots/movies_trending.png) | ![](/public/screenshots/trending_stars.png) |

| Popular TV Shows | Watch Page |
|:---:|:---:|
| ![](/public/screenshots/tv_popular.png) | ![](/public/screenshots/watch.png) |

## ✨ Key Features

- **🔄 Real-time Updates**: Automatically pulls live popular, top, and recent lists directly from the fastest providers without stale caching.
- **🎬 Smart Video Player**: Auto-selects the best streaming source and bypasses CORS restrictions using a smart proxy.
- **📺 TV Show Seasons**: Deep integration with TMDB API to natively fetch TV Show seasons, metadata, and episode thumbnails within a dynamic interactive grid.
- **🔗 Hybrid Fallback Network**: Utilizes the open-source **Consumet API** as the primary source resolver, seamlessly falling back to direct provider queries (AllAnime, AniWatch, HiAnime) if streams are encrypted or missing.
- **🚀 High Performance**: Built on Next.js 15 for server-side rendering and lightning-fast page loads.
- **📱 Responsive Contextual UI**: Intelligent mobile modals that contextually switch between Anime and Movie search engines based on active routes, with a full-bleed OLED Dark Mode desktop layout.
- **🌙 Modern Design**: Premium dark mode aesthetic with glassmorphism, contextual coloring, and smooth animations using Framer Motion.
- **⚡ Android Native**: Built-in support for Android via **Capacitor**, featuring native back-button handling and high-performance WebView.

## 🛠️ Development Process & Automation

ToonPlayer is designed to be a "Zero Maintenance" app. Here is how it updates automatically and handles data:

### 1. 🔄 Real-time Data Syncing
Instead of relying on static site generation (SSG) which gets stale, ToonPlayer uses **Real-time API Fetching**:
- **Zero Cache Strategy**: Every request to the `popular`, `recent`, or `trending` APIs bypasses all server-side caches.
- **Scraper Pipeline**: We built custom scrapers for **Anikai** and **AllAnime** that parse the latest HTML content directly when a user visits.
- **Auto-Refresh**: The Home page includes a client-side timer that refreshes the data every **60 seconds**, ensuring users never miss a new episode release.

### 2. 🚀 The Cascading Fallback Network
To guarantee 99.9% uptime for streams (despite anti-bot protections and AES encryption), ToonPlayer uses a **Dynamic Priority Fallback Pipeline**:
```mermaid
graph LR
    User([Play Video]) --> Route[API Priority Router]
    Route --> C[Consumet API]
    C -- Fails --> A[AllAnime]
    A -- Fails --> AW[AniWatch]
    AW -- Fails --> H[HiAnime]
    H --> Stream{Resolver}
```
If the primary AniList ID fails to map properly, the backend automatically drops down the chain, parsing raw HTML to extract highly protected `.m3u8` streams natively.

### 3. 📺 TMDB TV Show Integration
For non-anime content, the `/api/prime` suite communicates with TheMovieDatabase (TMDB). It pulls complete seasonal metadata and episode arrays, injecting them into a frontend Interactive Glassmorphic Grid so users can flawlessly select any episode across any season.

### 3. Build & Deployment
- **Web**: Automatically deployed to **Vercel** on every push to `main`.
- **Mobile**: Compiled to **Android APK** using Gradle and Capacitor. Version **v1.7** introduces zero-lag mobile UI, Native Sharing, and automatic server switching.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Video Player**: [ArtPlayer](https://artplayer.org/) with HLS.js
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)

### Backend & Data Sources
- **Meta Integrations**: [TMDB API](https://developer.themoviedb.org/) (Movies/TV), [AniList GraphQL](https://anilist.co/api/v2/oauth/docs) (Anime Autocomplete)
- **Primary Source Resolver**: [Consumet API Wrapper](https://docs.consumet.org/)
- **Fallback Providers**:
  - **AllAnime** ([allanime.day](https://allanime.to))
  - **AniWatch/Zoro**
  - **HiAnime**
  - **Anikai**
- **Video Servers**: Aggregated stream extraction via `ToonPlayer-VIP`, `VidLink`, and `AutoEmbed`.

### Deployment
- **Hosting**: [Vercel](https://vercel.com/)
- **CI/CD**: Automatic deployment on push to `main` branch

## 🎨 Design Inspiration

ToonPlayer's UI/UX draws inspiration from leading streaming platforms:

- **[Zoro.to](https://zoro.to)**: Server toggle system, minimal dark theme, episode grid layout
- **[Netflix](https://netflix.com)**: Featured hero section, hover animations on cards
- **[Crunchyroll](https://crunchyroll.com)**: Anime-focused color palette (purple/cyan accents)
- **[Spotify](https://spotify.com)**: Glassmorphism effects on modals and overlays

**Color Palette:**
- Primary: Electric Purple (`#a855f7`) - Energy and excitement
- Accent: Cyan (`#06b6d4`) - Modern tech feel
- Background: Near-Black (`#050505`) - Premium dark mode

## 🚀 Roadmap & Implementation Phases

The development of ToonPlayer was structured into 10 major phases, focusing on content expansion, reliability, and premium UX:

- **Phase 1: Foundation & Initial Content** - Established core streaming logic and fixed initial VidBinge provider issues.
- **Phase 2: Multi-Source Expansion** - Integrated multiple anime/movie providers for high redundancy.
- **Phase 3: Classification Refinement** - Improved categorical sorting for series, movies, and episodes.
- **Phase 4: UI/UX Intensive Polish** - Refined the layout, animations, and transitions for a professional feel.
- **Phase 5: Provider Reliability** - Solved "Content Not Found" errors by implementing better fallback logic.
- **Phase 6: Playback Stability** - Optimized video player and bypassed browser sandbox/redirection issues.
- **Phase 7: Total Cleanup & Unified Filtering** - Consolidated search results and unified filtering across genres and years.
- **Phase 8: Ad-Blocking & Search Accuracy** - Integrated DNS-level ad blocking (dns.adguard.com) and improved search suggestions.
- **Phase 9: Upcoming Shows & Smart Play** - Added "Upcoming" badges and automated server-health checks during playback.
- **Phase 10: Premium Branding & Clean Scraping** - Finalized the ToonPlayer brand, added Smart Tab Selection, and refined scrapers for direct, clean player links.
- **Phase 11: Final Polish & UI Optimization (v1.7)** - Eliminated all mobile UI lag by optimizing CSS 3D transforms, introduced the `ToonNortan` server, built an automatic server-fallback system for broken streams, and mapped out fully working LocalStorage Watchlist and Web Share functionalities.
- **Phase 12: Universal Fixed & Branding (v1.8)** - Integrated the high-performance **Anime-Alpha** (AnimeSalt) server using the Pyppeteer-driven `OpenClaw` engine. Performed a universal "Hard Reset" of all player restrictions, removing all `sandbox` attributes to fix "disable sandbox" errors forever. Renamed and obfuscated providers for a cleaner, unified branding.
- **Phase 13: Edge-To-Edge Overhaul & Global SEO (v1.9)** - Modernized the entire application with a fully responsive, edge-to-edge Netflix-style layout. Removed all fixed-width containers (`max-w-7xl`) to utilize the full width of 4K and Ultra-wide screens. Implemented robust technical SEO (Sitemap scaling, Schema.org Organization) and hardened security with CSP headers and mandatory trust pages (Privacy, Terms, Contact).
- **Phase 14: Search & Playback Optimization (v2.1)** - Implemented a high-performance **Netflix-style Search Engine** with fuzzy-matching typo tolerance and case-insensitive ranking. Resolved critical mobile playback issues by enforcing vertical scroll-bubbling on the video player (Scroll Unlock) and fixed the "Skip Intro" logic to prevent duration jumping. Unified brand consistency by integrating the official logo across the footer and sidebar.
- **Phase 15: Critical SEO & Platform Scaling (v2.2)** - Resolved Google Search Console SEO failures by implementing strict ISR caching strategies (`revalidate: 86400`) on the dynamic Sitemap, preventing TMDB API timeouts (429 errors). Enforced `www.` canonical subdomain mapping inside `robots.txt`. Stabilized the core Player State Manager to persist audio choices mid-stream, built out the UI Notification Engine with LocalStorage sync, and consolidated auto-server logic into a seamless priority queue.
- **Phase 16: Intelligent Playback & System Hardening (v2.5)** - Implemented **Automated Episode Resumption** and deep history persistence across sessions. Hardened the streaming environment with **Aggressive Ad-Blocking Sandboxes** for zero-popup viewing. Integrated the high-speed **Aniwaves.ru Scraper** for direct anime extraction. Built a proactive **Server Health Probing API** (`/api/health`) to auto-switch broken sources before playback. Optimized visual performance with **Hardware-Accelerated CSS 3D Transforms** for lag-free 60FPS interaction on all devices. Created **AI Smart Alerts** and customized Ad-Blocker Assistant in the unified settings dashboard.
- **Phase 17: Ultimate Anime Ecosystem & UI Overhaul (v3.0)** - Performed a complete system-level optimization. Resolved the "Episode 1 reset" bug via **State-to-URL synchronization**. Integrated **Aniwaves.ru** as the primary anime engine for search, home, and A-Z discovery. Consolidated **Unified Search** to deduplicate across providers. Hardened **Mobile Search UI** and eliminated all layout shifts during lazy loading. Refined the playback engine with **Optimized HLS Buffering** and low-latency modes. Fixed critical syntax and property bugs in the core landing page and video player.
- **Phase 18: Aniwaves Integration & Layout Hardening (v3.1)** - Restored the **Aniwaves.ru** anime pipeline with a robust, Cloudflare-resistant scraping engine using the Chrome engine and adaptive timeouts. Eliminated "blank space" layout issues by standardizing vertical container spacing (`space-y-12`) across all main feed tabs. Upgraded the **AnimeCard** component to natively handle alias data mapping for high-fidelity title and image rendering. Enhanced the **Scraper Client** with detailed reporting and raw stdout diagnostics to ensure 99.9% extraction uptime.

👉 **[Read the full Dev Journey & Learnings here](./DEV_JOURNEY.md)**

## 🚀 Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/iamTechieAman/anime-web.git
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please read our [**Contributing Guidelines**](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

We also have a [**Code of Conduct**](CODE_OF_CONDUCT.md) to ensure a welcoming community for everyone.

Check out our [**Security Policy**](SECURITY.md) for reporting vulnerabilities.

### Quick steps:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🧠 Development Methodology & AI Transparency

This project was built with a focus on **educational growth and professional learning**. Artificial Intelligence (AI) was utilized strictly as a:
*   **Debugging Assistant**: To identify complex issues like dependency conflicts (React 19 vs 18) and cross-origin resource sharing (CORS) errors.
*   **Testing Partner**: To generate edge-case scenarios and verify API responses.
*   **Learning Accelerator**: To understand advanced architectural patterns in Next.js 15.

The core logic, design decisions, and architectural implementation were driven by the developer to master modern web engineering practices.

## 👨‍💻 About Me

Hey there! I'm **Aman Kumar**, a developer who loves building things and learning in public.

This project started as a personal challenge to understand full-stack development with Next.js, and it turned into something I'm really proud of. Along the way, I learned that debugging is 80% of coding, CORS errors are inevitable, and React 19 doesn't always play nice with older libraries 😅

When I'm not coding, I'm probably watching anime (which is why this project exists), debugging something that worked yesterday, or drinking way too much coffee.

**Connect with me:**
- 💼 GitHub: [@iamTechieAman](https://github.com/iamTechieAman)
- 💬 Let's chat about web dev, anime, or your latest CORS nightmare

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
**Disclaimer:** This project is for educational purposes only. Content is indexed from public sources.
