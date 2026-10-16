"use client";

import Link from "next/link";
import { Github, Heart } from "lucide-react";
import Logo from "@/components/Logo";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative z-10 w-full bg-[#09090b] border-t border-white/[0.06] pt-10 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-10 mt-auto">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col items-center justify-center gap-6">
                {/* Brand & TMDB Disclaimer */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex justify-center items-center h-[36px] w-[36px] relative" style={{ filter: "drop-shadow(0 0 10px rgba(229,9,20,0.5))" }}>
                        <Logo />
                    </div>
                    <p className="text-xs text-zinc-400 max-w-sm sm:max-w-md leading-relaxed">
                        This site does not store files on its servers. All contents are indexed from non-affiliated third parties. Powered by TMDB.
                    </p>
                </div>

                {/* Links & Copyright */}
                <div className="flex flex-col items-center gap-4 text-center w-full max-w-2xl mx-auto">
                    <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-zinc-400">
                        <Link scroll={false} href="/privacy" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded">Privacy Policy</Link>
                        <Link scroll={false} href="/terms" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded">DMCA & Terms</Link>
                        <Link scroll={false} href="/contact" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded">Contact</Link>
                        <a href="https://github.com/iamTechieAman/anime-web" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded">
                            <Github className="w-4 h-4" /> GitHub
                        </a>
                        <span className="text-[10px] bg-white/[0.05] border border-white/10 px-2.5 py-0.5 rounded-full text-zinc-400 font-bold tracking-widest cursor-default">
                            V5.0
                        </span>
                    </nav>
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent max-w-sm mx-auto" />
                    <p className="text-[11px] text-zinc-500 tracking-wider uppercase font-bold">
                        © {currentYear} ToonPlayer. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
