"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Film, Play, Sparkles, Tv, ShieldCheck, Check, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Logo from "@/components/Logo";

// Real poster images from TMDB for the animated background grid
const BACKGROUND_POSTERS = [
  "https://image.tmdb.org/t/p/w342/qhbcfZ1eZTDbZaTQwQA6EvrLz2n.jpg",
  "https://image.tmdb.org/t/p/w342/h117F866S500eX3781s6v44p20m.jpg",
  "https://image.tmdb.org/t/p/w342/f49tQJ49cRPvFSnegAzV76a6qd1.jpg",
  "https://image.tmdb.org/t/p/w342/81D5Zq7WlUu929C4n2Wc9n8d11S.jpg",
  "https://image.tmdb.org/t/p/w342/9662nB04nGl25g4fW2o11S7x8bF.jpg",
  "https://image.tmdb.org/t/p/w342/k6EOrckWFuz7I4z4wiRwz8go3oH.jpg",
  "https://image.tmdb.org/t/p/w342/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg",
  "https://image.tmdb.org/t/p/w342/kEl2t3OhXc3Zb9FBh1AuYzRTykH.jpg",
  "https://image.tmdb.org/t/p/w342/1hRoyzDtpgMU7Dz4JF22RANzQO7.jpg",
  "https://image.tmdb.org/t/p/w342/yXSzo0vlqZai2OZSRy1wh4BgRKi.jpg",
  "https://image.tmdb.org/t/p/w342/fOy2Jurz9k6RnJnMULjAFAVTH1b.jpg",
  "https://image.tmdb.org/t/p/w342/6DrHO1jr3qVrViUO6s6kFiAGM7.jpg",
  "https://image.tmdb.org/t/p/w342/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  "https://image.tmdb.org/t/p/w342/Ast9c4fxSu4ZB5GbaCIdv1CMgmf.jpg",
  "https://image.tmdb.org/t/p/w342/jtnfNzqZwN4E32FGGxx1YZaBWWf.jpg",
  "https://image.tmdb.org/t/p/w342/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg",
  "https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
  "https://image.tmdb.org/t/p/w342/8kNruSfhk5IoE4eZOc4UpvDn6tM.jpg",
];

