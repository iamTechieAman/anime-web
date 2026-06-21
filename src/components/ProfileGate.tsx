"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import Image from "next/image";

interface Profile {
  name: string;
  avatar: string;
}

export default function ProfileGate() {
  const [showGate, setShowGate] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const existingActive = localStorage.getItem("toonplayer_profile");
    if (!existingActive) {
      setShowGate(true);
    }
    
    const saved = localStorage.getItem("toonplayer_profiles");
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        setProfiles(parsed); 
        if (parsed.length === 0) setIsCreating(true);
      } catch (e) {
        setIsCreating(true);
      }
    } else {
      setIsCreating(true);
    }
  }, []);

  const handleSelectProfile = (profile: Profile) => {
    localStorage.setItem("toonplayer_profile", JSON.stringify(profile));
    window.dispatchEvent(new Event("profileUpdated"));
    setShowGate(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const newProfile = {
      name: profileName.trim(),
      avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(profileName)}`
    };

    const newProfiles = [...profiles, newProfile];
    localStorage.setItem("toonplayer_profiles", JSON.stringify(newProfiles));
    
    handleSelectProfile(newProfile);
  };

  const deleteProfile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const updated = profiles.filter((_, i) => i !== index);
    setProfiles(updated);
    localStorage.setItem("toonplayer_profiles", JSON.stringify(updated));
    if (updated.length === 0) setIsCreating(true);
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
            className="w-full max-w-2xl text-center"
          >
            <h1 className="text-3xl md:text-5xl font-black mb-8 tracking-tight font-sora">
              Who's watching?
            </h1>
            
            {!isCreating ? (
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
                {profiles.map((p, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group cursor-pointer flex flex-col items-center gap-3"
                    onClick={() => handleSelectProfile(p)}
                  >
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-orange-500 transition-all duration-300 shadow-xl group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] bg-[var(--bg-card)]">
                      <Image src={p.avatar} alt={p.name} fill sizes="128px" className="object-cover" />
                    </div>
                    <span className="text-sm md:text-base font-bold text-[var(--text-muted)] group-hover:text-white transition-colors">{p.name}</span>
                    <button 
                      onClick={(e) => deleteProfile(e, idx)}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    >
                      <X className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </motion.div>
                ))}
                
                {profiles.length < 4 && (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group cursor-pointer flex flex-col items-center gap-3"
                    onClick={() => setIsCreating(true)}
                  >
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-2 border-dashed border-[var(--border-color)] group-hover:border-white transition-colors flex items-center justify-center bg-[var(--bg-card)]/50">
                      <Plus className="w-10 h-10 text-[var(--text-muted)] group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-sm md:text-base font-bold text-[var(--text-muted)] group-hover:text-white transition-colors">Add Profile</span>
                  </motion.div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreate} className="flex flex-col items-center gap-6 max-w-sm mx-auto">
                <div className="group relative w-full">
                  <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 p-[3px] mb-6 shadow-2xl transition-transform duration-300 group-hover:scale-105">
                    <div className="w-full h-full bg-[var(--bg-card)] rounded-full overflow-hidden flex items-center justify-center">
                      {profileName.trim() ? (
                        <Image 
                          src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(profileName)}`} 
                          alt="Avatar preview" 
                          fill
                          sizes="160px"
                          className="object-cover"
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
                    className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] focus:border-orange-500 rounded-2xl px-6 py-4 text-xl text-center font-bold outline-none transition-all placeholder:font-normal placeholder:opacity-50"
                  />
                </div>

                <div className="flex gap-3 w-full">
                  {profiles.length > 0 && (
                     <button
                       type="button"
                       onClick={() => setIsCreating(false)}
                       className="flex-1 bg-[var(--bg-card)] hover:bg-white/10 px-6 py-4 rounded-xl text-lg font-bold transition-all border border-[var(--border-color)] text-white"
                     >
                       Cancel
                     </button>
                  )}
                  <button
                    type="submit"
                    disabled={!profileName.trim()}
                    className="flex-1 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white px-8 py-4 rounded-xl text-lg font-bold transition-all disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
