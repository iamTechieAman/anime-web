"use client";

import { motion } from "framer-motion";
import { Mail, MessageSquare, ShieldAlert, Send, Github, Twitter, Info } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate sending — in real app would go to API
        setTimeout(() => {
            toast.success("Message sent! We'll get back to you soon.");
            setIsSubmitting(false);
            (e.target as HTMLFormElement).reset();
        }, 1500);
    };

    return (
        <main className="min-h-dvh bg-[var(--bg-main)] text-[var(--text-main)] pt-6 pb-20 px-4 md:px-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                
                {/* Left Side: Info */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/5"
                        >
                            <Info className="w-3 h-3" />
                            ToonPlayer Support
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[0.95]">
                            Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)]">Touch.</span>
                        </h1>
                        <p className="text-[var(--text-muted)] text-base md:text-lg max-w-md leading-relaxed">
                            Have a content request, found a bug, or need to report a DMCA issue? We are here to help.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl group hover:border-blue-500/30 transition-all">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Mail className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold mb-1">Email Us</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-2">Direct support and DMCA inquiries.</p>
                                <a href="mailto:contact@toonplayer.in" className="text-blue-400 font-bold hover:underline">contact@toonplayer.in</a>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl group hover:border-[var(--accent-warm)]/30 transition-all">
                            <div className="w-12 h-12 bg-[var(--accent-warm)]/10 rounded-xl flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-6 h-6 text-[var(--accent-warm)]" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold mb-1">DMCA & Legal</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-4">Please include all relevant URLs for faster processing.</p>
                                <button className="px-4 py-2 bg-[var(--accent-warm)]/10 border border-[var(--accent-warm)]/20 text-[var(--accent-warm)] text-xs font-bold rounded-lg hover:bg-[var(--accent-warm)] hover:text-white transition-all">Report Content</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                        <a href="https://github.com/iamTechieAman" className="p-3 bg-white/5 rounded-xl text-[var(--text-muted)] hover:text-white transition-colors border border-white/5 hover:border-white/10">
                            <Github className="w-6 h-6" />
                        </a>
                    </div>
                </div>

                {/* Right Side: Form */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -z-10" />
                    
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Full Name</label>
                            <input 
                                required
                                type="text" 
                                placeholder="Enter your name"
                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Email Address</label>
                            <input 
                                required
                                type="email" 
                                placeholder="you@example.com"
                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Message</label>
                            <textarea 
                                required
                                rows={5}
                                placeholder="How can we help you today?"
                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium resize-none"
                            />
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? "Sending..." : <>Send Message <Send className="w-5 h-5" /></>}
                        </button>

                        <p className="text-center text-[10px] text-[var(--text-muted)] font-medium leading-relaxed">
                            By sending this message, you agree to our <a href="/privacy" className="text-white hover:underline">Privacy Policy</a> regarding data handling.
                        </p>
                    </form>
                </motion.div>

            </div>
        </main>
    );
}
