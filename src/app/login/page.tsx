"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Github } from "lucide-react";
import Image from "next/image";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useUserStore } from "@/store/userStore";

export default function LoginPage() {
  const { signIn, isLoaded: signInLoaded } = useSignIn() as any;
  const { isLoaded: userLoaded, isSignedIn } = useUser() as any;
  const { addProfile, setActiveProfile } = useUserStore();
  const router = useRouter();

  const [bgIndex, setBgIndex] = useState(0);
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState("");

  const backgrounds = [
    "https://image.tmdb.org/t/p/original/mSXzIEYL5zPZ4w010xK6P48A1cR.jpg",
    "https://image.tmdb.org/t/p/original/9yBVqNruk6Ykrwc32qrK2TIE5xw.jpg",
    "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vtecsmEZzAUOA.jpg"
  ];

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      router.push("/", { scroll: false });
    }
  }, [userLoaded, isSignedIn, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);

  const handleOAuth = (strategy: "oauth_google" | "oauth_github" | "oauth_discord") => {
    if (!signInLoaded) return;
    signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;

    const currentStore = useUserStore.getState();
    const existing = currentStore.profiles.find(p => p.name === name && p.type === 'guest');

    if (existing) {
      setActiveProfile(existing.id);
    } else {
      const avatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
      addProfile({ name, avatar, type: 'guest', isKids: false, theme: 'purple' });
      
      setTimeout(() => {
        const updatedStore = useUserStore.getState();
        const created = updatedStore.profiles.find(p => p.name === name && p.type === 'guest');
        if (created) setActiveProfile(created.id);
      }, 50);
    }
    
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("toonplayer-session-active", "true");
      window.dispatchEvent(new Event("profileUpdated"));
    }
    
    router.push("/", { scroll: false });
  };

  if (!signInLoaded || !userLoaded || isSignedIn) {
    return <div className="min-h-[100dvh] bg-black" />; // Blank while redirecting
  }

  return (
    <main className="relative min-h-dvh flex items-center justify-center p-4 overflow-hidden bg-black">
      {backgrounds.map((bg, idx) => (
        <motion.div
          key={bg}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: bgIndex === idx ? 0.6 : 0, scale: bgIndex === idx ? 1 : 1.1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <Image src={bg} alt="Background" fill priority={idx === 0} className="object-cover" />
        </motion.div>
      ))}

      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0A0A0B] via-transparent to-[#0A0A0B] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px] bg-[#141419]/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 border border-accent/20 shadow-[0_0_30px_var(--accent-glow)]">
            <Play className="w-8 h-8 text-accent fill-current translate-x-0.5" />
          </div>
          <h1 className="text-3xl font-black font-sora text-white tracking-tight">ToonPlayer</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 font-medium">Premium Streaming Experience</p>
        </div>

        {!guestMode ? (
          <div className="space-y-4">
            <button
              onClick={() => handleOAuth("oauth_google")}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95"
            >
              <Image src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} />
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth("oauth_github")}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#24292F] text-white rounded-xl font-bold hover:bg-[#2b3137] transition-all active:scale-95"
            >
              <Github className="w-5 h-5" />
              Continue with Github
            </button>
            <button
              onClick={() => handleOAuth("oauth_discord")}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#5865F2] text-white rounded-xl font-bold hover:bg-[#4752C4] transition-all active:scale-95"
            >
              <Image src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6918e57475a843f59f_icon_clyde_blurple_RGB.svg" alt="Discord" width={24} height={24} />
              Continue with Discord
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center"><span className="px-4 text-xs text-zinc-500 bg-[#141419]">OR</span></div>
            </div>

            <button
              onClick={() => setGuestMode(true)}
              className="w-full px-6 py-3.5 bg-transparent border border-white/20 text-white rounded-xl font-bold hover:bg-white/5 transition-all active:scale-95"
            >
              Continue as Guest
            </button>
          </div>
        ) : (
          <motion.form 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleGuestLogin} 
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Guest Name</label>
              <input
                type="text"
                required
                maxLength={15}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-accent transition-all"
                placeholder="Enter your name"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGuestMode(false)}
                className="flex-1 px-4 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!guestName.trim()}
                className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl font-bold shadow-[0_0_20px_var(--accent-glow)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Watching
              </button>
            </div>
          </motion.form>
        )}
      </motion.div>
    </main>
  );
}
