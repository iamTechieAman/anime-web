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

    // Block known full website raw paths
    if (
        url.includes("/watch/show/") ||
        url.includes("/watch/movie/") ||
        url.includes("/watch/cartoon/") ||
        url.includes("/watch/anime/") ||
        url.includes("/season/") ||
        url.includes("/episode/") ||
        url.includes("/show/")
    ) {
        if (!url.startsWith("/api/proxy/embed") && !url.startsWith("/api/scrape/")) {
            return false;
        }
    }

    // Validate allowed embed indicators
    return (
        url.startsWith("/api/proxy/embed") ||
        url.startsWith("/api/scrape/") ||
        url.includes("/e/") ||
        url.includes("/embed/") ||
        url.includes("/v/") ||
        url.includes("?type=") ||
        url.includes("?video_id=") ||
        url.includes("/playere.php") ||
        url.includes("vidlink.pro") ||
        url.includes("peachify.top") ||
        url.includes("autoembed.co") ||
        url.includes("embed.su") ||
        url.includes("nontongo.win") ||
        url.includes("vidfast.pro") ||
        url.includes("vidsrc.me") ||
        url.includes("vidsrc.pro") ||
        url.includes("vidsrc.to") ||
        url.includes("vidsrc.cc") ||
        url.includes("cineby.pro") ||
        url.includes("rivestream.xyz") ||
        url.includes("cinemaos.to") ||
        url.includes(".m3u8") ||
        url.includes(".mp4")
    );
}

export const VideoEmbed = React.memo(function VideoEmbed({
  url,
  title = "ToonPlayer Stream",
  className = "absolute top-0 left-0 w-full h-full border-0",
  onLoad,
  onError,
  iframeRef,
}: VideoEmbedProps) {
  useEffect(() => {
    if (url) {
      console.log("[DEBUG] Playing URL:", url);
    }
  }, [url]);

  // Fallback for Empty/Null URLs
  if (!url || url.trim() === "") {
    return (
      <div className="relative w-full aspect-video min-h-[250px] md:min-h-[500px] bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/70 text-xs font-semibold uppercase tracking-wider animate-pulse">Loading server...</p>
      </div>
    );
  }

  // Security Guard: Block full website execution inside iframe
  if (!isValidEmbedUrl(url)) {
    return (
      <div className="relative w-full aspect-video min-h-[250px] md:min-h-[500px] bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center bg-black/95 text-center p-4">
        <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs mb-1">
          Invalid Stream Source Protected
        </div>
        <p className="text-zinc-500 text-[11px] max-w-xs">
          Raw website URL blocked from iframe execution.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video min-h-[250px] md:min-h-[500px] bg-black rounded-xl overflow-hidden">
      <iframe
        key={url}
        ref={iframeRef}
        src={url}
        className={className}
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
