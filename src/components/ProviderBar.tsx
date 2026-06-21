"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export type ProviderSlug =
    | "all"
    | "netflix"
    | "prime"
    | "disney"
    | "crunchyroll"
    | "hulu"
    | "hbo"
    | "appletv"
    | "toonplayer"
    | "paramount"
    | "peacock";

export interface ProviderInfo {
    slug: ProviderSlug;
    label: string;
    shortLabel: string;
    color: string;
    glowColor: string;
    bgGradient: string;
    logo: React.ReactNode;
}

// SVG logos as inline JSX — no external deps needed
const NetflixLogo = () => (
    <svg viewBox="0 0 111 30" className="w-14 h-4 shrink-0" fill="currentColor">
        <path d="M105.062 0l-8.983 25.751L87.1 0H73.604l13.67 30H73.604v-.01L60.18 0H44.928l10.5 25.97L44.928 0H30.424l-7.52 18.72L15.383 0H0v30h14.512V4.03L22.904 30h9.04l8.392-25.97V30h14.512V4.03L62.24 30h14.512L86.58 4.03V30h14.512L111 0z" />
    </svg>
);

const PrimeLogo = () => (
    <svg viewBox="0 0 90 26" className="w-14 h-4 shrink-0" fill="currentColor">
        <path d="M5.37 0C2.4 0 0 2.4 0 5.37v15.26C0 23.6 2.4 26 5.37 26h15.26C23.6 26 26 23.6 26 20.63V5.37C26 2.4 23.6 0 20.63 0H5.37zm2.88 18.31V7.69l9.5 5.31-9.5 5.31zm25.48.38v-4.38h4.34c2.14 0 3.53-.99 3.53-2.56 0-1.7-1.38-2.66-3.79-2.66h-7.5v9.6h3.42zm4.1-6.93c.87 0 1.34.36 1.34.93 0 .56-.47.96-1.34.96h-.68v-1.9h.68zm15.18 1.35c0-2.96-2.05-4.78-5.43-4.78H43.8v9.6h3.78V15.4h.76l2.45 3.29h4.05l-2.9-3.65c1.54-.6 2.54-1.84 2.54-3.63h.05zm-5.69 1.74H44.1v-3.16h3.22c1.08 0 1.66.52 1.66 1.57 0 1.06-.58 1.59-1.66 1.59zm9.3 3.84h3.42V8.7h-3.42v9.6zm5.5 0h9.36v-2.61h-5.94v-1.2h5.94v-2.5h-5.94v-1.13h5.94V8.7H62.82v9.6zM73.82 8.7l-2.59 6.57-2.59-6.57h-3.83l4.28 9.6h4.28l4.28-9.6h-3.83z" />
    </svg>
);

const DisneyLogo = () => (
    <span className="text-sm font-black tracking-tight text-blue-400 shrink-0 select-none">Disney+</span>
);

const CrunchyrollLogo = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 20.5c-4.69 0-8.5-3.81-8.5-8.5S7.31 3.5 12 3.5s8.5 3.81 8.5 8.5-3.81 8.5-8.5 8.5zm0-14c-3.03 0-5.5 2.47-5.5 5.5s2.47 5.5 5.5 5.5 5.5-2.47 5.5-5.5-2.47-5.5-5.5-5.5zm0 8c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
);

const HuluLogo = () => (
    <span className="text-sm font-black tracking-tight text-[#1CE783] shrink-0 select-none">hulu</span>
);

const HBOLogo = () => (
    <span className="text-sm font-black tracking-tight shrink-0 select-none">HBO Max</span>
);

