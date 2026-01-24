# Anime Web - Next.js Anime Streaming Platform

A high-performance, modern anime streaming application built with Next.js 14, TailwindCSS, and ArtPlayer. Features include a robust video player with HLS support, persistent playback state, and a responsive glassmorphism UI.

## 🚀 Features

-   **High-Performance Player**: Custom implementation of `ArtPlayer` with `hls.js` for adaptive bitrate streaming.
-   **Persistent Playback**: Seamless episode switching without reloading the player component.
-   **Smart Buffering**: Tuning for 30MB buffer to balance speed and stability.
-   **Proxy System**: Custom Next.js API proxy to bypass CORS and headers for video segments.
-   **Modern UI**: Glassmorphism design, responsive grid layouts, and smooth animations.
-   **Auto-Next & Auto-Play**: LocalStorage-backed settings for binge-watching.

## 🛠️ Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Language**: TypeScript
-   **Styling**: TailwindCSS
-   **Video Player**: ArtPlayer + hls.js
-   **Icons**: Lucide React
-   **State Management**: React Hooks (`useState`, `useEffect`, `useRef`)

## 📂 Project Structure

```
anime-web/
├── src/
│   ├── app/                # App Router pages
│   │   ├── api/            # API Routes (Proxy, Anime Info)
│   │   ├── watch/[id]/     # Video Player Page
│   │   └── page.tsx        # Home Page
│   ├── components/         # Reusable Components
│   │   ├── player/         # ArtPlayer Wrapper
│   │   └── ...
│   └── lib/                # Utilities & Providers
├── public/                 # Static Assets
└── next.config.js          # Next.js Configuration
```

## 🚀 Getting Started

### Prerequisites

-   Node.js 18.x or higher
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/anime-web.git
    cd anime-web
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1.  Install Vercel CLI: `npm measure -g vercel`
2.  Run `vercel` in the project root.
3.  Follow the prompts. No special configuration is needed as Vercel auto-detects Next.js.

### Git Workflow

1.  Initialize Git: `git init`
2.  Add files: `git add .`
3.  Commit: `git commit -m "Initial commit"`
4.  Push to GitHub:
    ```bash
    git remote add origin https://github.com/your-username/repo-name.git
    git push -u origin main
    ```

## 🐛 Debugging Common Issues

-   **AbortError (Media Removed)**: This happens if the player is unmounted while playing. The current codebase fixes this by persisting the player instance during episode switches.
-   **Buffering Stalls**: Check `ArtPlayer.tsx`. The default buffer is set to 30MB. If you have a gigabit connection, you can try increasing `maxBufferSize`.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.
