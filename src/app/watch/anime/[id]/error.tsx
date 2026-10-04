"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCcw, Home, Play, AlertTriangle, RotateCcw } from "lucide-react";

export default function AnimeWatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Anime Watch Page Error]", error?.message || error);
  }, [error]);

  const handleReset = useCallback(() => {
    try {
      reset();
    } catch (_) {
      window.location.reload();
    }
  }, [reset]);

  return (
    <div className="min-h-dvh bg-[#0b0c10] flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        <div className="relative w-full aspect-video bg-[#12131a] rounded-2xl border border-white/10 mb-6 flex items-center justify-center overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-purple-500/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-3 p-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-1">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-white text-lg font-black tracking-tight">
              Anime Source Unavailable
            </h2>
            <p className="text-zinc-500 text-xs max-w-xs leading-relaxed">
              The anime player hit an issue loading this episode. Try retrying or switch to a different server.
            </p>

            <div className="flex gap-2 mt-2 flex-wrap justify-center">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl hover:bg-white/15 transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reload Page
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 bg-transparent border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 font-bold text-xs rounded-xl transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            Go Home
          </Link>
          <Link
            href="/browse?type=anime"
            className="flex items-center gap-1.5 px-4 py-2 bg-transparent border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 font-bold text-xs rounded-xl transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            Browse Anime
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && error?.message && (
          <details className="mt-4 text-left w-full">
            <summary className="text-[10px] text-zinc-600 cursor-pointer uppercase tracking-widest font-bold">
              Error Details (dev only)
            </summary>
            <pre className="mt-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] text-red-400 overflow-auto max-h-36 text-left whitespace-pre-wrap">
              {error.message}
              {"\n"}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
