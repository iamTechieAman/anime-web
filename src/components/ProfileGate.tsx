"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfileGate() {
  const [showGate, setShowGate] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const existingProfile = localStorage.getItem("toonplayer_profile");
    if (!existingProfile) {
      setShowGate(true);
    }
  }, []);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    localStorage.setItem(
      "toonplayer_profile",
      JSON.stringify({ 
        name: profileName.trim(), 
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileName)}` 
      })
    );
    
    // Broadcast event so other components (like Header) can update immediately
    window.dispatchEvent(new Event("profileUpdated"));
    
    setShowGate(false);
  };

  if (!isClient) return null;

  return (
    <AnimatePresence>
      {showGate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] bg-[var(--bg-main)] flex flex-col items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full max-w-md text-center"
          >
            <h1 className="text-3xl md:text-5xl font-black mb-8 tracking-tight">
              Who's watching?
            </h1>
            
            <form onSubmit={handleContinue} className="flex flex-col items-center gap-6">
              <div className="group relative w-full">
                <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 p-[3px] mb-6 shadow-2xl transition-transform duration-300 group-hover:scale-105">
                  <div className="w-full h-full bg-[var(--bg-card)] rounded-full overflow-hidden flex items-center justify-center">
                    {profileName.trim() ? (
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileName)}`} 
                        alt="Avatar preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-[var(--text-muted)] opacity-50">?</span>
                    )}
                  </div>
                </div>
                
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={15}
                  className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] focus:border-purple-500 rounded-2xl px-6 py-4 text-xl text-center font-bold outline-none transition-all placeholder:font-normal placeholder:opacity-50"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!profileName.trim()}
                className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white px-8 py-4 rounded-xl text-lg font-bold transition-all disabled:cursor-not-allowed"
              >
                Let's Watch Anime
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
