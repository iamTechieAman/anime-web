"use client";

import { motion } from "framer-motion";
import { Github, Twitter, Mail, Shield, Zap, Sparkles, User, Cpu } from "lucide-react";

const timeline = [
    { year: "2024", title: "ToonPlayer V1.0 Launch", desc: "First release featuring local scrapers and standard anime video streams." },
    { year: "2025", title: "Global Aggregator V2.5", desc: "Integrated TMDB API, unified search, and watch context storage." },
    { year: "2025", title: "Ad-Block Sandbox V3.0", desc: "Implemented client-side proxy servers and custom video player controllers." },
    { year: "2026", title: "Dark Cinema V4.0", desc: "Complete luxury redesign matching premium OTT services like Apple TV+ and Netflix." },
];

const stats = [
    { label: "Performance", value: 100, color: "text-[#00D084]" },
    { label: "Accessibility", value: 100, color: "text-[#00D084]" },
    { label: "Best Practices", value: 100, color: "text-[#00D084]" },
    { label: "SEO", value: 100, color: "text-[#FF9D00]" },
];

export default function AboutPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 px-6 md:px-12 bg-[var(--bg-main)] overflow-x-hidden">
            <div className="w-full max-w-6xl mx-auto space-y-28">
                
                {/* Hero Section */}
                <section className="text-center space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-24 h-24 mx-auto flex items-center justify-center mb-6"
                    >
                        <img src="/logo.webp" alt="ToonPlayer Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_20px_var(--accent-glow)]" />
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-7xl font-black text-white tracking-tight font-sora leading-tight"
                    >
                        Designed for <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]">Cinematic Immersion</span>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-[var(--text-muted)] text-base md:text-xl max-w-2xl mx-auto font-medium"
                    >
                        Hi, I'm <span className="text-white font-black">Aman Kumar</span>. I design and build high-performance streaming solutions combining speed, precision, and elegant aesthetics.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-4 pt-4"
                    >
                        <a href="https://github.com/iamTechieAman" target="_blank" rel="noopener noreferrer" className="p-3.5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent)]/55 hover:shadow-[0_0_20px_var(--accent-glow)] transition-all">
                            <Github className="w-6 h-6 text-white" />
                        </a>
                        <a href="#" className="p-3.5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] hover:border-blue-500/50 transition-all">
                            <Twitter className="w-6 h-6 text-white" />
                        </a>
                        <a href="mailto:contact@toonplayer.in" className="p-3.5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] hover:border-rose-500/50 transition-all">
                            <Mail className="w-6 h-6 text-white" />
                        </a>
                    </motion.div>
                </section>

                {/* Performance / Lighthouse stats section */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Performance Benchmarks</h2>
                        <p className="text-[var(--text-muted)] text-sm mt-2 font-medium">Lighthouse metrics verifying streaming engine and UI speed</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 rounded-3xl bg-[var(--bg-card)]/30 border border-[var(--border-color)] backdrop-blur-md text-center flex flex-col items-center justify-center relative group"
                            >
                                <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                                    {/* SVG Progress Circle */}
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="48" cy="48" r="40" className="stroke-white/5" strokeWidth="6" fill="transparent" />
                                        <circle 
                                            cx="48" 
                                            cy="48" 
                                            r="40" 
                                            stroke="currentColor" 
                                            strokeWidth="6" 
                                            fill="transparent" 
                                            strokeDasharray={251.2}
                                            strokeDashoffset={251.2 - (251.2 * stat.value) / 100}
                                            className={`${stat.color} transition-all duration-1000`}
                                        />
                                    </svg>
                                    <span className="absolute text-xl font-black text-white tracking-tight">{stat.value}</span>
                                </div>
                                <h3 className="text-sm font-bold text-white tracking-wide">{stat.label}</h3>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase font-bold">Standard Met</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Features Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { 
                            title: "Privacy First Architecture", 
                            desc: "Sandboxed adblock proxies run locally, ensuring all external media stream scripts load securely without intrusive alerts.",
                            icon: Shield,
                            color: "text-blue-400",
                            bg: "bg-blue-500/10"
                        },
                        { 
                            title: "Blazing Edge Delivery", 
                            desc: "Optimized server routers and TMDB search endpoints ensure catalog response times stay below 200ms.",
                            icon: Zap,
                            color: "text-yellow-400",
                            bg: "bg-yellow-500/10"
                        },
                        { 
                            title: "Unified Search Engine", 
                            desc: "Scan catalog nodes across Movies, TV Series, and Anime simultaneously. Save folders and tracking state on the fly.",
                            icon: Sparkles,
                            color: "text-orange-400",
                            bg: "bg-orange-500/10"
                        },
                        { 
                            title: "Framer Motion Springs", 
                            desc: "Dynamic layout cards scale using 60FPS fluid physics. High performance interactions are optimized for low-tier hardware.",
                            icon: Cpu,
                            color: "text-emerald-400",
                            bg: "bg-emerald-500/10"
                        }
                    ].map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className="p-8 bg-[var(--bg-card)]/40 rounded-3xl border border-[var(--border-color)] relative group hover:border-[var(--accent)]/30 hover:shadow-[0_8px_30px_-8px_var(--accent-glow)] transition-all duration-300 overflow-hidden"
                        >
                            <div className={`${feature.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-6`}>
                                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                            <p className="text-[var(--text-muted)] leading-relaxed text-sm font-medium">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </section>

                {/* Timeline Section */}
                <section className="space-y-12">
                    <div className="text-center">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Development Timeline</h2>
                        <p className="text-[var(--text-muted)] text-sm mt-2 font-medium">Evolution of ToonPlayer's tech stack and user experience</p>
                    </div>
                    <div className="relative border-l border-[var(--border-color)] ml-4 md:ml-12 space-y-12">
                        {timeline.map((item, i) => (
                            <motion.div 
                                key={item.year}
                                initial={{ opacity: 0, x: -25 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="relative pl-8 md:pl-12 group"
                            >
                                {/* Timeline Dot */}
                                <div className="absolute -left-2.5 top-1.5 w-5 h-5 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] group-hover:border-[var(--accent)] group-hover:shadow-[0_0_12px_var(--accent-glow)] transition-all duration-300 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-color)] group-hover:bg-[var(--accent)] transition-all" />
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-xs font-black tracking-widest text-[var(--accent)] uppercase">{item.year}</span>
                                    <h3 className="text-lg font-black text-white tracking-tight">{item.title}</h3>
                                    <p className="text-sm text-[var(--text-muted)] max-w-xl font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Tech Stack Bento */}
                <section className="text-center space-y-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Architectural Tech Stack</h2>
                        <p className="text-[var(--text-muted)] text-sm mt-2 font-medium">Premium libraries power 60FPS client rendering and edge operations</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto text-xs md:text-sm font-bold">
                        {["Next.js 16", "TypeScript 5", "TailwindCSS v4", "Framer Motion 12", "Python Scrapling", "Edge Runtime", "Lucide Icons", "Axios Cache", "Clerk Authentication"].map((tech) => (
                            <span key={tech} className="px-5 py-3 bg-[var(--bg-card)]/40 border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)] hover:text-white hover:border-[var(--accent)]/55 hover:shadow-[0_4px_20px_-8px_var(--accent-glow)] transition-all cursor-default">
                                {tech}
                            </span>
                        ))}
                    </div>
                </section>

                {/* Creator & Disclaimer Section */}
                <section className="space-y-12">
                    <div className="bg-[var(--bg-card)]/40 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-[var(--border-color)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 blur-[100px] -z-10 group-hover:bg-[var(--accent)]/10 transition-colors duration-700" />
                        
                        <div className="flex flex-col md:flex-row gap-10 items-center">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[var(--accent)]/20 p-1 shrink-0 bg-gradient-to-tr from-[var(--bg-card)] to-[var(--bg-main)]">
                                <div className="w-full h-full rounded-full bg-[var(--bg-main)] flex items-center justify-center">
                                    <User className="w-12 h-12 text-[var(--accent)]" />
                                </div>
                            </div>
                            <div className="space-y-4 text-center md:text-left transition-all">
                                <span className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-black uppercase tracking-widest rounded-full border border-[var(--accent)]/20">Lead Developer</span>
                                <h2 className="text-3xl font-black text-white tracking-tight">Aman Kumar</h2>
                                <p className="text-[var(--text-muted)] leading-relaxed text-sm font-medium max-w-xl">
                                    I am a college student and full-stack engineer passionate about building high-fidelity open-source systems. ToonPlayer is a personal project developed for educational purposes, focusing on advanced streaming architecture and premium UI/UX interfaces.
                                </p>
                            </div>
                        </div>

                        <div className="mt-12 pt-12 border-t border-[var(--border-color)] space-y-6">
                            <div className="flex items-center gap-3 text-[var(--accent)]">
                                <Shield className="w-5 h-5" />
                                <h3 className="text-sm font-black uppercase tracking-widest">Legal Disclaimer</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-[var(--text-muted)] font-medium">
                                <p>
                                    ToonPlayer is a <span className="text-white">content aggregator</span>. We do not host, store, or upload any media files (videos, movies, or shows) on our own databases. All content links are indexed from third-party publicly available sources on the web.
                                </p>
                                <p>
                                    This platform is a <span className="text-white">personal development project</span>. We do not encourage digital piracy. For copyright issues or index removals, please contact the respective file hosts or edge hosts.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </main>
    );
}