const AppleTVLogo = () => (
    <span className="flex items-center gap-1 text-sm font-bold tracking-tight shrink-0 select-none">
        <svg viewBox="0 0 814 1000" className="w-3.5 h-4 shrink-0" fill="currentColor">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 829.5 0 761.7 0 693.1c0-154.8 126.7-278.4 261-278.4 66.8 0 122.4 44.1 164 44.1 39.5 0 102.6-47.9 174.8-47.9zm-45.7-228.3C706.5 81.6 742.7 30.2 742.7 0c0-3.2-.5-6.4-1.6-9-.6.5-21.5 2.2-43.4 14.9-19.4 11.3-41.3 34.6-58.3 63.5-15.4 26.7-28.9 65.5-28.9 101.5 0 3.8.5 7.7 1 11.5 2.2.5 5.8 1.6 9 1.6 19.4 0 44.7-13.5 64.1-37.7z" />
        </svg>
        TV+
    </span>
);

const ToonPlayerLogo = () => (
    <span className="text-sm font-black tracking-tight bg-gradient-to-r from-[#5865F2] to-[#229ED9] bg-clip-text text-transparent">
        ToonPlayer
    </span>
);

const ParamountLogo = () => (
    <span className="text-sm font-black tracking-tight">Paramount+</span>
);

const PeacockLogo = () => (
    <span className="text-sm font-black tracking-tight">Peacock</span>
);

export const PROVIDERS: ProviderInfo[] = [
    {
        slug: "all",
        label: "All Providers",
        shortLabel: "All",
        color: "text-white",
        glowColor: "rgba(88,101,242,0.45)",
        bgGradient: "from-[#5865F2] to-[#229ED9]",
        logo: <span className="text-sm font-black">✦ All</span>,
    },
    {
        slug: "netflix",
        label: "Netflix",
        shortLabel: "Netflix",
        color: "text-red-500",
        glowColor: "rgba(229,9,20,0.5)",
        bgGradient: "from-red-700 to-red-900",
        logo: <NetflixLogo />,
    },
    {
        slug: "prime",
        label: "Prime Video",
        shortLabel: "Prime",
        color: "text-sky-400",
        glowColor: "rgba(0,168,225,0.5)",
        bgGradient: "from-sky-700 to-blue-900",
        logo: <PrimeLogo />,
    },
    {
        slug: "disney",
        label: "Disney+",
        shortLabel: "Disney+",
        color: "text-blue-400",
        glowColor: "rgba(16,60,144,0.7)",
        bgGradient: "from-blue-800 to-indigo-900",
        logo: <DisneyLogo />,
    },
    {
        slug: "crunchyroll",
        label: "Crunchyroll",
        shortLabel: "Crunchyroll",
        color: "text-[var(--accent)]",
        glowColor: "rgba(88,101,242,0.5)",
        bgGradient: "from-[#5865F2] to-[#229ED9]",
        logo: <span className="flex items-center gap-1.5"><CrunchyrollLogo /><span className="text-xs font-black hidden sm:inline">Crunchyroll</span></span>,
    },
    {
        slug: "hulu",
        label: "Hulu",
        shortLabel: "Hulu",
        color: "text-[#1CE783]",
        glowColor: "rgba(28,231,131,0.4)",
        bgGradient: "from-emerald-700 to-green-900",
        logo: <HuluLogo />,
    },
    {
        slug: "hbo",
        label: "HBO Max",
        shortLabel: "HBO",
        color: "text-[#F3F3F1]",
        glowColor: "rgba(88,101,242,0.5)",
        bgGradient: "from-[#1F1C16] to-[#374151]",
        logo: <HBOLogo />,
    },
    {
        slug: "appletv",
        label: "Apple TV+",
        shortLabel: "Apple TV+",
        color: "text-white",
        glowColor: "rgba(255,255,255,0.25)",
        bgGradient: "from-zinc-700 to-zinc-900",
        logo: <AppleTVLogo />,
    },
    {
        slug: "toonplayer",
        label: "ToonPlayer Originals",
        shortLabel: "ToonPlayer",
        color: "text-[var(--accent)]",
        glowColor: "rgba(88,101,242,0.55)",
        bgGradient: "from-[#5865F2] to-[#229ED9]",
        logo: <ToonPlayerLogo />,
    },
];

interface ProviderBarProps {
    activeProvider: ProviderSlug;
    onProviderChange: (slug: ProviderSlug) => void;
    isLoading?: boolean;
}

