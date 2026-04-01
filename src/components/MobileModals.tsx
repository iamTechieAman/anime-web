"use client";

import { X, Search, TrendingUp, LayoutGrid, Star, Sparkles, Settings, Zap, Shield, Globe, ChevronRight, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const quickLinks = [
    { name: "Discover AI ✨", href: "/discover", icon: Compass, color: "from-purple-500 to-indigo-600" },
    { name: "Trending Now", href: "/search?genre=Action", icon: TrendingUp, color: "from-rose-500 to-pink-600" },
    { name: "Browse Genres", href: "/genres", icon: LayoutGrid, color: "from-cyan-500 to-blue-600" },
    { name: "Top Rated", href: "/search?status=Completed", icon: Star, color: "from-yellow-500 to-amber-600" },
    { name: "New Releases", href: "/search?status=Ongoing", icon: Sparkles, color: "from-emerald-500 to-green-600" },
];

export default function MobileModals() {
    const { isMenuOpen, setMenuOpen, isSearchOpen, setSearchOpen, theme, toggleTheme } = useMobileUI();
    const pathname = usePathname();
    const router = useRouter();
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoNext, setAutoNext] = useState(false);

    const isMovies = pathname?.startsWith('/');
    const searchAction = "/search";
    const searchPlaceholder = "Search movies, anime & shows...";
    const searchPrompt = "Search for anything";

    useEffect(() => {
        setAutoPlay(localStorage.getItem('toonplayer_autoplay') === 'true');
        setAutoNext(localStorage.getItem('toonplayer_autonext') === 'true');
    }, [isMenuOpen]);

    const toggleAutoPlay = () => {
        const val = !autoPlay;
        setAutoPlay(val);
        localStorage.setItem('toonplayer_autoplay', String(val));
    };

    const toggleAutoNext = () => {
        const val = !autoNext;
        setAutoNext(val);
        localStorage.setItem('toonplayer_autonext', String(val));
    };

    return (
        <>
            {/* About/Menu Modal */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        key="about-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80"
                        onClick={() => setMenuOpen(false)}
                        style={{ willChange: "opacity" }}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full md:max-w-md bg-[var(--bg-card)] border-t md:border border-[var(--border-color)] rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col will-change-transform"
                        >
                            <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                                <div className="w-12 h-1.5 bg-[var(--text-muted)]/30 rounded-full"></div>
                            </div>

                            <div className="p-5 overflow-y-auto">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-black text-[var(--text-main)]">Menu</h2>
                                    <button
                                        onClick={() => setMenuOpen(false)}
                                        className="p-2 bg-[var(--bg-main)] hover:bg-[var(--border-color)] rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-[var(--text-main)]" />
                                    </button>
                                </div>

                                {/* Quick Links */}
                                <div className="mb-6">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Quick Links</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {quickLinks.map((link, i) => {
                                            const Icon = link.icon;
                                            return (
                                                <motion.button
                                                    key={link.name}
                                                    onClick={() => { setMenuOpen(false); router.push(link.href); }}
                                                    className="flex items-center gap-2.5 p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] hover:border-white/20 transition-colors active:scale-95"
                                                >
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center shadow-lg`}>
                                                        <Icon className="w-4 h-4 text-white" />
                                                    </div>
                                                    <span className="text-xs font-bold text-[var(--text-main)]">{link.name}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Settings Section */}
                                <div className="space-y-3 mb-6">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Settings</h3>

                                    {/* Auto Play */}
                                    <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-[var(--text-main)]">Auto Play</p>
                                                <p className="text-[10px] text-[var(--text-muted)]">Auto-play on load</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleAutoPlay}
                                            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${autoPlay ? 'bg-blue-600' : 'bg-zinc-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${autoPlay ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {/* Features Info */}
                                    <div className="p-3 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-xl border border-[var(--border-color)]">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-tight">
                                            <Sparkles className="w-3 h-3" />
                                            Premium Features Active
                                        </div>
                                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">Auto-Next and Dark Theme are permanently enabled for the best experience.</p>
                                    </div>
                                </div>

                                {/* App Info */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">About</h3>
                                    <div className="p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 p-1 flex items-center justify-center shadow-lg border border-white/10">
                                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div class="text-white font-black text-xs">TP</div>'; }} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-[var(--text-main)]">ToonPlayer</h4>
                                                <p className="text-[10px] text-[var(--text-muted)]">v3.5 • Full Experience</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
                                            Premium anime & movie streaming. Built with love by Aman Kumar.
                                        </p>
                                        <div className="flex gap-2">
                                            <a href="https://github.com/iamTechieAman" target="_blank" className="flex-1 py-2 text-center bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[11px] font-bold text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors">
                                                GitHub
                                            </a>
                                            <a href="https://linkedin.com" target="_blank" className="flex-1 py-2 text-center bg-[#0077b5] text-white rounded-lg text-[11px] font-bold hover:bg-[#006097] transition-colors">
                                                LinkedIn
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Search Overlay */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        key="search-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[55] bg-[var(--bg-main)] pt-safe block md:hidden"
                        style={{ willChange: 'opacity' }}
                    >
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: "tween", duration: 0.2 }}
                        >
                            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)]">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const input = form.elements.namedItem('query') as HTMLInputElement;
                                        if (input.value.trim()) {
                                            setSearchOpen(false);
                                            router.push(`${searchAction}?query=${encodeURIComponent(input.value.trim())}`);
                                        }
                                    }}>
                                        <input
                                            type="text"
                                            name="query"
                                            placeholder={searchPlaceholder}
                                            autoFocus
                                            className="w-full bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-3 outline-none focus:border-purple-500/60 transition-colors text-sm"
                                        />
                                    </form>
                                </div>
                                <button
                                    onClick={() => setSearchOpen(false)}
                                    className="p-2 bg-[var(--bg-card)] rounded-xl transition-colors active:scale-95"
                                >
                                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                                </button>
                            </div>

                            {/* Genre Chips - horizontal scroll with GPU acceleration */}
                            <div className="px-4 py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Popular Genres</p>
                                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                                    {["Action", "Romance", "Comedy", "Fantasy", "Thriller", "Sci-Fi", "Horror", "Drama", "Mystery", "Adventure"].map((genre, i) => (
                                        <button 
                                            key={genre}
                                            onClick={() => { setSearchOpen(false); router.push(`/search?genre=${genre}`); }}
                                            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-purple-400 hover:border-purple-500/50 transition-colors active:scale-95 shrink-0"
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="py-8 flex flex-col items-center justify-center text-center opacity-40">
                                <Search className="w-12 h-12 text-[var(--text-muted)] mb-4" />
                                <p className="text-[var(--text-main)] font-medium">{searchPrompt}</p>
                                <p className="text-sm text-[var(--text-muted)]">Type to find your favorite {isMovies ? "movies" : "shows"}</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
