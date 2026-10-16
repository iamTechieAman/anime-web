"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignIn, useUser } from "@clerk/nextjs";
import { Play, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { isClerkConfigured } from "@/lib/clerkConfig";
import { useUserStore } from "@/store/userStore";

function LoginContent() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { setActiveProfile } = useUserStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/";
  const hasClerk = isClerkConfigured();

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      router.push(redirectUrl, { scroll: false });
    }
  }, [userLoaded, isSignedIn, redirectUrl, router]);

  const handleContinueAsGuest = () => {
    setActiveProfile("profile-guest");
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("toonplayer-session-active", "true");
      window.dispatchEvent(new Event("profileUpdated"));
    }
    router.push(redirectUrl, { scroll: false });
  };

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center p-4 overflow-hidden bg-[#09090b]">
      {/* Cinematic ambient background glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 z-10">
        <Link href="/" scroll={false} className="flex items-center gap-2.5 group">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center shadow-[0_0_24px_var(--accent-glow)] group-hover:scale-105 transition-transform">
            <Play className="w-6 h-6 text-accent fill-current translate-x-0.5" />
          </div>
          <span className="text-2xl font-black font-sora text-white tracking-tight">
            Toon<span className="text-accent">Player</span>
          </span>
        </Link>
        <p className="text-xs text-zinc-400 mt-2 font-medium">Free HD Anime & Movie Streaming</p>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full max-w-[460px] flex flex-col items-center">
        {hasClerk ? (
          <div className="w-full flex flex-col items-center">
            <SignIn 
              routing="path" 
              path="/login" 
              signUpUrl="/register"
              fallbackRedirectUrl={redirectUrl}
            />

            {/* Guest Browsing Action */}
            <div className="mt-6 text-center w-full">
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="w-full py-3 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Continue Browsing as Guest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full bg-[#121217] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-white mb-2">Authentication Unavailable</h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Cloud account authentication is not configured in this environment. You can freely explore the full catalog, watch anime and movies, and use AI discovery in Guest Mode.
            </p>

            <button
              onClick={handleContinueAsGuest}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-accent to-accent-secondary hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_var(--accent-glow)] transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Continue in Guest Mode</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center bg-[#09090b] text-zinc-500 text-xs">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
