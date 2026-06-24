"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function OpeningAnimation() {
  const [shouldPlay, setShouldPlay] = useState(false);
  const [visible, setVisible] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasPlayed = sessionStorage.getItem("toonplayer-intro-played");
      if (!hasPlayed) {
        setShouldPlay(true);
        setVisible(true);
        // Save state immediately to prevent multiple runs in concurrent tabs
        sessionStorage.setItem("toonplayer-intro-played", "true");
        
        // Duration: 1.4 seconds
        const timer = setTimeout(() => {
          setVisible(false);
        }, 1400);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!shouldPlay) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black select-none pointer-events-none"
        >
          {prefersReduced ? (
            // Simplified fade animation for reduced motion or low-end devices
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0 }}
              className="text-center"
            >
              <h2 className="text-3xl font-black font-sora tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-cyan-400 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]">
                TOONPLAYER
              </h2>
            </motion.div>
          ) : (
            // Premium cinematic neon logo reveal
            <div className="relative flex flex-col items-center justify-center hide-scrollbar">
              {/* Background ambient glow */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.4, 0.6, 0], scale: [0.8, 1, 1.2, 1.6] }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
                className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-orange-500 to-cyan-400 blur-[60px] opacity-30 pointer-events-none"
              />

              {/* Glowing animated logo symbol */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ 
                  scale: [0.8, 1, 1.02, 3.2], 
                  opacity: [0, 1, 1, 0], 
                  y: [10, 0, 0, -20]
                }}
                transition={{ 
                  duration: 1.4, 
                  ease: [0.22, 1, 0.36, 1], 
                  times: [0, 0.25, 0.7, 1] 
                }}
                className="flex flex-col items-center justify-center filter drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]"
              >
                {/* SVG Stylized "T" line drawing logo */}
                <svg className="w-24 h-24 text-orange-500" viewBox="0 0 100 100" fill="none">
                  {/* Neon Glow filters */}
                  <defs>
                    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#22D3EE" />
                    </linearGradient>
                  </defs>
                                    {/* Vertical bar of T */}
                  <motion.path
                    d="M50 25 L50 85"
                    stroke="url(#neonGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
                  />

                  {/* Horizontal bar of T */}
                  <motion.path
                    d="M20 25 L80 25"
                    stroke="url(#neonGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
                  />
                  
                  {/* Decorative neon dot */}
                  <motion.circle
                    cx="50"
                    cy="85"
                    r="5"
                    fill="#22D3EE"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25, delay: 0.5, type: "spring", stiffness: 300, damping: 15 }}
                  />
                </svg>

                {/* Text reveal */}
                <motion.h2 
                  initial={{ opacity: 0, letterSpacing: "0.1em" }}
                  animate={{ opacity: [0, 1, 1, 0], letterSpacing: ["0.1em", "0.2em", "0.2em", "0.3em"] }}
                  transition={{ duration: 1.4, times: [0, 0.25, 0.7, 1], ease: "easeInOut" }}
                  className="text-lg font-black tracking-widest text-white mt-4 uppercase font-sora"
                >
                  ToonPlayer
                </motion.h2>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
