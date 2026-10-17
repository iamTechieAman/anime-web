"use client";

import { useState, useEffect, use, useRef, useCallback, useMemo } from "react";
import React from "react";
import Script from "next/script";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle, RefreshCw, AlertTriangle, Search, Play, Share2, Server, ChevronDown, Check, Shield, Zap, Sparkles, BookmarkPlus, BookmarkCheck, ChevronRight, X, List, LayoutGrid, Download, ArrowLeft, Minimize2, Maximize2 } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAdBlock } from "@/context/AdBlockContext";
import SimilarAnime from "@/components/SimilarAnime";
import CommentsSection from "@/components/CommentsSection";

import { useRouter, useSearchParams } from "next/navigation";
import { useWatch } from "@/context/WatchContext";
import { useUserStore } from "@/store/userStore";
import { ServerHealthManager, type FailureReason } from "@/utils/ServerHealthManager";
import { isMovieContent } from "@/utils/mediaType";
import { DetailsSkeleton, EpisodeListSkeleton } from "@/components/SkeletonLoader";
import PlayerStatusOverlay, { type PlayerPlaybackState } from "@/components/player/PlayerStatusOverlay";
import CrossOriginEmbedNotice from "@/components/player/CrossOriginEmbedNotice";
import { 
    type ContentType, 
    deduplicateServersByCanonicalId, 
    getCanonicalProviderId 
} from "@/lib/providers/registry";

// Using ArtPlayer for robust playback
const ArtPlayer = dynamic(() => import("@/components/player/ArtPlayer"), { ssr: false });
const DownloadModal = dynamic(() => import("@/components/DownloadModal"), { ssr: false });

const getProxiedEmbedUrl = (rawUrl: string | null) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith('/') || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
        return rawUrl;
    }
    try {
        const parsed = new URL(rawUrl);
        // ONLY proxy sites that need server-side HTML rewriting for CORS.
        // Direct embed providers 403 when fetched server-side — load them as plain iframes.
        const needsProxy = parsed.hostname.includes('megacloud') ||
                           parsed.hostname.includes('rapid-cloud') ||
                           parsed.hostname.includes('rabbitstream') ||
                           parsed.hostname.includes('gogocdn') ||
                           parsed.hostname.includes('playtaku') ||
                           parsed.hostname.includes('vidstreaming') ||
                           parsed.hostname.includes('allanime') ||
                           parsed.hostname.includes('anime-taku') ||
                           parsed.hostname.includes('filemoon');
        if (needsProxy) {
            return `/api/proxy/embed?url=${encodeURIComponent(rawUrl)}&referer=${encodeURIComponent(parsed.origin)}`;
        }
    } catch (_) {}
    return rawUrl;
};

interface VideoIframeProps {
    src: string;
    mediaKey: string;
    playerLoaded?: boolean;
    isFocusMode?: boolean;
    onLoad: (e: React.SyntheticEvent<HTMLIFrameElement>) => void;
    onError: () => void;
    iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

const VideoIframeEmbed = React.memo(function VideoIframeEmbed({
    src,
    mediaKey,
    playerLoaded = true,
    isFocusMode = false,
    onLoad,
    onError,
    iframeRef,
}: VideoIframeProps) {
    useEffect(() => {
        if (src) {
            console.log("[DEBUG] Playing URL:", src);
        }
    }, [src]);

    return (
        <iframe
            key={mediaKey || src}
            ref={iframeRef}
            src={src}
            className="absolute inset-0 w-full h-full border-0 bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen={true}
            referrerPolicy="origin"
            onLoad={onLoad}
            onError={onError}
        />
    );
}, (prevProps, nextProps) => {
    return prevProps.src === nextProps.src && 
           prevProps.playerLoaded === nextProps.playerLoaded &&
           prevProps.mediaKey === nextProps.mediaKey;
});

function cleanString(str: any): string | null {
    if (!str) return null;
    const s = String(str).trim();
    if (/^(unknown|undefined|null|no image|no img|no_image|no_img|placeholder|none)$/i.test(s)) return null;
    return s;
}

/** Robust numerical episode sorting */
export function sortEpisodes(eps: any[]): any[] {
    if (!Array.isArray(eps)) return [];
    return [...eps].sort((a, b) => {
        const getNum = (item: any) => {
            if (typeof item === 'object' && item !== null) {
                if (item.number !== undefined && item.number !== null && !isNaN(Number(item.number))) {
                    return Number(item.number);
                }
                const parsedId = parseFloat(String(item.id).replace(/[^0-9.]/g, ''));
                return !isNaN(parsedId) ? parsedId : 0;
            }
            const parsed = parseFloat(String(item).replace(/[^0-9.]/g, ''));
            return !isNaN(parsed) ? parsed : 0;
        };
        return getNum(a) - getNum(b);
    });
}

/** Memoized episode button to prevent full list re-render on every currentEp change */
const EpisodeButton = React.memo(function EpisodeButton({
    ep, currentEp, onClick
}: { ep: any; currentEp: string; onClick: () => void }) {
    const epNum = typeof ep === 'object' ? String(ep.number || ep.id) : String(ep);
    const title = typeof ep === 'object' ? ep.title : null;
    const isFiller = typeof ep === 'object' ? ep.isFiller : false;
    const duration = typeof ep === 'object' ? ep.duration : null;
    const thumbnail = typeof ep === 'object' ? cleanString(ep.image) : null;
    const isDub = typeof ep === 'object' ? ep.isDub : false;
    const isActive = String(currentEp) === epNum;
    
    const ref = React.useRef<HTMLButtonElement>(null);

    return (
        <button
            ref={ref}
            onClick={onClick}
            className={`group relative flex items-center justify-between w-full p-2.5 sm:p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer border ${
                isActive 
                    ? "bg-accent/15 border-accent/80 shadow-[0_4px_20px_var(--accent-glow)] ring-1 ring-accent/40" 
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/15"
            }`}
        >
            <div className="flex gap-3 w-full items-center min-w-0">
                {thumbnail ? (
                    <div className="w-20 sm:w-24 h-14 flex-shrink-0 rounded-xl bg-zinc-900 overflow-hidden relative border border-white/10">
                        <img src={thumbnail} alt={`Episode ${epNum}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
                        <div className="absolute inset-0 bg-black/25" />
                        {duration && (
                            <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 backdrop-blur-sm text-[8px] font-bold text-zinc-300">
                                {duration}m
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                        <span className="text-xs font-black text-zinc-500">EP {epNum}</span>
                    </div>
                )}
                <div className="flex flex-col items-start min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-accent' : 'text-zinc-400'}`}>
                            EP {epNum}
                        </span>
                        {isActive && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/20 border border-accent/40 text-[8px] font-black tracking-wider text-accent uppercase">
                                <span className="flex items-end gap-[1.5px] h-2">
                                    <span className="w-[1.5px] h-1.5 bg-accent rounded-full animate-soundwave-1" />
                                    <span className="w-[1.5px] h-2 bg-accent rounded-full animate-soundwave-2" />
                                    <span className="w-[1.5px] h-1 bg-accent rounded-full animate-soundwave-3" />
                                </span>
                                Playing
                            </span>
                        )}
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-400">
                            {isDub ? 'DUB' : 'SUB'}
                        </span>
                        {isFiller && (
                            <span className="text-[8px] bg-amber-500/15 text-amber-400 px-1.5 py-0.2 rounded uppercase font-black border border-amber-500/30">
                                Filler
                            </span>
                        )}
                    </div>
                    <span className={`text-xs sm:text-sm font-bold truncate w-full mt-0.5 transition-colors ${isActive ? 'text-white font-extrabold' : 'text-zinc-200 group-hover:text-white'}`}>
                        {title && title.toLowerCase() !== `episode ${epNum}` ? title : `Episode ${epNum}`}
                    </span>
                </div>
            </div>
            {isActive ? (
                <div className="w-7 h-7 shrink-0 rounded-full bg-accent flex items-center justify-center shadow-[0_0_12px_var(--accent-glow)] ml-2">
                    <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5 animate-pulse" />
                </div>
            ) : (
                <div className="w-7 h-7 shrink-0 rounded-full bg-white/[0.03] group-hover:bg-white/[0.1] flex items-center justify-center transition-colors ml-2">
                    <Play className="w-3 h-3 text-zinc-500 group-hover:text-white ml-0.5 transition-colors" />
                </div>
            )}
        </button>
    );
});

const MOVIE_SERVERS = [
    {
        id: 'vidlink',
        serverId: 'vidlink',
        canonicalId: 'vidlink',
        name: 'Toon Player Link',
        serverName: 'Toon Player Link',
        badge: 'VidLink',
        isMovieServer: true,
        qualityScore: 105,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidlink.pro/tv/${id}/${s || 1}/${e || 1}?primaryColor=7C3AED&title=false&autoplay=true` : `https://vidlink.pro/movie/${id}?primaryColor=7C3AED&title=false&autoplay=true`,
    },
    {
        id: 'vidnest',
        serverId: 'vidnest',
        canonicalId: 'vidnest',
        name: 'Toon Player Nest',
        serverName: 'Toon Player Nest',
        badge: 'Ultra',
        isMovieServer: true,
        qualityScore: 104,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidnest.fun/tv/${id}/${s || 1}/${e || 1}` : `https://vidnest.fun/movie/${id}`,
    },
    {
        id: 'vidcore',
        serverId: 'vidcore',
        canonicalId: 'vidcore',
        name: 'Toon Player Core',
        serverName: 'Toon Player Core',
        badge: 'Core HD',
        isMovieServer: true,
        qualityScore: 103,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidcore.io/tv/${id}/${s || 1}/${e || 1}` : `https://vidcore.io/movie/${id}`,
    },
    {
        id: 'embedmaster',
        serverId: 'embedmaster',
        canonicalId: 'embedmaster',
        name: 'Toon Player Master',
        serverName: 'Toon Player Master',
        badge: 'Master',
        isMovieServer: true,
        qualityScore: 102,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://embedmaster.link/tv/${id}/${s || 1}/${e || 1}` : `https://embedmaster.link/movie/${id}`,
    },
    {
        id: 'vidrock',
        serverId: 'vidrock',
        canonicalId: 'vidrock',
        name: 'Toon Player Rock',
        serverName: 'Toon Player Rock',
        badge: 'Stable',
        isMovieServer: true,
        qualityScore: 99,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidrock.net/tv/${id}/${s || 1}/${e || 1}` : `https://vidrock.net/movie/${id}`,
    },
    {
        id: 'vidfast',
        serverId: 'vidfast',
        canonicalId: 'vidfast',
        name: 'Toon Player Fast',
        serverName: 'Toon Player Fast',
        badge: 'Auto-Next',
        isMovieServer: true,
        qualityScore: 101,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidfast.vc/tv/${id}/${s || 1}/${e || 1}?autoPlay=true&title=true&poster=true&nextButton=true` : `https://vidfast.vc/movie/${id}?autoPlay=true&title=true&poster=true`,
    },
    {
        id: 'vidsrc_embed_ru',
        serverId: 'vidsrc_embed_ru',
        canonicalId: 'vidsrc_embed_ru',
        name: 'Toon Player VidSrc',
        serverName: 'Toon Player VidSrc',
        badge: 'VidSrc',
        isMovieServer: true,
        qualityScore: 94,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidsrc-embed.ru/embed/tv?tmdb=${id}&season=${s || 1}&episode=${e || 1}&autoplay=1&ds_lang=en` : `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&autoplay=1&ds_lang=en`,
    },
    {
        id: 'smashystream',
        serverId: 'smashystream',
        canonicalId: 'smashystream',
        name: 'Toon Player Smashy',
        serverName: 'Toon Player Smashy',
        badge: 'Multi-Host',
        isMovieServer: true,
        qualityScore: 95,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://player.smashystream.com/show/${id}/${s || 1}/${e || 1}` : `https://player.smashystream.com/movie/${id}`,
    },
];

interface ShowData {
    _id: string;
    id?: string;
    showId?: string;
    name?: string;
    title?: string;
    englishName?: string;
    malId?: string;
    anilistId?: string;
    tmdbId?: string;
    provider?: string;
    thumbnail?: string;
    image?: string;
    rating?: string | number;
    description?: string;
    synopsis?: string;
    availableEpisodesDetail: {
        sub: any[];
        dub: any[];
        raw: any[];
    };
    [key: string]: any;
}

export default function WatchClient({ id: fullId }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAdBlockEnabled } = useAdBlock();

    // Parse ID for provider prefix (e.g., tmdb:123, aw:naruto, hi:naruto)
    const { provider: idProvider, actualId: id } = (() => {
        const decoded = decodeURIComponent(fullId || '');
        if (decoded.includes(':')) {
            const parts = decoded.split(':');
            let p = parts[0];
            if (p === 'hi') p = 'hianime';
            if (p === 'aw') p = 'aniwatch';
            return { provider: p, actualId: parts.slice(1).join(':') };
        }
        return { provider: null, actualId: decoded };
    })();
    
    // Priority: Prefix > URL Parameter
    const rawParamProvider = searchParams?.get('provider');
    const paramProvider = rawParamProvider === 'hi' ? 'hianime' : rawParamProvider === 'aw' ? 'aniwatch' : rawParamProvider;
    const provider = idProvider || paramProvider || undefined;

    const { history, addToHistory, getHistoryItem, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isGuestProfile = activeProfile?.type === 'guest';
    const fallbackCountRef = useRef<number>(0);
    const previousValidSourceRef = useRef<any>(null);

    const [show, setShow] = useState<ShowData | null>(null);
    const [showReloadKey, setShowReloadKey] = useState(0);

    const initialEp = searchParams?.get('ep') || "1";
    const initialModeParam = searchParams?.get('mode') as "sub" | "dub" | null;
    const initialMode: "sub" | "dub" = (initialModeParam && ["sub", "dub"].includes(initialModeParam)) ? initialModeParam : "sub";

    const [currentEp, setCurrentEp] = useState<string>(initialEp);
    const [mode, setMode] = useState<"sub" | "dub">(initialMode);
    const [epFilter, setEpFilter] = useState("");
    const [reloadCount, setReloadCount] = useState(0);

    const [showNextOverlay, setShowNextOverlay] = useState(false);
    const [nextCountdown, setNextCountdown] = useState(5);
    const nextIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isAdvancingRef = useRef(false);

    const handleSelectEpisode = useCallback((ep: string) => {
        if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
        setShowNextOverlay(false);
        setSourceUrl(null);
        setLoadingSource(true);
        setError(null);
        setCurrentEp(ep);
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            params.set('ep', ep);
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            router.replace(newUrl, { scroll: false });
        }
    }, [router]);

    const availableEps: any[] = useMemo(() => {
        const raw = show?.availableEpisodesDetail?.[mode] || [];
        return sortEpisodes(raw);
    }, [show?.availableEpisodesDetail, mode]);

    const currentEpItem = useMemo(() => {
        return availableEps.find((e: any) =>
            typeof e === 'object' ? String(e.number || e.id) === String(currentEp) : String(e) === String(currentEp)
        );
    }, [availableEps, currentEp]);

    const currentEpTitle = useMemo(() => {
        if (currentEpItem && typeof currentEpItem === 'object' && currentEpItem.title) {
            const t = String(currentEpItem.title).trim();
            if (t.toLowerCase() !== `episode ${currentEp}` && t.toLowerCase() !== `ep ${currentEp}`) {
                return t;
            }
        }
        return null;
    }, [currentEpItem, currentEp]);

    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [videoType, setVideoType] = useState<string>("auto");
    const [loadingSource, setLoadingSource] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playbackState, setPlaybackState] = useState<PlayerPlaybackState>('resolving');
    const [customErrorMessage, setCustomErrorMessage] = useState<string | null>(null);

