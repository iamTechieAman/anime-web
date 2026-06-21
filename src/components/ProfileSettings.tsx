"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Check, Save, Settings2, Play, Bell, TrendingUp, Sparkles, Bookmark, Users, Brain, Zap, Palette, Accessibility as AccessIcon, Keyboard } from "lucide-react";
import Image from "next/image";
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

function ToggleSwitch({ value, onChange, color = "bg-[var(--accent)]" }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 ${value ? color : 'bg-zinc-700'}`}
        >
            <motion.div
                className="w-4 h-4 rounded-full bg-white shadow-md animate-none"
                animate={{ x: value ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        </button>
    );
}

const NOTIF_CATEGORIES: { key: keyof NotificationPreferences; label: string; desc: string; icon: any; color: string; toggleColor: string }[] = [
    { key: 'episodes', label: 'New Episodes', desc: 'Alert when new episodes drop for shows you follow', icon: Play, color: 'text-[var(--accent)]', toggleColor: 'bg-[var(--accent)]' },
    { key: 'trending', label: 'Trending Shows', desc: 'Discover what\'s hot on the platform right now', icon: TrendingUp, color: 'text-red-400', toggleColor: 'bg-red-500' },
    { key: 'recommendations', label: 'Recommendations', desc: 'Personalized picks curated just for your taste', icon: Sparkles, color: 'text-cyan-400', toggleColor: 'bg-[var(--accent-secondary)]' },
    { key: 'watchlist', label: 'Watchlist Updates', desc: 'When new seasons or episodes arrive for saved shows', icon: Bookmark, color: 'text-blue-400', toggleColor: 'bg-blue-500' },
    { key: 'community', label: 'Community Activity', desc: 'What ToonPlayer users in your region are watching', icon: Users, color: 'text-green-400', toggleColor: 'bg-green-500' },
    { key: 'aiSmartAlerts', label: 'AI Smart Alerts', desc: 'Personalized nudges based on your watch patterns', icon: Brain, color: 'text-pink-400', toggleColor: 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]' },
];

const ACCENT_COLORS = [
    { name: "Orange", hex: "#F97316", glow: "rgba(249,115,22,0.4)" },
    { name: "Red", hex: "#EF4444", glow: "rgba(239,68,68,0.4)" },
    { name: "Purple", hex: "#A855F7", glow: "rgba(168,85,247,0.4)" },
    { name: "Green", hex: "#10B981", glow: "rgba(16,185,129,0.4)" },
    { name: "Blue", hex: "#3B82F6", glow: "rgba(59,130,246,0.4)" }
];

const TABS = ['Account', 'Playback', 'Appearance', 'Notifications', 'Accessibility'] as const;
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
    const [bufferSize, setBufferSize] = useState("Standard");
    const [playbackSpeed, setPlaybackSpeed] = useState("1.0");

    // Appearance settings
    const [theme, setTheme] = useState("Midnight Purple");
    const [accentColor, setAccentColor] = useState("Orange");

    // Accessibility settings
    const [subtitleSize, setSubtitleSize] = useState("Medium");
    const [subtitleFont, setSubtitleFont] = useState("Sora");

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
                    if (parsed.bufferSize) setBufferSize(parsed.bufferSize);
                    if (parsed.playbackSpeed) setPlaybackSpeed(parsed.playbackSpeed);
                    if (parsed.theme) setTheme(parsed.theme);
                    if (parsed.accentColor) setAccentColor(parsed.accentColor);
                    if (parsed.subtitleSize) setSubtitleSize(parsed.subtitleSize);
                    if (parsed.subtitleFont) setSubtitleFont(parsed.subtitleFont);
                } catch {}
            }
        }
    }, [isOpen]);

    const updateSetting = (key: string, value: any) => {
        const currentSettings = {
            autoplay, autoSkip, quality, smartSwitch, multiAudio, dataSaver, aggressiveSandbox,
            bufferSize, playbackSpeed, theme, accentColor, subtitleSize, subtitleFont
        };
        const newSettings = { ...currentSettings, [key]: value };
        localStorage.setItem("toonplayer_settings", JSON.stringify(newSettings));
        window.dispatchEvent(new Event('profileUpdated'));

        // Handle live updates
        if (key === 'accentColor') {
            const match = ACCENT_COLORS.find(c => c.name === value);
            if (match) {
                document.documentElement.style.setProperty('--accent', match.hex);
                document.documentElement.style.setProperty('--accent-glow', match.glow);
            }
        }

        switch (key) {
            case 'autoplay': setAutoplay(value); break;
            case 'autoSkip': setAutoSkip(value); break;
            case 'quality': setQuality(value); break;
            case 'smartSwitch': setSmartSwitch(value); break;
            case 'multiAudio': setMultiAudio(value); break;
            case 'dataSaver': setDataSaver(value); break;
            case 'aggressiveSandbox': setAggressiveSandbox(value); break;
            case 'bufferSize': setBufferSize(value); break;
            case 'playbackSpeed': setPlaybackSpeed(value); break;
            case 'theme': setTheme(value); break;
            case 'accentColor': setAccentColor(value); break;
            case 'subtitleSize': setSubtitleSize(value); break;
            case 'subtitleFont': setSubtitleFont(value); break;
        }
    };

    const handleSaveProfile = () => {
        if (!name.trim()) { toast.error("Name cannot be empty"); return; }
        setIsSaving(true);
        setTimeout(() => {
            const profile = { name: name.trim(), avatar: selectedAvatar };
            localStorage.setItem("toonplayer_profile", JSON.stringify(profile));
            window.dispatchEvent(new Event('profileUpdated'));
            toast.success("Profile settings saved successfully!");
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
                        className="absolute inset-0 bg-black/85 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0B0713]/97 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20 animate-none">
                                    <Settings2 className="w-5 h-5 text-[var(--accent)]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tight font-sora">App Configuration</h2>
                                    <p className="text-xs text-zinc-500 font-semibold">Netflix + Crunchyroll Premium Parity</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex overflow-x-auto border-b border-white/5 shrink-0 bg-white/5 hide-scrollbar">
                            {TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative px-6 py-3 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === tab ? 'text-white font-bold' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Panels */}
                        <div className="p-6 overflow-y-auto hide-scrollbar flex-1 space-y-6">
                            {activeTab === 'Account' && (
                                <motion.div key="account" className="space-y-6">
                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-white">Select Avatar Profile</label>
                                            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                                {AVATARS.map((avatar) => (
                                                    <button key={avatar} onClick={() => setSelectedAvatar(avatar)}
                                                        className={`relative aspect-square w-14 shrink-0 rounded-full overflow-hidden border-2 transition-all ${selectedAvatar === avatar ? "border-[var(--accent)] scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"}`}
                                                    >
                                                        <Image src={avatar} alt="" fill sizes="56px" className="object-cover" />
                                                        {selectedAvatar === avatar && (
                                                            <div className="absolute inset-0 bg-[var(--accent)]/20 flex items-center justify-center">
                                                                <Check className="w-4 h-4 text-white" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-white">Display Name</label>
                                            <div className="relative">
                                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name"
                                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]/50"
                                                    maxLength={20} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'Playback' && (
                                <motion.div key="playback" className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Video Quality Preference</p>
                                            <p className="text-xs text-zinc-500">Select default stream quality</p>
                                        </div>
                                        <select value={quality} onChange={(e) => updateSetting('quality', e.target.value)}
                                            className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                                            <option value="Auto">Auto Match</option>
                                            <option value="1080p">1080p FHD</option>
                                            <option value="720p">720p HD</option>
                                        </select>
                                    </div>

                                    <div className="w-full h-px bg-white/5" />

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Buffer Size</p>
                                            <p className="text-xs text-zinc-500">Video streaming network buffer chunk size</p>
                                        </div>
                                        <select value={bufferSize} onChange={(e) => updateSetting('bufferSize', e.target.value)}
                                            className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                                            <option value="Small">Small (Fast Start)</option>
                                            <option value="Standard">Standard (Balanced)</option>
                                            <option value="Large">Large (High Cache)</option>
                                        </select>
                                    </div>

                                    <div className="w-full h-px bg-white/5" />

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Playback Speed</p>
                                            <p className="text-xs text-zinc-500">Preferred speed rate for video player</p>
                                        </div>
                                        <select value={playbackSpeed} onChange={(e) => updateSetting('playbackSpeed', e.target.value)}
                                            className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                                            <option value="0.5">0.5x Slow</option>
                                            <option value="1.0">1.0x Normal</option>
                                            <option value="1.25">1.25x</option>
                                            <option value="1.5">1.5x</option>
                                            <option value="2.0">2.0x Fast</option>
                                        </select>
                                    </div>

                                    <div className="w-full h-px bg-white/5" />

                                    {[
                                        { key: 'autoplay', label: 'Autoplay Next Episode', desc: 'Seamlessly start the next episode', value: autoplay, color: 'bg-[var(--accent)]' },
                                        { key: 'autoSkip', label: 'Auto-skip Intro', desc: 'Automatically bypass anime openings', value: autoSkip, color: 'bg-blue-500' },
                                        { key: 'smartSwitch', label: 'Smart Server Switching', desc: 'Auto-bypass broken or dead servers', value: smartSwitch, color: 'bg-[var(--accent)]' },
                                        { key: 'aggressiveSandbox', label: 'Aggressive Ad-Blocker', desc: 'Prevents external popups and redirects', value: aggressiveSandbox, color: 'bg-red-500' },
                                    ].map((item, i, arr) => (
                                        <div key={item.key}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{item.label}</p>
                                                    <p className="text-xs text-zinc-500">{item.desc}</p>
                                                </div>
                                                <ToggleSwitch value={item.value} onChange={(v) => updateSetting(item.key, v)} color={item.color} />
                                            </div>
                                            {i < arr.length - 1 && <div className="w-full h-px bg-white/5 mt-4" />}
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'Appearance' && (
                                <motion.div key="appearance" className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-pink-400" />
                                            <div>
                                                <p className="text-sm font-bold text-white">Accent Highlight Color</p>
                                                <p className="text-xs text-zinc-500">Pick highlight color details</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {ACCENT_COLORS.map(c => (
                                                <button
                                                    key={c.name}
                                                    type="button"
                                                    onClick={() => updateSetting('accentColor', c.name)}
                                                    style={{ backgroundColor: c.hex }}
                                                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                                                        accentColor === c.name ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                                                    }`}
                                                    title={c.name}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-white/5" />

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Visual Interface Theme</p>
                                            <p className="text-xs text-zinc-500">Choose base dark accent layout</p>
                                        </div>
                                        <select value={theme} onChange={(e) => updateSetting('theme', e.target.value)}
                                            className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                                            <option value="Midnight Purple">Midnight Purple (Default)</option>
                                            <option value="Cinematic Dark">Cinematic Dark</option>
                                            <option value="AMOLED Black">AMOLED Black</option>
                                        </select>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'Notifications' && (
                                <motion.div key="notifications" className="space-y-4">
                                    <div className="bg-white/5 rounded-2xl border border-white/5 divide-y divide-white/5">
                                        {NOTIF_CATEGORIES.map(({ key, label, desc, icon: Icon, color, toggleColor }) => (
                                            <div key={key} className="flex items-center justify-between p-4 gap-4">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                                        <Icon className={`w-4 h-4 ${color}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-white">{label}</p>
                                                        <p className="text-[11px] text-zinc-500 truncate">{desc}</p>
                                                    </div>
                                                </div>
                                                <ToggleSwitch
                                                    value={preferences[key] ?? true}
                                                    onChange={(v) => {
                                                        updatePreference(key, v);
                                                        toast.success(v ? `${label} alerts enabled` : `${label} alerts muted`);
                                                    }}
                                                    color={toggleColor}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'Accessibility' && (
                                <motion.div key="accessibility" className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <AccessIcon className="w-4 h-4 text-emerald-400" />
                                            <div>
                                                <p className="text-sm font-bold text-white">Subtitle Text Size</p>
                                                <p className="text-xs text-zinc-500">Configure media track font sizing</p>
                                            </div>
                                        </div>
                                        <select value={subtitleSize} onChange={(e) => updateSetting('subtitleSize', e.target.value)}
                                            className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                                            <option value="Small">Small</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Large">Large</option>
                                            <option value="Extra Large">Extra Large</option>
                                        </select>
                                    </div>

                                    <div className="w-full h-px bg-white/5" />

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white">Subtitle Font Family</p>
                                            <p className="text-xs text-zinc-500">Choose typeface for subtitles</p>
                                        </div>
                                        <select value={subtitleFont} onChange={(e) => updateSetting('subtitleFont', e.target.value)}
                                            className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                                            <option value="Sora">Sora (Default)</option>
                                            <option value="Sans-Serif">Sans-Serif</option>
                                            <option value="Serif">Serif</option>
                                            <option value="Monospace">Monospace</option>
                                        </select>
                                    </div>

                                    <div className="w-full h-px bg-white/5" />

                                    {/* Keyboard Shortcuts Guide */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs uppercase">
                                            <Keyboard className="w-4 h-4 text-amber-500" />
                                            <span>Quick Keyboard Shortcuts</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] text-zinc-400 font-semibold leading-relaxed">
                                            <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white mr-1.5">Space</kbd> Play / Pause</div>
                                            <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white mr-1.5">F</kbd> Toggle Fullscreen</div>
                                            <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white mr-1.5">R</kbd> Surprise Me modal</div>
                                            <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white mr-1.5">Ctrl K</kbd> Search Palette</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-5 bg-white/5 border-t border-white/5 flex gap-4 shrink-0">
                            <button onClick={onClose} className="flex-1 py-3 px-6 rounded-xl border border-white/10 text-zinc-400 font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest">
                                Close Settings
                            </button>
                            {activeTab === 'Account' && (
                                <button onClick={handleSaveProfile} disabled={isSaving}
                                    className="flex-[2] py-3 px-6 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-widest border-0 cursor-pointer"
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
