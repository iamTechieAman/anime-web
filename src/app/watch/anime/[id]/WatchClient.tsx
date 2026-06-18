"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import React from "react";
import Script from "next/script";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle, RefreshCw, AlertTriangle, Search, Play, Share2, Server, ChevronDown, Check, Shield, Zap, Sparkles, BookmarkPlus, BookmarkCheck } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAdBlock } from "@/context/AdBlockContext";
import SimilarAnime from "@/components/SimilarAnime";

import { useRouter, useSearchParams } from "next/navigation";
import { useWatch } from "@/context/WatchContext";

// Using ArtPlayer for robust playback
const ArtPlayer = dynamic(() => import("@/components/player/ArtPlayer"), { ssr: false });

/** Memoized episode button to prevent full list re-render on every currentEp change */
const EpisodeButton = React.memo(function EpisodeButton({
    ep, currentEp, onClick
}: { ep: string | number; currentEp: string; onClick: () => void }) {
    const isActive = String(currentEp) === String(ep);
    const ref = React.useRef<HTMLButtonElement>(null);

    // Auto-scroll into view when this episode becomes active
    React.useEffect(() => {
        if (isActive && ref.current) {
            ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [isActive]);

    return (
        <button
            ref={ref}
            onClick={onClick}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-md text-left transition-colors group ${
                isActive ? "bg-orange-500/15 border border-orange-500/30" : "hover:bg-white/5 border border-transparent"
            }`}
        >
            <span className={`text-sm font-semibold transition-colors ${isActive ? 'text-orange-400' : 'text-[var(--text-muted)] group-hover:text-white'}`}>
                Episode {ep}
            </span>
            {isActive && (
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.4)]">
                    <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                </div>
            )}
        </button>
    );
});

const MOVIE_SERVERS = [
    {
        id: "peachify",
        name: "ToonPlayer VIP",
        badge: "Multi-Audio",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://peachify.top/?type=tv&id=${id}&s=${s || 1}&e=${e || 1}&autoplay=true` : `https://peachify.top/?type=movie&id=${id}&autoplay=true`,
    },
    {
        id: "vidbinge",
        name: "VidBinge",
        badge: "4K/HD",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidbinge.to/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=true` : `https://vidbinge.to/embed/movie/${id}?autoplay=true`,
    },
    {
        id: "vidsrc_pro",
        name: "VidSrc Pro",
        badge: "VIP",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.pro/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=true` : `https://vidsrc.pro/embed/movie/${id}?autoplay=true`,
    },
    {
        id: "vidlink",
        name: "VidLink",
        badge: "Recommended",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidlink.pro/tv/${id}/${s || 1}/${e || 1}?primaryColor=3b82f6&secondaryColor=1e3a5f&autoplay=true&title=false` : `https://vidlink.pro/movie/${id}?primaryColor=3b82f6&secondaryColor=1e3a5f&autoplay=true&title=false`,
    },
    {
        id: "vidsrc_net",
        name: "VidSrc",
        badge: "Stable",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.net/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=true` : `https://vidsrc.net/embed/movie/${id}?autoplay=true`,
    },
    {
        id: "vidsrc_me",
        name: "VidSrc US",
        badge: "Fast",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s || 1}&episode=${e || 1}&autoplay=true` : `https://vidsrc.me/embed/movie?tmdb=${id}&autoplay=true`,
    },
    {
        id: "superembed",
        name: "SuperEmbed",
        badge: "Reliable",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s || 1}&e=${e || 1}&autoplay=true` : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&autoplay=true`,
    },
    {
        id: "autoembed",
        name: "AutoEmbed",
        badge: null,
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://player.autoembed.cc/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=true` : `https://player.autoembed.cc/embed/movie/${id}?autoplay=true`,
    },
    {
        id: "vidsrc_in",
        name: "VidSrc IN",
        badge: "Backup",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.in/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=true` : `https://vidsrc.in/embed/movie/${id}?autoplay=true`,
    },
];

interface ShowData {
    _id: string;
    name?: string;
    malId?: string;
    anilistId?: string;
    tmdbId?: string;
    provider?: string;
    thumbnail?: string;
    availableEpisodesDetail: {
        sub: string[];
        dub: string[];
        raw: string[];
    };
}

export default function WatchClient({ id: fullId }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAdBlockEnabled } = useAdBlock();

    // Parse ID for provider prefix (e.g., tmdb:123, aw:naruto)
    const { provider: idProvider, actualId: id } = (() => {
        if (fullId.includes(':')) {
            const parts = fullId.split(':');
            return { provider: parts[0], actualId: parts.slice(1).join(':') };
        }
        return { provider: null, actualId: fullId };
    })();
    
    // Priority: Prefix > URL Parameter
    const provider = idProvider || searchParams.get('provider');

    const [show, setShow] = useState<ShowData | null>(null);

    const [currentEp, setCurrentEp] = useState<string>("1");
    const [mode, setMode] = useState<"sub" | "dub">("sub");
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

    const processingRef = useRef<string | null>(null);

    const [isSafeStream, setIsSafeStream] = useState(true);
    const [showSafeGuide, setShowSafeGuide] = useState(false);

    const [tmdbId, setTmdbId] = useState<string | null>(null);

    const { addToHistory, getHistoryItem, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();
    
    // Automatic Provider Fallback Engine (Intelligent Rotation & Health Recovery)
    const handleAutoFallback = useCallback(() => {
        if (!selectedServer || servers.length === 0) return;

        console.warn(`[ToonPlayer Fallback] Server ${selectedServer} timed out or failed. Initiating rotation...`);

        setFailedServers(prev => {
            const next = new Set(prev);
            next.add(selectedServer);

            // Find next server in the list that hasn't failed yet
            const nextServer = servers.find(s => !next.has(s.serverId) && s.serverId !== selectedServer);

            if (nextServer) {
                toast.error(`Server failed. Auto-switching to ${nextServer.serverName}...`, {
                    icon: "🔄",
                    style: {
                        background: "rgba(20, 20, 20, 0.95)",
                        color: "#fff",
                        border: "1px solid rgba(249, 115, 22, 0.3)",
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

    // Reset failed servers when episode or mode changes
    useEffect(() => {
        setFailedServers(new Set());
    }, [currentEp, mode]);

    // Automatic loading timeout recovery (5 seconds)
    useEffect(() => {
        if (!loadingSource || error || !selectedServer) return;

        const timer = setTimeout(() => {
            console.warn(`[ToonPlayer Anime] Provider timed out while loading source. Triggering fallback.`);
            handleAutoFallback();
        }, 5000);

        return () => clearTimeout(timer);
    }, [loadingSource, error, selectedServer, handleAutoFallback]);

    // Load Settings & Bookmark
    useEffect(() => {
        // null means first visit → default to true. Only disable if explicitly set to 'false'.
        const savedAutoPlay = localStorage.getItem('toonplayer_autoplay') !== 'false';
        const savedAutoNext = localStorage.getItem('toonplayer_autonext') !== 'false';
        setAutoPlay(savedAutoPlay);
        setAutoNext(savedAutoNext);

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
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener("message", handleMessage);
        };
    }, [id, autoNext, currentEp, mode, show]);

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

    const isBookmarked = isInWatchlist(fullId);

    // Auto-dispatch postMessage if audio was already unlocked in a previous session/server
    useEffect(() => {
        if (!loadingSource && audioUnlocked && iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage({ type: 'PLAY_WITH_SOUND' }, '*');
        }
    }, [loadingSource, audioUnlocked]);

    const toggleBookmark = () => {
        if (!show) return;

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
        const fetchData = async () => {
            setLoadingShow(true);
            setShowError(null);
            
            try {
                // Kick off episodes fetch
                const episodesPromise = axios.get(`/api/anime/episodes?id=${id}&provider=${provider || ''}`, {
                    timeout: 15000,
                });

                const res = await episodesPromise;
                const fetchedShow = res.data.show;
                
                if (!fetchedShow) throw new Error("No show data received");
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
                const historyItem = getHistoryItem(fullId);
                const epParam = new URLSearchParams(window.location.search).get("ep");
                const modeParam = new URLSearchParams(window.location.search).get("mode") as "sub" | "dub";
                
                if (modeParam && ["sub", "dub"].includes(modeParam)) {
                    setMode(modeParam);
                }

                const currentEps = fetchedShow.availableEpisodesDetail?.[modeParam || initialMode] || [];
                
                if (epParam && currentEps.map(String).includes(String(epParam))) {
                    setCurrentEp(String(epParam));
                } else if (historyItem && historyItem.episodeId && currentEps.map(String).includes(String(historyItem.episodeId))) {
                    setCurrentEp(String(historyItem.episodeId));
                } else if (currentEps.length > 0) {
                    setCurrentEp(currentEps.includes("1") ? "1" : String(currentEps[0]));
                }

                // Parallelly fetch TMDB ID if name is available
                if (fetchedShow.name) {
                    let sanitizedName = fetchedShow.name.split('\n')[0].trim().substring(0, 50).replace(/[^a-zA-Z0-9 ':!,-]/g, '').trim();
                    axios.get(`/api/prime/search?q=${encodeURIComponent(sanitizedName)}`)
                        .then(tmdbRes => {
                            const results = tmdbRes.data.results;
                            setTmdbId(results && results.length > 0 ? results[0].id.toString() : "0");
                        })
                        .catch(() => setTmdbId("0"));
                } else {
                    setTmdbId("0");
                }

            } catch (err: any) {
                console.error("Failed to fetch show", err);
                setShowError(err.response?.data?.error || "Anime not found or streaming servers are unreachable.");
            } finally {
                setLoadingShow(false);
            }
        };

        fetchData();
    }, [id, provider]);

    // Fetch Servers when Episode/Mode Changes
    useEffect(() => {
        if (!show?._id) return;


        // ALWAYS include movie servers — they are the guaranteed fallback
        const movieServersList = MOVIE_SERVERS.map(ms => ({
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
                const res = await axios.get(`/api/anime/servers?episodeId=${currentEp}&provider=${provider || ''}`);
                let nativeServers = (res.data.servers || []).filter((s: any) => s.type === mode);
                
                // If no servers for specific mode (sub/dub), show all native servers as fallback
                if (nativeServers.length === 0 && res.data.servers?.length > 0) {
                    nativeServers = res.data.servers;
                }
                
                // ALWAYS include movie servers — they are the guaranteed fallback
                const allServers = [...nativeServers, ...movieServersList, ...emergencyEmbeds];

                setServers(allServers);

                // Auto-selection logic: Pick first available healthy server
                if (allServers.length > 0) {
                    const currentExists = allServers.find((s: any) => s.serverId === selectedServer);
                    if (!currentExists && manualServerRef.current !== selectedServer) {
                        const topServers = allServers.slice(0, 3);
                        try {
                            const urlsToCheck = topServers.map(s => typeof s.getUrl === 'function' ? s.getUrl() : s.url);
                            const checkRes = await axios.post('/api/health', { urls: urlsToCheck });
                            const results = checkRes.data?.results || [];

                            const firstAliveIndex = results.findIndex((res: any) => res.alive);
                            if (firstAliveIndex !== -1) {
                                setSelectedServer(topServers[firstAliveIndex].serverId);
                            } else {
                                setSelectedServer(nativeServers[0]?.serverId || allServers[0].serverId);
                            }
                        } catch (checkErr) {
                            console.error("[ToonPlayer Anime Health] Failed to pre-check health:", checkErr);
                            setSelectedServer(nativeServers[0]?.serverId || allServers[0].serverId);
                        }
                    }
                } else {
                    setSelectedServer(null);
                }
            } catch (err) {
                console.error("Failed to fetch anime servers, using all fallbacks", err);
                // Always show movie servers + emergency embeds even if native API completely fails
                const fallbackList = [...movieServersList, ...emergencyEmbeds];
                setServers(fallbackList);
                
                // Precheck fallbackList
                const topFallbacks = fallbackList.slice(0, 3);
                try {
                    const urlsToCheck = topFallbacks.map(s => typeof s.getUrl === 'function' ? s.getUrl() : s.url);
                    const checkRes = await axios.post('/api/health', { urls: urlsToCheck });
                    const results = checkRes.data?.results || [];

                    const firstAliveIndex = results.findIndex((res: any) => res.alive);
                    if (firstAliveIndex !== -1) {
                        setSelectedServer(topFallbacks[firstAliveIndex].serverId);
                    } else {
                        const peachify = fallbackList.find(s => s.serverId === "peachify");
                        setSelectedServer(peachify?.serverId || fallbackList[0]?.serverId || null);
                    }
                } catch (e) {
                    const peachify = fallbackList.find(s => s.serverId === "peachify");
                    setSelectedServer(peachify?.serverId || fallbackList[0]?.serverId || null);
                }
            } finally {
                setLoadingServers(false);
            }
        };

        fetchServers();
    }, [currentEp, mode, show, tmdbId]);



    // Fetch Source
    useEffect(() => {
        if (!show || !selectedServer || servers.length === 0) return;

        const fetchSource = async () => {
            // Include selectedServer in key to trigger re-fetch when it changes
            const key = `${id}-${currentEp}-${mode}-${selectedServer}`;
            if (processingRef.current === key) return;
            processingRef.current = key;

            const selectedServerObj = servers.find(s => s.serverId === selectedServer);
            if (!selectedServerObj) return;

            // For movie/emergency servers — load iframe directly
            if (selectedServerObj.isMovieServer) {
                setLoadingSource(true);
                setSourceUrl(null);
                setError(null);

                const serverWithUrl = selectedServerObj as any;
                
                // If it's an emergency server, it has its own logic that doesn't need TMDB ID
                if (serverWithUrl.isEmergency) {
                    setSourceUrl(serverWithUrl.getUrl());
                } else {
                    // Regular movie server requires TMDB ID
                    if (!tmdbId || tmdbId === "0") {
                    console.warn('[WatchClient] No valid TMDB ID, skipping movie server');
                    setError("TMDB Metadata missing for this title. Try a native server.");
                    processingRef.current = null;
                    return;
                    }
                    const iframeUrl = serverWithUrl.getUrl("tv", tmdbId, 1, parseInt(String(currentEp) || "1"));
                    setSourceUrl(iframeUrl);
                }

                setVideoType("iframe");
                setLoadingSource(false);
                toast.success(`EP ${currentEp} loaded on ${selectedServerObj.serverName}`);
                processingRef.current = null;
                return;
            }

            // For native anime servers — check episode availability
            if (show.availableEpisodesDetail) {
                const availableEps = show.availableEpisodesDetail[mode] || [];
                if (!availableEps.includes(currentEp)) {
                    // Auto-switch to a movie server instead of showing error
                    console.warn(`EP ${currentEp} not in ${mode}`);
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
                    params: {
                        id,
                        ep: currentEp,
                        mode,
                        title: show.name,
                        provider: show.provider || provider,
                        serverId: selectedServer
                    }
                });

                if (processingRef.current !== key) return;

                const links = res.data.links;
                if (links && links.length > 0) {
                    const hlsIndex = links.findIndex((l: any) => l.hls);
                    const selected = hlsIndex !== -1 ? links[hlsIndex] : links[0];
                    const absoluteUrl = selected.link.startsWith('http')
                        ? selected.link
                        : `${window.location.origin}${selected.link}`;

                    const isM3U8 = selected.hls || absoluteUrl.includes('.m3u8') || selected.isM3U8;
                    
                    if (isM3U8 || absoluteUrl.includes('.mp4')) {
                        // Use ArtPlayer natively via CORS Proxy
                        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                        setSourceUrl(proxiedUrl);
                        setVideoType(isM3U8 ? "m3u8" : "mp4");
                    } else {
                        // Fallback to iframe if it's a raw embed page
                        const proxiedUrl = `/api/proxy/video?url=${encodeURIComponent(absoluteUrl)}`;
                        setSourceUrl(proxiedUrl);
                        setVideoType("iframe");
                    }


                } else {
                    // No links found — auto-switch to next server
                    console.warn('[WatchPage] No links from native server. Rotating...');
                    handleAutoFallback();
                }
            } catch (err: any) {
                if (processingRef.current !== key) return;
                console.error('[WatchPage] Native server failed:', err.message);
                handleAutoFallback();
            } finally {
                if (processingRef.current === key) {
                    setLoadingSource(false);
                    processingRef.current = null;
                }
            }
        };


        fetchSource();

    }, [id, currentEp, mode, show, selectedServer, provider, servers, tmdbId]);

    const handleVideoEnded = () => {
        if (!autoNext) return;
        
        const availableEps = show?.availableEpisodesDetail?.[mode] || [];
        const currentIndex = availableEps.map(String).indexOf(String(currentEp));
        
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
                        
                        const nextEp = availableEps[currentIndex + 1];
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
            <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
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
            <main className="bg-[var(--bg-main)] text-[var(--text-main)]">
                {/* Navbar */}
                <nav className="fixed top-0 left-0 md:left-[72px] right-0 z-50 h-[90px] md:h-[110px] lg:h-[140px] bg-[var(--bg-overlay)] backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-center pt-[env(safe-area-inset-top)]">
                    <Link href="/" className="absolute top-[24px] left-[24px] z-50 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group shrink-0">
                        <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div className="flex flex-col items-center text-center max-w-[60%] px-4">
                        <h1 className="font-bold text-[clamp(24px,4vw,64px)] lg:text-[clamp(32px,4vw,72px)] leading-[0.95] text-[var(--text-main)] truncate w-full">
                            {animeTitle}
                        </h1>
                    </div>
                </nav>

                <div className="pt-[90px] md:pt-[110px] lg:pt-[140px] px-0 sm:px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto w-full">
                    {/* Fallback Player */}
                    <div className="w-full aspect-video bg-black md:rounded-lg overflow-hidden border border-[var(--border-color)] relative shadow-2xl">
                        <iframe
                            src={`/api/proxy/video?url=${encodeURIComponent(fallbackEmbedUrl)}`}
                            className="absolute inset-0 w-full h-full border-0"
                            allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                            referrerPolicy="origin"
                        />
                    </div>

                    {/* Info + Alternative Servers */}
                    <div className="px-4 py-6">
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                            <p className="text-yellow-400 text-sm font-medium">⚠️ Native servers unavailable. Playing via fallback embed servers.</p>
                        </div>
                        
                        <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Try Other Servers</h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { name: "VidSrc Me", url: fallbackEmbedUrl },
                                { name: "VidSrc.to", url: fallbackEmbedUrl2 },
                                { name: "Peachify", url: `https://peachify.top/?type=tv&id=${id}&s=1&e=1` },
                                { name: "VidLink", url: `https://vidlink.pro/tv/${id}/1/1?autoplay=true` },
                            ].map(server => (
                                <a key={server.name} href={server.url} target="_blank" rel="noopener" className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-medium hover:bg-[var(--border-color)] transition-colors">
                                    {server.name}
                                </a>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                            <Link 
                                href="/"
                                className="w-full max-w-xs py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" /> Return Home
                            </Link>
                            <Link 
                                href="/search"
                                className="w-full max-w-xs py-3 border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Search className="w-4 h-4" /> Try Searching
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (!show) return null;

    const episodes = show.availableEpisodesDetail?.[mode] || [];

    return (
        <>
        <main className="bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-orange-500/20 transition-colors duration-300">
            {/* No JavaScript Fallback */}
            <noscript>
                <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/95 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="max-w-md bg-[var(--bg-card)] border border-red-500/30 rounded-2xl p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-3 text-[var(--text-main)]">JavaScript Required</h2>
                        <p className="text-[var(--text-muted)] mb-6">
                            Video streaming requires JavaScript to function. Please enable JavaScript in your browser to watch anime.
                        </p>
                        <Link href="/" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold inline-block">
                            Return Home
                        </Link>
                    </div>
                </div>
            </noscript>

            {/* Background Glow - Hidden on mobile for performance */}
            <div className="fixed inset-0 pointer-events-none z-0 hidden md:block">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-orange-900/10 rounded-full blur-[24px] mix-blend-screen opacity-20"></div>
            </div>

            {/* Navbar with Safe Area Support */}
            <nav className="fixed top-0 left-0 md:left-[72px] right-0 z-50 h-[90px] md:h-[110px] lg:h-[140px] bg-[var(--bg-overlay)] backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-center pt-[env(safe-area-inset-top)]">
                <Link href="/" className="absolute top-[24px] left-[24px] z-50 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group shrink-0">
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div className="flex flex-col items-center text-center max-w-[60%] px-4">
                    <h1 className="font-bold text-[clamp(24px,4vw,64px)] lg:text-[clamp(32px,4vw,72px)] leading-[0.95] text-[var(--text-main)] truncate w-full">
                        {show.name || "Anime Stream"}
                    </h1>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-[var(--text-muted)] mt-1 font-medium tracking-wide uppercase">
                        <span className="text-orange-400 font-bold">EP {currentEp}</span>
                        <span className="w-1 h-1 bg-[var(--text-muted)]/30 rounded-full"></span>
                        <span>{mode}</span>
                    </div>
                </div>
            </nav>

            {/* Content Container - Padded from top to avoid Navbar overlap */}
            <div className="flex-1 w-full mx-auto pt-[90px] md:pt-[110px] lg:pt-[140px] pb-8 px-0 sm:px-4 md:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col xl:flex-row gap-4 md:gap-6 items-start">

                    {/* Player Column */}
                    <div className="flex-1 w-full min-w-0 touch-pan-y">
                        <div className="w-full aspect-video bg-black md:rounded-lg overflow-hidden border border-[var(--border-color)] relative z-20 shadow-2xl touch-pan-y" style={{ touchAction: 'pan-y !important' }}>
                            {loadingSource ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-md z-50">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                                        <Loader2 className="w-16 h-16 animate-spin text-orange-400 relative z-10" />
                                    </div>
                                    <div className="text-center relative z-10 px-4">
                                        <h3 className="text-lg font-black text-white tracking-widest uppercase mb-1 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                                            Initializing Stream
                                        </h3>
                                        <p className="text-[10px] text-white/50 uppercase tracking-[0.3em] font-medium animate-pulse">
                                            Bypassing protections...
                                        </p>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4 text-red-500 p-4 md:p-8 text-center bg-[var(--bg-card)]/80 backdrop-blur-lg">
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
                                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all text-sm flex items-center gap-1.5"
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
                                                className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-orange-500/40"
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
                                            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-orange-500/40 flex items-center gap-1.5"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> Retry All
                                        </button>
                                        
                                        {castAvailable && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-blue-500/50">
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
                                                ref={iframeRef}
                                                src={sourceUrl}
                                                className="w-full h-full border-0 bg-black"
                                                allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                                                onLoad={() => setLoadingSource(false)}
                                                onError={() => setError("Iframe failed to load.")}
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
                                                        <div className="bg-blue-600/90 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 group-hover:scale-105 transition-transform">
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
                                            onTimeUpdate={(currentTime, duration) => {
                                                addToHistory({
                                                    id: `${fullId}-${currentEp}`,
                                                    showId: fullId,
                                                    type: 'anime',
                                                    title: show?.name || 'Unknown',
                                                    poster: show?.thumbnail || ((show as any)?.image) || '',
                                                    episodeId: currentEp,
                                                    episodeNumber: Number(currentEp) || 1,
                                                    currentTime,
                                                    duration
                                                });
                                            }}
                                            onEnded={handleVideoEnded}
                                            onError={() => setError("Player failed to load video.")}
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
                                                                stroke="#f97316"
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
                                        const currentIndex = availableEps.map(String).indexOf(String(currentEp));
                                        if (currentIndex !== -1 && currentIndex + 1 < availableEps.length) {
                                            const nextEp = availableEps[currentIndex + 1];
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

                        {/* Safe Stream & Stats */}
                        <div className="flex flex-wrap items-center gap-3 pt-4">
                            {/* Next Episode Button */}
                            {availableEps && currentEp && availableEps.map(String).indexOf(String(currentEp)) < availableEps.length - 1 && (
                                <button
                                    onClick={() => {
                                        const currentIndex = availableEps.map(String).indexOf(String(currentEp));
                                        if (currentIndex !== -1 && currentIndex < availableEps.length - 1) {
                                            const nextEp = availableEps[currentIndex + 1];
                                            setCurrentEp(String(nextEp));
                                            toast.success(`Now playing Episode ${nextEp}`, { icon: '▶️' });
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all drop-shadow-[0_0_10px_rgba(249,115,22,0.4)] mr-auto"
                                >
                                    Next Episode <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                            )}

                            <button 
                                onClick={() => setShowSafeGuide(true)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                            >
                                <Shield className="w-3 h-3" />
                                SafeStream Protected
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-wider">
                                <Zap className="w-3 h-3" />
                                Edge Optimized
                            </div>
                        </div>

                        {/* Ad-Blocker Guide Modal */}
                        <AnimatePresence>
                            {showSafeGuide && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowSafeGuide(false)}>
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                        className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-2xl"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="flex items-center gap-3 text-emerald-400 mb-2">
                                            <Shield className="w-6 h-6" />
                                            <h3 className="text-xl font-bold text-white">SafeStream Guide</h3>
                                        </div>
                                        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                                            We've enabled <span className="text-white font-bold">Player Guard</span> to block 99% of redirects and popups. To reach <span className="text-emerald-400 font-bold">100% Ad-Free</span> experience, we highly recommend using AdGuard DNS.
                                        </p>
                                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-[var(--text-muted)]">DNS Server:</span>
                                                <code className="text-orange-400 font-bold selection:bg-orange-500/20">dns.adguard.com</code>
                                            </div>
                                            <p className="text-[9px] text-[var(--text-muted)] italic">
                                                * This will block ads across all streaming sites and providers automatically.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setShowSafeGuide(false)}
                                            className="w-full py-3 bg-white text-black rounded-xl font-black text-sm hover:bg-white/90 transition-colors uppercase tracking-widest"
                                        >
                                            Got it
                                        </button>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Troubleshooting & Help */}
                        <div className="mt-4 p-4 bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-800/60 shadow-inner">
                            <div className="flex items-center gap-2 mb-3 text-amber-500/90 font-medium">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm">Playback Troubleshooting</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                                <div className="space-y-2">
                                    <p className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                                        <span>If video is not found or refused to connect, switch to <b>VidSrc Pro</b> or <b>VidSrc PM</b>.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                                        <span>Disable <b>Ad-Blockers</b> if you see a blank player or "Connection Refused".</span>
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                                        <span>Try switching from <b>SUB to DUB</b> (or vice versa) if one source fails.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                                        <span>If using <b>WatchAnimeWorld</b>, some old links may return 404—switch server.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Server & Meta Controls - JustAnime Style */}
                        <div className="mt-4 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                                {/* Type Selection (SUB/DUB) */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Source:</span>
                                    <div className="flex bg-[var(--bg-main)] p-1 rounded-md border border-[var(--border-color)]">
                                        <button
                                            onClick={() => setMode("sub")}
                                            className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all ${mode === 'sub' ? 'bg-white text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-white'}`}
                                        >
                                            SUB
                                        </button>
                                        <button
                                            onClick={() => setMode("dub")}
                                            className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all ${mode === 'dub' ? 'bg-white text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-white'}`}
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
                                        ? "bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]" 
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
                                        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] hover:bg-white/5 border border-[var(--border-color)] rounded-lg text-sm font-bold text-white transition-all min-w-[180px] justify-between group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Server className="w-4 h-4 text-orange-400" />
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
                                                className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-[60] overflow-hidden backdrop-blur-md"
                                            >
                                                <div className="p-3 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
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
                                                                    ? "bg-orange-500/10 text-white border border-orange-500/30 shadow-lg"
                                                                    : "hover:bg-white/5 text-[var(--text-muted)] hover:text-white border border-transparent"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                                    server.isMovieServer ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-500/10 text-orange-400'
                                                                }`}>
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
                                                                <Check className="w-4 h-4 text-orange-400" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Auto Toggles Removed — Now Permanent */}
                            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[var(--text-muted)]">
                                <div className="flex items-center gap-2 text-orange-400">
                                    <Sparkles className="w-4 h-4" />
                                    Premium Auto-Features Active
                                </div>
                                <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-white border border-white/5 disabled:opacity-50">
                                   <Share2 className="w-4 h-4" /> Share
                                </button>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="mt-6 flex flex-col gap-2 relative">
                            <div className="flex items-start justify-between gap-4">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex-1 font-sora">{show.name}</h1>
                                
                                <button
                                    onClick={toggleBookmark}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shrink-0 ${
                                        isBookmarked 
                                            ? "bg-orange-500/10 text-orange-400 border-orange-500/40 hover:bg-orange-500/20" 
                                            : "bg-white/5 text-[var(--text-muted)] border-[var(--border-color)] hover:text-white hover:bg-white/10"
                                    }`}
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
                            <p className="text-sm text-[var(--text-muted)]">
                                Watching Episode {currentEp} in {mode.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    {/* Sidebar - Fixed Height Vertical Episode List */}
                    <div className="w-full xl:w-[350px] flex-shrink-0">
                        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] flex flex-col h-[500px] xl:h-[calc(100vh-120px)] xl:sticky xl:top-[90px]">
                            {/* Sticky Header with Search */}
                            <div className="p-4 border-b border-[var(--border-color)] relative bg-[var(--bg-card)] z-10 rounded-t-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-white text-lg font-sora">Episodes</h3>
                                </div>
                                <div className="relative">
                                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input 
                                        type="number"
                                        placeholder="Search episode..."
                                        value={epFilter}
                                        className="w-full bg-[var(--bg-main)] pl-9 pr-3 py-2 rounded-md border border-[var(--border-color)] outline-none focus:border-orange-500/40 transition-colors text-sm text-white placeholder-[var(--text-muted)] font-inter"
                                        onChange={(e) => setEpFilter(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col gap-1">
                                {(() => {
                                    const filteredEpisodes = epFilter
                                        ? episodes.filter(ep => String(ep).includes(epFilter))
                                        : episodes;
                                    return filteredEpisodes.map((ep) => (
                                        <EpisodeButton
                                            key={ep}
                                            ep={ep}
                                            currentEp={currentEp}
                                            onClick={() => setCurrentEp(ep)}
                                        />
                                    ));
                                })()
                                }
                            </div>
                        </div>
                    </div>

                </div> {/* End flex-row */}

                {/* Smart Recommendations - Full Width Below Player+Sidebar */}
                <div className="mt-6 w-full">
                    <SimilarAnime currentShowId={show._id} showName={show.name || 'this'} />
                </div>

            </div>
        </main>
        <Script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" strategy="afterInteractive" />
        </>
    );
}
