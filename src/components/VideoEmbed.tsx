"use client";

import React, { useEffect } from "react";

export interface VideoEmbedProps {
  url: string;
  title?: string;
  className?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement>) => void;
  onError?: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export function isValidEmbedUrl(url: string): boolean {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim();
    if (!trimmed) return false;

    // Block dangerous non-web URI protocols
    const lower = trimmed.toLowerCase();
    if (
        lower.startsWith("javascript:") ||
        lower.startsWith("data:") ||
        lower.startsWith("vbscript:") ||
        lower.startsWith("file:")
    ) {
        return false;
    }

    // Always allow internal API endpoints (stream proxy, scrape, etc.)
    if (trimmed.startsWith("/api/")) {
        return true;
    }

    try {
        // Prevent recursive self-nesting of internal app pages
        if (trimmed.startsWith("/")) {
            if (
                trimmed.startsWith("/watch") ||
                trimmed.startsWith("/anime") ||
                trimmed.startsWith("/movies") ||
                trimmed.startsWith("/tv") ||
                trimmed.startsWith("/browse") ||
                trimmed.startsWith("/cartoon")
            ) {
                return false;
            }
            return true;
        }

        const parsed = new URL(trimmed);

        // Ensure HTTP or HTTPS protocol
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return false;
        }

        // Prevent self-nesting if hostname is our own site pointing to website routes
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();
        if (
            (host === "toonplayer.in" || host === "www.toonplayer.in" || host.includes("toonplayer")) &&
            (path.startsWith("/watch") || path.startsWith("/anime") || path.startsWith("/browse"))
        ) {
            return false;
        }

        // All valid external streaming servers, embed providers, and video hosts are allowed!
        return true;
    } catch {
        return false;
    }
}

export const VideoEmbed = React.memo(function VideoEmbed({
  url,
  title = "ToonPlayer Stream",
  className = "absolute inset-0 w-full h-full border-0",
  onLoad,
  onError,
  iframeRef,
}: VideoEmbedProps) {
  useEffect(() => {
    if (url) {
      console.log("[DEBUG] Playing URL:", url);
    }
  }, [url]);

  // Prevent Empty Src Rendering
  if (!url || !url.trim()) {
    return (
      <div className="relative w-full aspect-video min-h-[250px] bg-black rounded-2xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          Loading player...
        </div>
      </div>
    );
  }

  // Security Guard: Block full website execution inside iframe
  if (!isValidEmbedUrl(url)) {
    return (
      <div className="relative w-full aspect-video min-h-[250px] bg-black rounded-2xl overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 text-center p-4">
          <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs mb-1">
            Invalid Stream Source Protected
          </div>
          <p className="text-zinc-500 text-[11px] max-w-xs">
            Raw website URL blocked from iframe execution.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video min-h-[250px] bg-black rounded-2xl overflow-hidden">
      <iframe
        key={url}
        ref={iframeRef}
        src={url}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen={true}
        referrerPolicy="origin"
        title={title}
        onLoad={onLoad}
        onError={onError}
      />
    </div>
  );
}, (prev, next) => prev.url === next.url);

export default VideoEmbed;
