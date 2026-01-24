# 📺 ToonPlayer - Premium Anime Streaming App

### 🔴 **Live Demo:** [https://anime-web-neon-one.vercel.app](https://anime-web-neon-one.vercel.app/)

ToonPlayer is a modern, ad-free anime streaming application built with **Next.js 15** and **React 19**. It features a sleek, responsive UI, real-time search, and a robust video player that aggregates sources from multiple providers.

![ToonPlayer Home](/public/window.svg)
*(Note: Replace with actual screenshot)*

## ✨ Key Features

- **🎬 Smart Video Player**: Auto-selects the best streaming source (HLS vs MP4) and bypasses CORS restrictions using a smart proxy.
- **🚀 High Performance**: Built on Next.js 15 for server-side rendering and lightning-fast page loads.
- **📱 Fully Responsive**: Optimized for Mobile, Tablet, and Desktop with a unified, touch-friendly UI.
- **🔍 Real-time Search**: Instant search results with thumbnails and dub/sub indicators.
- **🌙 Modern Design**: Premium dark mode aesthetic with glassmorphism and smooth animations.
- **💾 Auto-Save**: Remembers your "Auto Play" and "Auto Next" settings.
- **🛠️ Progressive Enhancement**: Works even without JavaScript enabled (via Noscript fallbacks).

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Video Player**: [ArtPlayer](https://artplayer.org/) & [Vidstack](https://vidstack.io/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: [Vercel](https://vercel.com/)

## ⚡ Deployment Journey

We faced several challenges during development, including:
1.  **Video Playback**: Fixing "Loading Stream" issues by implementing a smart proxy for SharePoint/GDrive links.
2.  **React 19 Compatibility**: Resolving peer dependency conflicts between Next.js 15 and video libraries.
3.  **CORS**: Handling cross-origin resource sharing for third-party video sources.

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

## 📄 License

This project is for educational purposes only. Content is scraped from public sources.
