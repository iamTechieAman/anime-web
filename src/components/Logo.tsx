"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Logo({ className = "" }: { className?: string }) {
    return (
        <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`relative flex items-center justify-center cursor-pointer select-none shrink-0 w-full h-full hide-scrollbar ${className}`}
        >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent to-[#22D3EE] opacity-25 blur-[8px] rounded-full scale-110" />

            <Image 
                src="/icon.png" 
                alt="ToonPlayer Icon" 
                fill
                sizes="32px"
                className="object-contain relative z-10 filter drop-shadow-[0_0_8px_rgba(249,115,22,0.35)]" 
            />
        </motion.div>
    );
}
