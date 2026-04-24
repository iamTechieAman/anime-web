"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Check, Save, Settings2, Play, Bell, TrendingUp, Sparkles, Bookmark, Users, Brain, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useNotifications, type NotificationPreferences } from "@/context/NotificationContext";

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

function ToggleSwitch({ value, onChange, color = "bg-purple-500" }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
    return (
        <button
            onClick={() => onChange(!value)}
            className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 ${value ? color : 'bg-zinc-700'}`}
        >
            <motion.div
                className="w-4 h-4 rounded-full bg-white shadow-md"
                animate={{ x: value ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        </button>
    );
}

const NOTIF_CATEGORIES: { key: keyof NotificationPreferences; label: string; desc: string; icon: any; color: string; toggleColor: string }[] = [
    { key: 'episodes', label: 'New Episodes', desc: 'Alert when new episodes drop for shows you follow', icon: Play, color: 'text-purple-400', toggleColor: 'bg-purple-500' },
    { key: 'trending', label: 'Trending Shows', desc: 'Discover what\'s hot on the platform right now', icon: TrendingUp, color: 'text-red-400', toggleColor: 'bg-red-500' },
    { key: 'recommendations', label: 'Recommendations', desc: 'Personalized picks curated just for your taste', icon: Sparkles, color: 'text-amber-400', toggleColor: 'bg-amber-500' },
    { key: 'watchlist', label: 'Watchlist Updates', desc: 'When new seasons or episodes arrive for saved shows', icon: Bookmark, color: 'text-blue-400', toggleColor: 'bg-blue-500' },
    { key: 'community', label: 'Community Activity', desc: 'What ToonPlayer users in your region are watching', icon: Users, color: 'text-green-400', toggleColor: 'bg-green-500' },
    { key: 'aiSmartAlerts', label: 'AI Smart Alerts', desc: 'Personalized nudges based on your watch patterns', icon: Brain, color: 'text-pink-400', toggleColor: 'bg-gradient-to-r from-purple-500 to-pink-500' },
];

const TABS = ['Account', 'Playback', 'Notifications'] as const;
type Tab = typeof TABS[number];

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
    const [activeTab, setActiveTab] = useState<Tab>('Account');
    const [name, setName] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Playback settings
    const [autoplay, setAutoplay] = useState(true);
    const [autoSkip, setAutoSkip] = useState(true);
    const [quality, setQuality] = useState("Auto");
    const [smartSwitch, setSmartSwitch] = useState(true);
    const [multiAudio, setMultiAudio] = useState(true);
    const [dataSaver, setDataSaver] = useState(false);
    const [aggressiveSandbox, setAggressiveSandbox] = useState(true);

    const { preferences, updatePreference } = useNotifications();

    useEffect(() => {
        if (isOpen) {
            const p = localStorage.getItem("toonplayer_profile");
            if (p) {
                try {
                    const parsed = JSON.parse(p);
                    setName(parsed.name || "");
                    setSelectedAvatar(parsed.avatar || AVATARS[0]);
                } catch { setSelectedAvatar(AVATARS[0]); }
            } else {
                setSelectedAvatar(AVATARS[0]);
            }

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
                    if (parsed.aggressiveSandbox !== undefined) setAggressiveSandbox(parsed.aggressiveSandbox);
                } catch {}
            }
        }
    }, [isOpen]);

    const updateSetting = (key: string, value: any) => {
        const newSettings = { autoplay, autoSkip, quality, smartSwitch, multiAudio, dataSaver, [key]: value };
        localStorage.setItem("toonplayer_settings", JSON.stringify(newSettings));
        window.dispatchEvent(new Event('profileUpdated'));
        switch (key) {
            case 'autoplay': setAutoplay(value); break;
            case 'autoSkip': setAutoSkip(value); break;
            case 'quality': setQuality(value); break;
            case 'smartSwitch': setSmartSwitch(value); break;
            case 'multiAudio': setMultiAudio(value); break;
            case 'dataSaver': setDataSaver(value); break;
            case 'aggressiveSandbox': setAggressiveSandbox(value); break;
        }
    };

    const handleSaveProfile = () => {
        if (!name.trim()) { toast.error("Name cannot be empty"); return; }
        setIsSaving(true);
        setTimeout(() => {
            const profile = { name: name.trim(), avatar: selectedAvatar };
            localStorage.setItem("toonplayer_profile", JSON.stringify(profile));
            const savedProfilesStr = localStorage.getItem("toonplayer_profiles");
            if (savedProfilesStr) {
                try {
                    const savedProfiles = JSON.parse(savedProfilesStr);
                    const idx = savedProfiles.findIndex((p: any) => p.avatar === profile.avatar || p.name === profile.name);
                    if (idx >= 0) {
                        savedProfiles[idx] = profile;
                        localStorage.setItem("toonplayer_profiles", JSON.stringify(savedProfiles));
                    }
                } catch {}
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
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{ transform: 'translateZ(0)' }}
                        className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden shadow-purple-500/10 flex flex-col max-h-[90vh] will-change-transform"
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
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--text-muted)] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tab Bar */}
                        <div className="flex border-b border-[var(--border-color)] shrink-0 bg-white/5">
                            {TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative flex-1 py-3 text-sm font-bold transition-colors ${activeTab === tab ? 'text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto hide-scrollbar flex-1">
                            <AnimatePresence mode="wait">
                                {activeTab === 'Account' && (
                                    <motion.div key="account" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                                        <div className="bg-white/5 p-5 rounded-2xl border border-[var(--border-color)] space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-white">Select Avatar</label>
                                                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                                    {AVATARS.map((avatar) => (
                                                        <button key={avatar} onClick={() => setSelectedAvatar(avatar)}
                                                            className={`relative aspect-square w-14 shrink-0 rounded-full overflow-hidden border-2 transition-all ${selectedAvatar === avatar ? "border-purple-500 scale-110 shadow-lg shadow-purple-500/20" : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"}`}
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
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-white">Display Name</label>
                                                <div className="relative">
                                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name"
                                                        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all shadow-inner font-bold"
                                                        maxLength={20} />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-muted)]">{name.length}/20</div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'Playback' && (
                                    <motion.div key="playback" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 bg-white/5 p-5 rounded-2xl border border-[var(--border-color)]">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-white">Default Video Quality</p>
                                                <p className="text-xs text-[var(--text-muted)]">Select preferred stream resolution</p>
                                            </div>
                                            <select value={quality} onChange={(e) => updateSetting('quality', e.target.value)}
                                                className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-purple-500/50">
                                                <option value="Auto">Auto</option>
                                                <option value="1080p">1080p FHD</option>
                                                <option value="720p">720p HD</option>
                                            </select>
                                        </div>
                                        <div className="w-full h-px bg-[var(--border-color)]" />
                                        {[
                                            { key: 'autoplay', label: 'Autoplay Next Episode', desc: 'Seamlessly start the next episode', value: autoplay, color: 'bg-purple-500' },
                                            { key: 'autoSkip', label: 'Auto-skip Intro', desc: 'Automatically bypass anime openings', value: autoSkip, color: 'bg-blue-500', badge: 'Beta' },
                                            { key: 'smartSwitch', label: 'Smart Server Switching', desc: 'Auto-bypass broken or dead servers', value: smartSwitch, color: 'bg-purple-500' },
                                            { key: 'multiAudio', label: 'Prioritize Multi-Audio', desc: 'Favor ToonPlayer VIP streams', value: multiAudio, color: 'bg-purple-500' },
                                            { key: 'dataSaver', label: 'Data & Battery Saver', desc: 'Reduce blur effects for smoother UI', value: dataSaver, color: 'bg-green-500' },
                                            { key: 'aggressiveSandbox', label: 'Aggressive Ad-Blocker', desc: 'Prevents external popups and redirects', value: aggressiveSandbox, color: 'bg-red-500', badge: 'Secure' },
                                        ].map((item, i, arr) => (
                                            <div key={item.key}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-white">{item.label}</p>
                                                            {item.badge && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-wider border border-blue-500/20">{item.badge}</span>}
                                                        </div>
                                                        <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                                                    </div>
                                                    <ToggleSwitch value={item.value} onChange={(v) => updateSetting(item.key, v)} color={item.color} />
                                                </div>
                                                {i < arr.length - 1 && <div className="w-full h-px bg-[var(--border-color)] mt-4" />}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}

                                {activeTab === 'Notifications' && (
                                    <motion.div key="notifications" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                                        {/* AI Smart Alert Banner */}
                                        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-4">
                                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />
                                            <div className="flex items-start gap-3 relative">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                                                    <Brain className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-sm font-black text-white">AI Smart Alerts</p>
                                                        <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded bg-purple-500/30 text-purple-300 border border-purple-500/30">New</span>
                                                    </div>
                                                    <p className="text-xs text-purple-200/70 leading-relaxed">ToonPlayer analyzes your viewing patterns and sends personalized alerts — like notifying you when your usual watch time begins. It learns your taste to surface content you'll love.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notification Categories */}
                                        <div className="bg-white/5 rounded-2xl border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
                                            {NOTIF_CATEGORIES.map(({ key, label, desc, icon: Icon, color, toggleColor }) => (
                                                <div key={key} className="flex items-center justify-between p-4 gap-4">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0`}>
                                                            <Icon className={`w-4 h-4 ${color}`} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-white">{label}</p>
                                                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed truncate">{desc}</p>
                                                        </div>
                                                    </div>
                                                    <ToggleSwitch
                                                        value={preferences[key] ?? true}
                                                        onChange={(v) => {
                                                            updatePreference(key, v);
                                                            toast.success(v ? `${label} alerts enabled` : `${label} alerts muted`, { duration: 1500, id: key });
                                                        }}
                                                        color={toggleColor}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <p className="text-[11px] text-center text-[var(--text-muted)] px-4">
                                            <Zap className="w-3 h-3 inline mr-1 text-amber-400" />
                                            Preferences are saved instantly and apply to future notifications only.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 border-t border-[var(--border-color)] flex gap-4 shrink-0">
                            <button onClick={onClose} className="flex-1 py-3 px-6 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] font-bold hover:bg-white/5 transition-all active:scale-95 text-sm">
                                {activeTab === 'Notifications' ? 'Close' : 'Cancel'}
                            </button>
                            {activeTab !== 'Notifications' && (
                                <button onClick={handleSaveProfile} disabled={isSaving}
                                    className="flex-[2] py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                >
                                    {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" />Save Profile</>}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