const FEATURES = [
  {
    icon: Tv,
    title: "Full HD & 4K",
    desc: "Crystal-clear 1080p & 4K streams",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Film,
    title: "Massive Catalog",
    desc: "50,000+ movies, shows & anime",
    color: "text-[var(--accent)]",
    bg: "bg-[var(--accent)]/10",
    border: "border-[var(--accent)]/20",
  },
  {
    icon: Zap,
    title: "Zero Ads",
    desc: "Uninterrupted, buffering-free playback",
    color: "text-[var(--secondary)]",
    bg: "bg-[var(--secondary)]/10",
    border: "border-[var(--secondary)]/20",
  },
  {
    icon: ShieldCheck,
    title: "Secure Auth",
    desc: "Enterprise-grade Clerk authentication",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
];

export default function NetflixAuthGate() {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true); // Default to true for SSR safety

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);


  return (
    <div className="relative min-h-screen min-h-dvh w-full bg-[#050507] text-white flex flex-col overflow-hidden font-inter">

      {/* ── 1. Animated Poster Background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/60 via-[#050507]/85 to-[#050507] z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/80 via-transparent to-[#050507]/80 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#050507_85%)] z-10" />

        {/* Scrolling grid of posters */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 opacity-25 scale-110 rotate-[-5deg] translate-y-[-8%] origin-top-left">
          {Array.from({ length: 6 }).map((_, col) => (
            <div
              key={col}
              className="flex flex-col gap-2 sm:gap-3"
              style={
                !reducedMotion
                  ? {
                      animation: `marqueeVertical ${40 + col * 5}s linear infinite ${col % 2 === 0 ? "" : "reverse"}`,
                    }
                  : {}
              }
            >
              {[...BACKGROUND_POSTERS, ...BACKGROUND_POSTERS].map((src, i) => (
                <div key={i} className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-[var(--bg-elevated)]">
                  <Image src={src} alt="Background poster" fill sizes="150px" className="object-cover" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Header ── */}
      <header className="relative z-20 w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-5 flex items-center justify-between max-w-screen-2xl mx-auto pt-[env(safe-area-inset-top)]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0">
            <Logo />
          </div>
          <span className="flex flex-col leading-none">
            <span className="text-base sm:text-xl font-black tracking-tight text-white" style={{ fontFamily: "var(--font-sora, 'Sora', sans-serif)", lineHeight: 1 }}>Toon</span>
            <span className="text-base sm:text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-orange-400" style={{ fontFamily: "var(--font-sora, 'Sora', sans-serif)", lineHeight: 1 }}>Player</span>
          </span>
        </div>

        {/* Sign In button */}
        <SignInButton mode="modal">
          <button className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-secondary)] active:scale-95 text-white text-sm sm:text-base font-bold rounded-xl transition-all shadow-lg shadow-[var(--accent)]/30 cursor-pointer min-h-[44px]">
            Sign In
          </button>
        </SignInButton>
      </header>

      {/* ── 3. Hero Content ── */}
      <main className="relative z-20 flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 flex flex-col items-center justify-center text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/25 rounded-full text-xs sm:text-sm font-bold tracking-widest text-[var(--accent)] uppercase mb-6 sm:mb-8">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span>100% Free · Zero Ads</span>
        </div>

        {/* Headline */}
        <h1 className="font-black font-sora tracking-tight text-white mb-4 sm:mb-6 max-w-3xl leading-[1.05] uppercase text-[clamp(1.8rem,7vw,4rem)]">
          Unlimited Anime,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-[var(--accent-secondary)] to-[var(--secondary)]">
            Movies & Shows
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-sm sm:text-base lg:text-lg font-medium text-zinc-300 mb-8 sm:mb-10 max-w-lg sm:max-w-xl leading-relaxed">
          Premium streaming, zero cost. Watch HD movies, binge your favourite anime, and discover hidden gems — all from one place.
        </p>

        {/* CTA Buttons */}
        <div className="w-full max-w-sm sm:max-w-md flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-10 sm:mb-14">
          <SignUpButton mode="modal">
            <button className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] hover:from-[var(--accent-secondary)] hover:to-[var(--accent)] active:scale-95 text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-xl shadow-[var(--accent)]/30 flex items-center justify-center gap-2 group cursor-pointer min-h-[52px]">
              Get Started Free
              <Play className="w-4 h-4 fill-white text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </SignUpButton>

          <SignInButton mode="modal">
            <button className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/6 hover:bg-white/12 border border-white/15 active:scale-95 text-white rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-sm min-h-[52px]">
              Sign In to Account
            </button>
          </SignInButton>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10 sm:mb-14">
          {["HD & 4K streams", "Sub & Dub", "Daily updates", "No credit card"].map((trust) => (
            <div key={trust} className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-400">
              <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              {trust}
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-3xl pt-8 sm:pt-10 border-t border-white/6">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div
              key={title}
              className={`flex flex-col items-center p-3 sm:p-4 lg:p-5 ${bg} border ${border} rounded-2xl transition-all hover:scale-105`}
            >
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${bg} flex items-center justify-center ${color} mb-2 sm:mb-3 border ${border}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white mb-1">{title}</h3>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium text-center leading-relaxed hidden sm:block">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ── 4. Footer ── */}
      <footer className="relative z-20 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-5 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
        <span>© {new Date().getFullYear()} ToonPlayer. All rights reserved.</span>
        <div className="flex gap-4 sm:gap-6">
          <a href="/privacy" className="hover:text-[var(--accent)] transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-[var(--accent)] transition-colors">Terms</a>
          <a href="/contact" className="hover:text-[var(--accent)] transition-colors">Contact</a>
        </div>
      </footer>

      {/* Keyframe animation injected inline */}
      <style>{`
        @keyframes marqueeVertical {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}
