"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/auth/register", formData);
      toast.success("Account created! Please login.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-main)]">
      <div className="w-full max-w-md bg-[var(--bg-card)]/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_-20px_var(--accent-glow)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center mb-4 border border-[var(--accent)]/30">
            <Sparkles className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-black font-sora text-white">Join ToonPlayer</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Start your cinematic journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-[var(--accent)] outline-none transition-all"
                placeholder="Ex. John Doe"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

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
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Password</label>
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
            {loading ? "Creating Account..." : "Create Account"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--accent)] font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
