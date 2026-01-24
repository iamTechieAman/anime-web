# 🚀 The Development Journey of ToonPlayer

This document details the step-by-step process of building ToonPlayer, the challenges we faced, how we solved them, and what we learned along the way.

## 📅 Phases of Development

### Phase 1: Foundation & UI 🎨
**Goal:** Create a premium, ad-free viewing experience.
- Built the core layout using **Next.js 15 App Router**.
- Designed a "Netflix-style" homepage with Featured Spotlight, Trending Grid, and Latest Releases.
- Used **Tailwind CSS v4** for a modern, responsive design that works perfectly on mobile and desktop.

### Phase 2: The Video Playback Challenge 🎥
**Problem:** The biggest hurdle. Videos were getting stuck on "Loading Stream" or buffering indefinitely.
- **Initial State:** We relied on a basic proxy that wrapped *all* video URLs to avoid CORS errors.
- **The Issue:** This was slow and broke simple HLS streams that didn't need proxying.
- **The Fix:** We implemented **"Smart Proxy Detection"**:
    1.  **Direct URLs** for standard HLS streams (fastest).
    2.  **Proxied URLs** *only* for providers like SharePoint or Google Drive that block cross-origin requests.
    3.  Modified `allanime.ts` provider to return the *first* working source immediately instead of testing all of them (reducing load time from 15s to 4s).

### Phase 3: React 19 vs. Libraries 🥊
**Problem:** Next.js 15 uses React 19 (RC), but many video libraries (like `vidstack`) only support React 18.
- **The Error:** `npm install` failed on Vercel with `ERESOLVE unable to resolve dependency tree`.
- **The Fix:** We forced `npm` to cooperate!
    1.  Added `overrides` in `package.json` to force version resolution.
    2.  Used `npm install --legacy-peer-deps` configuration for Vercel.
    3.  This allowed us to use cutting-edge Next.js features while keeping our video player working.

### Phase 4: Production Deployment 🌍
**Goal:** Go live!
- **Platform:** Vercel (best for Next.js).
- **Challenge:** Environment differences between local and production.
- **Success:** Deployed successfully at [https://anime-web-neon-one.vercel.app](https://anime-web-neon-one.vercel.app).

---

## 🧠 Key Learnings

### 1. **CORS is Tricky but Solvable**
We learned that not all video links are equal. Some need a backend proxy to "pretend" the request is coming from the same origin. We built a custom `/api/proxy` route in Next.js to handle this efficiently.

### 2. **Progressive Enhancement Matters**
We added `<noscript>` fallbacks. Even if a user disables JavaScript, they get a friendly message content instead of a blank screen. This creates a robust app.

### 3. **Performance Optimization**
By switching from "Test All Sources" to "Fail Fast / Return Fast", we improved video load times significantly. User experience is about perceived speed!

### 4. **Dependency Management**
Living on the bleeding edge (Next.js 15 / React 19) requires understanding `peerDependencies` and `overrides`. We learned how to manually resolve conflicts when the ecosystem hasn't caught up yet.

---

## 📸 Project Highlights

### The Smart Proxy Logic
```typescript
// Only proxy if absolutely necessary!
const needsProxy = s.url.includes('sharepoint.com') || s.url.includes('drive.google.com');
const finalUrl = needsProxy ? `/api/proxy?url=${s.url}` : s.url;
```

### The UI Philosophy
"Mobile-First, but Desktop-Premium." We used CSS Grid and Flexbox to ensure the anime cards look great on a 6-inch phone screen and a 27-inch monitor.

---

## 🌟 Benefits of this Project

1.  **Ad-Free Experience:** No annoying popups.
2.  **Educational Value:** Learned full-stack Next.js, API routing, and scraping.
3.  **Portfolio Piece:** Demonstrates ability to debug complex media and deployment issues.

*Built with ❤️ by Aman Kumar*
