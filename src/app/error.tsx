"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-bg-main text-[var(--text-main)] flex flex-col items-center justify-center p-4 text-center z-50 relative">
      <div className="max-w-md w-full bg-bg-card border border-border-color rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-3xl font-black mb-3 text-white font-sora">System Error</h1>
            <p className="text-[var(--text-muted)] text-sm mb-8 leading-relaxed">
                We encountered an unexpected issue while trying to load this page. Our systems have logged the error.
            </p>
            
            <div className="flex flex-col w-full gap-3">
                <button
                    onClick={() => reset()}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-colors active:scale-95"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Try Again
                </button>
                <Link
                    href="/"
                    scroll={false}
                    className="w-full flex items-center justify-center gap-2 bg-bg-main border border-border-color text-white py-3.5 rounded-xl font-bold hover:bg-white/5 transition-colors active:scale-95"
                >
                    <Home className="w-4 h-4" />
                    Return Home
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
