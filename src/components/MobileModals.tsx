"use client";

import { X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileUI } from "@/context/MobileUIContext";
import { usePathname } from "next/navigation";

export default function MobileModals() {
    const { isMenuOpen, setMenuOpen, isSearchOpen, setSearchOpen, theme, toggleTheme } = useMobileUI();
    const pathname = usePathname();

    const isMovies = pathname?.startsWith('/movies');
    const searchAction = isMovies ? "/movies/search" : "/search";
    const searchPlaceholder = isMovies ? "Search movies & TV..." : "Search anime...";
    const searchPrompt = isMovies ? "Search for movies" : "Search for anime";

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
                        className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMenuOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full md:max-w-md bg-[var(--bg-card)] border-t md:border border-[var(--border-color)] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                        >
                            <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                                <div className="w-12 h-1.5 bg-[var(--text-muted)]/30 rounded-full"></div>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-[var(--text-main)]">Menu</h2>
                                    <button
                                        onClick={() => setMenuOpen(false)}
                                        className="p-2 bg-[var(--bg-main)] hover:bg-[var(--border-color)] rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-[var(--text-main)]" />
                                    </button>
                                </div>

                                {/* Settings Section */}
                                <div className="space-y-4 mb-8">
                                    <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Settings</h3>

                                    {/* Theme Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-600'}`}>
                                                {theme === 'dark' ? <div className="w-5 h-5">🌙</div> : <div className="w-5 h-5">☀️</div>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[var(--text-main)]">App Theme</p>
                                                <p className="text-xs text-[var(--text-muted)]">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleTheme}
                                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-purple-600' : 'bg-zinc-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>

                                {/* Profile Section */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Developer</h3>
                                    <div className="p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20">
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">AK</div>
                                            <div>
                                                <h4 className="font-bold text-[var(--text-main)]">Aman Kumar</h4>
                                                <p className="text-xs text-[var(--text-muted)]">Full Stack Developer</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
                                            Built with Next.js 15, React 19, and Tailwind CSS. Focused on high-performance mobile web experiences.
                                        </p>
                                        <div className="flex gap-2">
                                            <a href="https://github.com/iamTechieAman" target="_blank" className="flex-1 py-2 text-center bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors">
                                                GitHub
                                            </a>
                                            <a href="https://linkedin.com" target="_blank" className="flex-1 py-2 text-center bg-[#0077b5] text-white rounded-lg text-xs font-bold hover:bg-[#006097] transition-colors">
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
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed inset-0 z-[55] bg-[var(--bg-main)] pt-safe px-4 block md:hidden"
                    >
                        <div className="flex items-center gap-4 py-4 border-b border-[var(--border-color)]">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <form action={searchAction} method="GET" onSubmit={() => setSearchOpen(false)}>
                                    <input
                                        type="text"
                                        name="query"
                                        placeholder={searchPlaceholder}
                                        autoFocus
                                        className="w-full bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                    />
                                </form>
                            </div>
                            <button
                                onClick={() => setSearchOpen(false)}
                                className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="py-8 flex flex-col items-center justify-center text-center opacity-50">
                            <Search className="w-12 h-12 text-[var(--text-muted)] mb-4" />
                            <p className="text-[var(--text-main)] font-medium">{searchPrompt}</p>
                            <p className="text-sm text-[var(--text-muted)]">Type to find your favorite {isMovies ? "movies" : "shows"}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
