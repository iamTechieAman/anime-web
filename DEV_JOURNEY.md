# 🚀 ToonPlayer: The Development Journey

This document captures the technical evolution, major challenges, and engineering milestones of **ToonPlayer**—from a simple idea to a high-performance, resilient streaming engine.

## 🌟 The Vision
ToonPlayer was born out of a desire for a "Zero Maintenance" streaming platform. Most sites break when their source providers update their security. ToonPlayer was designed to be **autonomous**, with a cascading fallback system that stays alive even when individual servers fail.

## 🗺️ Version Milestones

### v1.0 - v1.3: The Foundation
*   **Core Architecture:** Established the Next.js 15 App Router structure.
*   **Provider Integration:** Connected to TMDB for metadata and Consumet for initial stream resolving.
*   **The Problem:** Discovered that many "free" APIs are unstable or have high latency.

### v1.4 - v1.6: Resilience & Redundancy
*   **Fallback Network:** Implemented the `Dynamic Priority Fallback Pipeline`. If one provider (e.g., VidSrc) fails, the app automatically switches to alternatives (VidBinge, SmashyStream, etc.).
*   **Smart Search:** Unified searching across Anime (AniList) and Movies/TV (TMDB).

### v1.7: The Mobile Leap
*   **Android Integration:** Compiled the app for Android using Capacitor.
*   **Performance Optimization:** Fixed critical main-thread lag on mobile by optimizing CSS 3D transforms and reducing GPU-heavy effects like `backdrop-blur` on low-end devices.
*   **Social Features:** Added native Web Share API integration and a local-storage based Watchlist.

### v1.8: The "OpenClaw" Era (Current)
*   **High-Performance Scraping:** Developed the `OpenClaw Engine`—a server-side Python module using Pyppeteer to bypass advanced bot protection and extract high-speed HLS streams directly.
*   **AnimeSalt Integration:** Integrated a new high-performance anime source with direct source extraction.
*   **The Sandbox Reset:** To resolve persistent "disable sandbox" errors from providers, we shifted to a "Raw Iframe" strategy, removing all site-level restrictions to allow browser-level ad-blockers (like Brave) to work perfectly without conflict.

## 🧠 Key Technical Learnings

1.  **CORS is the Final Boss:** Dealing with cross-origin restrictions required building smart proxies and choosing providers that support permissive headers.
2.  **User-Agent Stealth:** Traditional `fetch` is often blocked. Using randomized browser headers and headless browser automation (Pyppeteer) is essential for reliable scraping in 2026.
3.  **Client-Side vs. Server-Side:** Moving heavy scraping logic to Python scripts on the backend significantly improved the frontend performance and reduced "Total Blocking Time" on mobile.

## 🛠️ The Future
We are looking toward implementing **P2P Streaming** experiments and even deeper **AI-powered recommendations** based on local watch history.

---
*Built with ❤️ by [iamTechieAman](https://github.com/iamTechieAman)*
