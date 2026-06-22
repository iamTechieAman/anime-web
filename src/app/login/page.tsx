"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-[var(--bg-main)]">
      <div className="w-full max-w-md bg-[var(--bg-card)]/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_-20px_var(--accent-glow)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center mb-4 border border-[var(--accent)]/30">
            <Shield className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-black font-sora text-white">Welcome Back</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Access your secure profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="email"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-[var(--accent)] outline-none transition-all"
                placeholder="john@example.com"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Password</label>
                 <Link href="/forgot-password" title="Forgot Password" className="text-[10px] text-[var(--accent)] font-bold hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-[var(--accent)] outline-none transition-all"
                placeholder="••••••••"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-secondary)] py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group shadow-lg shadow-[var(--accent)]/20 text-white"
          >
            {loading ? "Signing In..." : "Sign In"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            New here?{" "}
            <Link href="/register" className="text-[var(--accent)] font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
