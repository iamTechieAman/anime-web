"use client";

import { useEffect, useCallback } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

/**
 * error.tsx — Next.js App Router segment-level error boundary for the root app segment.
 * This is the LAST LINE of defense before global-error.tsx.
 * Shown when any unhandled async error bubbles up from a page or layout in the /app directory.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ToonPlayer RootError]", error?.message || error, "digest:", error?.digest);
  }, [error]);

  const handleReset = useCallback(() => {
    try {
      reset();
    } catch (_) {
      window.location.reload();
    }
  }, [reset]);

  return (
    <div className="min-h-dvh bg-[#0b0c10] text-white flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-2xl font-black tracking-tight mb-8"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ToonPlayer
        </div>

        <div className="bg-[#12131a] border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/15 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-5 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>

            <h1 className="text-xl font-black mb-2 tracking-tight">
              Playback Error
            </h1>
            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
              Something went wrong loading this content. This is usually temporary —
              try retrying or go back home to browse other titles.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 bg-white text-black py-3.5 rounded-xl font-bold text-sm hover:bg-zinc-100 transition-colors active:scale-95"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
              <Link
                href="/"
                scroll={false}
                className="w-full flex items-center justify-center gap-2 bg-white/[0.05] border border-white/10 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-white/[0.08] transition-colors active:scale-95"
              >
                <Home className="w-4 h-4" />
                Return Home
              </Link>
            </div>
          </div>
        </div>

        {/* Error digest */}
        {error?.digest && (
          <p className="text-[10px] text-zinc-700 mt-3">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
