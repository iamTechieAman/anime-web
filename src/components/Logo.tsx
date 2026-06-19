"use client";

import { motion } from "framer-motion";

export default function Logo({ className = "" }: { className?: string }) {
    return (
        <motion.div
            whileHover={{ scale: 1.08, rotate: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`relative flex items-center justify-center cursor-pointer select-none shrink-0 h-[30px] md:h-[36px] lg:h-[42px] w-auto aspect-square object-contain transition-transform duration-200 hover:scale-110 active:scale-95 ${className}`}
        >
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)] to-[#00d2ff] opacity-25 blur-[10px] rounded-full scale-110" />

            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full relative z-10"
            >
                {/* Themed Purple/Violet Path */}
                <path
                    d="M30 20 L75 45 L30 70 Z"
                    fill="url(#goldGradient)"
                    stroke="rgba(124,58,237,0.4)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                
                {/* Cyberpunk Blue/Cyan Overlapping Arc */}
                <path
                    d="M45 25 C65 30, 80 50, 75 70 C70 85, 50 90, 35 85"
                    stroke="url(#blueGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                />

                {/* Definitions for Gradients */}
                <defs>
                    <linearGradient id="goldGradient" x1="30" y1="20" x2="75" y2="70" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                    <linearGradient id="blueGradient" x1="45" y1="25" x2="35" y2="85" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#22D3EE" />
                        <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                </defs>
            </svg>
        </motion.div>
    );
}