export default function ProviderBar({ activeProvider, onProviderChange, isLoading = false }: ProviderBarProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const activeProviderInfo = PROVIDERS.find(p => p.slug === activeProvider) || PROVIDERS[0];

    return (
        <div
            className="w-full bg-[#171611]/90 backdrop-blur-2xl border-b border-white/[0.05] sticky top-[56px] md:top-[64px] z-[39] shadow-[0_6px_28px_rgba(0,0,0,0.55)]"
            aria-label="Streaming provider filter"
        >
            {/* Loading bar */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ scaleX: 0, opacity: 1 }}
                        animate={{ scaleX: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="absolute top-0 left-0 h-[2px] w-full origin-left bg-gradient-to-r from-[#5865F2] via-[#229ED9] to-[#5865F2]"
                    />
                )}
            </AnimatePresence>

            <div className="w-full max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-12">

                {/* ── MOBILE: Glassmorphism Dropdown (< sm) ── */}
                <div className="flex sm:hidden py-2.5 relative">
                    <button
                        id="provider-mobile-toggle"
                        onClick={() => setMobileOpen(prev => !prev)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-sm text-sm font-semibold text-white transition-all active:scale-[0.98]"
                        aria-haspopup="listbox"
                        aria-expanded={mobileOpen}
                    >
                        <span className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`shrink-0 ${activeProviderInfo.color}`}>{activeProviderInfo.logo}</span>
                            <span className="truncate">{activeProviderInfo.label}</span>
                        </span>
                        <ChevronDown
                            className={`w-4 h-4 text-white/50 shrink-0 transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Dropdown Panel */}
                    <AnimatePresence>
                        {mobileOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute top-full left-0 right-0 mt-1 z-[50] bg-[#14141c]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7)]"
                                role="listbox"
                                aria-label="Select streaming provider"
                            >
                                {PROVIDERS.map((provider) => {
                                    const isActive = activeProvider === provider.slug;
                                    return (
                                        <button
                                            key={provider.slug}
                                            role="option"
                                            aria-selected={isActive}
                                            onClick={() => {
                                                onProviderChange(provider.slug);
                                                setMobileOpen(false);
                                            }}
                                            className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold transition-colors text-left border-b border-white/[0.04] last:border-b-0 ${
                                                isActive
                                                    ? 'bg-white/[0.08] text-white'
                                                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                                            }`}
                                        >
                                            <span className={`shrink-0 ${isActive ? provider.color : ''}`}>
                                                {provider.logo}
                                            </span>
                                            <span className="flex-1 truncate">{provider.label}</span>
                                            {isActive && <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── TABLET / DESKTOP: Horizontal scrollable chip row ── */}
                <div className="hidden sm:flex items-center gap-2 py-3 overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth">
                    {PROVIDERS.map((provider) => {
                        const isActive = activeProvider === provider.slug;

                        return (
                            <button
                                key={provider.slug}
                                id={`provider-btn-${provider.slug}`}
                                onClick={() => onProviderChange(provider.slug)}
                                className={`relative flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 border font-semibold active:scale-95 ${
                                    isActive
                                        ? `${provider.color} border-white/20 font-bold bg-gradient-to-r ${provider.bgGradient}`
                                        : 'text-[var(--text-muted)] border-white/[0.06] hover:text-white hover:border-white/15 hover:bg-white/[0.04]'
                                }`}
                                style={isActive ? { boxShadow: `0 0 16px ${provider.glowColor}` } : undefined}
                                aria-label={`Filter by ${provider.label}`}
                                aria-pressed={isActive}
                            >
                                <span className={`transition-transform duration-200 shrink-0 ${isActive ? 'scale-110' : 'scale-100'}`}>
                                    {provider.logo}
                                </span>

                                {/* Active indicator dot */}
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
                                )}

                                {/* Active bottom line */}
                                {isActive && (
                                    <span className={`absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r ${provider.bgGradient}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
