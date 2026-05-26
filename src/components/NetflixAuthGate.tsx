"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Film, Play, Sparkles, Tv, ShieldAlert, Check } from "lucide-react";
import { useEffect, useState } from "react";

// Static premium posters for the landing background grid (to ensure fast, static, zero-fetch load)
const BACKGROUND_POSTERS = [
  "https://image.tmdb.org/t/p/w342/qhbcfZ1eZTDbZaTQwQA6EvrLz2n.jpg", // Yona of the Dawn
  "https://image.tmdb.org/t/p/w342/h117F866S500eX3781s6v44p20m.jpg", // Solo Leveling
  "https://image.tmdb.org/t/p/w342/f49tQJ49cRPvFSnegAzV76a6qd1.jpg", // Demon Slayer
  "https://image.tmdb.org/t/p/w342/k9th9ZqH0gC4HwVn6c8P0qWk9tZ.jpg", // Kaiju No. 8
  "https://image.tmdb.org/t/p/w342/81D5Zq7WlUu929C4n2Wc9n8d11S.jpg", // Frieren
  "https://image.tmdb.org/t/p/w342/9662nB04nGl25g4fW2o11S7x8bF.jpg", // Jujutsu Kaisen
  "https://image.tmdb.org/t/p/w342/z45v5X3tUv4R1G7d4G7W2m4f7S8.jpg", // Attack on Titan
  "https://image.tmdb.org/t/p/w342/7W9e4pXpX2x0G3aR4n6u9k8S0s4.jpg", // Naruto Shippuden
  "https://image.tmdb.org/t/p/w342/9G1c5W0r1g8fX8C7n5G6k2tD1g1.jpg", // One Piece
  "https://image.tmdb.org/t/p/w342/pe1af4Nf9Z8gC8W5J6c8S0qWk9t.jpg", // Chainsaw Man
  "https://image.tmdb.org/t/p/w342/8G24v1u8p5S1N4c9W2o11X8a7X2.jpg", // Bleach
  "https://image.tmdb.org/t/p/w342/A7s8a7c2D3N4n5K6q7W2a2n1S9a.jpg", // Death Note
  "https://image.tmdb.org/t/p/w342/9G1c5W0r1g8fX8C7n5G6k2tD1g2.jpg", // My Hero Academia
  "https://image.tmdb.org/t/p/w342/pe1af4Nf9Z8gC8W5J6c8S0qWk9t.jpg", // Hunter x Hunter
  "https://image.tmdb.org/t/p/w342/8G24v1u8p5S1N4c9W2o11X8a7X3.jpg", // Vinland Saga
];

export default function NetflixAuthGate() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white flex flex-col justify-between overflow-hidden font-inter selection:bg-orange-500/30">
      
      {/* 1. Animated Immersive Poster Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/70 via-[#050505]/90 to-[#0b0b0f] z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#050505_95%)] z-10" />
        
        {/* Scrolling Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 opacity-20 scale-105 rotate-[-6deg] translate-y-[-10%] origin-top-left">
          {Array.from({ length: 4 }).map((_, rIndex) => (
            <div 
              key={rIndex} 
              className={`flex flex-col gap-3 ${rIndex % 2 === 0 ? 'animate-[marqueeVertical_45s_linear_infinite]' : 'animate-[marqueeVertical_45s_linear_infinite_reverse]'}`}
            >
              {[...BACKGROUND_POSTERS, ...BACKGROUND_POSTERS].map((src, pIndex) => (
                <div key={pIndex} className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shadow-md">
                  <img src={src} alt="Poster" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Top Navigation Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-full blur-lg opacity-40 animate-pulse" />
            <img 
              src="/logo.webp" 
              alt="ToonPlayer Logo" 
              className="w-full h-full relative z-10 object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] mix-blend-screen"
            />
          </div>
          <span className="text-xl font-black tracking-tighter text-white font-sora drop-shadow-[0_0_12px_rgba(249,115,22,0.4)] uppercase">
            Toon<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Player</span>
          </span>
        </div>

        <SignInButton mode="modal">
          <button className="px-5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 text-white cursor-pointer">
            Sign In
          </button>
        </SignInButton>
      </header>

      {/* 3. Hero Content Area */}
      <main className="relative z-20 w-full max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Micro-badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-black tracking-wider text-orange-400 uppercase mb-6 animate-bounce">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Now 100% Free & No Ads</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black font-sora tracking-tight text-white mb-6 max-w-3xl leading-[1.1] uppercase">
          Unlimited Anime, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 drop-shadow-[0_0_30px_rgba(249,115,22,0.2)]">
            Movies & Shows
          </span>
        </h1>

        <p className="text-lg sm:text-xl font-bold text-zinc-300 mb-8 max-w-xl leading-relaxed">
          Watch secure, premium entertainment anywhere. Ad-free, no payment required. Simply authenticate to enter.
        </p>

        {/* Action CTAs */}
        <div className="w-full max-w-md mx-auto flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
          <SignUpButton mode="modal">
            <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white rounded-xl font-bold text-base transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 group cursor-pointer">
              Get Started Free
              <Play className="w-4 h-4 fill-white text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </SignUpButton>

          <SignInButton mode="modal">
            <button className="w-full sm:w-auto px-8 py-4 bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 active:scale-95 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer">
              Sign In To Account
            </button>
          </SignInButton>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl pt-10 border-t border-white/5">
          <div className="flex flex-col items-center p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-2 border border-orange-500/20">
              <Tv className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Full HD Streams</h3>
            <p className="text-[10px] text-zinc-400 mt-1 font-medium">1080p & Auto-scaling Player</p>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-2 border border-orange-500/20">
              <Film className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Massive Catalog</h3>
            <p className="text-[10px] text-zinc-400 mt-1 font-medium">Daily Updated Sub & Dub</p>
          </div>

          <div className="flex flex-col items-center col-span-2 md:col-span-1 p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-2 border border-orange-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Secure Access</h3>
            <p className="text-[10px] text-zinc-400 mt-1 font-medium">Clerk Auth Verification</p>
          </div>
        </div>

      </main>

      {/* 4. Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
        <div>
          &copy; {new Date().getFullYear()} ToonPlayer. All rights reserved.
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-orange-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-orange-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-orange-400 transition-colors">Contact Support</a>
        </div>
      </footer>

      {/* Embedded CSS Animations */}
      <style jsx global>{`
        @keyframes marqueeVertical {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}
