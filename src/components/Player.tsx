"use client";

import React, { useEffect } from "react";
import { Play, RefreshCw, X, Loader2 } from "lucide-react";

export interface PlayerProps {
  currentServerUrl?: string | null;
  isLoading?: boolean;
  sourceError?: boolean;
  activeServerName?: string;
  reloadKey?: number;
  onRetryAll?: () => void;
  onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement>) => void;
  onError?: () => void;
  className?: string;
  title?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export const VideoEmbed = React.memo(function VideoEmbed({
  url,
  title = "ToonPlayer Stream",
  className = "absolute inset-0 w-full h-full border-0",
  reloadKey = 0,
  onLoad,
  onError,
  iframeRef,
}: {
  url: string;
  title?: string;
  className?: string;
  reloadKey?: number;
  onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement>) => void;
  onError?: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}) {
  useEffect(() => {
    if (url) {
      console.log("[DEBUG] Playing URL:", url);
    }
  }, [url]);

  if (!url || !url.trim()) {
    return (
      <div className="relative w-full aspect-video min-h-[250px] bg-black rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3">
        <div className="absolute inset-0 shimmer-card opacity-20 pointer-events-none" />
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        </div>
        <p className="text-xs font-bold text-zinc-400 tracking-wide uppercase relative z-10">Initializing Stream...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video min-h-[250px] bg-black rounded-2xl overflow-hidden">
      <iframe
        key={`${url}-${reloadKey}`}
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
}, (prev, next) => prev.url === next.url && prev.reloadKey === next.reloadKey);

export const Player = React.memo(function Player({
  currentServerUrl,
  isLoading = false,
  sourceError = false,
  activeServerName = "Server",
  reloadKey = 0,
  onRetryAll,
  onLoad,
  onError,
  className = "absolute inset-0 w-full h-full border-0",
  title = "ToonPlayer Stream",
  iframeRef,
}: PlayerProps) {
  useEffect(() => {
    if (currentServerUrl) {
      console.log("[DEBUG] Playing URL:", currentServerUrl);
    }
  }, [currentServerUrl]);

  // If loading is true or URL is pending (and no explicit error), show dark loading spinner/skeleton
  if (isLoading || (!currentServerUrl && !sourceError)) {
    return (
      <div className="relative w-full aspect-video min-h-[250px] bg-black rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3.5">
        <div className="absolute inset-0 shimmer-card opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-extrabold text-white tracking-wide uppercase">Connecting to {activeServerName}...</p>
            <p className="text-[10px] text-zinc-500 font-medium">Securing high-speed playback stream</p>
          </div>
        </div>
      </div>
    );
  }

  // Only show the error fallback if the API explicitly returned an error or all servers were tried
  if (sourceError && !currentServerUrl) {
    return (
      <div className="relative w-full aspect-video min-h-[250px] bg-black rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <X className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-base sm:text-lg font-bold mb-1 text-white">
          Source Temporarily Unavailable
        </h3>
        <p className="text-zinc-400 text-xs mb-5 max-w-[320px] leading-relaxed">
          The player encountered an issue across all available servers. This usually fixes itself — try resetting and retrying all servers.
        </p>
        {onRetryAll && (
          <button
            onClick={onRetryAll}
            className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-accent/25"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry All Servers
          </button>
        )}
      </div>
    );
  }

  // Clean iframe player with stable key based on currentServerUrl and reloadKey
  return (
    <div className="relative w-full aspect-video min-h-[250px] bg-black rounded-2xl overflow-hidden">
      <iframe
        key={`${currentServerUrl}-${reloadKey}`}
        ref={iframeRef}
        src={currentServerUrl || ""}
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
}, (prev, next) => (
  prev.currentServerUrl === next.currentServerUrl &&
  prev.isLoading === next.isLoading &&
  prev.sourceError === next.sourceError &&
  prev.activeServerName === next.activeServerName &&
  prev.reloadKey === next.reloadKey
));

export default Player;
