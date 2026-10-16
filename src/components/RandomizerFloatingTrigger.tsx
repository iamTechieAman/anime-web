"use client";

import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import { usePathname } from "next/navigation";

export default function RandomizerFloatingTrigger() {
    const pathname = usePathname();

    // Do not obscure playback controls on watch routes
    if (pathname?.startsWith("/watch")) {
        return null;
    }

    const handleClick = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("openRandomizer"));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.5 }}
            className="group fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:right-6 md:bottom-6 z-40 pointer-events-auto hide-scrollbar"
        >
            <button
                onClick={handleClick}
                aria-label="Surprise Me (Randomizer)"
                className="relative flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-[0_4px_20px_rgba(236,72,153,0.35)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] border border-pink-500/30 transition-all duration-200 cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c10] hide-scrollbar"
            >
                {/* Micro-animating Shuffle Icon */}
                <Shuffle className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-105 will-change-transform" />
            </button>

            {/* Tooltip */}
            <div className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#12141D] border border-white/10 rounded-lg text-white text-[11px] font-bold tracking-wide uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-2xl">
                Surprise Me <kbd className="ml-1.5 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 font-bold">R</kbd>
            </div>
        </motion.div>
    );
}
