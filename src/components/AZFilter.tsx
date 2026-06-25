"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const letters = [
    "All", "0-9",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

export default function AZFilter() {
    const [active, setActive] = useState("All");

    return (
        <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar">
            <div className="flex items-center gap-2 min-w-max px-2">
                {letters.map((letter) => (
                    <Link
                        key={letter}
                        href={letter === "All" ? "/" : `/az-list/${letter}`}
                        onClick={() => setActive(letter)}
                        scroll={false}
                    >
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`
                px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200
                ${active === letter
                                    ? "bg-accent-warm text-white shadow-lg shadow-red-950/40 border border-accent-warm/50"
                                    : "bg-bg-card text-[var(--text-muted)] border border-border-color hover:bg-border-color hover:text-[var(--text-main)]"
                                }
              `}
                        >
                            {letter}
                        </motion.div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
