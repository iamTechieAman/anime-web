"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, ArrowRight, Github, UserCircle, Play } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cinematic backgrounds
  const [bgIndex, setBgIndex] = useState(0);
  const backgrounds = [
    "https://image.tmdb.org/t/p/original/mSXzIEYL5zPZ4w010xK6P48A1cR.jpg", // Example stunning backdrop
    "https://image.tmdb.org/t/p/original/9yBVqNruk6Ykrwc32qrK2TIE5xw.jpg",
    "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vtecsmEZzAUOA.jpg"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/auth/login", formData);
      toast.success("Welcome back!");
      router.push("/");
      // Force refresh to update navigation state
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    toast.success("Logging in as Guest...");
    router.push("/");
  };

  return (
    <main className="relative min-h-dvh flex items-center justify-center p-4 overflow-hidden bg-black">
      {/* Animated Cinematic Background */}
      {backgrounds.map((bg, idx) => (
        <motion.div
          key={bg}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ 
            opacity: bgIndex === idx ? 0.6 : 0, 
            scale: bgIndex === idx ? 1 : 1.1 
          }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <Image 
            src={bg}
            alt="Cinematic Background"
            fill
            priority={idx === 0}
            className="object-cover"
          />
        </motion.div>
      ))}

      {/* Gradients to blend background into dark void */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0A0A0B] via-transparent to-[#0A0A0B] pointer-events-none" />

      {/* Auth Modal Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px] bg-[rgba(20,20,25,0.6)] backdrop-blur-3xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-glow)]" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-6 border border-[var(--accent)]/20 shadow-[0_0_30px_var(--accent-glow)]">
            <Play className="w-8 h-8 text-[var(--accent)] fill-current translate-x-0.5" />
          </div>
          <h1 className="text-3xl font-black font-sora text-white tracking-tight">ToonPlayer</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 font-medium">Premium Streaming Experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                type="email"
                required
                className="w-full bg-[var(--bg-card)]/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:border-[var(--accent)] focus:bg-[var(--bg-elevated)] outline-none transition-all placeholder:text-zinc-600 font-medium"
                placeholder="you@example.com"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Password</label>
                 <Link href="/forgot-password" title="Forgot Password" className="text-[10px] text-[var(--text-muted)] hover:text-white font-medium transition-colors">Forgot?</Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                type="password"
                required
                className="w-full bg-[var(--bg-card)]/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:border-[var(--accent)] focus:bg-[var(--bg-elevated)] outline-none transition-all placeholder:text-zinc-600 font-medium"
                placeholder="••••••••"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-secondary)] py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group shadow-lg shadow-[var(--accent)]/30 text-white mt-2 disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#141419] px-3 text-[var(--text-muted)] uppercase font-bold tracking-widest rounded-full">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 py-3 bg-[var(--bg-card)] hover:bg-white/10 border border-white/5 rounded-xl text-sm font-bold text-white transition-all">
             <Image src="https://authjs.dev/img/providers/google.svg" alt="Google" width={18} height={18} />
             Google
          </button>
          <button className="flex items-center justify-center gap-2 py-3 bg-[var(--bg-card)] hover:bg-white/10 border border-white/5 rounded-xl text-sm font-bold text-white transition-all">
             <Github className="w-4 h-4" />
             GitHub
          </button>
        </div>
        
        <button 
          onClick={handleGuestLogin}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-transparent hover:bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-white transition-all"
        >
          <UserCircle className="w-4 h-4" />
          Continue as Guest
        </button>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-[var(--text-muted)] font-medium">
            New to ToonPlayer?{" "}
            <Link href="/register" className="text-white font-bold hover:text-[var(--accent)] transition-colors">Sign up now</Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
