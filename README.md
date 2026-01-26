# 📺 ToonPlayer - Premium Anime Streaming App

### 🔴 **Live Demo:** [https://anime-web-neon-one.vercel.app](https://anime-web-neon-one.vercel.app/)

ToonPlayer is a modern, ad-free anime streaming application built with **Next.js 15** and **React 19**. It features a sleek, responsive UI, real-time search, and a robust video player that aggregates sources from multiple providers.

![ToonPlayer Home](/public/screenshots/home.png)

## 📸 Screenshots

| Popular Grid | Search Suggestions |
|:---:|:---:|
| ![](/public/screenshots/popular.png) | ![](/public/screenshots/search.png) |

| Filter Results | Watch Page |
|:---:|:---:|
| ![](/public/screenshots/filter.png) | ![](/public/screenshots/watch.png) |

## ✨ Key Features

- **🔄 Real-time Updates**: The platform automatically updates its anime list, latest releases, and trending shows **daily and automatically** via smart web scraping and API integration.
- **🎬 Smart Video Player**: Auto-selects the best streaming source (HLS vs MP4) and bypasses CORS restrictions using a smart proxy.
- **🚀 High Performance**: Built on Next.js 15 for server-side rendering and lightning-fast page loads.
- **📱 Fully Responsive**: Optimized for Mobile, Tablet, and Desktop with a unified, touch-friendly UI.
- **🔍 Real-time Search**: Instant search results with thumbnails and dub/sub indicators.
- **🌙 Modern Design**: Premium dark mode aesthetic with glassmorphism and smooth animations.
- **💾 Auto-Save**: Remembers your "Auto Play" and "Auto Next" settings.

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

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please read our [**Contributing Guidelines**](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

We also have a [**Code of Conduct**](CODE_OF_CONDUCT.md) to ensure a welcoming community for everyone.

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

This project is for educational purposes only. Content is scraped from public sources.
