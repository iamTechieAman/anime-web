"use client";

import Link from "next/link";
import { Mail, Github, Twitter, Heart, ExternalLink, ShieldCheck, FileText, MessageSquare } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer-wrap w-full mt-auto">
            {/* Gradient fade top connector */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
            <div className="w-full bg-gradient-to-b from-[var(--bg-card)]/30 to-[var(--bg-main)] backdrop-blur-sm">
                <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Brand Section */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-1 space-y-4">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 relative flex items-center justify-center">
                                <img 
                                    src="/logo.webp" 
                                    alt="ToonPlayer" 
                                    className="w-full h-full object-contain mix-blend-screen group-hover:scale-110 transition-transform duration-300"
                                />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-white">ToonPlayer</span>
                        </Link>
                        <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-xs">
                            Discover and watch thousands of movies, anime, and TV shows in high definition. Fast, free, and ad-safe.
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                            <a href="https://github.com/iamTechieAman" target="_blank" aria-label="Github" className="text-[var(--text-muted)] hover:text-white transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="#" aria-label="Twitter" className="text-[var(--text-muted)] hover:text-white transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="mailto:contact@toonplayer.in" aria-label="Email" className="text-[var(--text-muted)] hover:text-white transition-colors">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-4">
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest">Browse content</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/discover" className="text-[var(--text-muted)] hover:text-orange-400 transition-colors">Movies & TV</Link></li>
                            <li><Link href="/az-list/all" className="text-[var(--text-muted)] hover:text-orange-400 transition-colors">Anime Catalog</Link></li>
                            <li><Link href="/genres" className="text-[var(--text-muted)] hover:text-orange-400 transition-colors">Browse Genres</Link></li>
                            <li><Link href="/search" className="text-[var(--text-muted)] hover:text-orange-400 transition-colors">Advanced Search</Link></li>
                        </ul>
                    </div>

                    {/* Legal & Trust */}
                    <div className="space-y-4">
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest">Legal & Trust</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/privacy" className="text-[var(--text-muted)] hover:text-orange-400 transition-colors flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-[var(--text-muted)] hover:text-orange-400 transition-colors flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" /> Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-[var(--text-muted)] hover:text-orange-400 transition-colors flex items-center gap-2">
                                    <MessageSquare className="w-3.5 h-3.5" /> Contact & Support
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Disclaimer */}
                    <div className="space-y-4">
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest">Notice</h3>
                        <p className="text-[var(--text-muted)] text-[11px] leading-relaxed italic">
                            ToonPlayer is a content aggregator and does not host any media files directly. All link indices are found publicly on the internet. We respect intellectual property and strictly follow DMCA guidelines.
                        </p>
                        <div className="pt-2">
                             <a href="https://www.themoviedb.org/" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-[var(--text-muted)] hover:text-white transition-colors">
                                Powered by TMDB <ExternalLink className="w-2.5 h-2.5" />
                             </a>
                        </div>
                    </div>
                </div>


                <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-4 max-w-[1800px] mx-auto px-4 md:px-6 w-full">
                    <p className="text-[var(--text-muted)] text-[10px] font-medium tracking-wider uppercase">
                        © {currentYear} ToonPlayer.in • Built for HD Streaming Excellence
                    </p>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px]">
                        <span>Made with</span>
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        <span>by Aman Kumar</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
