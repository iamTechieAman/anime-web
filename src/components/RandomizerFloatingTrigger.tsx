"use client";

import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";

export default function RandomizerFloatingTrigger() {
    const handleClick = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("openRandomizer"));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 100, delay: 1 }}
            className="fixed right-4 bottom-20 md:right-6 md:bottom-6 z-40 pointer-events-auto"
        >
            <button
                onClick={handleClick}
                aria-label="Surprise Me (Randomizer)"
                className="group relative flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.45)] border border-pink-500/30 transition-all duration-[250ms] cursor-pointer active:scale-90"
            >
                {/* Micro-animating Shuffle Icon */}
                <Shuffle className="w-5 h-5 transition-transform duration-[250ms] group-hover:rotate-12 group-hover:scale-110" will-change-transform />

                {/* Pulse wave overlay */}
                <span className="absolute -inset-0.5 rounded-full bg-pink-500/20 animate-ping opacity-75 pointer-events-none group-hover:animate-none" />

                {/* Premium Tooltip */}
                <div className="absolute right-14 px-3 py-1.5 bg-[#12131A] border border-white/10 rounded-lg text-white text-[10px] font-black tracking-wider uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-2xl">
                    Surprise Me <kbd className="ml-1.5 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-normal">R</kbd>
                </div>
            </button>
        </motion.div>
    );
}
