"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Camera, Check, Save } from "lucide-react";
import toast from "react-hot-toast";

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Shadow",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Frost",
];

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
    const [name, setName] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const p = localStorage.getItem("toonplayer_profile");
            if (p) {
                try {
                    const parsed = JSON.parse(p);
                    setName(parsed.name || "");
                    setSelectedAvatar(parsed.avatar || AVATARS[0]);
                } catch (e) {
                    setSelectedAvatar(AVATARS[0]);
                }
            } else {
                setSelectedAvatar(AVATARS[0]);
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        setIsSaving(true);
        setTimeout(() => {
            const profile = { name: name.trim(), avatar: selectedAvatar };
            localStorage.setItem("toonplayer_profile", JSON.stringify(profile));
            
            // Dispatch custom event to notify Header and other components
            window.dispatchEvent(new Event('profileUpdated'));
            
            toast.success("Profile updated successfully!");
            setIsSaving(false);
            onClose();
        }, 800);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">Profile Settings</h2>
                                    <p className="text-xs text-[var(--text-muted)] font-medium">Personalize your ToonPlayer experience</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--text-muted)] hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Avatar Picker */}
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)]">
                                    <Camera className="w-3 h-3" />
                                    Choose Avatar
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                    {AVATARS.map((avatar) => (
                                        <button
                                            key={avatar}
                                            onClick={() => setSelectedAvatar(avatar)}
                                            className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all ${
                                                selectedAvatar === avatar 
                                                ? "border-purple-500 scale-110 shadow-lg shadow-purple-500/20" 
                                                : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                                            }`}
                                        >
                                            <img src={avatar} alt="Avatar option" className="w-full h-full object-cover" />
                                            {selectedAvatar === avatar && (
                                                <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name Input */}
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)]">
                                    <User className="w-3 h-3" />
                                    Display Name
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-purple-500/50 rounded-2xl px-5 py-4 text-white outline-none transition-all shadow-inner font-bold"
                                        maxLength={20}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-muted)]">
                                        {name.length}/20
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 border-t border-[var(--border-color)] flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 px-6 rounded-2xl border border-[var(--border-color)] text-[var(--text-muted)] font-bold hover:bg-white/5 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
