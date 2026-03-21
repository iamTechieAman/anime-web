"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Camera, Check, Save, Settings2, Play, FastForward } from "lucide-react";
import toast from "react-hot-toast";

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const AVATARS = [
    "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/9.x/avataaars/svg?seed=Milo",
    "https://api.dicebear.com/9.x/avataaars/svg?seed=Luna",
    "https://api.dicebear.com/9.x/avataaars/svg?seed=Oliver",
    "https://api.dicebear.com/9.x/avataaars/svg?seed=Shadow",
    "https://api.dicebear.com/9.x/avataaars/svg?seed=Midnight",
    "https://api.dicebear.com/9.x/avataaars/svg?seed=Frost",
];

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
    const [name, setName] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    
    // Additional settings
    const [autoplay, setAutoplay] = useState(true);
    const [autoSkip, setAutoSkip] = useState(true);
    const [quality, setQuality] = useState("Auto");
    
    // New advanced features
    const [smartSwitch, setSmartSwitch] = useState(true);
    const [multiAudio, setMultiAudio] = useState(true);
    const [dataSaver, setDataSaver] = useState(false);

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
            
            // Load settings
            const s = localStorage.getItem("toonplayer_settings");
            if (s) {
                try {
                    const parsed = JSON.parse(s);
                    if (parsed.autoplay !== undefined) setAutoplay(parsed.autoplay);
                    if (parsed.autoSkip !== undefined) setAutoSkip(parsed.autoSkip);
                    if (parsed.quality) setQuality(parsed.quality);
                    if (parsed.smartSwitch !== undefined) setSmartSwitch(parsed.smartSwitch);
                    if (parsed.multiAudio !== undefined) setMultiAudio(parsed.multiAudio);
                    if (parsed.dataSaver !== undefined) setDataSaver(parsed.dataSaver);
                } catch(e) {}
            } else {
                // Pre-fill defaults for brand new users
                const defaultSettings = { autoplay: true, autoSkip: true, quality: "Auto", smartSwitch: true, multiAudio: true, dataSaver: false };
                localStorage.setItem("toonplayer_settings", JSON.stringify(defaultSettings));
            }
        }
    }, [isOpen]);

    const updateSetting = (key: string, value: any) => {
        const newSettings = { autoplay, autoSkip, quality, smartSwitch, multiAudio, dataSaver, [key]: value };
        localStorage.setItem("toonplayer_settings", JSON.stringify(newSettings));
        window.dispatchEvent(new Event('profileUpdated'));
        // Trigger generic toast for feedback without being annoying
        // toast.success("Preference updated", { id: 'pref-update', duration: 1500 });
        
        switch (key) {
            case 'autoplay': setAutoplay(value); break;
            case 'autoSkip': setAutoSkip(value); break;
            case 'quality': setQuality(value); break;
            case 'smartSwitch': setSmartSwitch(value); break;
            case 'multiAudio': setMultiAudio(value); break;
            case 'dataSaver': setDataSaver(value); break;
        }
    };

    const handleSaveProfile = () => {
        if (!name.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        setIsSaving(true);
        setTimeout(() => {
            const profile = { name: name.trim(), avatar: selectedAvatar };
            localStorage.setItem("toonplayer_profile", JSON.stringify(profile));

            // Sync with toonplayer_profiles array if it exists
            const savedProfilesStr = localStorage.getItem("toonplayer_profiles");
            if (savedProfilesStr) {
                try {
                    const savedProfiles = JSON.parse(savedProfilesStr);
                    const idx = savedProfiles.findIndex((p: any) => p.avatar === profile.avatar || p.name === profile.name);
                    if (idx >= 0) {
                        savedProfiles[idx] = profile;
                        localStorage.setItem("toonplayer_profiles", JSON.stringify(savedProfiles));
                    }
                } catch (e) {}
            }
            
            window.dispatchEvent(new Event('profileUpdated'));
            toast.success("Profile saved successfully!");
            setIsSaving(false);
            onClose();
        }, 600);
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
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden shadow-purple-500/10 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-white/5 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <Settings2 className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight font-sora">App Settings</h2>
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

                        {/* Content */}
                        <div className="p-6 overflow-y-auto hide-scrollbar space-y-8 flex-1">
                            
                            {/* Account Section */}
                            <div>
                                <h3 className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-4 flex items-center gap-2">
                                    <User className="w-3 h-3" /> Account Profile
                                </h3>
                                <div className="space-y-6 bg-white/5 p-5 rounded-2xl border border-[var(--border-color)]">
                                    {/* Avatar Picker */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-white">Select Avatar</label>
                                        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                            {AVATARS.map((avatar) => (
                                                <button
                                                    key={avatar}
                                                    onClick={() => setSelectedAvatar(avatar)}
                                                    className={`relative aspect-square w-14 shrink-0 rounded-full overflow-hidden border-2 transition-all ${
                                                        selectedAvatar === avatar 
                                                        ? "border-purple-500 scale-110 shadow-lg shadow-purple-500/20" 
                                                        : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                                                    }`}
                                                >
                                                    <img src={avatar} alt="Avatar option" className="w-full h-full object-cover" />
                                                    {selectedAvatar === avatar && (
                                                        <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                                            <Check className="w-4 h-4 text-white drop-shadow-md" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Name Input */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-white">Display Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Enter your name"
                                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all shadow-inner font-bold"
                                                maxLength={20}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-muted)]">
                                                {name.length}/20
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Playback Section */}
                            <div>
                                <h3 className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-4 flex items-center gap-2">
                                    <Play className="w-3 h-3" /> Playback Preferences
                                </h3>
                                <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-[var(--border-color)]">
                                    
                                    {/* Quality Selector */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Default Video Quality</p>
                                            <p className="text-xs text-[var(--text-muted)]">Select preferred stream res if available</p>
                                        </div>
                                        <select 
                                            value={quality}
                                            onChange={(e) => updateSetting('quality', e.target.value)}
                                            className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-purple-500/50"
                                        >
                                            <option value="Auto">Auto</option>
                                            <option value="1080p">1080p FHD</option>
                                            <option value="720p">720p HD</option>
                                        </select>
                                    </div>

                                    <div className="w-full h-px bg-[var(--border-color)]" />

                                    {/* Autoplay Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Autoplay Next Episode</p>
                                            <p className="text-xs text-[var(--text-muted)]">Seamlessly start the next episode</p>
                                        </div>
                                        <button 
                                            onClick={() => updateSetting('autoplay', !autoplay)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${autoplay ? 'bg-purple-500' : 'bg-zinc-700'}`}
                                        >
                                            <motion.div 
                                                className="w-4 h-4 rounded-full bg-white shadow-md"
                                                animate={{ x: autoplay ? 24 : 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>

                                    <div className="w-full h-px bg-[var(--border-color)]" />

                                    {/* Auto-Skip Intro */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white">Auto-skip Intro</p>
                                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-wider border border-blue-500/20">Beta</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">Automatically bypass anime openings</p>
                                        </div>
                                        <button 
                                            onClick={() => updateSetting('autoSkip', !autoSkip)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${autoSkip ? 'bg-blue-500' : 'bg-zinc-700'}`}
                                        >
                                            <motion.div 
                                                className="w-4 h-4 rounded-full bg-white shadow-md"
                                                animate={{ x: autoSkip ? 24 : 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                    
                                    <div className="w-full h-px bg-[var(--border-color)]" />

                                    {/* Smart Server Switch */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Smart Server Switching</p>
                                            <p className="text-xs text-[var(--text-muted)]">Auto-bypass broken or dead servers</p>
                                        </div>
                                        <button 
                                            onClick={() => updateSetting('smartSwitch', !smartSwitch)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${smartSwitch ? 'bg-purple-500' : 'bg-zinc-700'}`}
                                        >
                                            <motion.div 
                                                className="w-4 h-4 rounded-full bg-white shadow-md"
                                                animate={{ x: smartSwitch ? 24 : 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                    
                                    <div className="w-full h-px bg-[var(--border-color)]" />

                                    {/* Prioritize Multi-Audio (ToonPlayer VIP) */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Prioritize Multi-Audio</p>
                                            <p className="text-xs text-[var(--text-muted)]">Favor ToonPlayer VIP streams</p>
                                        </div>
                                        <button 
                                            onClick={() => updateSetting('multiAudio', !multiAudio)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${multiAudio ? 'bg-purple-500' : 'bg-zinc-700'}`}
                                        >
                                            <motion.div 
                                                className="w-4 h-4 rounded-full bg-white shadow-md"
                                                animate={{ x: multiAudio ? 24 : 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                    
                                    <div className="w-full h-px bg-[var(--border-color)]" />

                                    {/* Data Saver Mode */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-[var(--accent)]">Data & Battery Saver</p>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">Reduce blur effects for smoother UI</p>
                                        </div>
                                        <button 
                                            onClick={() => updateSetting('dataSaver', !dataSaver)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${dataSaver ? 'bg-[var(--accent)]' : 'bg-zinc-700'}`}
                                        >
                                            <motion.div 
                                                className="w-4 h-4 rounded-full bg-white shadow-md"
                                                animate={{ x: dataSaver ? 24 : 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 border-t border-[var(--border-color)] flex gap-4 shrink-0">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 px-6 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] font-bold hover:bg-white/5 transition-all active:scale-95 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex-[2] py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Profile
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