    // Auto-play and Auto-next preferences
    const [autoPlay, setAutoPlay] = useState(true);
    const [autoNext, setAutoNext] = useState(true);
    const manualServerRef = useRef<string | null>(null);
    const sourceSeqRef = useRef<number>(0);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const artInstanceRef = useRef<any>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
    const [showFsControls, setShowFsControls] = useState(true);
    const fsControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handlePointerMoveFs = useCallback(() => {
        setShowFsControls(true);
        if (fsControlsTimerRef.current) clearTimeout(fsControlsTimerRef.current);
        fsControlsTimerRef.current = setTimeout(() => {
            setShowFsControls(false);
        }, 3500);
    }, []);

    const handleReloadPlayer = useCallback(() => {
        setReloadCount(c => c + 1);
        setError(null);
        setLoadingSource(true);
        processingRef.current = null;
        toast.success("Reloading anime stream...", { icon: "🔄" });
    }, []);

    const exitFullscreen = useCallback(async () => {
        const doc = document as any;
        if (isPseudoFullscreen) {
            setIsPseudoFullscreen(false);
            setIsFullscreen(false);
            return;
        }
        try {
            if (doc.exitFullscreen) await doc.exitFullscreen();
            else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
            else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
            else if (doc.msExitFullscreen) await doc.msExitFullscreen();
        } catch (err) {
            console.warn('[Fullscreen] Exit failed:', err);
        }
        setIsFullscreen(false);
        setIsPseudoFullscreen(false);
    }, [isPseudoFullscreen]);

    // Cross-browser fullscreen toggle supporting container, ArtPlayer, and iOS Safari fallback
    const toggleFullscreen = useCallback(async () => {
        const doc = document as any;
        const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

        if (fsEl || isPseudoFullscreen) {
            await exitFullscreen();
            return;
        }

        // First try ArtPlayer internal fullscreen if native player is active
        if (artInstanceRef.current && videoType !== 'iframe') {
            try {
                artInstanceRef.current.fullscreen = true;
                return;
            } catch (e) {
                console.warn('[Fullscreen] ArtPlayer fullscreen failed, falling back to container:', e);
            }
        }

        const target = playerContainerRef.current as any;
        if (!target) return;

        try {
            if (target.requestFullscreen) {
                await target.requestFullscreen();
                setIsFullscreen(true);
            } else if (target.webkitRequestFullscreen) {
                await target.webkitRequestFullscreen();
                setIsFullscreen(true);
            } else if (target.mozRequestFullScreen) {
                await target.mozRequestFullScreen();
                setIsFullscreen(true);
            } else if (target.msRequestFullscreen) {
                await target.msRequestFullscreen();
                setIsFullscreen(true);
            } else {
                // Fallback for iOS Safari / devices without div.requestFullscreen
                setIsPseudoFullscreen(true);
                setIsFullscreen(true);
            }
        } catch (err) {
            console.warn('[Fullscreen] Fullscreen request rejected or unavailable, falling back to pseudo-fullscreen:', err);
            setIsPseudoFullscreen(true);
            setIsFullscreen(true);
        }
    }, [videoType, isPseudoFullscreen, exitFullscreen]);

    // Fullscreen change listener across browsers
    useEffect(() => {
        const onFSChange = () => {
            const doc = document as any;
            const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
            const isFS = Boolean(
                fsEl && (
                    fsEl === playerContainerRef.current || 
                    playerContainerRef.current?.contains(fsEl)
                )
            );
            setIsFullscreen(isFS);
            if (!isFS) {
                setIsPseudoFullscreen(false);
            }
        };

        document.addEventListener('fullscreenchange', onFSChange);
        document.addEventListener('webkitfullscreenchange', onFSChange);
        document.addEventListener('mozfullscreenchange', onFSChange);
        document.addEventListener('MSFullscreenChange', onFSChange);

        return () => {
            document.removeEventListener('fullscreenchange', onFSChange);
            document.removeEventListener('webkitfullscreenchange', onFSChange);
            document.removeEventListener('mozfullscreenchange', onFSChange);
            document.removeEventListener('MSFullscreenChange', onFSChange);
        };
    }, []);

