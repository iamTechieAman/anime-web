"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useUserStore, Profile } from "@/store/userStore";

export default function ProfileGate() {
  const { profiles, activeProfileId, setActiveProfile, addProfile, removeProfile } = useUserStore();
  const [showGate, setShowGate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Show gate on first visit, logout, or if no active profile
    if (!activeProfileId) {
      setShowGate(true);
    }

    const handleOpen = () => setShowGate(true);
    const handleLogout = () => {
      setActiveProfile(null);
      setShowGate(true);
    };

    window.addEventListener("openProfileGate", handleOpen);
    window.addEventListener("userLogout", handleLogout);
    
    return () => {
      window.removeEventListener("openProfileGate", handleOpen);
      window.removeEventListener("userLogout", handleLogout);
    };
  }, [activeProfileId, setActiveProfile]);

  const handleSelectProfile = (profile: Profile) => {
    setSelectedId(profile.id);
    
    // Netflix-style delay for the zoom effect before disappearing
    setTimeout(() => {
      setActiveProfile(profile.id);
      setShowGate(false);
      setSelectedId(null);
      window.dispatchEvent(new Event("profileUpdated"));
    }, 800);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const newAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(profileName)}`;
    addProfile({ name: profileName.trim(), avatar: newAvatar });
    setIsCreating(false);
    setProfileName("");
  };

  const deleteProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeProfile(id);
    if (profiles.length <= 1) setIsCreating(true);
  };

  if (!isClient) return null;

  return (
    <AnimatePresence>
      {showGate && (
        <motion.div
          key="profile-gate"
          initial={{ opacity: 0, backgroundColor: "rgba(0,0,0,1)" }}
          animate={{ opacity: 1, backgroundColor: "var(--bg-main)" }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: selectedId ? 0 : 1, scale: selectedId ? 1.5 : 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-full max-w-4xl text-center"
          >
            <h1 className="text-3xl md:text-5xl font-black mb-10 tracking-tight font-sora">
              Who's watching?
            </h1>
            
            {!isCreating ? (
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 lg:gap-12">
                {profiles.map((p) => {
                  const isSelected = selectedId === p.id;
                  const isFading = selectedId && !isSelected;

                  return (
                    <motion.div 
                      key={p.id}
                      animate={
                        isSelected 
                          ? { scale: 1.3, zIndex: 50, opacity: 1 } 
                          : isFading 
                            ? { opacity: 0, scale: 0.9 }
                            : { opacity: 1, scale: 1 }
                      }
                      whileHover={!selectedId ? { scale: 1.1 } : {}}
                      whileTap={!selectedId ? { scale: 0.95 } : {}}
                      className="relative group cursor-pointer flex flex-col items-center gap-4"
                      onClick={() => !selectedId && handleSelectProfile(p)}
                    >
                      <div className={`relative w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-md overflow-hidden border-4 transition-colors duration-300 shadow-xl ${isSelected ? 'border-white shadow-[0_0_40px_rgba(255,255,255,0.4)]' : 'border-transparent group-hover:border-white group-hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] bg-[var(--bg-card)]'}`}>
                        <Image src={p.avatar} alt={p.name} fill sizes="160px" className="object-cover" />
                      </div>
                      
                      <motion.span 
                        animate={{ opacity: isSelected ? 0 : 1 }}
                        className="text-base md:text-xl font-medium text-[var(--text-muted)] group-hover:text-white transition-colors"
                      >
                        {p.name}
                      </motion.span>
                      
                      {!selectedId && (
                        <button 
                          onClick={(e) => deleteProfile(e, p.id)}
                          className="absolute -top-3 -right-3 p-1.5 bg-[var(--danger)] rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                        >
                          <X className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      )}
                    </motion.div>
                  )
                })}
                
                {profiles.length < 5 && !selectedId && (
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="group cursor-pointer flex flex-col items-center gap-4"
                    onClick={() => setIsCreating(true)}
                  >
                    <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-md border-2 border-dashed border-[var(--border-color)] group-hover:border-white group-hover:bg-white/5 transition-all flex items-center justify-center bg-transparent">
                      <Plus className="w-12 h-12 text-[var(--text-muted)] group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-base md:text-xl font-medium text-[var(--text-muted)] group-hover:text-white transition-colors">Add Profile</span>
                  </motion.div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreate} className="flex flex-col items-center gap-8 max-w-md mx-auto">
                <div className="group relative w-full">
                  <div className="w-36 h-36 md:w-48 md:h-48 mx-auto rounded-md bg-[var(--bg-card)] mb-8 shadow-2xl transition-transform duration-300 group-hover:scale-105 border-4 border-transparent group-hover:border-white flex items-center justify-center overflow-hidden">
                    {profileName.trim() ? (
                      <Image 
                        src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(profileName)}`} 
                        alt="Avatar preview" 
                        fill
                        sizes="192px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-6xl font-bold text-[var(--text-muted)] opacity-30">?</span>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Name"
                    maxLength={15}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] focus:border-white focus:bg-[var(--bg-elevated)] px-6 py-4 text-xl font-medium outline-none transition-all placeholder:text-[var(--text-muted)] rounded-md"
                  />
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    type="submit"
                    disabled={!profileName.trim()}
                    className="flex-1 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white px-8 py-4 text-lg font-bold transition-all disabled:cursor-not-allowed rounded-md"
                  >
                    Continue
                  </button>
                  {profiles.length > 0 && (
                     <button
                       type="button"
                       onClick={() => setIsCreating(false)}
                       className="flex-1 bg-transparent hover:bg-white/10 px-6 py-4 text-lg font-medium transition-all border border-[var(--border-color)] text-white rounded-md"
                     >
                       Cancel
                     </button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
