# 📺 ToonPlayer - Premium Anime Streaming App

### 🔴 **Live Demo:** [https://anime-web-neon-one.vercel.app](https://anime-web-neon-one.vercel.app/)

ToonPlayer is a modern, ad-free anime streaming application built with **Next.js 15** and **React 19**. It features a sleek, responsive UI, real-time search, and a robust video player that aggregates sources from multiple providers.

![ToonPlayer Home](/public/screenshots/home.png)

## 📸 Screenshots

| Search Page | Watch Page |
|:---:|:---:|
| ![](/public/screenshots/search.png) | ![](/public/screenshots/watch.png) |

## ✨ Key Features

- **🎬 Smart Video Player**: Auto-selects the best streaming source (HLS vs MP4) and bypasses CORS restrictions using a smart proxy.
- **🚀 High Performance**: Built on Next.js 15 for server-side rendering and lightning-fast page loads.
- **📱 Fully Responsive**: Optimized for Mobile, Tablet, and Desktop with a unified, touch-friendly UI.
- **🔍 Real-time Search**: Instant search results with thumbnails and dub/sub indicators.
- **🌙 Modern Design**: Premium dark mode aesthetic with glassmorphism and smooth animations.
- **💾 Auto-Save**: Remembers your "Auto Play" and "Auto Next" settings.
- **🛠️ Progressive Enhancement**: Works even without JavaScript enabled (via Noscript fallbacks).

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
- **API Library**: [@consumet/extensions](https://github.com/consumet/consumet.ts) - Anime data aggregation
- **Providers**:
  - **AllAnime** ([allanime.to](https://allanime.to)) - Primary anime episodes & metadata
  - **HiAnime** ([hianime.to](https://hianime.to)) - Fallback provider
  - **AniList API** ([anilist.co](https://anilist.co)) - Anime metadata & cover images
- **Video Sources**: Aggregated from SharePoint, Google Drive, and HLS streams
- **CORS Proxy**: Custom Next.js API route for bypassing SharePoint/GDrive restrictions

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

## ⚡ Deployment Journey

We faced several challenges during development, including:
1.  **Video Playback**: Fixing "Loading Stream" issues by implementing a smart proxy for SharePoint/GDrive links.
2.  **React 19 Compatibility**: Resolving peer dependency conflicts between Next.js 15 and video libraries.
3.  **CORS**: Handling cross-origin resource sharing for third-party video sources.
4.  **Mobile Performance**: Optimizing scroll lag by reducing GPU-heavy blur effects on mobile devices.

👉 **[Read the full Dev Journey & Learnings here](./JOURNEY.md)**

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

Feel free to fork the project and submit pull requests!

## 🧠 Development Methodology & AI Transparency

This project was built with a focus on **educational growth and professional learning**. Artificial Intelligence (AI) was utilized strictly as a:
*   **Debugging Assistant**: To identify complex issues like dependency conflicts (React 19 vs 18) and cross-origin resource sharing (CORS) errors.
*   **Testing Partner**: To generate edge-case scenarios and verify API responses.
*   **Learning Accelerator**: To understand advanced architectural patterns in Next.js 15.

The core logic, design decisions, and architectural implementation were driven by the developer to master modern web engineering practices.

## 📄 License

This project is for educational purposes only. Content is scraped from public sources.