    // Keyboard shortcut for fullscreen (f) and Escape key to exit
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === 'Escape') {
                if (isPseudoFullscreen || isFullscreen) {
                    e.preventDefault();
                    exitFullscreen();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleFullscreen, exitFullscreen, isPseudoFullscreen, isFullscreen]);

    // Autoplay preference toggles with real persistence
    const handleToggleAutoPlay = useCallback(() => {
        setAutoPlay(prev => {
            const nextVal = !prev;
            try {
                localStorage.setItem('toonplayer_autoplay', String(nextVal));
                const s = localStorage.getItem('toonplayer_settings');
                const current = s ? JSON.parse(s) : {};
                localStorage.setItem('toonplayer_settings', JSON.stringify({ ...current, autoplay: nextVal }));
                window.dispatchEvent(new Event('profileUpdated'));
            } catch (_) {}
            toast(nextVal ? "Autoplay Enabled" : "Autoplay Disabled", {
                icon: nextVal ? "▶️" : "⏸️",
                duration: 2000
            });
            return nextVal;
        });
    }, []);

    const handleToggleAutoNext = useCallback(() => {
        setAutoNext(prev => {
            const nextVal = !prev;
            try {
                localStorage.setItem('toonplayer_autonext', String(nextVal));
                const s = localStorage.getItem('toonplayer_settings');
                const current = s ? JSON.parse(s) : {};
                localStorage.setItem('toonplayer_settings', JSON.stringify({ ...current, autoNext: nextVal }));
                window.dispatchEvent(new Event('profileUpdated'));
            } catch (_) {}
            toast(nextVal ? "Auto-Next Episode Enabled" : "Auto-Next Episode Disabled", {
                icon: nextVal ? "⏭️" : "⏹️",
                duration: 2000
            });
            return nextVal;
        });
    }, []);

    // Sync URL when episode or mode changes without triggering page reload
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const url = new URL(window.location.href);
            let changed = false;
            if (currentEp && url.searchParams.get('ep') !== currentEp) {
                url.searchParams.set('ep', currentEp);
                changed = true;
            }
            if (mode && url.searchParams.get('mode') !== mode) {
                url.searchParams.set('mode', mode);
                changed = true;
            }
            if (changed) {
                window.history.replaceState(window.history.state, '', url.toString());
            }
        } catch (_) {}
    }, [currentEp, mode]);

    // Handle Browser Back / Forward buttons (popstate) and searchParams sync
    useEffect(() => {
        const epFromUrl = searchParams?.get('ep');
        const modeFromUrl = searchParams?.get('mode') as 'sub' | 'dub' | null;
        if (epFromUrl && epFromUrl !== currentEp) {
            setCurrentEp(epFromUrl);
        }
        if (modeFromUrl && ['sub', 'dub'].includes(modeFromUrl) && modeFromUrl !== mode) {
            setMode(modeFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const epFromUrl = params.get('ep');
            const modeFromUrl = params.get('mode') as 'sub' | 'dub' | null;
            if (epFromUrl && epFromUrl !== currentEp) {
                setCurrentEp(epFromUrl);
            }
            if (modeFromUrl && ['sub', 'dub'].includes(modeFromUrl) && modeFromUrl !== mode) {
                setMode(modeFromUrl);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [currentEp, mode]);

    // Cleanup countdown timer on unmount
    useEffect(() => {
        return () => {
            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
        };
    }, []);

    // Server State
    const [servers, setServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const selectedServerObj = useMemo(() => servers.find(s => s.serverId === selectedServer), [servers, selectedServer]);
    const [failedServers, setFailedServers] = useState<Set<string>>(new Set());
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loadingServers, setLoadingServers] = useState(false);
    const [serversKey, setServersKey] = useState<string>("");

    // Cast & Auto-Next state
    const [rawVideoSource, setRawVideoSource] = useState<string | null>(null);
    const [castAvailable, setCastAvailable] = useState(false);

    // Show loading and error states
    const [showError, setShowError] = useState<string | null>(null);
    const [loadingShow, setLoadingShow] = useState(true);
    const [showServerDropdown, setShowServerDropdown] = useState(false);
    const serverRef = useRef<HTMLDivElement>(null);
    const [loadingStatus, setLoadingStatus] = useState("Connecting to server...");
    const [healthScores, setHealthScores] = useState<Record<string, number>>({});
    const [dynamicMovieServers, setDynamicMovieServers] = useState<any[]>(MOVIE_SERVERS);
    const processingRef = useRef<string | null>(null);

    const [isSafeStream, setIsSafeStream] = useState(true);
    const [showSafeGuide, setShowSafeGuide] = useState(false);

    const [tmdbId, setTmdbId] = useState<string | null>(null);
    const [dimLights, setDimLights] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isTheatreMode, setIsTheatreMode] = useState(false);
    const [episodeLayoutMode, setEpisodeLayoutMode] = useState<"list" | "grid">("list");
    const [iframeKey, setIframeKey] = useState(0);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [aggressiveSandbox, setAggressiveSandbox] = useState(true);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);

    // Dynamic document.title update
    useEffect(() => {
        if (show?.name) {
            document.title = `Watch ${show.name} - Episode ${currentEp}${currentEpTitle ? `: ${currentEpTitle}` : ''} | ToonPlayer`;
        }
    }, [show?.name, currentEp, currentEpTitle]);

    // Save to watch history immediately when episode changes
    useEffect(() => {
        if (!show || !currentEp) return;
        try {
            addToHistory({
                id: `${fullId}-${currentEp}`,
                showId: fullId,
                type: 'anime',
                title: show?.name || 'Unknown',
                poster: (currentEpItem && typeof currentEpItem === 'object' && currentEpItem.image) || show?.thumbnail || ((show as any)?.image) || '',
                episodeId: currentEp,
                episodeNumber: Number(currentEp) || 1,
                currentTime: 0,
                duration: 0,
                providerId: provider || undefined,
                serverId: selectedServer || undefined
            });
        } catch (_) {}
    }, [fullId, currentEp, show, currentEpItem, provider, selectedServer, addToHistory]);

    // Reset advancing guard when episode changes
    useEffect(() => {
        isAdvancingRef.current = false;
    }, [currentEp]);

    const hasNextEpisode = useCallback(() => {
        const currentIdx = availableEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        return currentIdx !== -1 && currentIdx + 1 < availableEps.length;
    }, [availableEps, currentEp]);

    const hasPrevEpisode = useCallback(() => {
        const currentIdx = availableEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        return currentIdx > 0;
    }, [availableEps, currentEp]);

    const handleNextEpisode = useCallback(() => {
        if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
        setShowNextOverlay(false);

        const currentIdx = availableEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        if (currentIdx !== -1 && currentIdx + 1 < availableEps.length) {
            const nextItem = availableEps[currentIdx + 1];
            const nextEp = typeof nextItem === 'object' ? String(nextItem.number || nextItem.id) : String(nextItem);
            handleSelectEpisode(nextEp);
            toast.success(`Now playing Episode ${nextEp}`, { icon: '▶️' });
        } else {
            toast("You have reached the final episode.", { icon: "🏁" });
        }
    }, [availableEps, currentEp, handleSelectEpisode]);

    const handlePrevEpisode = useCallback(() => {
        if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
        setShowNextOverlay(false);

        const currentIdx = availableEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        if (currentIdx > 0) {
            const prevItem = availableEps[currentIdx - 1];
            const prevEp = typeof prevItem === 'object' ? String(prevItem.number || prevItem.id) : String(prevItem);
            handleSelectEpisode(prevEp);
            toast.success(`Now playing Episode ${prevEp}`, { icon: '▶️' });
        }
    }, [availableEps, currentEp, handleSelectEpisode]);

    // Automatic Provider Fallback Engine (Intelligent Content-Aware Circular Rotation)
    const handleAutoFallback = useCallback((reason: FailureReason = 'generic_failure') => {
        if (!selectedServer || !servers || servers.length === 0) return;
        const contentKey = `anime:${id}:${currentEp}`;

        let stateToSet: PlayerPlaybackState = 'unavailable';
        let failureMsg = `All available streaming providers failed for Episode ${currentEp}.`;
        if (reason === 'unsupported_content') {
            stateToSet = 'unsupported';
            failureMsg = `This provider does not have Episode ${currentEp} in its catalog.`;
        } else if (reason === 'embedding_rejected') {
            stateToSet = 'blocked_by_policy';
            failureMsg = `This provider prohibits embedding inside external web frames.`;
        } else if (reason === 'network_timeout') {
            stateToSet = 'timed_out';
            failureMsg = `Connection to streaming host timed out.`;
        }

        setPlaybackState(stateToSet);
        setCustomErrorMessage(failureMsg);

        setFailedServers(prev => {
            const nextFailed = new Set(prev);
            nextFailed.add(selectedServer);
            ServerHealthManager.recordFailure(selectedServer, reason, contentKey);

            // Show error screen ONLY if every single server in the available servers list has failed
            const allFailed = servers.every(s => nextFailed.has(s.serverId));
            if (allFailed || nextFailed.size >= servers.length) {
                console.warn(`[ToonPlayer Fallback] Reached max rotation attempts (${servers.length}). Stopping auto-switch.`);
                setError(failureMsg);
                setPlaybackState(stateToSet);
                setLoadingSource(false);
                processingRef.current = null;
                return nextFailed;
            }

            // Circular transition: find candidate that hasn't failed and is available for this content
            const currentIndex = servers.findIndex(s => s.serverId === selectedServer);
            const startIdx = currentIndex >= 0 ? currentIndex : 0;
            let nextServer = null;

            for (let i = 1; i <= servers.length; i++) {
                const nextIndex = (startIdx + i) % servers.length;
                const candidate = servers[nextIndex];
                if (candidate && !nextFailed.has(candidate.serverId) && ServerHealthManager.isAvailable(candidate.serverId, contentKey)) {
                    nextServer = candidate;
                    break;
                }
            }

            // If none are fully available, fallback to any server not yet tried in this session
            if (!nextServer) {
                for (let i = 1; i <= servers.length; i++) {
                    const nextIndex = (startIdx + i) % servers.length;
                    const candidate = servers[nextIndex];
                    if (candidate && !nextFailed.has(candidate.serverId)) {
                        nextServer = candidate;
                        break;
                    }
                }
            }

            if (nextServer) {
                processingRef.current = null;
                setLoadingStatus(`Switching to backup server: ${nextServer.serverName}...`);
                setPlaybackState('resolving');
                toast.error(`Server failed. Auto-switching to ${nextServer.serverName}...`, {
                    icon: "🔄",
                    style: {
                        background: "rgba(20, 20, 20, 0.95)",
                        border: "1px solid rgba(124, 58, 237, 0.3)",
                        fontSize: "12px",
                        fontWeight: "bold"
                    }
                });
                manualServerRef.current = nextServer.serverId;
                // Update selected server -> UI button highlight updates automatically
                setSelectedServer(nextServer.serverId);
            } else {
                setError(failureMsg);
                setPlaybackState(stateToSet);
                setLoadingSource(false);
                processingRef.current = null;
            }
            return nextFailed;
        });
    }, [selectedServer, servers, id, currentEp]);

    const handleResetAndRetryAllServers = useCallback(() => {
        fallbackCountRef.current = 0;
        setFailedServers(new Set());
        setError(null);
        setCustomErrorMessage(null);
        setPlaybackState('resolving');
        if (servers && servers.length > 0) {
            const firstServer = servers[0];
            setLoadingStatus(`Connecting to ${firstServer.serverName || 'Server 1'}...`);
            manualServerRef.current = firstServer.serverId;
            setSelectedServer(firstServer.serverId);
            toast.success(`Reset server tracker — trying ${firstServer.serverName || 'Server 1'}...`, { icon: '🔄' });
        }
    }, [servers]);

    // Helper to match server names to live API health scores
    const getHealthScoreForServer = (serverName: string, scoresMap: Record<string, number>): number => {
        const name = serverName.toLowerCase();
        if (name.includes("ultimate")) return scoresMap["vidsrc to"] ?? scoresMap["vidsrc.to"] ?? 100;
        if (name.includes("auto")) return scoresMap["vidsrc me"] ?? scoresMap["vidsrc.me"] ?? 100;
        if (name.includes("classic")) return 85; 
        if (name.includes("vip")) return 95; 
        if (name.includes("backup")) return scoresMap["superembed"] ?? 100;
        return 100;
    };

    // Reset failed servers when episode or mode changes
    useEffect(() => {
        setFailedServers(new Set());
    }, [currentEp, mode]);

    // Background loading timeouts and provider health checks have been removed to prevent unexpected switches.

    // Fetch dynamic movie/tv fallback servers from MongoDB on mount
    useEffect(() => {
        const loadDynamicFallbackServers = async () => {
            try {
                let fetchedServers: any[] = [];
                try {
                    const res = await axios.get('/api/servers?type=movie');
                    if (res.data && res.data.servers && res.data.servers.length > 0) {
                        fetchedServers = res.data.servers.map((srv: any) => {
                            const canonicalId = srv.canonicalId || getCanonicalProviderId(srv.serverId || srv.id);
                            return {
                                id: canonicalId,
                                serverId: srv.serverId || canonicalId,
                                canonicalId,
                                name: srv.name,
                                serverName: srv.name,
                                badge: srv.badge,
                                type: srv.type,
                                isMovieServer: true,
                                getUrl: (param1: string, param2: string, s?: number, e?: number) => {
                                    if (srv.type === 'anime') {
                                        return srv.urlTemplate
                                            .replace('{id}', param1)
                                            .replace('{e}', String(param2 || 1));
                                    }
                                    const isAnimeCall = (param1 !== 'tv' && param1 !== 'movie' && s === undefined && e === undefined);
                                    if (isAnimeCall) {
                                        return srv.urlTemplate
                                            .replace('{id}', param1)
                                            .replace('{s}', '1')
                                            .replace('{e}', String(param2 || 1));
                                    }
                                    return srv.urlTemplate
                                        .replace('{id}', param2)
                                        .replace('{s}', String(s || 1))
                                        .replace('{e}', String(e || 1));
                                }
                            };
                        });
                    }
                } catch (err) {
                    console.error('Failed to fetch dynamic fallback servers in anime, using hardcoded', err);
                }

                const combined = [...fetchedServers, ...MOVIE_SERVERS];
                const dedupedMovieServers = deduplicateServersByCanonicalId(combined);
                setDynamicMovieServers(dedupedMovieServers);
            } catch (e) {
                console.error("Failed to initialize dynamic movie servers in anime WatchClient:", e);
            }
        };
        loadDynamicFallbackServers();
    }, []);

    useEffect(() => {
        const loadSettings = () => {
            try {
                const s = localStorage.getItem("toonplayer_settings");
                if (s) {
                    const parsed = JSON.parse(s);
                    // Default to true if not explicitly set to false
                    setAutoPlay(parsed.autoplay ?? true);
                    setAutoNext(parsed.autoplay ?? true);
                    if (parsed.aggressiveSandbox !== undefined) {
                        setAggressiveSandbox(parsed.aggressiveSandbox);
                    }
                } else {
                    // No settings saved — both default to true
                    setAutoPlay(localStorage.getItem('toonplayer_autoplay') !== 'false');
                    setAutoNext(localStorage.getItem('toonplayer_autonext') !== 'false');
                }
            } catch (e) {}
        };
        loadSettings();
        window.addEventListener("profileUpdated", loadSettings);

        const toggleVisibility = () => {
            if (window.scrollY > 120) {
                setIsHeaderScrolled(true);
            } else {
                setIsHeaderScrolled(false);
            }
        };
        window.addEventListener("scroll", toggleVisibility);

        // Click outside to close dropdown
        const handleClickOutside = (e: MouseEvent) => {
            if (serverRef.current && !serverRef.current.contains(e.target as Node)) {
                setShowServerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            window.removeEventListener("profileUpdated", loadSettings);
            window.removeEventListener("scroll", toggleVisibility);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Override window.open globally to prevent popups bubbling from iframes
    useEffect(() => {
        const originalWindowOpen = window.open;
        window.open = function() {
            console.warn('[WatchClient] Blocked malicious popup attempt from iframe.');
            return null;
        };
        return () => {
            window.open = originalWindowOpen;
        };
    }, []);

    // Sync URL with state
    useEffect(() => {
        if (!show) return;
        const params = new URLSearchParams(window.location.search);
        let changed = false;
        if (params.get('ep') !== currentEp) { params.set('ep', currentEp); changed = true; }
        if (params.get('mode') !== mode) { params.set('mode', mode); changed = true; }
        if (params.get('provider') !== provider) { params.set('provider', provider || ''); changed = true; }
        
        if (changed) {
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            router.replace(newUrl, { scroll: false });
        }
    }, [currentEp, mode, provider, show]);

    // Scroll to top only on initial mount when media ID changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [id]);

    // Reset captured stream links when rotating sources
    useEffect(() => {
        setRawVideoSource(null);
    }, [selectedServer, currentEp, mode]);

    const isBookmarked = isInWatchlist(fullId);

    // Auto-dispatch postMessage if audio was already unlocked in a previous session/server
    useEffect(() => {
        if (!loadingSource && audioUnlocked && iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage({ type: 'PLAY_WITH_SOUND' }, '*');
        }
    }, [loadingSource, audioUnlocked]);

    const toggleBookmark = () => {
        if (!show) return;
        if (isGuestProfile) {
            toast.error("Watchlist is not available for Guest profiles. Please switch profiles or log in.", { icon: "🔒" });
            return;
        }

        if (isBookmarked) {
            removeFromWatchlist(fullId);
            toast("Removed from Watchlist", { icon: "🗑️" });
        } else {
            addToWatchlist({
                id: fullId,
                showId: fullId,
                type: 'anime',
                title: show.name || 'Unknown',
                poster: show.thumbnail || ((show as any).image) || '/placeholder.jpg',
            });
            toast.success("Added to Watchlist", { icon: "⭐" });
        }
    };

    // Keep handleVideoEnded fresh for message event
    const handleVideoEndedRef = useRef<Function | null>(null);
    useEffect(() => {
        handleVideoEndedRef.current = handleVideoEnded;
    });

    // Refs for tracking playback progress without triggering re-renders of the player
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);

    // Listen for events from proxy iframe or third-party embeds (e.g. VidLink)
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (!e.data) return;

            // 1. VidLink / progress ticks - NEVER trigger React state
            if (e.data.type === 'MEDIA_DATA' || e.data.event === 'timeupdate' || e.data.type === 'timeupdate') {
                const ct = e.data.data?.currentTime ?? e.data.currentTime;
                const dur = e.data.data?.duration ?? e.data.duration;
                if (typeof ct === 'number') currentTimeRef.current = ct;
                if (typeof dur === 'number') durationRef.current = dur;
                return;
            }

            // 2. Video ended event
            const isEndEvent = (
                e.data.type === "videoEnd" || 
                e.data.event === "ended" || 
                e.data === "video_ended" ||
                e.data.type === "player_ended" ||
                e.data.type === 'VIDEO_ENDED'
            );
            if (isEndEvent) {
                if (handleVideoEndedRef.current) handleVideoEndedRef.current();
                return;
            }

            // 3. Raw video source (only set if actually different)
            if (e.data.type === 'VIDEO_SOURCE_FOUND' && e.data.source) {
                setRawVideoSource(prev => (prev !== e.data.source ? e.data.source : prev));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Cast initialization
    useEffect(() => {
        (window as any).__onGCastApiAvailable = function (isAvailable: boolean) {
            if (isAvailable) {
                try {
                    const castContext = (window as any).cast.framework.CastContext.getInstance();
                    castContext.setOptions({
                        receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                        autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                    });
                    setCastAvailable(true);
                } catch (e) {
                    console.error("Cast initialization failed", e);
                }
            }
        };
    }, []);

    // Cast session listener
    useEffect(() => {
        if (!castAvailable) return;
        const castContext = (window as any).cast.framework.CastContext.getInstance();
        
        const handleSessionStateChanged = (event: any) => {
            if (event.sessionState === (window as any).cast.framework.SessionState.SESSION_STARTED) {
                const sourceToCast = videoType === "iframe" ? rawVideoSource : sourceUrl;
                if (!sourceToCast) {
                    toast.error("This stream cannot be casted. Try a different server.");
                    return;
                }
                const castSession = castContext.getCurrentSession();
                const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(sourceToCast, sourceToCast.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4');
                const request = new (window as any).chrome.cast.media.LoadRequest(mediaInfo);
                
                castSession.loadMedia(request).then(
                    () => toast.success("Casting started!"),
                    (e: any) => toast.error("Casting failed.")
                );
            }
        };

        castContext.addEventListener(
            (window as any).cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            handleSessionStateChanged
        );

        return () => {
            castContext.removeEventListener(
                (window as any).cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                handleSessionStateChanged
            );
        };
    }, [castAvailable, rawVideoSource, sourceUrl, videoType]);

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Watch ${show?.name || 'Anime'}`,
                    text: `Watch episode ${currentEp} of ${show?.name} on ToonPlayer!`,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied to clipboard!");
            }
        } catch (err) {
            console.error("Error sharing", err);
        }
    };

    // Combined Fetch for Show and TMDB Metadata to parallelize networking
    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            setLoadingShow(true);
            setShow(null);
            setShowError(null);
            setTmdbId(null);
            setSourceUrl(null);
            
            try {
                // Kick off episodes fetch
                const episodesPromise = axios.get(`/api/anime/episodes?id=${encodeURIComponent(id)}&provider=${encodeURIComponent(provider || '')}`, {
                    timeout: 15000,
                    signal: controller.signal
                });

                const res = await episodesPromise;
                if (controller.signal.aborted) return;

                const fetchedShow = res.data.show;
                
                if (!fetchedShow) throw new Error("No show data received");
                
                // Validate show identity against requested ID or resolved metadata
                const fetchedShowId = String(fetchedShow.id || fetchedShow.showId || fetchedShow._id || '');
                const matchesId = !fetchedShowId ||
                    fetchedShowId === String(id) ||
                    String(fetchedShow.anilistId) === String(id) ||
                    String(fetchedShow.malId) === String(id) ||
                    String(fetchedShow.tmdbId) === String(id) ||
                    fetchedShowId.toLowerCase() === String(id).toLowerCase() ||
                    Boolean(fetchedShow.name);
                if (!matchesId && !provider) {
                    console.error('[WatchClient] ID Mismatch Detected!', { requested: id, received: fetchedShowId });
                    throw new Error("CONTENT_MISMATCH");
                }
                
                // Ensure episodes are strictly sorted numerically
                if (fetchedShow.availableEpisodesDetail) {
                    if (Array.isArray(fetchedShow.availableEpisodesDetail.sub)) {
                        fetchedShow.availableEpisodesDetail.sub = sortEpisodes(fetchedShow.availableEpisodesDetail.sub);
                    }
                    if (Array.isArray(fetchedShow.availableEpisodesDetail.dub)) {
                        fetchedShow.availableEpisodesDetail.dub = sortEpisodes(fetchedShow.availableEpisodesDetail.dub);
                    }
                }
                
                setShow(fetchedShow);

                // Determine initial mode and episode
                let initialMode: "sub" | "dub" = "sub";
                let eps = fetchedShow.availableEpisodesDetail?.sub || [];
                if (eps.length === 0 && (fetchedShow.availableEpisodesDetail?.dub || []).length > 0) {
                    initialMode = "dub";
                    eps = fetchedShow.availableEpisodesDetail.dub;
                }
                setMode(initialMode);

                // Use watch history if available to resume playback
                // Use URL parameter > history > default
                const historyItem = history.find((i: any) => i.showId === fullId);
                const epParam = new URLSearchParams(window.location.search).get("ep");
                const modeParam = new URLSearchParams(window.location.search).get("mode") as "sub" | "dub";
                
                if (modeParam && ["sub", "dub"].includes(modeParam)) {
                    setMode(modeParam);
                }

                const currentEps = fetchedShow.availableEpisodesDetail?.[modeParam || initialMode] || [];
                
                if (epParam && currentEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).includes(String(epParam))) {
                    setCurrentEp(String(epParam));
                } else if (historyItem && historyItem.episodeId && currentEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).includes(String(historyItem.episodeId))) {
                    setCurrentEp(String(historyItem.episodeId));
                } else if (currentEps.length > 0) {
                    setCurrentEp(currentEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).includes("1") ? "1" : String((typeof currentEps[0] === 'object' ? String(currentEps[0].number||currentEps[0].id) : String(currentEps[0]))));
                }
                
                if (historyItem?.serverId) {
                    setSelectedServer(historyItem.serverId);
                    manualServerRef.current = historyItem.serverId;
                }

                // Parallelly resolve TMDB ID for shared server support
                if (fetchedShow.tmdbId) {
                    setTmdbId(String(fetchedShow.tmdbId));
                } else if (fetchedShow.name) {
                    const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/gi, '').trim();
                    let sanitizedName = fetchedShow.name.split('\n')[0].trim().substring(0, 50).replace(/[^a-zA-Z0-9 ':!,-]/g, '').trim();
                    const isMovie = fetchedShow.type?.toLowerCase() === 'movie' || fetchedShow.totalEpisodes === 1 || fetchedShow.format === 'MOVIE';
                    const targetType = isMovie ? 'movie' : 'tv';

                    axios.get(`/api/prime/search?q=${encodeURIComponent(sanitizedName)}`, { signal: controller.signal })
                        .then(tmdbRes => {
                            if (controller.signal.aborted) return;
                            const results = tmdbRes.data.results || [];
                            if (results.length > 0) {
                                const cleanSearch = clean(sanitizedName);
                                const exactMatch = results.find((r: any) =>
                                    r.media_type === targetType && (
                                        clean(r.name || r.title || '') === cleanSearch ||
                                        clean(r.original_name || r.original_title || '') === cleanSearch
                                    )
                                );
                                const typeMatch = exactMatch || results.find((r: any) => r.media_type === targetType);
                                const fallbackMatch = typeMatch || results[0];
                                setTmdbId(fallbackMatch ? fallbackMatch.id.toString() : "0");
                            } else {
                                setTmdbId("0");
                            }
                        })
                        .catch((err) => {
                            if (!axios.isCancel(err)) setTmdbId("0");
                        });
                } else {
                    setTmdbId("0");
                }

            } catch (err: any) {
                if (axios.isCancel(err)) return;
                console.error("Failed to fetch show data", err);
                setShowError(err.message === "CONTENT_MISMATCH" ? "Content ID mismatch. Please try searching again." : "Failed to load show. Please try again later.");
            } finally {
                if (!controller.signal.aborted) setLoadingShow(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [id, provider, showReloadKey]);

    // Fetch Servers when Episode/Mode Changes
    useEffect(() => {
        if (!show) return;

        const controller = new AbortController();
        
        // ALWAYS include movie servers — they are the guaranteed fallback
        const movieServersList = dynamicMovieServers.map((ms: any) => ({
            serverId: ms.id,
            canonicalId: ms.canonicalId || getCanonicalProviderId(ms.id),
            serverName: ms.name,
            type: mode,
            badge: ms.badge,
            isMovieServer: true,
            qualityScore: ms.qualityScore || 90,
            getUrl: ms.getUrl
        }));

        // Emergency ID-based embeds — only if we have numeric IDs to avoid wrong content
        const numericAnilistId = (show?.anilistId && /^\d+$/.test(String(show.anilistId))) ? String(show.anilistId) : null;
        const numericMalId = (show?.malId && /^\d+$/.test(String(show.malId))) ? String(show.malId) : null;
        const numericTmdbId = (show?.tmdbId && /^\d+$/.test(String(show.tmdbId))) ? String(show.tmdbId) : tmdbId;

        const emergencyEmbeds: any[] = [];
        
        if (numericMalId) {
            emergencyEmbeds.push({
                serverId: "emergency_autoembed",
                canonicalId: "autoembed",
                serverName: "AutoEmbed",
                type: mode,
                badge: "Fast HD",
                isMovieServer: true,
                isEmergency: true,
                qualityScore: 100,
                getUrl: () => `https://player.autoembed.cc/embed/anime/${numericMalId}/${currentEp}`
            });
            emergencyEmbeds.push({
                serverId: "emergency_vidsrc_cc",
                canonicalId: "vidsrc_cc",
                serverName: "VidSrc CC",
                type: mode,
                badge: "VidSrc",
                isMovieServer: true,
                isEmergency: true,
                qualityScore: 99,
                getUrl: () => `https://vidsrc.cc/v2/embed/anime/${numericMalId}/${currentEp}`
            });
            emergencyEmbeds.push({
                serverId: "emergency_mal",
                canonicalId: "vidsrc_me",
                serverName: "VidSrc Me",
                type: mode,
                badge: "MAL",
                isMovieServer: true,
                isEmergency: true,
                qualityScore: 98,
                getUrl: () => `https://vidsrc.me/embed/anime?mal=${numericMalId}&episode=${currentEp}`
            });
            emergencyEmbeds.push({
                serverId: "emergency_vidsrc_to",
                canonicalId: "vidsrc_to",
                serverName: "VidSrc TO",
                type: mode,
                badge: "Backup",
                isMovieServer: true,
                isEmergency: true,
                qualityScore: 97,
                getUrl: () => `https://vidsrc.to/embed/anime/${numericMalId}/${currentEp}`
            });
        }

        const fetchServers = async () => {
            fallbackCountRef.current = 0;
            setLoadingServers(true);
            try {
                const availableEps = show?.availableEpisodesDetail?.[mode] || [];
                const epObj = availableEps.find((e: any) => typeof e === 'object' ? String(e.number || e.id) === String(currentEp) : String(e) === String(currentEp));
                const episodeIdForApi = (typeof epObj === 'object' && epObj ? epObj.id : currentEp) || currentEp;

                const res = await axios.get(`/api/anime/servers?episodeId=${encodeURIComponent(episodeIdForApi)}&provider=${encodeURIComponent(provider || '')}`, {
                    signal: controller.signal
                });
                if (controller.signal.aborted) return;
                
                let nativeServers = (res.data.servers || []).filter((s: any) => s.type === mode);
                
                // If no servers for specific mode (sub/dub), show all native servers as fallback
                if (nativeServers.length === 0 && res.data.servers?.length > 0) {
                    nativeServers = res.data.servers;
                }
                
                // ALWAYS include emergency anime embeds and valid movie servers — guaranteed fallbacks, deduplicated by canonical provider
                const validMovieServers = (tmdbId && tmdbId !== "0") ? movieServersList : [];
                const combinedAnimeServers = [...nativeServers, ...emergencyEmbeds, ...validMovieServers];
                const allServersRaw = deduplicateServersByCanonicalId(combinedAnimeServers, 'anime');
                const contentKey = `anime:${id}:${currentEp}`;
                const allServers = ServerHealthManager.filterAndSortServers(allServersRaw, 'serverId', contentKey);
                setServers(allServers);
                setServersKey(`${currentEp}-${mode}`);

                // Pick first available server immediately if none selected or current invalid
                if (allServers.length > 0) {
                    const currentValid = allServers.some((s: any) => 
                        s.serverId === selectedServer || 
                        (s.canonicalId && selectedServer && getCanonicalProviderId(selectedServer) === s.canonicalId)
                    );
                    const manualValid = manualServerRef.current && allServers.some((s: any) => 
                        s.serverId === manualServerRef.current || 
                        (s.canonicalId && getCanonicalProviderId(manualServerRef.current) === s.canonicalId)
                    );
                    
                    if (!currentValid) {
                        const newServer = (manualValid ? manualServerRef.current : (nativeServers[0]?.serverId || allServers[0].serverId)) as string;
                        console.log(`[GlobalClickDebugger] 🎬 PLAYER INITIALIZED ID (Anime): ${id} on Server: ${newServer}`);
                        setSelectedServer(newServer);
                    }
                } else {
                    setSelectedServer(null);
                }
            } catch (err: any) {
                if (axios.isCancel(err)) return;
                console.error("Failed to fetch anime servers, using all fallbacks", err);
                const contentKey = `anime:${id}:${currentEp}`;
                const validMovieServersFallback = (tmdbId && tmdbId !== "0") ? movieServersList : [];
                const combinedFallback = deduplicateServersByCanonicalId([...emergencyEmbeds, ...validMovieServersFallback], 'anime');
                const fallbackList = ServerHealthManager.filterAndSortServers(combinedFallback, 'serverId', contentKey);
                setServers(fallbackList);
                setServersKey(`${currentEp}-${mode}`);
                if (fallbackList.length > 0 && (!selectedServer || !fallbackList.some(s => s.serverId === selectedServer || (s.canonicalId && getCanonicalProviderId(selectedServer) === s.canonicalId)))) {
                    setSelectedServer(fallbackList[0].serverId);
                }
            } finally {
                if (!controller.signal.aborted) setLoadingServers(false);
            }
        };

        fetchServers();
        return () => controller.abort();
    }, [currentEp, mode, show, tmdbId]);

    // Fetch Source
    useEffect(() => {
        if (!show || !selectedServer || servers.length === 0 || serversKey !== `${currentEp}-${mode}`) return;

        const key = `${id}-${currentEp}-${mode}-${selectedServer}`;
        if (processingRef.current === key) return;
        processingRef.current = key;
        const currentSeq = ++sourceSeqRef.current;
        const controller = new AbortController();

        const fetchSource = async () => {
            const selectedServerObj = servers.find(s => s.serverId === selectedServer);
            if (!selectedServerObj) return;

            // For movie/emergency servers — load iframe directly
            if (selectedServerObj.isMovieServer) {
                setLoadingSource(true);
                setSourceUrl(null);
                setError(null);

                const serverWithUrl = selectedServerObj as any;
                
                if (serverWithUrl.isEmergency) {
                    if (currentSeq !== sourceSeqRef.current) return;
                    const emergencyUrl = serverWithUrl.getUrl?.();
                    if (!emergencyUrl || typeof emergencyUrl !== 'string' || emergencyUrl.trim() === '') {
                        console.warn('[WatchPage] Emergency server returned empty URL. Auto-switching...');
                        handleAutoFallback('invalid_response');
                        return;
                    }
                    setSourceUrl(emergencyUrl);
                } else {
                    if (!tmdbId || tmdbId === "0") {
                        if (currentSeq !== sourceSeqRef.current) return;
                        console.warn('[WatchPage] TMDB Metadata missing for this title. Auto-switching to next server...');
                        handleAutoFallback('unsupported_content');
                        return;
                    }
                    const isMovie = show.type?.toLowerCase() === 'movie' || show.totalEpisodes === 1 || isMovieContent(show);
                    let iframeUrl = "";
                    try {
                        iframeUrl = isMovie 
                            ? serverWithUrl.getUrl("movie", tmdbId)
                            : serverWithUrl.getUrl("tv", tmdbId, 1, parseInt(String(currentEp) || "1"));
                    } catch (e) {
                        iframeUrl = "";
                    }
                    if (!iframeUrl || typeof iframeUrl !== 'string' || iframeUrl.trim() === "") {
                        console.warn('[WatchPage] Empty embed URL from server. Auto-switching...');
                        handleAutoFallback('invalid_response');
                        return;
                    }
                    if (currentSeq !== sourceSeqRef.current) return;
                    setSourceUrl(iframeUrl);
                }

                setVideoType("iframe");
                setLoadingSource(false);
                toast.success(`${show.type?.toLowerCase() === 'movie' ? 'Movie' : `EP ${currentEp}`} loaded on ${selectedServerObj.serverName}`);
                processingRef.current = null;
                return;
            }

            // For native anime servers
            if (show.availableEpisodesDetail) {
                const availableEps = show.availableEpisodesDetail[mode] || [];
                const formattedAvailable = availableEps.map(e => typeof e === 'object' ? String(e.number||e.id) : String(e));
                if (formattedAvailable.length > 0 && !formattedAvailable.includes(String(currentEp))) {
                    if (currentSeq !== sourceSeqRef.current) return;
                    if (mode === "dub" && (show.availableEpisodesDetail.sub || []).length > 0) {
                        console.warn(`[WatchPage] Episode ${currentEp} not available in DUB. Reverting to SUB mode.`);
                        toast.error(`Episode ${currentEp} unavailable in DUB audio. Reverting to SUB audio...`, { icon: "🔄" });
                        setMode("sub");
                        processingRef.current = null;
                        return;
                    }
                    setError(`Episode ${currentEp} is not available in ${mode.toUpperCase()} mode.`);
                    processingRef.current = null;
                    return;
                }
            }

            setLoadingSource(true);
            setSourceUrl(null);
            setError(null);

            try {
                console.log('[WatchPage] Fetching source from native server...');
                const res = await axios.get(`/api/anime/source`, {
                    signal: controller.signal,
                    params: {
                        id,
                        ep: currentEp,
                        mode,
                        malId: show.malId,
                        title: show.name,
                        provider: show.provider || provider,
                        serverId: selectedServer
                    }
                });

                if (controller.signal.aborted || currentSeq !== sourceSeqRef.current) return;

                // Validate returned response identity matches requested content
                const matchesAnimeId = !res.data?.animeId || 
                    res.data.animeId === id || 
                    res.data.animeId === String(show?.anilistId) || 
                    res.data.animeId === String(show?.malId) || 
                    res.data.animeId === (show as any)?.slug || 
                    res.data.animeId === show?.id ||
                    (typeof show?.name === 'string' && show.name.length > 0);
                if (!matchesAnimeId) {
                    console.warn(`[WatchPage] ⚠️ Discarding mismatched response: requested ${id}, received ${res.data.animeId}`);
                    return;
                }
                if (res.data?.episode && String(res.data.episode) !== String(currentEp)) {
                    console.warn(`[WatchPage] ⚠️ Discarding mismatched episode response: requested ${currentEp}, received ${res.data.episode}`);
                    return;
                }

                const links = res.data.sources || res.data.links;
                if (links && Array.isArray(links) && links.length > 0) {
                    const hlsIndex = links.findIndex((l: any) => l.hls || l.isM3U8 || l.type === 'hls');
                    const selected = hlsIndex !== -1 ? links[hlsIndex] : links[0];
                    const rawUrl = selected?.url || selected?.link;
                    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
                        console.warn('[WatchPage] Invalid or empty source URL received. Auto-switching to next server...');
                        handleAutoFallback('invalid_response');
                        return;
                    }
                    const absoluteUrl = rawUrl.startsWith('http')
                        ? rawUrl
                        : `${window.location.origin}${rawUrl}`;

                    const isM3U8 = selected.hls || selected.isM3U8 || selected.type === 'hls' || absoluteUrl.includes('.m3u8');
                    
                    if (isM3U8 || absoluteUrl.includes('.mp4')) {
                        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                        console.log(`[GlobalClickDebugger] 📡 STREAM URL GENERATED FOR ID (Anime MP4/M3U8): ${id} -> ${proxiedUrl}`);
                        if (currentSeq !== sourceSeqRef.current) return;
                        setRawVideoSource(proxiedUrl);
                        setSourceUrl(proxiedUrl);
                        setVideoType(isM3U8 ? "m3u8" : "mp4");
                    } else {
                        const embedUrl = getProxiedEmbedUrl(absoluteUrl);
                        console.log(`[GlobalClickDebugger] 📡 STREAM URL GENERATED FOR ID (Anime IFrame): ${id} -> ${embedUrl}`);
                        if (currentSeq !== sourceSeqRef.current) return;
                        setSourceUrl(embedUrl);
                        setVideoType("iframe");
                    }
                } else {
                    // No links found — auto-switch to next server
                    console.warn('[WatchPage] No links from native server. Rotating...');
                    if (currentSeq !== sourceSeqRef.current) return;
                    handleAutoFallback('unsupported_content');
                }
            } catch (err: any) {
                if (axios.isCancel(err) || controller.signal.aborted) return;
                if (currentSeq !== sourceSeqRef.current) return;
                console.error('[WatchPage] Native server failed:', err.message);
                handleAutoFallback('network_timeout');
            } finally {
                if (currentSeq === sourceSeqRef.current) {
                    setLoadingSource(false);
                    processingRef.current = null;
                }
            }
        };

        fetchSource();
        return () => {
            controller.abort();
            if (processingRef.current === key) {
                processingRef.current = null;
            }
        };
    }, [id, currentEp, mode, show, selectedServer, provider, servers, serversKey, tmdbId]);

    const handleVideoEnded = useCallback(() => {
        if (!autoNext) {
            console.log('[WatchPage] Video ended, auto-next is disabled.');
            return;
        }
        if (isAdvancingRef.current) return;
        if (loadingSource || loadingServers) {
            console.warn('[WatchPage] Ignoring ended event while source is loading.');
            return;
        }
        
        const currentIdx = availableEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        
        if (currentIdx !== -1 && currentIdx + 1 < availableEps.length) {
            // Trigger Netflix-style countdown overlay
            if (showNextOverlay) return;
            
            setShowNextOverlay(true);
            setNextCountdown(5);
            
            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
            
            nextIntervalRef.current = setInterval(() => {
                setNextCountdown(prev => {
                    if (prev <= 1) {
                        if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                        setShowNextOverlay(false);
                        isAdvancingRef.current = true;
                        handleNextEpisode();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            toast("You have reached the latest available episode.", { icon: "✅" });
        }
    }, [autoNext, availableEps, currentEp, showNextOverlay, loadingSource, loadingServers, handleNextEpisode]);


    if (loadingShow) {
        return <DetailsSkeleton />;
    }

    if (showError) {
        const isNumeric = /^\d+$/.test(id);
        const displayTitle = (!isNumeric && id) ? id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : "Anime Series";

        return (
            <div className="min-h-screen bg-bg-main text-[var(--text-main)] flex flex-col">
                {/* Navbar */}
                <nav className={`fixed top-0 left-0 right-0 z-50 h-14 md:h-16 bg-black/60 backdrop-blur-md border-b border-white/5 flex items-center px-4 md:px-6 gap-3 pt-[env(safe-area-inset-top)] transition-transform ${isHeaderScrolled ? '-translate-y-full' : 'translate-y-0'}`}>
                    <Link href="/" scroll={false} className="shrink-0 flex items-center justify-center w-10 h-10 bg-white/[0.05] hover:bg-white/10 rounded-full border border-white/10 text-zinc-400 hover:text-white transition-all group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform will-change-transform" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-black text-sm md:text-base lg:text-lg leading-tight text-white truncate tracking-tight">
                            {displayTitle}
                        </h2>
                        <p className="text-[10px] md:text-xs text-zinc-500 font-medium tracking-widest uppercase">Stream Details</p>
                    </div>
                </nav>

                <div className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-xl">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">Content Temporarily Unavailable</h1>
                    <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
                        {showError || "We could not resolve streaming sources for this title. It may be currently offline or cataloged under an alternative provider."}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
                        <button
                            onClick={() => {
                                setShowError(null);
                                setLoadingShow(true);
                                setShowReloadKey(k => k + 1);
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                        >
                            <RefreshCw className="w-4 h-4" /> Retry Connection
                        </button>
                        <Link
                            href="/search"
                            scroll={false}
                            className="px-6 py-3 bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Search className="w-4 h-4" /> Search Catalog
                        </Link>
                        <Link
                            href="/"
                            scroll={false}
                            className="px-6 py-3 bg-transparent hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white rounded-xl font-bold transition-all cursor-pointer"
                        >
                            Return Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
    const renderPlayer = () => {
        return (
            <div 
                ref={playerContainerRef}
                onPointerMove={handlePointerMoveFs}
                className={`relative w-full aspect-video bg-black overflow-hidden ${
                    isPseudoFullscreen 
                        ? "toonplayer-pseudo-fullscreen" 
                        : isFocusMode 
                            ? "!h-[100dvh] !aspect-auto rounded-none" 
                            : "rounded-none sm:rounded-xl md:rounded-2xl watch-player-landscape"
                } border-0 sm:border border-border-color shadow-none sm:shadow-2xl touch-pan-y ${dimLights ? 'z-[48]' : 'z-20'}`} 
                style={{ touchAction: 'pan-y !important' }}
            >
                {/* Floating Fullscreen Controls Bar (visible when in native or pseudo fullscreen) */}
                <AnimatePresence>
                    {(isFullscreen || isPseudoFullscreen) && showFsControls && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-0 left-0 right-0 z-[60] bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 py-3 flex items-center justify-between pointer-events-auto"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-white font-bold text-sm tracking-wide line-clamp-1 max-w-[200px] sm:max-w-md">
                                    {show?.name || 'Anime'}
                                </span>
                                {show?.type?.toLowerCase() !== 'movie' && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-600/30 border border-purple-500/40 text-purple-300 font-mono">
                                        EP {currentEp}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {show?.type?.toLowerCase() !== 'movie' && (
                                    <>
                                        <button
                                            onClick={handlePrevEpisode}
                                            disabled={!hasPrevEpisode()}
                                            className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg text-white transition-colors cursor-pointer"
                                            title="Previous Episode"
                                            aria-label="Previous Episode"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleNextEpisode}
                                            disabled={!hasNextEpisode()}
                                            className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg text-white transition-colors cursor-pointer"
                                            title="Next Episode"
                                            aria-label="Next Episode"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={handleReloadPlayer}
                                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                                    title="Reload Stream"
                                    aria-label="Reload Stream"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={exitFullscreen}
                                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                                    title="Exit Fullscreen (Esc)"
                                    aria-label="Exit Fullscreen"
                                >
                                    <Minimize2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {loadingSource ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-md z-50">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                            <Loader2 className="w-16 h-16 animate-spin text-accent relative z-10" />
                        </div>
                        <div className="text-center relative z-10 px-4">
                            <h3 className="text-lg font-black text-white tracking-widest uppercase mb-1 drop-shadow-[0_0_10px_var(--accent-glow)]">
                                Initializing Stream
                            </h3>
                            <p className="text-[10px] text-white/50 uppercase tracking-[0.3em] font-medium animate-pulse">
                                {loadingStatus}
                            </p>
                        </div>
                    </div>
                ) : error ? (
                    <PlayerStatusOverlay
                        state={playbackState}
                        serverName={selectedServerObj?.serverName || "Provider"}
                        loadingStatus={loadingStatus}
                        customErrorMessage={customErrorMessage || error || undefined}
                        availableAlternatives={servers
                            .filter(s => s.serverId !== selectedServer && !failedServers.has(s.serverId) && ServerHealthManager.isAvailable(s.serverId, `anime:${id}:${currentEp}`))
                            .map(s => ({ id: s.serverId, name: s.serverName, badge: s.badge }))}
                        onSelectAlternative={(alt) => {
                            setError(null);
                            setCustomErrorMessage(null);
                            setPlaybackState('resolving');
                            manualServerRef.current = alt.id;
                            setSelectedServer(alt.id);
                        }}
                        onRetry={() => {
                            if (selectedServer) {
                                setFailedServers(prev => {
                                    const next = new Set(prev);
                                    next.delete(selectedServer);
                                    return next;
                                });
                            }
                            setError(null);
                            setCustomErrorMessage(null);
                            setPlaybackState('resolving');
                            setReloadCount(c => c + 1);
                        }}
                        onRetryAll={handleResetAndRetryAllServers}
                        onBack={() => router.back()}
                    />
                ) : sourceUrl ? (
                    <div className="relative w-full h-full">
                        {videoType === "iframe" ? (
                            <>
                                <CrossOriginEmbedNotice 
                                    serverName={selectedServerObj?.serverName || "Provider"} 
                                    visible={playbackState === 'player_loaded'} 
                                />
                                <VideoIframeEmbed
                                    mediaKey={`${selectedServer || 'server'}-${id}-ep${currentEp}-${mode}-${reloadCount}`}
                                    iframeRef={iframeRef}
                                    src={getProxiedEmbedUrl(sourceUrl)}
                                    isFocusMode={isFocusMode}
                                    onLoad={(e: any) => {
                                        setLoadingSource(false);
                                        setPlaybackState('player_loaded');
                                        try {
                                            const iframe = e.target as HTMLIFrameElement;
                                            const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                            if (doc) {
                                                const text = doc.body?.innerText || '';
                                                if (text.includes('Embed fetch failed') || text.includes('Embed proxy error') || text.includes('404 Not Found') || text.includes('502 Bad Gateway') || text.includes('Server Not Responding')) {
                                                    console.warn('[ToonPlayer] Proxy error detected inside anime iframe. Triggering autoscan fallback...');
                                                    handleAutoFallback('origin_unreachable');
                                                    return;
                                                }
                                            }
                                            if (selectedServer) {
                                                ServerHealthManager.recordSuccess(selectedServer, `anime:${id}:${currentEp}`);
                                            }
                                        } catch (err) {
                                            if (selectedServer) {
                                                ServerHealthManager.recordSuccess(selectedServer, `anime:${id}:${currentEp}`);
                                            }
                                        }
                                    }}
                                    onError={() => {
                                        setError("Iframe failed to load.");
                                        handleAutoFallback('embedding_rejected');
                                    }}
                                />
                                
                                {/* Global Audio Unlocker Overlay */}
                                <AnimatePresence>
                                    {!audioUnlocked && !loadingSource && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => {
                                                setAudioUnlocked(true);
                                                if (iframeRef.current) {
                                                    iframeRef.current.contentWindow?.postMessage({ type: 'PLAY_WITH_SOUND' }, '*');
                                                }
                                            }}
                                            className="absolute inset-0 z-[55] flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer group"
                                        >
                                            <div className="bg-gradient-to-r from-accent to-accent-warm hover:opacity-90 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 group-hover:scale-105 transition-transform will-change-transform" >
                                                <Play className="w-5 h-5 fill-current" />
                                                Tap anywhere to enable audio
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        ) : (
                            <ArtPlayer
                                key={`${id}-${currentEp}-${selectedServer}-${sourceUrl || ''}`}
                                getInstance={(art) => {
                                    artInstanceRef.current = art;
                                    art.on('play', () => {
                                        setPlaybackState('playback_confirmed');
                                        if (selectedServer) {
                                            ServerHealthManager.recordSuccess(selectedServer, `anime:${id}:${currentEp}`);
                                        }
                                    });
                                }}
                                option={{
                                    url: sourceUrl,
                                    type: videoType,
                                    poster: (currentEpItem && typeof currentEpItem === 'object' && currentEpItem.image) || show?.thumbnail || ((show as any)?.image) || '',
                                    title: `${show?.name || 'Anime'} - Episode ${currentEp}${currentEpTitle ? `: ${currentEpTitle}` : ''}`,
                                }}
                                initialTime={getHistoryItem(`${fullId}-${currentEp}`)?.currentTime || 0}
                                onTimeUpdate={(currentTime: number, duration: number) => {
                                    addToHistory({
                                        id: `${fullId}-${currentEp}`,
                                        showId: fullId,
                                        type: 'anime',
                                        title: show?.name || 'Unknown',
                                        poster: (currentEpItem && typeof currentEpItem === 'object' && currentEpItem.image) || show?.thumbnail || ((show as any)?.image) || '',
                                        episodeId: currentEp,
                                        episodeNumber: Number(currentEp) || 1,
                                        currentTime,
                                        duration,
                                        providerId: provider || undefined,
                                        serverId: selectedServer || undefined,
                                        audio: typeof window !== 'undefined' ? localStorage.getItem('artplayer_audio_track') || undefined : undefined,
                                        quality: typeof window !== 'undefined' ? localStorage.getItem('artplayer_quality') || undefined : undefined
                                    });
                                }}
                                onEnded={handleVideoEnded}
                                onNext={handleNextEpisode}
                                hasNext={hasNextEpisode()}
                                onError={(err: any) => {
                                    console.warn('[ToonPlayer] ArtPlayer playback error. Triggering auto fallback...', err);
                                    handleAutoFallback();
                                }}
                                autoPlay={autoPlay}
                                autoNext={autoNext}
                                className="w-full h-full"
                            />
                        )}

                        {/* Netflix-style Auto Next Overlay (Shared) */}
                        <AnimatePresence>
                            {showNextOverlay && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        className="max-w-sm w-full"
                                    >
                                        <div className="relative w-20 h-20 mx-auto mb-6">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="40"
                                                    cy="40"
                                                    r="36"
                                                    stroke="rgba(255,255,255,0.1)"
                                                    strokeWidth="6"
                                                    fill="none"
                                                />
                                                <motion.circle
                                                    cx="40"
                                                    cy="40"
                                                    r="36"
                                                    stroke="var(--accent)"
                                                    strokeWidth="6"
                                                    fill="none"
                                                    strokeDasharray="226.08"
                                                    animate={{ strokeDashoffset: 226.08 - (226.08 * (5 - nextCountdown)) / 5 }}
                                                    transition={{ duration: 1, ease: "linear" }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-2xl font-black text-white">{nextCountdown}</span>
                                            </div>
                                        </div>
                                        
                                        {(() => {
                                            const currentIdx = availableEps.map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
                                            const nextItem = currentIdx !== -1 && currentIdx + 1 < availableEps.length ? availableEps[currentIdx + 1] : null;
                                            const nextEpNum = nextItem ? (typeof nextItem === 'object' ? String(nextItem.number || nextItem.id) : String(nextItem)) : 'Next';
                                            const nextEpTitle = nextItem && typeof nextItem === 'object' && nextItem.title ? nextItem.title : null;
                                            return (
                                                <>
                                                    <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tighter">Up Next</h3>
                                                    <p className="text-[var(--text-muted)] text-xs font-bold mb-6">
                                                        Episode {nextEpNum}{nextEpTitle ? `: ${nextEpTitle}` : ''}
                                                    </p>
                                                </>
                                            );
                                        })()}
                                        
                                        <div className="flex items-center gap-2 justify-center">
                                            <button 
                                                onClick={() => {
                                                    if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                                                    setShowNextOverlay(false);
                                                }}
                                                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-all cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                                                    setShowNextOverlay(false);
                                                    handleNextEpisode();
                                                }}
                                                className="px-6 py-2 bg-white text-black hover:bg-white/90 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                Play Now <Play className="w-3.5 h-3.5 fill-current" />
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6 bg-black/70 backdrop-blur-sm z-30">
                        {loadingServers || loadingSource ? (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full scale-150 animate-pulse" />
                                    <Loader2 className="w-10 h-10 animate-spin text-accent relative z-10" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-base tracking-wide uppercase">Connecting to Stream</p>
                                    <p className="text-xs text-white/50 mt-1">{loadingStatus || "Resolving playback server..."}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-10 h-10 text-amber-400/80" />
                                <div className="max-w-md">
                                    <p className="font-bold text-white text-base">Select a Playback Server</p>
                                    <p className="text-xs text-white/60 mt-1">Please select an available stream server below or tap Retry to reload.</p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-sm">
                                    {servers.slice(0, 3).map((srv) => (
                                        <button
                                            key={srv.serverId}
                                            onClick={() => {
                                                manualServerRef.current = srv.serverId;
                                                setSelectedServer(srv.serverId);
                                            }}
                                            className="px-3.5 py-1.5 bg-accent/20 border border-accent/40 hover:bg-accent/30 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                                        >
                                            <Play className="w-3 h-3 fill-current" /> {srv.serverName}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const firstSrv = servers[0]?.serverId;
                                            if (firstSrv) {
                                                manualServerRef.current = firstSrv;
                                                setSelectedServer(firstSrv);
                                            }
                                        }}
                                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Retry Stream
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (!show) {
        return (
            <div className="min-h-dvh bg-bg-main text-[var(--text-main)] pt-[calc(60px+env(safe-area-inset-top)+16px)] md:pt-[calc(72px+env(safe-area-inset-top)+16px)] w-full max-w-[1800px] mx-auto pb-8 px-4 sm:px-6 md:px-8">
                <div className="w-64 h-8 bg-zinc-800/60 rounded-xl animate-pulse mb-4" />
                <div className="grid grid-cols-1 xl:grid-cols-[74%_minmax(0,26%)] gap-6 items-start">
                    <div className="w-full aspect-video min-h-[220px] sm:min-h-[360px] md:min-h-[480px] bg-zinc-900/80 rounded-2xl animate-pulse flex items-center justify-center border border-white/5">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                    <div className="hidden xl:block w-full h-[600px] bg-zinc-900/40 rounded-2xl animate-pulse border border-white/5" />
                </div>
            </div>
        );
    }

    const episodes = show.availableEpisodesDetail?.[mode] || [];

    const renderAnimeCarousel = () => {
        const filteredEpisodes = epFilter
            ? episodes.filter(ep => String(typeof ep === 'object' ? (ep.number||ep.id) : ep).includes(epFilter))
            : episodes;
        return (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {filteredEpisodes.map((ep) => {
                    const epNum = String(typeof ep === 'object' ? (ep.number||ep.id) : ep);
                    const isActive = String(currentEp) === epNum;
                    return (
                        <button
                            key={epNum}
                            onClick={() => handleSelectEpisode(epNum)}
                            className={`flex-shrink-0 w-[180px] snap-center p-3 rounded-xl border text-left transition-all duration-[250ms] ease-out hover:-translate-y-[2px] hover:shadow-lg cursor-pointer ${
                                isActive
                                    ? 'border-accent bg-accent/15 border-accent/40 shadow-[0_0_12px_var(--accent-glow)]'
                                    : 'border-white/5 bg-[#12131A] hover:border-accent/30'
                            }`}
                        >
                            <div className="w-full aspect-video rounded-lg overflow-hidden bg-bg-main relative mb-2">
                                {typeof ep === 'object' && ep.image ? (
                                    <img src={ep.image} alt={ep.title || `Episode ${epNum}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                ) : show.thumbnail ? (
                                    <img src={show.thumbnail} alt={`Episode ${epNum}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
                                )}
                                {isActive && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Play className="w-4 h-4 text-white fill-current" /></div>}
                            </div>
                            <p className={`text-xs font-semibold line-clamp-1 ${isActive ? 'text-accent font-bold' : 'text-white'}`}>
                                EP {epNum}
                            </p>
                            {typeof ep === 'object' && ep.title && (
                                <p className="text-[10px] text-zinc-500 truncate mt-0.5">{ep.title}</p>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <>
        {/* Dim Lights Background Overlay */}
        {dimLights && (
            <div 
                onClick={() => setDimLights(false)}
                className="fixed inset-0 bg-black/90 z-[45] transition-opacity duration-[250ms] cursor-pointer"
            />
        )}
        <div className="bg-bg-main text-[var(--text-main)] font-sans selection:bg-accent/20 transition-colors duration-[250ms]">
            {/* No JavaScript Fallback */}
            <noscript>
                <div className="fixed inset-0 z-[100] bg-bg-main/95 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="max-w-md bg-bg-card border border-red-500/30 rounded-2xl p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-3 text-[var(--text-main)]">JavaScript Required</h2>
                        <p className="text-[var(--text-muted)] mb-6">
                            Video streaming requires JavaScript to function. Please enable JavaScript in your browser to watch anime.
                        </p>
                        <Link href="/" scroll={false} className="px-6 py-3 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] hover:opacity-90 text-white rounded-lg font-bold inline-block">
                            Return Home
                        </Link>
                    </div>
                </div>
            </noscript>

            {/* Background Glow - Hidden on mobile for performance */}
            <div className="fixed inset-0 pointer-events-none z-0 hidden md:block">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[24px] mix-blend-screen opacity-20"></div>
            </div>

            {/* Top Navigation Bar — Netflix-style compact fixed header */}
            {!isFocusMode && (
                <div className={`fixed top-0 left-0 right-0 z-[100] h-[calc(60px+env(safe-area-inset-top))] md:h-[calc(72px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-black/60 backdrop-blur-md border-b border-white/5 flex items-center px-4 md:px-6 gap-3 transition-all duration-[250ms] ease-apple will-change-transform ${
                    isHeaderScrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
                }`}>
                    <Link href="/" scroll={false} className="shrink-0 flex items-center justify-center w-9 h-9 bg-white/[0.06] hover:bg-white/[0.12] rounded-full border border-white/10 text-zinc-400 hover:text-white transition-all group">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform will-change-transform"  />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-black text-sm md:text-base leading-tight text-white truncate tracking-tight">
                            {show.name || "Anime Stream"}
                        </h2>
                        <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase mt-0.5">
                            {episodes.length > 1 ? `Episode ${currentEp} · ${mode}` : `Movie · ${mode}`}
                        </p>
                    </div>
                </div>
            )}

            {/* Content Container - Padded from top to avoid Navbar overlap (Page top = 16px) */}
            <div className={`${isFocusMode ? "pt-0 w-full" : "pt-[calc(60px+env(safe-area-inset-top)+16px)] md:pt-[calc(72px+env(safe-area-inset-top)+16px)] w-full max-w-[1800px] mx-auto pb-8 px-0 sm:px-4 md:px-6 lg:px-8 relative z-10"}`}>
                {isFocusMode && (
                    <button onClick={() => setIsFocusMode(false)} className="fixed top-4 left-4 z-[999] flex items-center gap-1.5 px-3.5 py-2 bg-black/80 hover:bg-black border border-white/10 rounded-xl text-xs font-bold text-white transition-all shadow-xl">
                        <X className="w-3.5 h-3.5" /> Exit Focus Mode
                    </button>
                )}

                {(isTheatreMode || isFocusMode) && (
                    <div className={`w-full ${isFocusMode ? "h-[100dvh] bg-black rounded-none border-0 overflow-hidden animate-fade-in" : "mb-6"}`}>{renderPlayer()}</div>
                )}

                {!isFocusMode && (
                    <>
                    {/* Proximity attached header (Gap player/header = 12px) */}
                    <div className="relative z-10 w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 mb-[12px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white">
                        <div className="flex items-center gap-3 min-w-0">
                            <button 
                                onClick={() => router.back()} 
                                className="shrink-0 flex items-center justify-center w-10 h-10 bg-white/[0.06] hover:bg-white/[0.12] rounded-full border border-white/10 text-zinc-400 hover:text-white transition-all active:scale-95 group cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-sora tracking-tight truncate leading-tight flex items-center gap-2">
                                    {show.name}
                                </h1>
                                {/* Episode Info (Compact) */}
                                {episodes.length > 1 ? (
                                    <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                                        Episode {currentEp}{currentEpTitle ? `: ${currentEpTitle}` : ''} <span className="text-zinc-600">·</span> {mode.toUpperCase()}
                                    </p>
                                ) : (
                                    <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                        Movie <span className="text-zinc-600">·</span> {mode.toUpperCase()}
                                    </p>
                                )}
                            </div>
                        </div>
                        {show.rating && (
                            <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 font-bold text-xs sm:ml-auto">
                                <span>★</span>
                                <span>{show.rating}</span>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 w-full max-w-[1800px] mx-auto mt-0 mb-0 grid grid-cols-1 xl:grid-cols-[74%_minmax(0,26%)] gap-6 items-start">

                        {/* Player Column */}
                        <div className="w-full min-w-0 touch-pan-y bg-white/[0.02] backdrop-blur-md p-0 rounded-none sm:rounded-[22px] shadow-[0_10px_40px_rgba(0,0,0,0.45)] border-0 sm:border border-white/[0.05] overflow-hidden">
                            {!isTheatreMode && <div className="mb-0">{renderPlayer()}</div>}

                            {/* Control Bar (Prev/Next/Autoplay/AutoNext/Theatre/Focus/Reload/Dim/Fullscreen) */}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#111113]/90 border border-white/5 rounded-2xl mt-4 gap-3 flex-wrap select-none shadow-md mb-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {episodes.length > 1 ? (
                                        <>
                                            <button
                                                onClick={handlePrevEpisode}
                                                disabled={!hasPrevEpisode()}
                                                className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 border border-white/10 rounded-xl text-white transition-all duration-200 cursor-pointer"
                                                title="Previous Episode"
                                                aria-label="Previous Episode"
                                            ><ChevronLeft className="w-4 h-4" /></button>
                                            <span className="text-xs font-semibold text-zinc-400 min-w-[70px] text-center">
                                                EP {currentEp}
                                            </span>
                                            <button
                                                onClick={handleNextEpisode}
                                                disabled={!hasNextEpisode()}
                                                className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 border border-white/10 rounded-xl text-white transition-all duration-200 cursor-pointer"
                                                title="Next Episode"
                                                aria-label="Next Episode"
                                            ><ChevronRight className="w-4 h-4" /></button>
                                        </>
                                    ) : (
                                        <span className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-[11px] font-black text-accent uppercase tracking-wider">
                                            Anime Movie
                                        </span>
                                    )}

                                    <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

                                    {/* Real Autoplay Preference Toggle */}
                                    <button
                                        onClick={handleToggleAutoPlay}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                            autoPlay 
                                                ? "bg-purple-600/20 border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
                                                : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                                        }`}
                                        title={`Autoplay is ${autoPlay ? 'ON' : 'OFF'} — click to toggle`}
                                        aria-label={`Toggle Autoplay (currently ${autoPlay ? 'enabled' : 'disabled'})`}
                                        aria-pressed={autoPlay}
                                    >
                                        <Play className={`w-3.5 h-3.5 ${autoPlay ? 'fill-current text-purple-400' : 'text-zinc-500'}`} />
                                        <span>Autoplay</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                            autoPlay ? "bg-purple-500/30 text-purple-200" : "bg-white/10 text-zinc-500"
                                        }`}>
                                            {autoPlay ? "ON" : "OFF"}
                                        </span>
                                    </button>

                                    {/* Real Auto-Next Preference Toggle */}
                                    <button
                                        onClick={handleToggleAutoNext}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                            autoNext 
                                                ? "bg-purple-600/20 border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
                                                : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                                        }`}
                                        title={`Auto-Next is ${autoNext ? 'ON' : 'OFF'} — click to toggle`}
                                        aria-label={`Toggle Auto-Next (currently ${autoNext ? 'enabled' : 'disabled'})`}
                                        aria-pressed={autoNext}
                                    >
                                        <svg className={`w-3.5 h-3.5 ${autoNext ? 'text-purple-400' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="5 4 15 12 5 20 5 4" />
                                            <line x1="19" y1="5" x2="19" y2="19" />
                                        </svg>
                                        <span>Auto-Next</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                            autoNext ? "bg-purple-500/30 text-purple-200" : "bg-white/10 text-zinc-500"
                                        }`}>
                                            {autoNext ? "ON" : "OFF"}
                                        </span>
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleReloadPlayer}
                                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer"
                                        title="Reload Player"
                                        aria-label="Reload Player"
                                    ><RefreshCw className="w-4 h-4" /></button>
                                    <button
                                        onClick={() => {
                                            setIsTheatreMode(!isTheatreMode);
                                            if (isFocusMode) setIsFocusMode(false);
                                        }}
                                        className={`p-2 border rounded-xl transition-all cursor-pointer ${
                                            isTheatreMode 
                                                ? "bg-accent/20 border-accent text-accent font-bold shadow-[0_0_10px_var(--accent-glow)]" 
                                                : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                                        }`}
                                        title="Theatre Mode"
                                        aria-label="Toggle Theatre Mode"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <line x1="2" y1="16" x2="22" y2="16" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsFocusMode(!isFocusMode);
                                            if (isTheatreMode) setIsTheatreMode(false);
                                        }}
                                        className={`p-2 border rounded-xl transition-all cursor-pointer ${
                                            isFocusMode 
                                                ? "bg-accent/20 border-accent text-accent font-bold shadow-[0_0_10px_var(--accent-glow)]" 
                                                : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                                        }`}
                                        title="Cinematic Focus Mode"
                                        aria-label="Toggle Cinematic Focus Mode"
                                    ><Shield className="w-4 h-4" /></button>
                                    <button 
                                        onClick={() => setDimLights(!dimLights)}
                                        className={`p-2 border rounded-xl transition-all cursor-pointer ${
                                            dimLights 
                                                ? "bg-amber-500/20 border-amber-500 text-amber-500 font-bold" 
                                                : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                                        }`}
                                        title="Toggle Cinema Light Effect"
                                        aria-label="Toggle Cinema Lights"
                                    >
                                        <Zap className="w-4 h-4" />
                                    </button>
                                    {/* Fullscreen Button */}
                                    <button
                                        onClick={toggleFullscreen}
                                        className={`p-2 border rounded-xl transition-all cursor-pointer ${
                                            (isFullscreen || isPseudoFullscreen)
                                                ? "bg-purple-600/20 border-purple-500 text-purple-300 font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                                : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                                        }`}
                                        title={(isFullscreen || isPseudoFullscreen) ? "Exit Fullscreen (f)" : "Enter Fullscreen (f)"}
                                        aria-label={(isFullscreen || isPseudoFullscreen) ? "Exit Fullscreen" : "Enter Fullscreen"}
                                    >
                                        {(isFullscreen || isPseudoFullscreen) ? (
                                            <Minimize2 className="w-4 h-4" />
                                        ) : (
                                            <Maximize2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Safe Stream & Stats */}
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <button 
                                    onClick={() => setShowSafeGuide(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                                >
                                    <Shield className="w-3 h-3" />
                                    SafeStream Protected
                                </button>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-wider">
                                    <Zap className="w-3 h-3" />
                                    Edge Optimized
                                </div>
                            </div>

                            {/* Troubleshooting & Help */}
                            <div className="mt-4 p-4 bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-800/60 shadow-inner">
                                <div className="flex items-center gap-2 mb-3 text-amber-500/90 font-medium">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-sm">Playback Troubleshooting</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                                    <div className="space-y-2">
                                        <p className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1 flex-shrink-0" />
                                            <span>If video is not found or refused to connect, switch to alternative servers.</span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1 flex-shrink-0" />
                                            <span>Disable <b>Ad-Blockers</b> if you see a blank player or "Connection Refused".</span>
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1 flex-shrink-0" />
                                            <span>Try switching from <b>SUB to DUB</b> (or vice versa) if one source fails.</span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1 flex-shrink-0" />
                                            <span>If links return 404, try dynamic fallback movie servers.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Server & Meta Controls - JustAnime Style */}
                            <div className="mt-4 bg-bg-card p-4 rounded-lg border border-border-color flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                                    {/* Type Selection (SUB/DUB) with Capability Detection */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Source:</span>
                                        {(() => {
                                            const subEps = (show?.availableEpisodesDetail?.sub || []).map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e));
                                            const dubEps = (show?.availableEpisodesDetail?.dub || []).map((e: any) => typeof e === 'object' ? String(e.number||e.id) : String(e));
                                            
                                            const isSubAvailable = subEps.length > 0 && (subEps.includes(String(currentEp)) || subEps.includes("1"));
                                            const isDubAvailable = dubEps.length > 0 && (dubEps.includes(String(currentEp)) || dubEps.includes("1"));

                                            const handleSubClick = () => {
                                                if (mode === "sub") return;
                                                if (!isSubAvailable) {
                                                    toast.error(`SUB audio is unavailable for Episode ${currentEp}.`, { icon: "⚠️" });
                                                    return;
                                                }
                                                setMode("sub");
                                            };

                                            const handleDubClick = () => {
                                                if (mode === "dub") return;
                                                if (!isDubAvailable) {
                                                    toast.error(`DUB audio is unavailable for Episode ${currentEp}. Remaining on SUB.`, { icon: "⚠️" });
                                                    return;
                                                }
                                                setMode("dub");
                                            };

                                            return (
                                                <div className="flex bg-bg-main p-1 rounded-md border border-border-color">
                                                    <button
                                                        onClick={handleSubClick}
                                                        disabled={!isSubAvailable}
                                                        title={isSubAvailable ? "Switch to SUB" : "SUB unavailable for this episode"}
                                                        className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all ${
                                                            mode === 'sub' 
                                                                ? 'bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-sm' 
                                                                : isSubAvailable
                                                                    ? 'text-[var(--text-muted)] hover:text-white cursor-pointer'
                                                                    : 'text-white/20 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        SUB
                                                    </button>
                                                    <button
                                                        onClick={handleDubClick}
                                                        disabled={!isDubAvailable}
                                                        title={isDubAvailable ? "Switch to DUB" : "DUB unavailable for this episode"}
                                                        className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all ${
                                                            mode === 'dub' 
                                                                ? 'bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-sm' 
                                                                : isDubAvailable
                                                                    ? 'text-[var(--text-muted)] hover:text-white cursor-pointer'
                                                                    : 'text-white/20 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        DUB {!isDubAvailable && "(N/A)"}
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Multi-Audio Quick Select with Capability Detection */}
                                    {(() => {
                                        const peachifyAvailable = servers.some(s => s.serverId === "peachify");
                                        return (
                                            <button
                                                disabled={!peachifyAvailable}
                                                onClick={() => {
                                                    const peachify = servers.find(s => s.serverId === "peachify");
                                                    if (peachify) {
                                                        manualServerRef.current = "peachify";
                                                        setSelectedServer("peachify");
                                                        toast.success("Switched to Multi-Audio Server", { icon: "🎧" });
                                                    } else {
                                                        toast.error("Multi-Audio server not available for this title");
                                                    }
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                                    selectedServer === "peachify" 
                                                    ? "bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_var(--accent-glow)]" 
                                                    : peachifyAvailable
                                                        ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                                                        : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                                                }`}
                                            >
                                                <Sparkles className={`w-4 h-4 ${selectedServer === "peachify" ? "animate-pulse" : ""}`} />
                                                <span className="text-xs font-black uppercase tracking-wider">Multi-Audio {!peachifyAvailable && "(N/A)"}</span>
                                            </button>
                                        );
                                    })()}

                                    {/* Server Selection Dropdown */}
                                    <div className="flex items-center gap-3 relative" ref={serverRef}>
                                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Server:</span>
                                        <button
                                            onClick={() => setShowServerDropdown(!showServerDropdown)}
                                            className="flex items-center gap-2 px-4 py-2 bg-bg-main hover:bg-white/5 border border-border-color rounded-lg text-sm font-bold text-white transition-all min-w-[180px] justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Server className="w-4 h-4 text-accent" />
                                                <span>{servers.find(s => s.serverId === selectedServer)?.serverName || "Select Server"}</span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-white transition-transform ${showServerDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {showServerDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute bottom-full left-0 mb-2 w-64 bg-bg-card border border-border-color rounded-xl shadow-2xl z-[60] overflow-hidden backdrop-blur-md"
                                                >
                                                    <div className="p-3 border-b border-border-color bg-white/5 flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black uppercase text-white tracking-widest">Select Source</span>
                                                        </div>
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                                                        {servers.map((server, index) => (
                                                            <button
                                                                key={`${server.serverId}-${server.type}-${index}`}
                                                                onClick={() => {
                                                                    manualServerRef.current = server.serverId;
                                                                    setSelectedServer(server.serverId);
                                                                    setShowServerDropdown(false);
                                                                }}
                                                                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all ${
                                                                    selectedServer === server.serverId
                                                                        ? "bg-accent/20 text-white border border-accent/30 shadow-lg"
                                                                        : "hover:bg-white/5 text-[var(--text-muted)] hover:text-white border border-transparent"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/10 text-accent">
                                                                        <Play className={`w-3.5 h-3.5 ${selectedServer === server.serverId ? 'fill-current' : ''}`} />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <p className="text-xs font-bold leading-none mb-1">{server.serverName}</p>
                                                                        <p className="text-[9px] uppercase tracking-tighter opacity-60">
                                                                            {server.badge || (server.isMovieServer ? "Movie Server" : "Native HLS")}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {selectedServer === server.serverId && (
                                                                    <Check className="w-4 h-4 text-accent" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[var(--text-muted)]">
                                    <div className="flex items-center gap-2 text-accent">
                                        <Sparkles className="w-4 h-4" />
                                        Premium Auto-Features Active
                                    </div>
                                    <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-white border border-white/5 disabled:opacity-50">
                                       <Share2 className="w-4 h-4" /> Share
                                    </button>
                                </div>
                            </div>

                            {/* Metadata (Providers -> Metadata = 20px) */}
                            <div className="mt-[20px] flex flex-col gap-2 relative">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-[var(--text-muted)] font-semibold">
                                            {episodes.length > 1 ? `Watching Episode ${currentEp} in ${mode.toUpperCase()}` : `Watching Movie in ${mode.toUpperCase()}`}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setShowDownloadModal(true)}
                                            className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 justify-center cursor-pointer"
                                        >
                                            <Download className="w-4 h-4" /> Download
                                        </button>
                                        
                                        <button
                                            onClick={toggleBookmark}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                                                isBookmarked 
                                                    ? "bg-accent/10 text-accent border-accent/40 hover:bg-accent/20" 
                                                    : "bg-white/5 text-[var(--text-muted)] border-border-color hover:text-white hover:bg-white/10"
                                            } cursor-pointer`}
                                        >
                                            {isBookmarked ? (
                                                <>
                                                    <BookmarkCheck className="w-5 h-5 fill-current" />
                                                    <span className="hidden sm:inline font-bold text-sm">In Watchlist</span>
                                                </>
                                            ) : (
                                                <>
                                                    <BookmarkPlus className="w-5 h-5" />
                                                    <span className="hidden sm:inline font-bold text-sm">Add to Watchlist</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Description (Metadata -> Description = 24px, Description -> Recommendations = 40px) */}
                            <div className="mt-[24px] mb-[40px] w-full">
                                <p className="text-zinc-400 text-xs sm:text-sm md:text-base leading-relaxed max-w-3xl">
                                    {show.description || show.synopsis || "No description available."}
                                </p>
                            </div>

                            {/* Mobile/Tablet Episodes */}
                            {episodes.length > 1 && (
                                <>
                                    {/* Mobile View: Carousel (under max-md) */}
                                    <div className="w-full md:hidden mb-6 block mt-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-white text-base">Episodes</h3>
                                        </div>
                                        {renderAnimeCarousel()}
                                    </div>

                                    {/* Tablet View: Bottom Sheet Trigger Card (md to xl) */}
                                    <div className="w-full hidden md:max-xl:block mb-6 mt-4">
                                        <button 
                                            onClick={() => setShowEpisodesDrawer(true)} 
                                            className="w-full py-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-white font-bold transition-all active:scale-95 cursor-pointer shadow-lg"
                                        >
                                            <List className="w-5 h-5 text-accent" />
                                            <span>Show Episodes List ({episodes.length} Episodes)</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sidebar - Sticky Desktop (Visible on xl and above) */}
                        {episodes.length > 1 && (
                            <div className="hidden xl:flex flex-col w-full h-[calc(100dvh-120px)] sticky top-[90px] rounded-[22px] overflow-hidden bg-white/[0.02] backdrop-blur-md border border-white/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
                                    {/* Sticky Header with Search */}
                                    <div className="p-4 border-b border-white/5 relative bg-transparent z-10 rounded-t-lg">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-white text-lg font-sora">Episodes</h3>
                                            <div className="flex items-center gap-2">
                                                <div className="flex bg-bg-main p-0.5 rounded-lg border border-border-color">
                                                    <button onClick={() => setEpisodeLayoutMode("list")} className={`p-1 rounded-md transition-all ${episodeLayoutMode === "list" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`} title="List View"><List className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setEpisodeLayoutMode("grid")} className={`p-1 rounded-md transition-all ${episodeLayoutMode === "grid" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`} title="Grid View"><LayoutGrid className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input 
                                                type="number"
                                                placeholder="Search episode..."
                                                value={epFilter}
                                                className="w-full bg-bg-main pl-9 pr-3 py-2 rounded-md border border-border-color outline-none focus:border-accent/40 transition-colors text-sm text-white placeholder-[var(--text-muted)] font-inter"
                                                onChange={(e) => setEpFilter(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col gap-1.5">
                                        {episodes.length === 0 ? (
                                            <EpisodeListSkeleton mode={episodeLayoutMode} count={episodeLayoutMode === 'grid' ? 24 : 6} />
                                        ) : (() => {
                                            const filteredEpisodes = epFilter
                                                ? episodes.filter(ep => String(typeof ep === 'object' ? (ep.number||ep.id) : ep).includes(epFilter))
                                                : episodes;
                                            
                                            if (filteredEpisodes.length === 0) {
                                                return (
                                                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                                                        <List className="w-8 h-8 text-zinc-600 mb-2" />
                                                        <p className="text-xs font-bold text-zinc-300">No episodes match &ldquo;{epFilter}&rdquo;</p>
                                                    </div>
                                                );
                                            }

                                            if (episodeLayoutMode === "grid") {
                                                return (
                                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-4 gap-2 p-1">
                                                        {filteredEpisodes.map((ep, idx) => {
                                                            const epVal = String(typeof ep === 'object' ? (ep.number || ep.id) : ep);
                                                            const isCur = String(currentEp) === epVal;
                                                            return (
                                                                <button 
                                                                    key={`${epVal}-${idx}`} 
                                                                    onClick={() => handleSelectEpisode(epVal)} 
                                                                    className={`group relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                                                                        isCur 
                                                                            ? 'border-accent bg-gradient-to-b from-accent/25 to-accent-warm/15 text-white shadow-[0_0_16px_var(--accent-glow)] ring-1 ring-accent scale-[1.02]' 
                                                                            : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-1">
                                                                        {isCur && <Play className="w-2.5 h-2.5 fill-current text-accent animate-pulse" />}
                                                                        <span className="tracking-tight">{epVal}</span>
                                                                    </div>
                                                                    <span className={`text-[8px] font-black uppercase mt-0.5 tracking-wider ${isCur ? 'text-accent' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                                                        SUB
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }

                                            return filteredEpisodes.map((ep, idx) => (
                                                <EpisodeButton
                                                    key={`${typeof ep === 'object' ? (ep.number || ep.id) : ep}-${idx}`}
                                                    ep={ep}
                                                    currentEp={currentEp}
                                                    onClick={() => handleSelectEpisode(String(typeof ep === 'object' ? (ep.number||ep.id) : ep))}
                                                />
                                            ));
                                        })()
                                        }
                                    </div>
                            </div>
                        )}

                    </div>
                    </>
                )}

                {/* Smart Recommendations - Full Width Below Player+Sidebar */}
                {!isFocusMode && (
                    <div className="mt-0 mb-[64px] w-full space-y-[48px]">
                        <SimilarAnime currentShowId={show._id} showName={show.name || 'this'} />
                        <CommentsSection 
                            contentId={id} 
                            category="anime" 
                            episodeId={currentEp}
                            slug={show?.name ? show.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined}
                        />
                    </div>
                )}

            </div>
        </div>
        <AnimatePresence>
            {showDownloadModal && (
                <DownloadModal
                    type="anime"
                    id={fullId}
                    selectedSeason={1}
                    selectedEpisode={parseInt(currentEp) || 1}
                    title={show?.name || "Anime"}
                    onClose={() => setShowDownloadModal(false)}
                    rawVideoSource={rawVideoSource}
                />
            )}
        </AnimatePresence>
        <AnimatePresence>
            {showEpisodesDrawer && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowEpisodesDrawer(false)}
                        className="fixed inset-0 bg-black z-[100] md:max-xl:block hidden"
                    />
                    {/* Drawer Container */}
                    <motion.div 
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 h-[60dvh] bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-white/10 rounded-t-[24px] z-[101] md:max-xl:flex flex-col hidden p-6"
                    >
                        {/* Handle bar */}
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowEpisodesDrawer(false)} />
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-lg">Episodes</h3>
                            <button onClick={() => setShowEpisodesDrawer(false)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        {/* Search in Drawer */}
                        <div className="relative mb-4">
                            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="number"
                                placeholder="Search episode..."
                                value={epFilter}
                                className="w-full bg-bg-main pl-9 pr-3 py-2 rounded-md border border-border-color outline-none focus:border-accent/40 transition-colors text-sm text-white placeholder-[var(--text-muted)] font-inter"
                                onChange={(e) => setEpFilter(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                            {(() => {
                                const filteredEpisodes = epFilter
                                    ? episodes.filter(ep => String(typeof ep === 'object' ? (ep.number||ep.id) : ep).includes(epFilter))
                                    : episodes;
                                
                                if (episodeLayoutMode === "grid") {
                                    return (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-4 gap-1.5 p-1">
                                            {filteredEpisodes.map((ep, idx) => {
                                                const epNumStr = String(typeof ep === 'object' ? (ep.number||ep.id) : ep);
                                                return (
                                                    <button 
                                                        key={`${epNumStr}-${idx}`} 
                                                        onClick={() => {
                                                            handleSelectEpisode(epNumStr);
                                                            setShowEpisodesDrawer(false);
                                                        }} 
                                                        className={`py-2 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${String(currentEp) === epNumStr ? 'border-accent bg-accent/15 text-accent shadow-[0_0_8px_var(--accent-glow)] font-black' : 'border-border-color bg-[#08080B] text-zinc-400 hover:text-white'}`}
                                                    >
                                                        {typeof ep === 'object' ? (ep.number||ep.id) : ep}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                }

                                return filteredEpisodes.map((ep, idx) => (
                                    <EpisodeButton
                                        key={`${typeof ep === 'object' ? String(ep.id || ep.number) : String(ep)}-${idx}`}
                                        ep={ep}
                                        currentEp={currentEp}
                                        onClick={() => {
                                            handleSelectEpisode(String(typeof ep === 'object' ? (ep.number||ep.id) : ep));
                                            setShowEpisodesDrawer(false);
                                        }}
                                    />
                                ));
                            })()}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        {/* Floating Button for Tablet Episodes Drawer */}
        {episodes.length > 1 && (
            <button 
                onClick={() => setShowEpisodesDrawer(true)}
                className="fixed bottom-20 right-6 z-[99] md:max-xl:flex hidden items-center gap-2 px-5 py-3 bg-gradient-to-r from-accent to-accent-warm text-white rounded-full font-bold shadow-2xl active:scale-95 transition-all hover:scale-105 cursor-pointer"
            >
                <List className="w-4 h-4" /> View Episodes
            </button>
        )}
        <Script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" strategy="afterInteractive" />
        </>
    );
}
