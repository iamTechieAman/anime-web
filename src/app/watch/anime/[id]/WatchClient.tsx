"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import React from "react";
import Script from "next/script";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle, RefreshCw, AlertTriangle, Search, Play, Share2, Server, ChevronDown, Check, Shield, Zap, Sparkles, BookmarkPlus, BookmarkCheck, ChevronRight, X, List, LayoutGrid, Download, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAdBlock } from "@/context/AdBlockContext";
import SimilarAnime from "@/components/SimilarAnime";
import CommentsSection from "@/components/CommentsSection";

import { useRouter, useSearchParams } from "next/navigation";
import { useWatch } from "@/context/WatchContext";
import { useUserStore } from "@/store/userStore";
import { ServerHealthManager } from "@/utils/ServerHealthManager";
import { isMovieContent } from "@/utils/mediaType";

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



function cleanString(str: any): string | null {
    if (!str) return null;
    const s = String(str).trim();
    if (/^(unknown|undefined|null|no image|no img|no_image|no_img|placeholder|none)$/i.test(s)) return null;
    return s;
}

/** Memoized episode button to prevent full list re-render on every currentEp change */
const EpisodeButton = React.memo(function EpisodeButton({
    ep, currentEp, onClick
}: { ep: any; currentEp: string; onClick: () => void }) {
    const epNum = typeof ep === 'object' ? String(ep.number || ep.id) : String(ep);
    const title = typeof ep === 'object' ? ep.title : null;
    const isFiller = typeof ep === 'object' ? ep.isFiller : false;
    const thumbnail = typeof ep === 'object' ? cleanString(ep.image) : null;
    const isActive = String(currentEp) === epNum;
    
    const ref = React.useRef<HTMLButtonElement>(null);

    // Auto-scroll disabled to prevent page jumping

    return (
        <button
            ref={ref}
            onClick={onClick}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-md text-left transition-all duration-[250ms] ease-out hover:-translate-y-[2px] hover:shadow-lg group ${
                isActive ? "bg-accent/15 border border-accent/30" : "hover:bg-white/5 border border-transparent"
            }`}
        >
            <div className="flex gap-3 w-full items-center">
                {thumbnail && (
                    <div className="w-20 h-12 flex-shrink-0 rounded bg-zinc-800 overflow-hidden relative border border-white/5">
                        <img src={thumbnail} alt="thumbnail" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        <div className="absolute inset-0 bg-black/20" />
                    </div>
                )}
                <div className="flex flex-col items-start min-w-0">
                    <span className={`text-sm font-bold truncate transition-colors ${isActive ? 'text-accent' : 'text-zinc-300 group-hover:text-white'}`}>
                        {title && title.toLowerCase() !== `episode ${epNum}` ? title : `Episode ${epNum}`}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500 font-semibold tracking-wider">EP {epNum}</span>
                        {isFiller && <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-[1px] rounded uppercase font-black border border-amber-500/20">Filler</span>}
                    </div>
                </div>
            </div>
            {isActive && (
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-[0_0_10px_var(--accent-glow)]">
                    <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                </div>
            )}
        </button>
    );
});

const MOVIE_SERVERS = [
    {
        id: 'peachify',
        name: 'Toon Player VIP',
        badge: 'Multi-Audio',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://peachify.top/?type=tv&id=${id}&s=${s || 1}&e=${e || 1}&autoplay=1` : `https://peachify.top/?type=movie&id=${id}&autoplay=1`,
    },
    {
        id: 'vidlink',
        name: 'VidLink',
        badge: 'Auto-Next',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidlink.pro/tv/${id}/${s || 1}/${e || 1}?primaryColor=7C3AED&title=false` : `https://vidlink.pro/movie/${id}?primaryColor=7C3AED&title=false`,
    },
    {
        id: 'toon4k',
        name: 'Toon4K',
        badge: 'Premium 4K',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidsrc.pro/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=1` : `https://vidsrc.pro/embed/movie/${id}?autoplay=1`,
    },
    {
        id: 'toon_ultimate',
        name: 'Toon Player Ultimate',
        badge: 'Best',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${s || 1}/${e || 1}` : `https://vidsrc.to/embed/movie/${id}`,
    },
    {
        id: 'autoembed',
        name: 'Toon Player Auto',
        badge: 'Fast',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://autoembed.co/tv/tmdb/${id}-${s || 1}-${e || 1}` : `https://autoembed.co/movie/tmdb/${id}`,
    },
    {
        id: 'nontongo',
        name: 'ToonNortan',
        badge: 'Classic',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://www.nontongo.win/embed/tv/${id}/${s || 1}/${e || 1}` : `https://www.nontongo.win/embed/movie/${id}`,
    },
    {
        id: 'vidsrcto',
        name: 'Toon Player Pro',
        badge: 'CinEvo',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${s || 1}/${e || 1}` : `https://vidsrc.to/embed/movie/${id}`,
    },
    {
        id: 'toon_titan',
        name: 'Toon Player Titan',
        badge: '4K/HD',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://embed.su/embed/tv/${id}/${s || 1}/${e || 1}` : `https://embed.su/embed/movie/${id}`,
    },
    {
        id: 'multiembed',
        name: 'Toon Player Multi',
        badge: 'Multi-Q',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s || 1}&e=${e || 1}` : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    },
    {
        id: 'vidfast',
        name: 'Toon Player Xtreme',
        badge: 'Reliable',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidfast.pro/tv/${id}/${s || 1}/${e || 1}?autoPlay=true&theme=3b82f6` : `https://vidfast.pro/movie/${id}?autoPlay=true&theme=3b82f6`,
    },
    {
        id: 'smashystream',
        name: 'SmashyStream',
        badge: 'CinEvo',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://embed.smashystream.com/playere.php?tmdb=${id}&s=${s || 1}&e=${e || 1}` : `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    },
    {
        id: 'toon_abyss',
        name: 'ToonAbyss',
        badge: 'AnimeSalt',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidsrc.cc/v2/embed/tv/${id}/${s || 1}/${e || 1}` : `https://vidsrc.cc/v2/embed/movie/${id}`,
    },
    {
        id: 'cineby',
        name: 'CineBy',
        badge: 'Fast',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://cineby.pro/tv/${id}/${s || 1}/${e || 1}?autoplay=true` : `https://cineby.pro/movie/${id}?autoplay=true`,
    },
    {
        id: 'rivestream',
        name: 'RiveStream',
        badge: 'HD',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://api.rivestream.xyz/embed/tv/?tmdb=${id}&season=${s || 1}&episode=${e || 1}` : `https://api.rivestream.xyz/embed/movie/?tmdb=${id}`,
    },
    {
        id: 'cinemaos',
        name: 'CinemaOS',
        badge: 'HD',
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://cinemaos.to/embed/tv/${id}/${s || 1}/${e || 1}` : `https://cinemaos.to/embed/movie/${id}`,
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

    const [show, setShow] = useState<ShowData | null>(null);

    const initialEp = searchParams?.get('ep') || "1";
    const initialModeParam = searchParams?.get('mode') as "sub" | "dub" | null;
    const initialMode: "sub" | "dub" = (initialModeParam && ["sub", "dub"].includes(initialModeParam)) ? initialModeParam : "sub";

    const [currentEp, setCurrentEp] = useState<string>(initialEp);
    const [mode, setMode] = useState<"sub" | "dub">(initialMode);
    const [epFilter, setEpFilter] = useState("");

    const availableEps = show?.availableEpisodesDetail?.[mode] || [];

    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [videoType, setVideoType] = useState<string>("auto");
    const [loadingSource, setLoadingSource] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-play and Auto-next always enabled
    const [autoPlay, setAutoPlay] = useState(true);
    const [autoNext, setAutoNext] = useState(true);
    const [showNextOverlay, setShowNextOverlay] = useState(false);
    const [nextCountdown, setNextCountdown] = useState(5);
    const nextIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const manualServerRef = useRef<string | null>(null);
    const sourceSeqRef = useRef<number>(0);

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

    // Handle Browser Back / Forward buttons (popstate)
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
    const [failedServers, setFailedServers] = useState<Set<string>>(new Set());
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loadingServers, setLoadingServers] = useState(false);

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

    const hasNextEpisode = () => {
        const currentIdx = availableEps.map(e => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        return currentIdx !== -1 && currentIdx + 1 < availableEps.length;
    };

    const hasPrevEpisode = () => {
        const currentIdx = availableEps.map(e => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        return currentIdx > 0;
    };

    const handleNextEpisode = () => {
        const currentIdx = availableEps.map(e => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        if (currentIdx !== -1 && currentIdx + 1 < availableEps.length) {
            const nextItem = availableEps[currentIdx + 1];
            const nextEp = typeof nextItem === 'object' ? String(nextItem.number || nextItem.id) : String(nextItem);
            setCurrentEp(nextEp);
            toast.success(`Now playing Episode ${nextEp}`, { icon: '▶️' });
        }
    };

    const handlePrevEpisode = () => {
        const currentIdx = availableEps.map(e => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        if (currentIdx > 0) {
            const prevItem = availableEps[currentIdx - 1];
            const prevEp = typeof prevItem === 'object' ? String(prevItem.number || prevItem.id) : String(prevItem);
            setCurrentEp(prevEp);
            toast.success(`Now playing Episode ${prevEp}`, { icon: '▶️' });
        }
    };

    const { history, addToHistory, getHistoryItem, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isGuestProfile = activeProfile?.type === 'guest';
    
    // Automatic Provider Fallback Engine (Intelligent Rotation & Health Recovery)
    const handleAutoFallback = useCallback(() => {
        if (!selectedServer || servers.length === 0) return;

        console.warn(`[ToonPlayer Fallback] Server ${selectedServer} timed out or failed. Initiating rotation...`);

        setFailedServers(prev => {
            const next = new Set(prev);
            next.add(selectedServer);
            ServerHealthManager.blacklistServer(selectedServer);

            // Find next server in the list that hasn't failed yet
            const nextServer = servers.find(s => !next.has(s.serverId) && s.serverId !== selectedServer);

            if (nextServer) {
                setLoadingStatus(`Switching to backup server: ${nextServer.serverName}...`);
                toast.error(`Server failed. Auto-switching to ${nextServer.serverName}...`, {
                    icon: "🔄",
                    style: {
                        background: "rgba(20, 20, 20, 0.95)",
                        border: "1px solid rgba(124, 58, 237, 0.3)",
                        fontSize: "12px",
                        fontWeight: "bold"
                    }
                });
                setTimeout(() => setSelectedServer(nextServer.serverId), 50);
            } else {
                setError("All streaming servers failed for this episode. Please try another episode or mirror.");
            }
            return next;
        });
    }, [selectedServer, servers]);

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
                let fetchedServers = [];
                try {
                    const res = await axios.get('/api/servers?type=movie');
                    if (res.data && res.data.servers && res.data.servers.length > 0) {
                        fetchedServers = res.data.servers.map((srv: any) => ({
                            id: srv.serverId,
                            name: srv.name,
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
                        }));
                    }
                } catch (err) {
                    console.error('Failed to fetch dynamic fallback servers in anime, using hardcoded', err);
                }

                if (fetchedServers.length > 0) {
                    let baseServers = [...fetchedServers];
                    MOVIE_SERVERS.forEach((hc: any) => {
                        const exists = fetchedServers.some((fs: any) => 
                            fs.id === hc.id || 
                            fs.id.startsWith(hc.id) ||
                            fs.name.toLowerCase().includes(hc.name.toLowerCase()) ||
                            hc.name.toLowerCase().includes(fs.name.toLowerCase())
                        );
                        if (!exists) {
                            baseServers.push(hc);
                        }
                    });
                    setDynamicMovieServers(baseServers);
                } else {
                    setDynamicMovieServers([...MOVIE_SERVERS]);
                }
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

        const handleMessage = (e: MessageEvent) => {
            const isEndEvent = e.data && (
                e.data.type === "videoEnd" || 
                e.data.event === "ended" || 
                e.data === "video_ended" ||
                e.data.type === "player_ended"
            );

            // Use ref to avoid stale closure
            if (isEndEvent && handleVideoEndedRef.current) {
                (handleVideoEndedRef.current as Function)();
            }
        };

        // Click outside to close dropdown
        const handleClickOutside = (e: MouseEvent) => {
            if (serverRef.current && !serverRef.current.contains(e.target as Node)) {
                setShowServerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener("message", handleMessage);
        
        return () => {
            window.removeEventListener("profileUpdated", loadSettings);
            window.removeEventListener("scroll", toggleVisibility);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener("message", handleMessage);
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

    // Scroll to top exactly once when title (id), episode, or provider changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [id, currentEp, selectedServer]);

    // Reset player state and captured stream links when rotating sources
    useEffect(() => {
        setRawVideoSource(null);
        setIframeKey(prev => prev + 1);
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

    // Listen for events from proxy iframe
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'VIDEO_ENDED') {
                if (handleVideoEndedRef.current) handleVideoEndedRef.current();
            } else if (e.data?.type === 'VIDEO_SOURCE_FOUND' && e.data.source) {
                setRawVideoSource(e.data.source);
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
            setShowError(null);
            
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
                
                // Strict ID Validation
                const fetchedShowId = String(fetchedShow.id || fetchedShow.showId || fetchedShow._id || '');
                if (fetchedShowId && fetchedShowId !== String(id) && !provider) {
                    console.error('[WatchClient] ID Mismatch Detected!', { requested: id, received: fetchedShowId });
                    throw new Error("CONTENT_MISMATCH");
                }
                
                console.log(`[GlobalClickDebugger] 🌐 API FETCHED ID (Anime): ${fetchedShow.id || fetchedShow.showId || fetchedShow._id}`);
                
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

                // Parallelly fetch TMDB ID if name is available
                if (fetchedShow.name) {
                    let sanitizedName = fetchedShow.name.split('\n')[0].trim().substring(0, 50).replace(/[^a-zA-Z0-9 ':!,-]/g, '').trim();
                    axios.get(`/api/prime/search?q=${encodeURIComponent(sanitizedName)}`, { signal: controller.signal })
                        .then(tmdbRes => {
                            if (controller.signal.aborted) return;
                            const results = tmdbRes.data.results;
                            setTmdbId(results && results.length > 0 ? results[0].id.toString() : "0");
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
    }, [id, provider]);

    // Fetch Servers when Episode/Mode Changes
    useEffect(() => {
        if (!show) return;

        const controller = new AbortController();
        
        // ALWAYS include movie servers — they are the guaranteed fallback
        const movieServersList = dynamicMovieServers.map((ms: any) => ({
            serverId: ms.id,
            serverName: ms.name,
            type: mode,
            badge: ms.badge,
            isMovieServer: true,
            getUrl: ms.getUrl
        }));

        // Emergency ID-based embeds — only if we have numeric IDs to avoid wrong content
        const numericAnilistId = (show?.anilistId && /^\d+$/.test(String(show.anilistId))) ? String(show.anilistId) : null;
        const numericMalId = (show?.malId && /^\d+$/.test(String(show.malId))) ? String(show.malId) : null;
        const numericTmdbId = (show?.tmdbId && /^\d+$/.test(String(show.tmdbId))) ? String(show.tmdbId) : tmdbId;

        const emergencyEmbeds: any[] = [];
        
        if (numericAnilistId) {
            emergencyEmbeds.push({
                serverId: "emergency_vidsrc",
                serverName: "VidSrc Anime",
                type: mode,
                badge: "Anime",
                isMovieServer: true,
                isEmergency: true,
                getUrl: () => `https://vidsrc.to/embed/anime/${numericAnilistId}/${currentEp}`
            });
            emergencyEmbeds.push({
                serverId: "emergency_vidsrc_me",
                serverName: "VidSrc Me",
                type: mode,
                badge: "Backup",
                isMovieServer: true,
                isEmergency: true,
                getUrl: () => `https://vidsrc.me/embed/anime?anilist=${numericAnilistId}&episode=${currentEp}`
            });
        }

        if (numericMalId) {
            emergencyEmbeds.push({
                serverId: "emergency_mal",
                serverName: "MAL Stream",
                type: mode,
                badge: "MAL",
                isMovieServer: true,
                isEmergency: true,
                getUrl: () => `https://vidsrc.me/embed/anime?mal=${numericMalId}&episode=${currentEp}`
            });
        }

        const fetchServers = async () => {
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
                
                // ALWAYS include movie servers — they are the guaranteed fallback
                const allServersRaw = [...nativeServers, ...movieServersList, ...emergencyEmbeds];
                const allServers = ServerHealthManager.filterAndSortServers(allServersRaw, 'serverId');
                setServers(allServers);

                // Pick first available server immediately
                if (allServers.length > 0) {
                    const currentExists = allServers.find((s: any) => s.serverId === selectedServer);
                    if (!currentExists && manualServerRef.current !== selectedServer) {
                        const newServer = nativeServers[0]?.serverId || allServers[0].serverId;
                        console.log(`[GlobalClickDebugger] 🎬 PLAYER INITIALIZED ID (Anime): ${id} on Server: ${newServer}`);
                        setSelectedServer(newServer);
                    }
                } else {
                    setSelectedServer(null);
                }
            } catch (err: any) {
                if (axios.isCancel(err)) return;
                console.error("Failed to fetch anime servers, using all fallbacks", err);
                const fallbackList = [...movieServersList, ...emergencyEmbeds];
                setServers(fallbackList);
                if (fallbackList.length > 0 && !selectedServer) {
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
        if (!show || !selectedServer || servers.length === 0) return;

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
                    setSourceUrl(serverWithUrl.getUrl());
                } else {
                    if (!tmdbId || tmdbId === "0") {
                        if (currentSeq !== sourceSeqRef.current) return;
                        setError("TMDB Metadata missing for this title. Try a native server.");
                        processingRef.current = null;
                        return;
                    }
                    const isMovie = show.type?.toLowerCase() === 'movie' || show.totalEpisodes === 1 || isMovieContent(show);
                    const iframeUrl = isMovie 
                        ? serverWithUrl.getUrl("movie", tmdbId)
                        : serverWithUrl.getUrl("tv", tmdbId, 1, parseInt(String(currentEp) || "1"));
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
                if (!availableEps.map(e => typeof e === 'object' ? String(e.number||e.id) : String(e)).includes(currentEp)) {
                    if (currentSeq !== sourceSeqRef.current) return;
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
                if (res.data?.animeId && res.data.animeId !== id) {
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
                    const rawUrl = selected.url || selected.link;
                    if (!rawUrl || typeof rawUrl !== 'string') {
                        throw new Error('Invalid source URL received');
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
                        let referer = "";
                        try { referer = new URL(absoluteUrl).origin; } catch(_) {}
                        const proxiedUrl = `/api/proxy/embed?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`;
                        console.log(`[GlobalClickDebugger] 📡 STREAM URL GENERATED FOR ID (Anime IFrame): ${id} -> ${proxiedUrl}`);
                        if (currentSeq !== sourceSeqRef.current) return;
                        setSourceUrl(proxiedUrl);
                        setVideoType("iframe");
                    }
                } else {
                    // No links found — auto-switch to next server
                    console.warn('[WatchPage] No links from native server. Rotating...');
                    if (currentSeq !== sourceSeqRef.current) return;
                    handleAutoFallback();
                }
            } catch (err: any) {
                if (axios.isCancel(err) || controller.signal.aborted) return;
                if (currentSeq !== sourceSeqRef.current) return;
                console.error('[WatchPage] Native server failed:', err.message);
                handleAutoFallback();
            } finally {
                if (currentSeq === sourceSeqRef.current) {
                    setLoadingSource(false);
                    processingRef.current = null;
                }
            }
        };

        fetchSource();
        return () => controller.abort();
    }, [id, currentEp, mode, show, selectedServer, provider, servers, tmdbId]);

    const handleVideoEnded = () => {
        if (!autoNext) return;
        
        const availableEps = show?.availableEpisodesDetail?.[mode] || [];
        const currentIndex = availableEps.map(e => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
        
        if (currentIndex !== -1 && currentIndex + 1 < availableEps.length) {
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
                        
                        const nextEp = (typeof availableEps[currentIndex + 1] === 'object' ? String(availableEps[currentIndex + 1].number||availableEps[currentIndex + 1].id) : String(availableEps[currentIndex + 1]));
                        setCurrentEp(String(nextEp));
                        toast.success(`Now playing Episode ${nextEp}`, { icon: '▶️' });
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            toast("You have reached the latest available episode.", { icon: "✅" });
        }
    };


    if (loadingShow) {
        return (
            <div className="min-h-dvh bg-bg-main flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-accent" />
                <p className="text-[var(--text-muted)] animate-pulse tracking-widest uppercase font-semibold">Initializing Experience</p>
            </div>
        );
    }

    if (showError) {
        // Instead of dead-end error, show a fallback embed player
        const animeTitle = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const fallbackEmbedUrl = `https://vidsrc.me/embed/anime?anilist=${id}&episode=1`;
        const fallbackEmbedUrl2 = `https://vidsrc.to/embed/anime/${id}/1`;
        
        return (
            <main className="bg-bg-main text-[var(--text-main)]">
                {/* Navbar */}
                <nav className={`fixed top-0 left-0 right-0 z-50 h-14 md:h-16 bg-black/50 backdrop-blur-md border-b border-white/5 flex items-center px-4 md:px-6 gap-3 pt-[env(safe-area-inset-top)] transition-transform ${isHeaderScrolled ? '-translate-y-full' : 'translate-y-0'}`}>
                    <Link href="/" scroll={false} className="shrink-0 flex items-center justify-center w-10 h-10 bg-white/[0.05] hover:bg-white/10 rounded-full border border-white/10 text-zinc-400 hover:text-white transition-all group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform will-change-transform"  />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-black text-sm md:text-base lg:text-lg leading-tight text-white truncate tracking-tight">
                            {animeTitle}
                        </h2>
                        <p className="text-[10px] md:text-xs text-zinc-500 font-medium tracking-widest uppercase">Anime · Episode {currentEp}</p>
                    </div>
                </nav>

                <div className="pt-14 md:pt-16 px-0 sm:px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto w-full">
                    {/* Fallback Player */}
                    <div className="w-full aspect-video bg-black md:rounded-lg overflow-hidden border border-border-color relative shadow-2xl">
                        <iframe
                            src={getProxiedEmbedUrl(fallbackEmbedUrl)}
                            className="absolute inset-0 w-full h-full border-0 rounded-none md:rounded-lg"
                            allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                            referrerPolicy="origin"
                            onLoad={(e: any) => {
                                try {
                                    const iframe = e.target as HTMLIFrameElement;
                                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                    if (doc) {
                                        const text = doc.body?.innerText || '';
                                        if (text.includes('Embed fetch failed') || text.includes('Embed proxy error') || text.includes('404 Not Found') || text.includes('502 Bad Gateway') || text.includes('Server Not Responding')) {
                                            console.warn('[ToonPlayer] Proxy error detected inside fallback iframe. Triggering autoscan...');
                                        }
                                    }
                                } catch (err) {}
                            }}
                        />
                    </div>

                    {/* Info + Alternative Servers */}
                    <div className="px-4 py-6">
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                            <p className="text-yellow-400 text-sm font-medium">⚠️ Native servers unavailable. Playing via fallback embed servers.</p>
                        </div>
                        
                        <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Try Other Servers</h3>
                        <div className="flex flex-wrap gap-2">
                            {(() => {
                                const isMovieShow = show?.type?.toLowerCase() === 'movie' || show?.totalEpisodes === 1 || isMovieContent(show);
                                return [
                                    { name: "VidSrc Me", url: fallbackEmbedUrl },
                                    { name: "VidSrc.to", url: fallbackEmbedUrl2 },
                                    { name: "Peachify", url: isMovieShow ? `https://peachify.top/?type=movie&id=${id}` : `https://peachify.top/?type=tv&id=${id}&s=1&e=1` },
                                    { name: "VidLink", url: isMovieShow ? `https://vidlink.pro/movie/${id}?autoplay=true` : `https://vidlink.pro/tv/${id}/1/1?autoplay=true` },
                                ].map(server => (
                                    <a key={server.name} href={server.url} target="_blank" rel="noopener" className="px-4 py-2 bg-bg-card border border-border-color rounded-lg text-xs font-medium hover:bg-border-color transition-colors">
                                        {server.name}
                                    </a>
                                ));
                            })()}
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                            <Link 
                                href="/"
                                scroll={false}
                                className="w-full max-w-xs py-3 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] hover:opacity-90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" /> Return Home
                            </Link>
                            <Link 
                                href="/search"
                                scroll={false}
                                className="w-full max-w-xs py-3 border border-border-color hover:bg-bg-card text-[var(--text-main)] rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Search className="w-4 h-4" /> Try Searching
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }
    const renderPlayer = () => {
        return (
            <div className={`w-full ${isFocusMode ? "h-[100dvh] rounded-none" : "aspect-video rounded-none sm:rounded-xl md:rounded-2xl"} bg-black overflow-hidden border-0 sm:border border-border-color relative shadow-none sm:shadow-2xl touch-pan-y ${dimLights ? 'z-[48]' : 'z-20'}`} style={{ touchAction: 'pan-y !important' }}>
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4 text-red-500 p-4 md:p-8 text-center bg-bg-card/80 backdrop-blur-lg">
                        <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-red-600/80" />
                        <div className="max-w-md">
                            <p className="font-bold text-[var(--text-main)] text-base md:text-lg">Stream Unavailable</p>
                            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">Native sources failed. Try a movie server below.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 w-full max-w-sm">
                            {/* Quick switch to ToonPlayer VIP */}
                            {servers.find(s => s.serverId === "peachify") && (
                                <button
                                    onClick={() => {
                                        setError(null);
                                        manualServerRef.current = "peachify";
                                        setSelectedServer("peachify");
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] hover:opacity-90 text-white rounded-lg font-semibold transition-all text-sm flex items-center gap-1.5"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" /> ToonPlayer VIP
                                </button>
                            )}
                            {/* Quick switch to FMovies */}
                            {servers.find(s => s.serverId === "fmovies") && (
                                <button
                                    onClick={() => {
                                        setError(null);
                                        manualServerRef.current = "fmovies";
                                        setSelectedServer("fmovies");
                                    }}
                                    className="px-4 py-2 bg-bg-card border border-border-color text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-accent/40"
                                >
                                    FMovies
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setError(null);
                                    setSourceUrl(null);
                                    const firstNative = servers.find(s => !s.isMovieServer);
                                    const nextServerId = firstNative?.serverId || servers[0]?.serverId || null;
                                    if (nextServerId) manualServerRef.current = nextServerId;
                                    setSelectedServer(nextServerId);
                                }}
                                className="px-4 py-2 bg-bg-card border border-border-color text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-accent/40 flex items-center gap-1.5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Retry All
                            </button>
                            
                            {castAvailable && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-color text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-blue-500/50">
                                    {React.createElement('google-cast-launcher', { style: { width: '20px', height: '20px', cursor: 'pointer', display: 'block' } })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : sourceUrl ? (
                    <div className="relative w-full h-full">
                        {videoType === "iframe" ? (
                            <>
                                <iframe
                                    key={iframeKey}
                                    ref={iframeRef}
                                    src={getProxiedEmbedUrl(sourceUrl)}
                                    className={`w-full h-full border-0 bg-black ${
                                        isFocusMode ? "rounded-none" : "rounded-none sm:rounded-xl md:rounded-2xl"
                                    }`}
                                    allow="fullscreen; autoplay; encrypted-media; picture-in-picture; web-share"
                                    allowFullScreen
                                    onLoad={(e: any) => {
                                        setLoadingSource(false);
                                        try {
                                            const iframe = e.target as HTMLIFrameElement;
                                            const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                            if (doc) {
                                                const text = doc.body?.innerText || '';
                                                if (text.includes('Embed fetch failed') || text.includes('Embed proxy error') || text.includes('404 Not Found') || text.includes('502 Bad Gateway') || text.includes('Server Not Responding')) {
                                                    console.warn('[ToonPlayer] Proxy error detected inside anime iframe. Triggering autoscan fallback...');
                                                    handleAutoFallback();
                                                }
                                            }
                                        } catch (err) {}
                                    }}
                                    onError={() => {
                                        setError("Iframe failed to load.");
                                        handleAutoFallback();
                                    }}
                                ></iframe>
                                
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
                                key={`${id}-${currentEp}`}
                                option={{
                                    url: sourceUrl,
                                    type: videoType,
                                }}
                                initialTime={getHistoryItem(`${fullId}-${currentEp}`)?.currentTime || 0}
                                onTimeUpdate={(currentTime: number, duration: number) => {
                                    addToHistory({
                                        id: `${fullId}-${currentEp}`,
                                        showId: fullId,
                                        type: 'anime',
                                        title: show?.name || 'Unknown',
                                        poster: show?.thumbnail || ((show as any)?.image) || '',
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
                                onError={() => {
                                    console.warn('[ToonPlayer] ArtPlayer playback error. Triggering auto fallback...');
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
                                        
                                        <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tighter">Up Next</h3>
                                        <p className="text-[var(--text-muted)] text-xs font-bold mb-6">
                                            Episode {availableEps[availableEps.indexOf(currentEp) + 1] || 'Next'}
                                        </p>
                                        
                                        <div className="flex items-center gap-2 justify-center">
                                            <button 
                                                onClick={() => {
                                                    if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                                                    setShowNextOverlay(false);
                                                }}
                                                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                                                    setShowNextOverlay(false);
                                                    const currentIndex = availableEps.map(e => typeof e === 'object' ? String(e.number||e.id) : String(e)).indexOf(String(currentEp));
                                                    if (currentIndex !== -1 && currentIndex + 1 < availableEps.length) {
                                                        const nextEp = (typeof availableEps[currentIndex + 1] === 'object' ? String(availableEps[currentIndex + 1].number||availableEps[currentIndex + 1].id) : String(availableEps[currentIndex + 1]));
                                                        setCurrentEp(String(nextEp));
                                                    }
                                                }}
                                                className="px-6 py-2 bg-white text-black hover:bg-white/90 rounded-lg font-black text-xs transition-all flex items-center gap-1.5"
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
                    <div className="absolute inset-0 text-[var(--text-muted)] text-sm flex flex-col items-center justify-center gap-3">
                        <p>Initializing...</p>
                    </div>
                )}
            </div>
        );
    };

    if (!show) return null;

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
                            onClick={() => setCurrentEp(epNum)}
                            className={`flex-shrink-0 w-[180px] snap-center p-3 rounded-xl border text-left transition-all duration-[250ms] ease-out hover:-translate-y-[2px] hover:shadow-lg ${
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
                                    <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                        Episode {currentEp} <span className="text-zinc-600">·</span> {mode.toUpperCase()}
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

                            {/* Control Bar (Prev/Next/Theatre/Focus/Reload/Dim) */}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#111113]/90 border border-white/5 rounded-2xl mt-4 gap-4 flex-wrap select-none shadow-md mb-4">
                                <div className="flex items-center gap-2">
                                    {episodes.length > 1 ? (
                                        <>
                                            <button
                                                onClick={handlePrevEpisode}
                                                disabled={!hasPrevEpisode()}
                                                className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 border border-white/10 rounded-xl text-white transition-all duration-200 cursor-pointer"
                                                title="Previous Episode"
                                            ><ChevronLeft className="w-4 h-4" /></button>
                                            <span className="text-xs font-semibold text-zinc-400 min-w-[70px] text-center">
                                                EP {currentEp}
                                            </span>
                                            <button
                                                onClick={handleNextEpisode}
                                                disabled={!hasNextEpisode()}
                                                className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 border border-white/10 rounded-xl text-white transition-all duration-200 cursor-pointer"
                                                title="Next Episode"
                                            ><ChevronRight className="w-4 h-4" /></button>
                                        </>
                                    ) : (
                                        <span className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-[11px] font-black text-accent uppercase tracking-wider">
                                            Anime Movie
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIframeKey(prev => prev + 1)}
                                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 hover:text-white transition-all"
                                        title="Reload Player"
                                    ><RefreshCw className="w-4 h-4" /></button>
                                    <button
                                        onClick={() => {
                                            setIsTheatreMode(!isTheatreMode);
                                            if (isFocusMode) setIsFocusMode(false);
                                        }}
                                        className={`p-2 border rounded-xl transition-all ${
                                            isTheatreMode 
                                                ? "bg-accent/20 border-accent text-accent font-bold shadow-[0_0_10px_var(--accent-glow)]" 
                                                : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                                        }`}
                                        title="Theatre Mode"
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
                                        className={`p-2 border rounded-xl transition-all ${
                                            isFocusMode 
                                                ? "bg-accent/20 border-accent text-accent font-bold shadow-[0_0_10px_var(--accent-glow)]" 
                                                : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                                        }`}
                                        title="Cinematic Focus Mode"
                                    ><Shield className="w-4 h-4" /></button>
                                    <button 
                                        onClick={() => setDimLights(!dimLights)}
                                        className={`p-2 border rounded-xl transition-all ${
                                            dimLights 
                                                ? "bg-amber-500/20 border-amber-500 text-amber-500 font-bold" 
                                                : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                                        }`}
                                        title="Toggle Cinema Light Effect"
                                    >
                                        <Zap className="w-4 h-4" />
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
                                    {/* Type Selection (SUB/DUB) */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Source:</span>
                                        <div className="flex bg-bg-main p-1 rounded-md border border-border-color">
                                            <button
                                                onClick={() => setMode("sub")}
                                                className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all ${mode === 'sub' ? 'bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-white'}`}
                                            >
                                                SUB
                                            </button>
                                            <button
                                                onClick={() => setMode("dub")}
                                                className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all ${mode === 'dub' ? 'bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-white'}`}
                                            >
                                                DUB
                                            </button>
                                        </div>
                                    </div>

                                    {/* Multi-Audio Quick Select */}
                                    <button
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
                                            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        <Sparkles className={`w-4 h-4 ${selectedServer === "peachify" ? "animate-pulse" : ""}`} />
                                        <span className="text-xs font-black uppercase tracking-wider">Multi-Audio</span>
                                    </button>

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
                                            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="number"
                                                placeholder="Search episode..."
                                                value={epFilter}
                                                className="w-full bg-bg-main pl-9 pr-3 py-2 rounded-md border border-border-color outline-none focus:border-accent/40 transition-colors text-sm text-white placeholder-[var(--text-muted)] font-inter"
                                                onChange={(e) => setEpFilter(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col gap-1">
                                        {(() => {
                                            const filteredEpisodes = epFilter
                                                ? episodes.filter(ep => String(typeof ep === 'object' ? (ep.number||ep.id) : ep).includes(epFilter))
                                                : episodes;
                                            
                                            if (episodeLayoutMode === "grid") {
                                                return (
                                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-4 gap-1.5 p-1">
                                                        {filteredEpisodes.map((ep) => (
                                                            <button 
                                                                key={ep} 
                                                                onClick={() => setCurrentEp(String(typeof ep === 'object' ? (ep.number||ep.id) : ep))} 
                                                                className={`py-2 rounded-lg text-xs font-bold transition-all border text-center ${String(currentEp) === String(typeof ep === 'object' ? (ep.number||ep.id) : ep) ? 'border-accent bg-accent/15 text-accent shadow-[0_0_8px_var(--accent-glow)] font-black' : 'border-border-color bg-[#08080B] text-zinc-400 hover:text-white'}`}
                                                            >
                                                                {ep}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            return filteredEpisodes.map((ep) => (
                                                <EpisodeButton
                                                    key={ep}
                                                    ep={ep}
                                                    currentEp={currentEp}
                                                    onClick={() => setCurrentEp(String(typeof ep === 'object' ? (ep.number||ep.id) : ep))}
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
                                            {filteredEpisodes.map((ep) => (
                                                <button 
                                                    key={ep} 
                                                    onClick={() => {
                                                        setCurrentEp(String(typeof ep === 'object' ? (ep.number||ep.id) : ep));
                                                        setShowEpisodesDrawer(false);
                                                    }} 
                                                    className={`py-2 rounded-lg text-xs font-bold transition-all border text-center ${String(currentEp) === String(typeof ep === 'object' ? (ep.number||ep.id) : ep) ? 'border-accent bg-accent/15 text-accent shadow-[0_0_8px_var(--accent-glow)] font-black' : 'border-border-color bg-[#08080B] text-zinc-400 hover:text-white'}`}
                                                >
                                                    {typeof ep === 'object' ? (ep.number||ep.id) : ep}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                }

                                return filteredEpisodes.map((ep) => (
                                    <EpisodeButton
                                        key={ep}
                                        ep={ep}
                                        currentEp={currentEp}
                                        onClick={() => {
                                            setCurrentEp(String(typeof ep === 'object' ? (ep.number||ep.id) : ep));
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
