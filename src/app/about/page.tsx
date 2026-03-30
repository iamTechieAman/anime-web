"use client";

import { motion } from "framer-motion";
import { Github, Twitter, Mail, Globe, Heart, Sparkles, Zap, Shield, Rocket, User } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 px-4 md:px-8 bg-[var(--bg-main)] overflow-x-hidden">
            <div className="max-w-4xl mx-auto space-y-20">
                
                {/* Hero Section */}
                <section className="text-center space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)] mb-8 p-4"
                    >
                        <img src="/logo.png" alt="ToonPlayer Logo" className="w-full h-full object-contain" />
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-6xl font-black text-white tracking-tight"
                    >
                        Crafting the Future of <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Digital Entertainment</span>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto"
                    >
                        Hi, I'm <span className="text-white font-bold">Aman Kumar</span>. I build high-performance streaming experiences that combine speed, precision, and privacy.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-4 pt-4"
                    >
                        <a href="https://github.com/iamTechieAman" target="_blank" className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-purple-500/50 transition-colors">
                            <Github className="w-6 h-6 text-white" />
                        </a>
                        <a href="#" className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-blue-500/50 transition-colors">
                            <Twitter className="w-6 h-6 text-white" />
                        </a>
                        <a href="mailto:contact@example.com" className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-rose-500/50 transition-colors">
                            <Mail className="w-6 h-6 text-white" />
                        </a>
                    </motion.div>
                </section>

                {/* Features Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { 
                            title: "Privacy First", 
                            desc: "Advanced ad-blocking and sandbox tech to keep your browsing safe from intrusive redirects.",
                            icon: Shield,
                            color: "text-blue-400",
                            bg: "bg-blue-500/10"
                        },
                        { 
                            title: "Blazing Fast", 
                            desc: "Optimized scraping engines and edge-runtime APIs ensure near-instant content loading.",
                            icon: Zap,
                            color: "text-yellow-400",
                            bg: "bg-yellow-500/10"
                        },
                        { 
                            title: "Unified Search", 
                            desc: "Search across Movies, TV, Anime, and Cartoons simultaneously without switching tabs.",
                            icon: Sparkles,
                            color: "text-purple-400",
                            bg: "bg-purple-500/10"
                        },
                        { 
                            title: "Open Source", 
                            desc: "Built with transparency and community in mind. Check out the codebase on GitHub.",
                            icon: Rocket,
                            color: "text-emerald-400",
                            bg: "bg-emerald-500/10"
                        }
                    ].map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] relative group"
                        >
                            <div className={`${feature.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-6`}>
                                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-[var(--text-muted)] leading-relaxed">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </section>

                {/* Tech Stack */}
                <section className="text-center space-y-10">
                    <h2 className="text-2xl font-bold text-white">The Tech Stack</h2>
                    <div className="flex flex-wrap justify-center gap-4 text-sm font-bold">
                        {["Next.js 14", "TypeScript", "TailwindCSS", "Framer Motion", "Python (Scrapling)", "Edge Runtime", "Lucide Icons", "Axios"].map((tech) => (
                            <span key={tech} className="px-5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full text-[var(--text-muted)] hover:text-white hover:border-purple-500/50 transition-all cursor-default">
                                {tech}
                            </span>
                        ))}
                    </div>
                </section>

                {/* Creator & Disclaimer Section */}
                <section className="space-y-12">
                    <div className="bg-[var(--bg-card)] rounded-3xl p-8 md:p-12 border border-[var(--border-color)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] -z-10 group-hover:bg-purple-500/20 transition-colors duration-700" />
                        
                        <div className="flex flex-col md:flex-row gap-10 items-center">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-purple-500/30 p-1 shrink-0">
                                <div className="w-full h-full rounded-full bg-[var(--bg-main)] flex items-center justify-center">
                                    <User className="w-12 h-12 text-purple-400" />
                                </div>
                            </div>
                            <div className="space-y-4 text-center md:text-left transition-all">
                                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-purple-500/20">Lead Developer</span>
                                <h2 className="text-3xl font-black text-white">Aman Kumar</h2>
                                <p className="text-[var(--text-muted)] leading-relaxed max-w-xl">
                                    I am a passionate <span className="text-white font-bold">college student</span> and full-stack developer dedicated to building innovative open-source projects. ToonPlayer is a personal project developed for educational purposes, focusing on high-performance web architecture and unified search experiences.
                                </p>
                            </div>
                        </div>

                        <div className="mt-12 pt-12 border-t border-[var(--border-color)] space-y-6">
                            <div className="flex items-center gap-3 text-amber-400">
                                <Shield className="w-5 h-5" />
                                <h3 className="text-lg font-bold uppercase tracking-tight">Legal Disclaimer</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-[var(--text-muted)] font-medium">
                                <p>
                                    ToonPlayer is a <span className="text-white">content aggregator</span> and search tool. We do not host, store, or upload any media files (videos, movies, or shows) on our own servers. All content is indexed from third-party publicly available sources on the internet.
                                </p>
                                <p>
                                    This platform is a <span className="text-white">personal development project</span> by a student. We do not promote or encourage digital piracy. If you believe your copyrighted content is being linked without authorization, please contact the respective hosting provider for removal.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Closing */}
                <section className="text-center pt-10">
                    <div className="flex items-center justify-center gap-2 mb-4 text-[var(--text-muted)]">
                        <span>Made with</span>
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <span>by Aman Kumar</span>
                    </div>
                    <p className="text-[9px] text-[var(--text-muted)] opacity-50 uppercase tracking-[0.2em] font-black">
                        &copy; {new Date().getFullYear()} ToonPlayer Project • Built for Learning
                    </p>
                </section>

            </div>
        </main>
    );
}
