"use client";

import React, { useEffect } from "react";
import { Play, RefreshCw, X } from "lucide-react";

export interface PlayerProps {
  currentServerUrl?: string | null;
  isLoading?: boolean;
  sourceError?: boolean;
  activeServerName?: string;
  onRetryAll?: () => void;
  onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement>) => void;
  onError?: () => void;
  className?: string;
  title?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export default function Player({
  currentServerUrl,
  isLoading = false,
  sourceError = false,
  activeServerName = "Server",
  onRetryAll,
  onLoad,
  onError,
  className = "w-full h-full border-0",
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
      <div className="relative w-full aspect-video bg-black flex flex-col items-center justify-center gap-4 text-white">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full border border-blue-500/20 animate-ping" />
          <div className="w-14 h-14 rounded-full border-[3px] border-blue-500/20 border-t-blue-500 animate-spin" />
          <Play className="absolute w-5 h-5 text-blue-500" />
        </div>
        <p className="text-white text-xs font-black uppercase tracking-[0.2em] animate-pulse">
          Connecting to server…
        </p>
        <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
          {activeServerName}
        </p>
      </div>
    );
  }

  // Only show the error fallback if the API explicitly returned an error or all servers were tried
  if (sourceError && !currentServerUrl) {
    return (
      <div className="relative w-full aspect-video bg-black flex flex-col items-center justify-center p-6 text-center">
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
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry All Servers
          </button>
        )}
      </div>
    );
  }

  // Clean iframe player with NO sandbox attribute
  return (
    <iframe
      ref={iframeRef}
      src={currentServerUrl || ""}
      className={className}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="no-referrer"
      title={title}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
