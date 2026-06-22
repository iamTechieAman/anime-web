"use client";

import Link from "next/link";
import { Github, Heart } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative z-10 w-full bg-black border-t border-[rgba(255,255,255,0.06)] pt-5 pb-24 md:pb-5 mt-auto">
            <div className="max-w-[1800px] mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Left: Brand & TMDB Disclaimer */}
                <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                    <span className="text-sm font-black tracking-wider uppercase text-white font-sora">
                        Toon<span className="text-[var(--accent)]">Player</span>
                    </span>
                    <span className="hidden sm:inline text-white/15">|</span>
                    <p className="text-[10px] text-[var(--text-muted)] max-w-sm sm:max-w-md leading-relaxed">
                        This site does not store files. We only index links. Powered by TMDB.
                    </p>
                </div>

                {/* Right: Links & Copyright */}
                <div className="flex flex-col items-center lg:items-end gap-2 text-center lg:text-right">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-[var(--text-muted)]">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">DMCA</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                        <a href="https://github.com/iamTechieAman/anime-web" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                            <Github className="w-3.5 h-3.5" /> GitHub
                        </a>
                        <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full text-white/40 cursor-default">
                            v5.0.0
                        </span>
                    </div>
                    <p className="text-[9.5px] text-[var(--text-muted)] tracking-wider">
                        © {currentYear} ToonPlayer. Made with ❤️ by Aman Kumar.
                    </p>
                </div>
            </div>
        </footer>
    );
}
