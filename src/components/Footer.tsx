"use client";

import Link from "next/link";
import { Github, Heart } from "lucide-react";
import Logo from "@/components/Logo";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative z-10 w-full bg-bg-main border-t border-[rgba(255,255,255,0.06)] pt-8 pb-24 md:pb-8 mt-auto">
            <div className="max-w-[1800px] mx-auto px-6 flex flex-col items-center justify-center gap-6">
                {/* Brand & TMDB Disclaimer */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex justify-center items-center h-[36px] w-[36px] relative" style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.4))" }}>
                        <Logo />
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] max-w-sm sm:max-w-md leading-relaxed">
                        This site does not store files. We only index links. Powered by TMDB.
                    </p>
                </div>

                {/* Links & Copyright */}
                <div className="flex flex-col items-center gap-4 text-center w-full max-w-2xl mx-auto">
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-bold text-[var(--text-muted)]">
                        <Link scroll={false} href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link scroll={false} href="/terms" className="hover:text-white transition-colors">DMCA</Link>
                        <Link scroll={false} href="/contact" className="hover:text-white transition-colors">Contact</Link>
                        <a href="https://github.com/iamTechieAman/anime-web" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                            <Github className="w-4 h-4" /> GitHub
                        </a>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-full text-white/50 font-black tracking-widest cursor-default">
                            V5.0
                        </span>
                    </div>
                    <div className="w-full h-px bg-white/5 max-w-xs mx-auto" />
                    <p className="text-[10px] text-zinc-500 tracking-widest uppercase font-black">
                        © {currentYear} ToonPlayer. Made with ❤️ by Aman Kumar.
                    </p>
                </div>
            </div>
        </footer>
    );
}
