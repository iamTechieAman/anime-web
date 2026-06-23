"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useUserStore, Profile, getAvatarUrl } from "@/store/userStore";
import { useUser } from "@clerk/nextjs";

const ProfileAvatar = ({ src, alt, sizes = "120px" }: { src?: string | null, alt?: string | null, sizes?: string }) => {
  const [error, setError] = useState(false);
  const isInvalidSrc = !src || 
    src === "null" || 
    src === "undefined" || 
    src.trim() === "" || 
    src.includes("undefined") ||
    src.includes("/undefined") ||
    src.includes("/null");
  const fallbackChar = (alt && typeof alt === 'string' && alt.trim().length > 0) 
    ? alt.trim().charAt(0).toUpperCase() 
    : "?";
  
  return error || isInvalidSrc ? (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent to-accent-secondary text-white font-black text-4xl select-none">{fallbackChar}</div>
  ) : (
    <Image src={src!} alt={alt || "Avatar"} fill sizes={sizes} className="object-cover" onError={() => setError(true)} />
  );
};

export default function ProfileGate() {
  const { profiles, activeProfileId, setActiveProfile, addProfile, removeProfile, syncProfile } = useUserStore();
  const [showGate, setShowGate] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isKids, setIsKids] = useState(false);
  const [theme, setTheme] = useState("orange");
  const [isClient, setIsClient] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const { user, isLoaded } = useUser();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Sync external profile (Clerk) if logged in
    if (isLoaded && user && !synced) {
      const clerkProfileId = `profile-${user.id}`;
      const clerkName = user.firstName || user.username || "My Profile";
      const clerkAvatar = user.imageUrl || getAvatarUrl(clerkName, 'orange');
      
      syncProfile({ id: clerkProfileId, name: clerkName, avatar: clerkAvatar });
      setSynced(true);
    }

    const checkPersistedProfile = () => {
      let activeId = activeProfileId;
      if (!activeId && typeof window !== "undefined") {
        try {
          const storeData = window.localStorage.getItem("toonplayer-unified-store");
          if (storeData) {
            const parsed = JSON.parse(storeData);
            if (parsed && parsed.state && parsed.state.activeProfileId) {
              activeId = parsed.state.activeProfileId;
            }
          }
        } catch (e) {}

        if (!activeId) {
          const match = document.cookie.match(/(^|;)\s*toonplayer_active_profile_id\s*=\s*([^;]+)/);
          if (match) {
            activeId = match[2];
          }
        }
      }

      if (activeId) {
        if (activeProfileId !== activeId) {
          setActiveProfile(activeId);
        }
        setShowGate(false);
      } else {
        setShowGate(true);
      }
      setHasChecked(true);
    };

    if (!hasChecked) {
      checkPersistedProfile();
    }

    const handleOpen = () => setShowGate(true);
    const handleLogout = () => {
      setActiveProfile(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("toonplayer-session-active");
        window.sessionStorage.removeItem("toonplayer_active_profile_id");
        document.cookie = "toonplayer_active_profile_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      setShowGate(true);
    };

    window.addEventListener("openProfileGate", handleOpen);
    window.addEventListener("userLogout", handleLogout);
    
    return () => {
      window.removeEventListener("openProfileGate", handleOpen);
      window.removeEventListener("userLogout", handleLogout);
    };
  }, [activeProfileId, setActiveProfile, isLoaded, user, synced, syncProfile, hasChecked]);

  const handleSelectProfile = (profile: Profile) => {
    setSelectedId(profile.id);
    
    // Netflix-style delay for the zoom effect before disappearing
    setTimeout(() => {
      setActiveProfile(profile.id);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("toonplayer-session-active", "true");
        window.sessionStorage.setItem("toonplayer_active_profile_id", profile.id);
        document.cookie = `toonplayer_active_profile_id=${profile.id}; path=/; max-age=31536000; SameSite=Lax`;
      }
      setShowGate(false);
      setSelectedId(null);
      window.dispatchEvent(new Event("profileUpdated"));
    }, 800);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const newAvatar = getAvatarUrl(profileName.trim(), theme);
    addProfile({
      name: profileName.trim(),
      avatar: newAvatar,
      isKids,
      theme,
      type: isKids ? 'kids' : 'adult',
    });
    setIsCreating(false);
    setProfileName("");
    setIsKids(false);
    setTheme("orange");
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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-bg-main"
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: selectedId ? 0 : 1, scale: selectedId ? 1.5 : 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-full max-w-4xl text-center"
          >
            <h1 className="text-3xl md:text-5xl font-black mb-10 tracking-tight font-sora text-white">
              Who's watching?
            </h1>
            
            {!isCreating ? (
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 lg:gap-12">
                {profiles.map((p) => {
                  const isSelected = selectedId === p.id;
                  const isFading = selectedId && !isSelected;
                  const themeGlowClass = 
                    p.theme === 'red' ? 'group-hover:border-[#E50914] group-hover:shadow-[0_0_20px_rgba(229,9,20,0.6)]' :
                    p.theme === 'blue' ? 'group-hover:border-[#00A8E1] group-hover:shadow-[0_0_20px_rgba(0,168,225,0.6)]' :
                    p.theme === 'green' ? 'group-hover:border-[#1CE783] group-hover:shadow-[0_0_20px_rgba(28,231,131,0.6)]' :
                    p.theme === 'purple' ? 'group-hover:border-[#9933FF] group-hover:shadow-[0_0_20px_rgba(153,51,255,0.6)]' :
                    'group-hover:border-white group-hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]';

                  const selectGlowClass = 'border-white shadow-[0_0_30px_rgba(255,255,255,0.8)]';

                  return (
                    <motion.div 
                      key={p.id}
                      animate={
                        isSelected 
                          ? { scale: 1.15, zIndex: 50, opacity: 1 } 
                          : isFading 
                            ? { opacity: 0, scale: 0.9 }
                            : { opacity: 1, scale: 1 }
                      }
                      whileHover={!selectedId ? { scale: 1.05 } : {}}
                      whileTap={!selectedId ? { scale: 0.95 } : {}}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="relative group cursor-pointer flex flex-col items-center gap-4"
                      onClick={() => !selectedId && handleSelectProfile(p)}
                    >
                      <div className={`relative w-[120px] h-[120px] rounded-xl overflow-hidden border-4 transition-all duration-[250ms] ${isSelected ? selectGlowClass : `border-transparent bg-zinc-800 ${themeGlowClass}`}`}>
                        <ProfileAvatar src={p.avatar} alt={p.name} />
                      </div>
                      
                      <motion.span 
                        animate={{ opacity: isSelected ? 0 : 1 }}
                        className="text-base md:text-lg font-bold text-zinc-400 group-hover:text-white transition-colors"
                      >
                        {p.name}
                      </motion.span>
                      
                      {!selectedId && p.id !== 'profile-guest' && p.id !== 'profile-adult' && p.id !== 'profile-teen' && p.id !== 'profile-kids' && (
                        <button 
                          onClick={(e) => deleteProfile(e, p.id)}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700 z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  )
                })}
                
                {!selectedId && (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="group cursor-pointer flex flex-col items-center gap-4"
                    onClick={() => setIsCreating(true)}
                  >
                    <div className="w-[120px] h-[120px] rounded-xl border-4 border-dashed border-zinc-700 group-hover:border-white group-hover:bg-white/5 transition-all flex items-center justify-center bg-transparent">
                      <Plus className="w-10 h-10 text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-base md:text-lg font-bold text-zinc-500 group-hover:text-white transition-colors">Add Profile</span>
                  </motion.div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreate} className="flex flex-col items-center gap-6 max-w-md mx-auto">
                <div className="group relative w-full">
                  <div className="w-[120px] h-[120px] mx-auto rounded-xl bg-zinc-800 mb-6 shadow-2xl transition-transform duration-[250ms] group-hover:scale-105 border-4 border-transparent group-hover:border-white flex items-center justify-center overflow-hidden relative" will-change-transform>
                    {profileName.trim() ? (
                      <ProfileAvatar src={getAvatarUrl(profileName.trim(), theme)} alt="Avatar preview" />
                    ) : (
                      <span className="text-5xl font-bold text-zinc-600 opacity-30">?</span>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Name"
                    maxLength={15}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-white focus:bg-zinc-800 px-6 py-4 text-xl font-medium outline-none transition-all placeholder:text-zinc-600 rounded-md text-white font-sora"
                  />
                </div>

                <div className="flex flex-col gap-6 w-full py-2">
                  {/* Kids Mode Toggle */}
                  <label className="flex items-center justify-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isKids} 
                      onChange={(e) => setIsKids(e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 accent-orange-500 cursor-pointer"
                    />
                    <span className="text-base font-semibold text-white">Kids Profile</span>
                  </label>

                  {/* Theme Circle Picker */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Profile Theme</span>
                    <div className="flex gap-4">
                      {[
                        { name: 'red', value: '#E50914' },
                        { name: 'blue', value: '#00A8E1' },
                        { name: 'green', value: '#1CE783' },
                        { name: 'purple', value: '#9933FF' },
                        { name: 'orange', value: '#F97316' }
                      ].map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setTheme(t.name)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            theme === t.name 
                              ? 'scale-125 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]' 
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: t.value }}
                          aria-label={`Theme ${t.name}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    type="submit"
                    disabled={!profileName.trim()}
                    className="flex-1 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white px-8 py-4 text-lg font-bold transition-all disabled:cursor-not-allowed rounded-md cursor-pointer"
                  >
                    Continue
                  </button>
                  {profiles.length > 0 && (
                     <button
                       type="button"
                       onClick={() => setIsCreating(false)}
                       className="flex-1 bg-transparent hover:bg-white/10 px-6 py-4 text-lg font-medium transition-all border border-zinc-800 text-white rounded-md cursor-pointer"
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
