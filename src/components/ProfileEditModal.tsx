"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Check, Trash2 } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ModalPortal from "./ModalPortal";
import { useUserStore, Profile } from "@/store/userStore";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATARS = [
  { name: "Totoro", url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Totoro" },
  { name: "Ponyo", url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Ponyo" },
  { name: "Luffy", url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Luffy" },
  { name: "Naruto", url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Naruto" },
  { name: "Nezuko", url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Nezuko" },
  { name: "Goku", url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Goku" },
  { name: "Pikachu", url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Pikachu" },
  { name: "Chihiro", url: "https://api.dicebear.com/9.x/avataaars/svg?seed=Chihiro" }
];

const THEMES = [
  { name: "red", value: "#E50914" },
  { name: "blue", value: "#00A8E1" },
  { name: "green", value: "#1CE783" },
  { name: "purple", value: "#9933FF" },
  { name: "orange", value: "#F97316" }
];

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { profiles, activeProfileId, setActiveProfile, addProfile, removeProfile, syncProfile } = useUserStore();
  
  // Modes: 'list' | 'edit' | 'create'
  const [mode, setMode] = useState<'list' | 'edit' | 'create'>('list');
  const [isManaging, setIsManaging] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Form states
  const [profileName, setProfileName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);
  const [isKids, setIsKids] = useState(false);
  const [theme, setTheme] = useState("orange");

  useEffect(() => {
    if (isOpen) {
      setMode('list');
      setIsManaging(false);
      setEditingProfile(null);
    }
  }, [isOpen]);

  const handleSelectProfile = (profile: Profile) => {
    if (isManaging) {
      // Enter edit mode for this profile
      setEditingProfile(profile);
      setProfileName(profile.name);
      setSelectedAvatar(profile.avatar);
      setIsKids(profile.isKids);
      setTheme(profile.theme || "orange");
      setMode('edit');
    } else {
      // Switch active profile
      setActiveProfile(profile.id);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("toonplayer-session-active", "true");
        window.dispatchEvent(new Event("profileUpdated"));
      }
      toast.success(`Switched to profile: ${profile.name}`);
      onClose();
    }
  };

  const handleCreateOpen = () => {
    setProfileName("");
    setSelectedAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)].url);
    setIsKids(false);
    setTheme(THEMES[Math.floor(Math.random() * THEMES.length)].name);
    setMode('create');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    addProfile({
      name: profileName.trim(),
      avatar: selectedAvatar,
      type: isKids ? 'kids' : 'adult',
      isKids,
      theme
    });

    toast.success(`Created profile: ${profileName}`);
    setMode('list');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !profileName.trim()) return;

    syncProfile({
      id: editingProfile.id,
      name: profileName.trim(),
      avatar: selectedAvatar,
      type: isKids ? 'kids' : (editingProfile.type === 'guest' ? 'guest' : 'adult'),
      isKids,
      theme
    });

    toast.success(`Updated profile: ${profileName}`);
    setMode('list');
  };

  const handleDeleteProfile = (id: string) => {
    if (id === 'profile-guest' || id === 'profile-adult' || id === 'profile-teen' || id === 'profile-kids') {
      toast.error("Cannot delete default system profiles.");
      return;
    }
    removeProfile(id);
    toast.success("Profile deleted.");
    setMode('list');
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="relative p-6 sm:p-8 flex flex-col min-h-0 overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white cursor-pointer z-20"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {mode === 'list' && (
            <motion.div
              key="profile-list"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-2xl md:text-3xl font-black font-sora text-white mb-8 text-center">
                {isManaging ? "Manage Profiles" : "Who's Watching?"}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
                {profiles.map((p) => {
                  const isActive = activeProfileId === p.id;
                  const themeColor = THEMES.find(t => t.name === p.theme)?.value || "#FFFFFF";
                  
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProfile(p)}
                      className="group relative cursor-pointer flex flex-col items-center gap-3"
                    >
                      {/* Avatar wrap */}
                      <div 
                        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 transition-all duration-[250ms] ${
                          isActive && !isManaging
                            ? 'border-white shadow-[0_0_24px_rgba(255,255,255,0.3)] bg-zinc-800' 
                            : 'border-transparent group-hover:scale-105'
                        }`}
                        style={{
                          borderColor: isManaging ? '#ffffff30' : (isActive ? 'white' : 'transparent'),
                          boxShadow: !isManaging && isActive ? `0 0 20px ${themeColor}40` : 'none'
                        }}
                      >
                        <Image src={p.avatar} alt={p.name} fill sizes="112px" className="object-cover" />
                        
                        {/* Manage Overlay */}
                        {isManaging && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity">
                            <Pencil className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>

                      <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">
                        {p.name}
                      </span>
                    </div>
                  );
                })}

                {true && (
                  <button
                    onClick={handleCreateOpen}
                    className="group flex flex-col items-center gap-3 cursor-pointer"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-zinc-700 bg-transparent group-hover:border-white group-hover:bg-white/5 transition-all flex items-center justify-center">
                      <Plus className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-sm font-bold text-zinc-500 group-hover:text-white transition-colors">
                      Add Profile
                    </span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsManaging(!isManaging)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  isManaging
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-transparent border border-white/20 text-white hover:bg-white/5"
                } cursor-pointer`}
              >
                {isManaging ? "Done" : "Manage Profiles"}
              </button>
            </motion.div>
          )}

          {(mode === 'create' || mode === 'edit') && (
            <motion.form
              key={mode}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={mode === 'create' ? handleCreateSubmit : handleEditSubmit}
              className="space-y-6"
            >
              <h2 className="text-xl md:text-2xl font-black font-sora text-white text-center">
                {mode === 'create' ? "Add Profile" : `Edit Profile: ${editingProfile?.name}`}
              </h2>

              <div className="flex flex-col md:flex-row gap-6 items-center">
                {/* Visual Preview */}
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-4 border-[var(--accent)] bg-zinc-800 shrink-0">
                  <Image src={selectedAvatar} alt="Profile Avatar" fill sizes="128px" className="object-cover" />
                </div>

                <div className="flex-1 w-full space-y-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Name</label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--accent)] transition-all"
                      placeholder="Enter profile name"
                    />
                  </div>

                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    {/* Kids Mode */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isKids}
                        onChange={(e) => setIsKids(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 accent-[var(--accent)] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white">Kids Profile</span>
                    </label>

                    {/* Theme Picker */}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Theme</span>
                      <div className="flex gap-2">
                        {THEMES.map((t) => (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => setTheme(t.name)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              theme === t.name
                                ? "scale-110 border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: t.value }}
                            aria-label={`Theme ${t.name}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Avatar Chooser */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Select Avatar</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVATARS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.url;
                    return (
                      <button
                        key={avatar.name}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.url)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-white/5 p-1 transition-all ${
                          isSelected ? "border-[var(--accent)] bg-white/10" : "border-transparent hover:border-white/20"
                        } cursor-pointer`}
                      >
                        <div className="relative w-full h-full">
                          <Image src={avatar.url} alt={avatar.name} fill className="object-cover rounded-lg" sizes="60px" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!profileName.trim()}
                  className="flex-1 min-w-[120px] py-3 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-[0_0_20px_var(--accent-glow)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Save
                </button>
                
                {mode === 'edit' && editingProfile && !['profile-guest', 'profile-adult', 'profile-teen', 'profile-kids'].includes(editingProfile.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProfile(editingProfile.id)}
                    className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="px-5 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </ModalPortal>
  );
}
