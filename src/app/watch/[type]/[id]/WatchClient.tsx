"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import Script from "next/script";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Star, Clock, Calendar, Globe, Users, ChevronDown, ChevronUp, X, Shield, Server, Sparkles, Share2, Heart, Zap, Loader2, Check, Download, ExternalLink } from "lucide-react";
import { MovieRow, type MovieItem } from "@/components/MovieCard";
import toast from "react-hot-toast";
import { useAdBlock } from "@/context/AdBlockContext";
import { useWatch } from "@/context/WatchContext";

const IMG_BASE = "https://image.tmdb.org/t/p";

const SERVERS = [
    {
        id: 'toon_ultimate',
        name: 'Toon Player Ultimate',
        badge: 'Ultimate',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidsrc.pro/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=1` : `https://vidsrc.pro/embed/movie/${id}?autoplay=1`,
    },
    {
        id: 'vidfast',
        name: 'Toon Player Auto',
        badge: 'Fast',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://vidfast.pro/tv/${id}/${s || 1}/${e || 1}?autoPlay=true&theme=3b82f6` : `https://vidfast.pro/movie/${id}?autoPlay=true&theme=3b82f6`,
    },
    {
        id: 'nortan',
        name: 'Toon Player Classic',
        badge: 'Classic',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://www.nontongo.win/embed/tv/${id}/${s || 1}/${e || 1}` : `https://www.nontongo.win/embed/movie/${id}`,
    },
    {
        id: 'peachify',
        name: 'Toon Player VIP',
        badge: 'Multi-Audio',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://peachify.top/?type=tv&id=${id}&s=${s || 1}&e=${e || 1}&autoplay=1` : `https://peachify.top/?type=movie&id=${id}&autoplay=1`,
    },
    {
        id: 'multiembed',
        name: 'Toon Player Backup',
        badge: 'Backup',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv' ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s || 1}&e=${e || 1}` : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
    }
];

const ANIME_SERVERS = [
    {
        id: "toon4k_anime",
        name: "Toon4K Anime",
        badge: "Premium 4K",
        getUrl: (id: string, ep: number) => `https://vidlink.pro/embed/anime/${id}/${ep}?primaryColor=3b82f6`
    },
    {
        id: "vidsrc_anime",
        name: "VidSrc Anime",
        badge: "Anime",
        getUrl: (id: string, ep: number) => `https://vidsrc.to/embed/anime/${id}/${ep}`
    },
    {
        id: "vidsrc_me_anime",
        name: "VidSrc Me",
        badge: "Backup",
        getUrl: (id: string, ep: number) => `https://vidsrc.me/embed/anime?anilist=${id}&episode=${ep}`
    }
];

interface MovieDetails {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string;
    vote_average: number;
    vote_count: number;
    release_date?: string;
    first_air_date?: string;
    runtime?: number;
    number_of_seasons?: number;
    number_of_episodes?: number;
    genres: { id: number; name: string }[];
    spoken_languages?: { english_name: string; iso_639_1: string }[];
    production_companies?: { id: number; name: string; logo_path: string | null }[];
    tagline?: string;
    status?: string;
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
    crew: { id: number; name: string; job: string }[];
    trailer: { key: string; name: string; site: string } | null;
    similar: MovieItem[];
    recommendations: MovieItem[];
    seasons?: {
        air_date: string;
        episode_count: number;
        id: number;
        name: string;
        overview: string;
        poster_path: string;
        season_number: number;
    }[];
}

interface EpisodeInfo {
    id: number;
    name: string;
    overview: string;
    episode_number: number;
    still_path: string | null;
    air_date: string;
    runtime: number;
}

interface ShowData {
    _id: string;
    name: string;
    thumbnail?: string;
    provider?: string;
    aniListId: string;
    availableEpisodesDetail: {
        sub: string[];
        dub: string[];
        raw: string[];
    };
}

export default function WatchClient({ type: initialType, id: encodedRawId }: { type: string; id: string }) {
    const [type, setType] = useState(initialType);
    const { isAdBlockEnabled } = useAdBlock();
    const rawId = decodeURIComponent(encodedRawId || '');
    // Strip any prefix like 'tmdb:' from the ID so embed servers and API get a clean numeric ID
    const id = rawId.includes(':') ? rawId.split(':').pop()! : rawId;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { history, addToHistory, getHistoryItem, watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [activeServer, setActiveServer] = useState<any>(SERVERS[0]); // Start with first server immediately
    const [loading, setLoading] = useState(true);
    const [showTrailer, setShowTrailer] = useState(false);
    const [showServers, setShowServers] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);

    const isAnimeServer = activeServer ? ANIME_SERVERS.some(s => s.id === activeServer.id) : false;


    // Cast & Auto-Next state
    const [rawVideoSource, setRawVideoSource] = useState<string | null>(null);
    const [castAvailable, setCastAvailable] = useState(false);

    // Netflix-style Auto Next States
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
    
    // User Settings Support
    const [smartSwitchEnabled, setSmartSwitchEnabled] = useState(true);
    const [failedServers, setFailedServers] = useState<Set<string>>(new Set());
    const [serversList, setServersList] = useState<any[]>(SERVERS);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [playerLoaded, setPlayerLoaded] = useState(false);
    const [sourceError, setSourceError] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("Initializing Stream");
    const [healthScores, setHealthScores] = useState<Record<string, number>>({});
    
    // Watchlist
    const inWatchlist = isInWatchlist(id);


    // TV Auto-Next logic
    const handleVideoEnded = () => {
        if (type !== 'tv' || episodes.length === 0) return;
        
        const currentIndex = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
        
        if (currentIndex !== -1 && currentIndex + 1 < episodes.length) {
            if (showNextOverlay) return;
            
            setShowNextOverlay(true);
            setNextCountdown(5);
            
            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
            
            nextIntervalRef.current = setInterval(() => {
                setNextCountdown(prev => {
                    if (prev <= 1) {
                        if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                        setShowNextOverlay(false);
                        
                        const nextEp = episodes[currentIndex + 1].episode_number;
                        setSelectedEpisode(nextEp);
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
        if (!castAvailable || !rawVideoSource) return;
        const castContext = (window as any).cast.framework.CastContext.getInstance();
        
        const handleSessionStateChanged = (event: any) => {
            if (event.sessionState === (window as any).cast.framework.SessionState.SESSION_STARTED) {
                const castSession = castContext.getCurrentSession();
                const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(rawVideoSource, rawVideoSource.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4');
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
    }, [castAvailable, rawVideoSource]);

    const toggleWatchlist = () => {
        if (inWatchlist) {
            removeFromWatchlist(id);
        } else {
            addToWatchlist({
                id,
                showId: id,
                type: type as any,
                title: details?.name || details?.title || "Unknown",
                poster: details?.poster_path ? `https://image.tmdb.org/t/p/w200${details?.poster_path}` : ""
            });
        }
    };

    const handleShare = async () => {
        const title = details?.name || details?.title || "ToonPlayer";
        try {
            if (navigator.share) {
                await navigator.share({
                    title,
                    text: `Watch ${title} for free on ToonPlayer!`,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    };
    // Auto Server Selection State


    // Unified State
    const [animeData, setAnimeData] = useState<ShowData | null>(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [mode, setMode] = useState<"sub" | "dub">("sub");
    const [tmdbIdForAnime, setTmdbIdForAnime] = useState<string | null>(null);

    // Read query parameters or history on load
    useEffect(() => {
        const s = searchParams?.get("season") || searchParams?.get("s");
        const e = searchParams?.get("episode") || searchParams?.get("e") || searchParams?.get("ep");
        
        if (s || e) {
            if (s) setSelectedSeason(parseInt(s) || 1);
            if (e) setSelectedEpisode(parseInt(e) || 1);
        } else if (type === 'tv' && (id || tmdbIdForAnime)) {
            const finalId = (type === 'anime' || type === 'cartoon') ? (animeData?._id || id) : id;
            if (finalId) {
                // Find most recently watched episode of this TV show from history
                const historyItem = history.find((i: any) => i.showId === finalId);
                if (historyItem) {
                    if (historyItem.season) setSelectedSeason(historyItem.season);
                    if (historyItem.episodeNumber || historyItem.episodeId) {
                        setSelectedEpisode(Number(historyItem.episodeNumber || historyItem.episodeId) || 1);
                    }
                }
            }
        }
    }, [searchParams, id, type, animeData, tmdbIdForAnime, history]);




    // Scroll-to-top visibility
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Refresh iframe when server or episode changes
    useEffect(() => {
        setPlayerLoaded(false);
        setSourceError(false);
        setIframeKey(prev => prev + 1);
        
        // Ensure auto-play / next-episode / timeupdate handling
        const handleMessage = (e: MessageEvent) => {
            const isEndEvent = e.data && (
                e.data.type === "videoEnd" || 
                e.data.event === "ended" || 
                e.data === "video_ended" ||
                e.data.type === "player_ended"
            );

            if (isEndEvent && (type === 'tv' || type === 'anime')) {
                // Trigger Netflix-style countdown overlay instead of direct jump
                if (showNextOverlay) return; // Already counting down
                
                setShowNextOverlay(true);
                setNextCountdown(5);
                
                if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                
                nextIntervalRef.current = setInterval(() => {
                    setNextCountdown(prev => {
                        if (prev <= 1) {
                            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                            setShowNextOverlay(false);
                            
                            // Load next episode
                            let nextEp = selectedEpisode + 1;
                            let nextSeason = selectedSeason;
                            const seasons = details?.seasons;
                            const currentSeasonData = seasons?.find(s => s.season_number === selectedSeason);
                            
                            if (currentSeasonData && nextEp > currentSeasonData.episode_count) {
                                nextSeason += 1;
                                nextEp = 1;
                            }
                            
                            const newUrl = new URL(window.location.href);
                            newUrl.searchParams.set("s", nextSeason.toString());
                            newUrl.searchParams.set("e", nextEp.toString());
                            router.push(newUrl.pathname + newUrl.search);
                            
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }

            // Time update parsing for progress saving
            const isTimeUpdate = e.data && (
                e.data.type === "timeupdate" || 
                e.data.event === "timeupdate" ||
                e.data.name === "timeupdate" ||
                e.data.event === "time_update"
            );
            if (isTimeUpdate) {
                const currentTime = e.data.currentTime || e.data.data?.currentTime || e.data.data?.time || 0;
                const duration = e.data.duration || e.data.data?.duration || 0;
                if (currentTime > 0 && duration > 0) {
                    try {
                        const finalId = (type === 'anime' || type === 'cartoon') ? (animeData?._id || id) : id;
                        addToHistory({
                            id: `${finalId}-${selectedSeason}-${selectedEpisode}`,
                            showId: finalId,
                            type: type as any,
                            title: details?.title || details?.name || animeData?.name || "Untitled",
                            poster: details?.poster_path ? `https://image.tmdb.org/t/p/w200${details?.poster_path}` : (animeData?.thumbnail || ""),
                            episodeId: String(selectedEpisode),
                            episodeNumber: selectedEpisode,
                            currentTime: Math.floor(currentTime),
                            duration: Math.floor(duration),
                            season: selectedSeason,
                        } as any);
                    } catch (err) {
                        console.warn("Failed to save progress update:", err);
                    }
                }
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [activeServer, selectedSeason, selectedEpisode, type, details?.seasons, router]);

    const isFirstLoadRef = useRef(true);
    // Load App Settings & Fetch DB Servers
    useEffect(() => {
        const loadServersAndSettings = async () => {
            try {
                let parsed = { smartSwitch: true, multiAudio: true };
                const s = localStorage.getItem("toonplayer_settings");
                if (s) {
                    parsed = JSON.parse(s);
                }
                
                if (parsed.smartSwitch !== undefined) setSmartSwitchEnabled(parsed.smartSwitch);
                else setSmartSwitchEnabled(true);
                
                // Fetch dynamic servers from MongoDB
                let fetchedServers = [];
                try {
                    const reqType = type === 'anime' ? 'anime' : 'movie';
                    const res = await axios.get(`/api/servers?type=${reqType}`);
                    if (res.data && res.data.servers && res.data.servers.length > 0) {
                        fetchedServers = res.data.servers.map((srv: any) => ({
                            id: srv.serverId,
                            name: srv.name,
                            badge: srv.badge,
                            getUrl: (_type: string, _id: string, s?: number, e?: number) => {
                                return srv.urlTemplate
                                    .replace('{id}', _id)
                                    .replace('{s}', String(s || 1))
                                    .replace('{e}', String(e || 1));
                            }
                        }));
                    }
                } catch (err) {
                    console.error('Failed to fetch servers, using fallback', err);
                }

                // Use DB servers or fallback to hardcoded
                const baseServers = fetchedServers.length > 0 ? fetchedServers : (type === 'anime' ? ANIME_SERVERS : SERVERS);

                // Re-sort servers if MultiAudio prioritize is on
                if (parsed.multiAudio === true || parsed.multiAudio === undefined) {
                    const sortedServers = [...baseServers].sort((a, b) => {
                        if (a.id === "peachify") return -1;
                        if (b.id === "peachify") return 1;
                        if (a.id === "vidlink") return -1; // Vidlink is best fallback
                        return 0;
                    });
                    setServersList(sortedServers);
                    
                    if (isFirstLoadRef.current) {
                        setActiveServer(sortedServers[0]);
                        isFirstLoadRef.current = false;
                    }
                } else {
                    setServersList([...baseServers]);
                    if (isFirstLoadRef.current) {
                        setActiveServer(baseServers[0]);
                        isFirstLoadRef.current = false;
                    }
                }
            } catch (e) {
                console.error("Failed to initialize servers:", e);
            }
        };

        // Load initially
        loadServersAndSettings();

        // Listen for live updates from ProfileSettings modal
        const handleProfileUpdate = () => {
            isFirstLoadRef.current = false; // Never forcibly swap server on live toggles to prevent deep lag!
            loadServersAndSettings();
        };
        window.addEventListener("profileUpdated", handleProfileUpdate);
        return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
    }, [type]);

    // Automatic Provider Fallback Engine (Intelligent Rotation & Health Recovery)
    const handleAutoFallback = useCallback(() => {
        if (!activeServer) return;
        
        console.warn(`[ToonPlayer Fallback] Server ${activeServer.name} (${activeServer.id}) timed out or failed. Initiating rotation...`);
        
        setFailedServers(prev => {
            const next = new Set(prev);
            next.add(activeServer.id);
            
            // Find next server in the list that hasn't failed yet
            const listToUse = isAnimeServer ? ANIME_SERVERS : serversList;
            const nextServer = listToUse.find(s => !next.has(s.id) && s.id !== activeServer.id);

            if (nextServer) {
                setLoadingStatus(`Switching to backup server: ${nextServer.name}...`);
                toast.error(`Server ${activeServer.name} is unresponsive. Rotating to ${nextServer.name}...`, {
                    icon: "🔄",
                    style: {
                        background: "rgba(20, 20, 20, 0.95)",
                        color: "#fff",
                        border: "1px solid rgba(249, 115, 22, 0.3)",
                        fontSize: "12px",
                        fontWeight: "bold"
                    }
                });
                // Update active server state on the next tick to avoid state sync locks
                setTimeout(() => setActiveServer(nextServer), 50);
            } else {
                setSourceError(true);
                toast.error("All available streaming sources are currently unreachable. Please try the alternative mirrors below or download.", {
                    duration: 6000,
                    style: {
                        background: "rgba(20, 20, 20, 0.95)",
                        color: "#fff",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        fontSize: "12px",
                        fontWeight: "bold"
                    }
                });
            }
            return next;
        });
    }, [activeServer, serversList, isAnimeServer]);

    // Dynamic Server Health Pre-Checking & Auto-Selection
    useEffect(() => {
        if (!smartSwitchEnabled || !details) return;
        if (manualServerRef.current === activeServer?.id) return;

        const checkServersHealth = async () => {
            try {
                const listToUse = isAnimeServer ? ANIME_SERVERS : serversList;
                const topServers = listToUse.slice(0, 3);
                
                const urlsToCheck = topServers.map(server => {
                    const resolvedType = (details as any).resolvedType || (type === "cartoon" || type === "anime" ? "tv" : type);
                    const activeId = (type === "anime" || type === "cartoon") ? (tmdbIdForAnime || id) : id;
                    return isAnimeServer 
                        ? (server as any).getUrl(animeData?.aniListId || animeData?._id || id, selectedEpisode)
                        : (server as any).getUrl(resolvedType, activeId, selectedSeason, selectedEpisode);
                });

                const response = await axios.post('/api/health', { urls: urlsToCheck });
                const results = response.data?.results || [];

                const firstAliveIndex = results.findIndex((res: any) => res.alive);
                if (firstAliveIndex !== -1) {
                    const aliveServer = topServers[firstAliveIndex];
                    if (activeServer && aliveServer.id !== activeServer.id) {
                        console.log(`[ToonPlayer] Auto-selecting healthy server: ${aliveServer.name}`);
                        setActiveServer(aliveServer);
                    }
                }
            } catch (err) {
                console.error("[ToonPlayer] Server health check failed:", err);
            }
        };

        checkServersHealth();
    }, [smartSwitchEnabled, type, id, selectedSeason, selectedEpisode, details, serversList, isAnimeServer, animeData, tmdbIdForAnime, activeServer]);

    // Boot automatic health checker timeout (5 seconds client-side fallback)
    useEffect(() => {
        if (!activeServer || sourceError || playerLoaded || !smartSwitchEnabled) return;

        const timer = setTimeout(() => {
            handleAutoFallback();
        }, 8000);

        return () => clearTimeout(timer);
    }, [activeServer, playerLoaded, sourceError, handleAutoFallback, smartSwitchEnabled]);

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

    // Live Sync with server health engine
    useEffect(() => {
        const fetchHealthStats = async () => {
            try {
                const res = await fetch('/api/provider/health');
                if (!res.ok) return;
                const data = await res.json();
                if (data && data.providers) {
                    const scoresMap: Record<string, number> = {};
                    data.providers.forEach((p: any) => {
                        scoresMap[p.name.toLowerCase()] = p.score;
                    });
                    setHealthScores(scoresMap);

                    // Filter out servers with score < 70%
                    const filtered = SERVERS.filter(server => {
                        const score = getHealthScoreForServer(server.name, scoresMap);
                        return score >= 70;
                    });

                    if (filtered.length > 0) {
                        setServersList(filtered);
                        const activeStillExists = filtered.some(s => s.id === activeServer?.id);
                        if (!activeStillExists && !manualServerRef.current) {
                            setActiveServer(filtered[0]);
                        }
                    }
                }
            } catch (err) {
                console.warn("[Health Sync] Failed to load provider health stats:", err);
            }
        };
        fetchHealthStats();
    }, [activeServer]);

    // Manual Server Select
    const handleManualServerSelect = useCallback((server: any) => {
        setFailedServers(new Set());
        setSourceError(false);
        setPlayerLoaded(false);
        setLoadingStatus(`Connecting to ${server.name}...`);
        manualServerRef.current = server.id;
        setActiveServer(server);
    }, []);



    // Keyboard shortcuts: 1-9 to switch servers, Escape to close modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'Escape') {
                setShowTrailer(false);
                setShowServers(false);
                return;
            }

            const num = parseInt(e.key);
            if (num >= 1 && num <= SERVERS.length) {
                setActiveServer(SERVERS[num - 1]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (initialType === "anime" || initialType === "cartoon") {
                    // 1. Fetch Anime/Cartoon Episodes/Metadata
                    const animeRes = await axios.get(`/api/anime/episodes?id=${id}`);
                    const show = animeRes.data.show;
                    setAnimeData(show);

                    // 2. Optimized TMDB Metadata Resolution
                    // Try to find a TMDB match using multiple title variants if available
                    const searchQueries = [show.name, show.englishName, show.romajiName].filter(Boolean);
                    let tmdbMatch = null;
                    
                    for (const q of searchQueries) {
                        try {
                            const tmdbSearch = await axios.get(`/api/prime/search?q=${encodeURIComponent(q)}`);
                            if (tmdbSearch.data.results?.length > 0) {
                                tmdbMatch = tmdbSearch.data.results[0];
                                break;
                            }
                        } catch (e) {}
                    }

                    if (tmdbMatch) {
                        setTmdbIdForAnime(tmdbMatch.id.toString());
                        // Normalize media_type — TMDB multi-search can omit it
                        const mediaType = tmdbMatch.media_type === 'tv' ? 'tv' : 'movie';
                        const detailsRes = await axios.get(`/api/prime/details?id=${tmdbMatch.id}&type=${mediaType}`);
                        setDetails(detailsRes.data);
                        if (detailsRes.data.resolvedType) {
                            setType(detailsRes.data.resolvedType);
                        }
                    } else {
                        setSourceError(true);
                        // Minimal details if TMDB match fails
                        setDetails({
                            id: 0,
                            name: show.name,
                            poster_path: show.thumbnail,
                            backdrop_path: show.thumbnail,
                            overview: "Playing via Anime Servers",
                            vote_average: 0,
                            vote_count: 0,
                            genres: [],
                            cast: [],
                            crew: [],
                            similar: [],
                            recommendations: [],
                            trailer: null
                        });
                    }
                    
                    // Initial episode setup
                    const eps = Array.isArray(show.availableEpisodesDetail?.[mode]) ? show.availableEpisodesDetail[mode] : [];
                    setEpisodes(eps);
                    if (eps.length > 0) setSelectedEpisode(parseInt(eps[0]) || 1);

                } else {
                    // Guard against missing or invalid IDs
                    if (!id || id === 'undefined' || id === 'null') {
                        console.error("[WatchPage] Segments missing or invalid ID:", { id, type: initialType });
                        setSourceError(true);
                        setLoading(false);
                        return;
                    }
                    
                    let res = null;
                    for (let attempt = 0; attempt < 2; attempt++) {
                        try {
                            res = await axios.get(`/api/prime/details?id=${id}&type=${initialType}`);
                            if (res.data) break;
                        } catch (retryErr) {
                            if (attempt === 1) throw retryErr;
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                    if (res?.data) {
                        setDetails(res.data);
                        if (res.data.resolvedType) {
                            setType(res.data.resolvedType);
                        }
                        const resolvedType = res.data.resolvedType || initialType;
                        if ((resolvedType === "tv" || resolvedType === "cartoon" || resolvedType === "anime") && res.data.seasons?.length > 0) {
                            setSelectedSeason(res.data.seasons[0].season_number || 1);
                        }
                    } else {
                        throw new Error('No data returned from TMDB');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch page data:", err);
                // Try robust fallback via TMDB Details which auto-classifies media type
                try {
                    const fallbackRes = await axios.get(`/api/prime/details?id=${id}&type=${initialType === 'movie' ? 'movie' : 'tv'}`);
                    if (fallbackRes.data) {
                        setDetails(fallbackRes.data);
                        if (fallbackRes.data.resolvedType) {
                            setType(fallbackRes.data.resolvedType);
                        }
                        if (fallbackRes.data.seasons?.length > 0) {
                            setSelectedSeason(fallbackRes.data.seasons[0].season_number || 1);
                        }
                        return;
                    }
                } catch (fallbackErr) {
                    console.error("TMDB Fallback details failed as well:", fallbackErr);
                }

                // Set minimal fallback details so the player still works
                setDetails({
                    id: parseInt(id) || 0,
                    title: initialType === 'tv' ? 'TV Show' : initialType === 'anime' ? 'Anime' : initialType === 'cartoon' ? 'Cartoon' : 'Movie',
                    poster_path: null,
                    backdrop_path: null,
                    overview: 'Could not load metadata. The player is still available — try different servers if the content doesn\'t play.',
                    vote_average: 0,
                    vote_count: 0,
                    genres: [],
                    cast: [],
                    crew: [],
                    similar: [],
                    recommendations: [],
                    trailer: null,
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, initialType]);

    // Fetch episodes when season changes
    useEffect(() => {
        if (type !== 'tv' || !id || !details) return;

        const fetchEpisodes = async () => {
            setLoadingEpisodes(true);
            try {
                const res = await axios.get(`/api/prime/season?id=${id}&season=${selectedSeason}`);
                const eps = res.data.episodes || [];
                // Sort episodes by episode number ascending
                eps.sort((a: EpisodeInfo, b: EpisodeInfo) => a.episode_number - b.episode_number);
                setEpisodes(eps);
            } catch (err) {
                console.error("Failed to fetch episodes:", err);
            } finally {
                setLoadingEpisodes(false);
            }
        };
        fetchEpisodes();
    }, [type, id, selectedSeason, details]);

    // Update anime episodes when mode (sub/dub) changes
    useEffect(() => {
        if (type === "anime" && animeData) {
            const eps = animeData.availableEpisodesDetail?.[mode] || [];
            setEpisodes(eps);
            if (eps.length > 0) setSelectedEpisode(parseInt(eps[0]) || 1);
        }
    }, [type, animeData, mode]);

    // Refresh iframe when server or episode changes
    useEffect(() => {
        setIframeKey((prev) => prev + 1);
        setSourceError(false); // Reset error on change

        // Save to watch history (including season for TV resume)
        if (details && (id || tmdbIdForAnime)) {
            try {
                const finalId = (type === 'anime' || type === 'cartoon') ? (animeData?._id || id) : id;
                addToHistory({
                    id: `${finalId}-${selectedSeason}-${selectedEpisode}`,
                    showId: finalId,
                    type: type as any,
                    title: details?.title || details?.name || animeData?.name || "Untitled",
                    poster: details?.poster_path ? `https://image.tmdb.org/t/p/w200${details?.poster_path}` : (animeData?.thumbnail || ""),
                    episodeId: String(selectedEpisode),
                    episodeNumber: selectedEpisode,
                    currentTime: 0,
                    duration: 0,
                    season: selectedSeason,
                } as any);
            } catch (e) {
                console.error("Failed to save history:", e);
            }
        }
    }, [activeServer, selectedSeason, selectedEpisode, mode, details, animeData, tmdbIdForAnime]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)]">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[var(--text-muted)] text-sm animate-pulse">Loading content...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (!details) {
        // Show a minimal player page instead of "Content Not Found"
        const fallbackTitle = type === 'tv' ? 'TV Show' : type === 'anime' ? 'Anime' : type === 'cartoon' ? 'Cartoon' : 'Movie';
        const fallbackId = (type === "anime" || type === "cartoon") ? (tmdbIdForAnime || id) : id;
        const embedUrl = SERVERS[0].getUrl(
            (details && (details as any).resolvedType) ? (details as any).resolvedType : ((type === "anime" || type === "cartoon") ? "tv" : type), 
            fallbackId, 
            1, 
            1
        );
        return (
            <main className="bg-[var(--bg-main)] text-[var(--text-main)]">
                <div className="fixed top-0 left-0 md:left-[72px] right-0 z-50 h-[90px] md:h-[110px] lg:h-[140px] bg-[var(--bg-main)]/90 backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-center pt-[env(safe-area-inset-top)]">
                    <Link href="/" className="absolute top-[24px] left-[24px] z-50 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group shrink-0">
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div className="flex flex-col items-center text-center max-w-[60%] px-4">
                        <h1 className="font-bold text-[clamp(24px,4vw,64px)] lg:text-[clamp(32px,4vw,72px)] leading-[0.95] text-[var(--text-main)] truncate w-full">
                            {fallbackTitle}
                        </h1>
                    </div>
                </div>
                <div className="pt-[90px] md:pt-[110px] lg:pt-[140px]">
                    <div className="relative w-full bg-black">
                        <div className="w-full">
                            <div className="relative w-full aspect-video bg-[var(--bg-card)] rounded-b-xl overflow-hidden">
                                <iframe 
                                    src={embedUrl} 
                                    className="absolute inset-0 w-full h-full border-0" 
                                    allow="fullscreen; autoplay; encrypted-media; picture-in-picture" 
                                    referrerPolicy="origin" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="w-full px-4 py-8 text-center">
                        <p className="text-[var(--text-muted)]">Detailed metadata is unavailable. Try switching servers if the content doesn&apos;t play.</p>
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                            {SERVERS.slice(0, 6).map((server) => (
                                <a key={server.id} href={server.getUrl(type === "anime" ? "tv" : type, fallbackId, 1, 1)} target="_blank" rel="noopener" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-medium hover:bg-[var(--border-color)] transition-colors">{server.name}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    const title = details!.title || details!.name || animeData?.name || "Untitled";
    const year = (details?.release_date || details?.first_air_date || "").slice(0, 4);
    const matchPercent = Math.round((details?.vote_average || 0) * 10);
    const director = details?.crew?.find((c: any) => c.job === "Director");
    const isUpcoming = details?.release_date && new Date(details?.release_date || "") > new Date();

    // Unified URL logic: Use tmdbIdForAnime if we're on an anime page trying a movie server
    const activeId = (type === "anime" || type === "cartoon") ? (tmdbIdForAnime || id) : id;
    // isAnimeServer is declared at the top of the component
    
    // Auto-detect and resolve media classification
    let resolvedMediaType = type;
    if (details && (details as any).resolvedType) {
        resolvedMediaType = (details as any).resolvedType;
    } else if (type === "cartoon" || type === "anime") {
        resolvedMediaType = "tv"; // Fallback cartoon/anime to tv
    }

    const embedUrl = isAnimeServer 
        ? (activeServer as any).getUrl(animeData?.aniListId || animeData?._id || id, selectedEpisode)
        : activeServer.getUrl(resolvedMediaType, activeId, selectedSeason, selectedEpisode);

    return (
        <>
        <main className="bg-[var(--bg-main)] text-[var(--text-main)]">
            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 md:left-[72px] right-0 z-50 h-[90px] md:h-[110px] lg:h-[140px] bg-[var(--bg-main)]/90 backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-center pt-[env(safe-area-inset-top)]">
                <Link href="/" className="absolute top-[24px] left-[24px] z-50 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group shrink-0">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div className="flex flex-col items-center text-center max-w-[60%] px-4">
                    <h1 className="font-bold text-[clamp(24px,4vw,64px)] lg:text-[clamp(32px,4vw,72px)] leading-[0.95] text-[var(--text-main)] truncate w-full">
                        {type === 'cartoon' ? `Cartoon: ${title}` : title}
                    </h1>
                    {(type === 'tv' || type === 'anime' || type === 'cartoon') && (
                        <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1 font-medium tracking-wide uppercase">
                            Season {selectedSeason} • Episode {selectedEpisode}
                        </p>
                    )}
                </div>
            </div>

            <div className="pt-[90px] md:pt-[110px] lg:pt-[140px] w-full max-w-[1600px] mx-auto px-0 sm:px-4 md:px-6 lg:px-8 py-6">
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                    
                    {/* Left Pane (Main content: Player, Cast, Info, alt etc.) */}
                    <div className="flex-1 w-full min-w-0">
                {/* Video Player with Anti-Redirect Protection */}
                <div className="relative w-full bg-black touch-pan-y">
                    <div className="w-full touch-pan-y">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="relative w-full aspect-video bg-[#12131A] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/5 shadow-[#FF9D00]/5 touch-pan-y"
                            style={{ touchAction: 'pan-y !important' }}
                        >
                            {/* Loading skeleton */}
                            {!playerLoaded && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-card)]">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                                        <Play className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
                                    </div>
                                    <p className="mt-4 text-[var(--text-muted)] text-sm animate-pulse tracking-widest uppercase font-bold">{loadingStatus}</p>
                                    <p className="mt-1 text-zinc-600 text-xs font-medium uppercase tracking-tighter">Server: {activeServer.name}</p>
                                    {isUpcoming && <p className="mt-4 px-4 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">Upcoming Release</p>}
                                </div>
                            )}
                            {/* Upcoming Content Lock */}
                            {isUpcoming && playerLoaded && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-8 text-center backdrop-blur-md">
                                    <Calendar className="w-16 h-16 text-orange-500 mb-6" />
                                    <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Content Upcoming</h2>
                                    <p className="text-[var(--text-muted)] text-base max-w-md mb-8">
                                        This content has not been released yet (Expected: {details.release_date}).
                                        Trailers or promo clips may play if available, but the full movie will appear here after the release date.
                                    </p>
                                    <div className="flex gap-4">
                                        <Link 
                                            href="/" 
                                            className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-500 transition-all uppercase tracking-widest text-[10px]"
                                        >
                                            Explore Others
                                        </Link>
                                    </div>
                                </div>
                            )}
                            {/* Source Error Fallback */}
                            {sourceError && !isAnimeServer && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                        <X className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Server Not Responding</h3>
                                    <p className="text-[var(--text-muted)] text-sm mb-6 max-w-md">
                                        This content might not be available on {activeServer.name}.
                                    </p>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setIframeKey(prev => prev + 1)}
                                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-500 hover:to-orange-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                        >
                                            <Zap className="w-4 h-4" /> Try Refreshing
                                        </button>
                                        {type === 'anime' && (
                                            <button 
                                                onClick={() => setActiveServer(ANIME_SERVERS[0])}
                                                className="px-6 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] text-white rounded-xl font-bold transition-all flex items-center gap-2"
                                            >
                                        <Server className="w-4 h-4" /> Anime Server
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <iframe
                                key={iframeKey}
                                src={embedUrl}
                                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-700 ${playerLoaded ? 'opacity-100' : 'opacity-0'}`}
                                allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                                referrerPolicy="no-referrer"
                                onError={() => {
                                    handleAutoFallback();
                                }}
                                onLoad={() => setPlayerLoaded(true)}
                            />

                            {/* Netflix-style Auto Next Overlay */}
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
                                            <div className="relative w-24 h-24 mx-auto mb-6">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle
                                                        cx="48"
                                                        cy="48"
                                                        r="40"
                                                        stroke="rgba(255,255,255,0.1)"
                                                        strokeWidth="8"
                                                        fill="none"
                                                    />
                                                    <motion.circle
                                                        cx="48"
                                                        cy="48"
                                                        r="40"
                                                        stroke="#FF9D00"
                                                        strokeWidth="8"
                                                        fill="none"
                                                        strokeDasharray="251.2"
                                                        animate={{ strokeDashoffset: 251.2 - (251.2 * (5 - nextCountdown)) / 5 }}
                                                        transition={{ duration: 1, ease: "linear" }}
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-3xl font-black text-white">{nextCountdown}</span>
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Up Next</h3>
                                            <p className="text-[var(--text-muted)] text-sm font-bold mb-8">
                                                Episode {selectedEpisode + 1}
                                            </p>
                                            
                                            <div className="flex items-center gap-3 justify-center">
                                                <button 
                                                    onClick={() => {
                                                        if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                                                        setShowNextOverlay(false);
                                                    }}
                                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        // Direct jump
                                                        if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                                                        setNextCountdown(0);
                                                        // This will be caught by the next tick or I can manually trigger redirect here
                                                        setShowNextOverlay(false);
                                                        
                                                        const currentIndex = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
                                                        let nextEp = selectedEpisode + 1;
                                                        if (currentIndex !== -1 && currentIndex + 1 < episodes.length) {
                                                            nextEp = episodes[currentIndex + 1].episode_number;
                                                            setSelectedEpisode(nextEp);
                                                        }
                                                        let nextSeason = selectedSeason;
                                                        const seasons = details?.seasons;
                                                        const currentSeasonData = seasons?.find(s => s.season_number === selectedSeason);
                                                        if (currentSeasonData && nextEp > currentSeasonData.episode_count) {
                                                            nextSeason += 1;
                                                            nextEp = 1;
                                                        }
                                                        const newUrl = new URL(window.location.href);
                                                        newUrl.searchParams.set("s", nextSeason.toString());
                                                        newUrl.searchParams.set("e", nextEp.toString());
                                                        router.push(newUrl.pathname + newUrl.search);
                                                    }}
                                                    className="px-8 py-3 bg-white text-black hover:bg-white/90 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-2xl shadow-white/10"
                                                >
                                                    Play Now <Play className="w-4 h-4 fill-current" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>

                {/* Server disclaimer */}
                <div className="w-full bg-orange-500/10 border-b border-orange-500/20 px-4 md:px-6 py-2.5 backdrop-blur-md">
                    <p className="w-full text-xs font-semibold text-blue-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 shrink-0 text-yellow-400" />
                        <span>You are watching <span className="font-black text-white px-1">{title}</span>. If the current server doesn't work, please try other servers below.</span>
                    </p>
                </div>

                {/* Server Selector Bar */}
                <div className="w-full px-4 md:px-6 py-3 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5" /> Server:
                        </span>

                        {/* Server Buttons — wrapped rows on desktop/tablet (no horizontal scroll) */}
                        <div className="hidden md:flex flex-wrap items-center gap-2 max-h-[84px] md:overflow-hidden lg:max-h-none pr-4">
                            {(type === "anime" ? [...serversList, ...ANIME_SERVERS] : serversList).map((server) => (
                                <button
                                    key={server.id}
                                    onClick={() => handleManualServerSelect(server)}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${activeServer.id === server.id
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 font-bold"
                                        : failedServers.has(server.id)
                                            ? "bg-red-500/10 text-red-400 border border-red-500/20 line-through opacity-70"
                                            : "bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white"
                                        } ${server.id === "peachify" ? "border-amber-500/50 hover:border-amber-500" : ""}`}
                                >
                                    <div className="flex flex-col items-start gap-0.5">
                                        <div className="flex items-center gap-1.5">
                                            {activeServer.id === server.id ? (
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                            ) : (
                                                <Server className="w-3.5 h-3.5" />
                                            )}
                                            {server.name}
                                        </div>
                                        {server.badge && (
                                            <span className={`text-[9px] px-1.5 py-[1px] rounded uppercase font-black tracking-widest ${server.id === "peachify" ? "text-amber-400 bg-amber-400/10"
                                                : "text-orange-400 bg-orange-400/10"
                                                }`}>
                                                {server.badge}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Mobile dropdown */}
                        <div className="relative md:hidden w-full max-w-[280px] z-50">
                            <button
                                onClick={() => setShowServers(!showServers)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-[#12131A]/95 backdrop-blur-md border border-white/10 rounded-xl text-xs font-black text-white hover:border-[#FF9D00]/50 transition-all shadow-lg"
                                aria-label="Select streaming server"
                            >
                                <div className="flex items-center gap-2">
                                    <Server className="w-3.5 h-3.5 text-[#FF9D00]" />
                                    <span className="truncate">{activeServer.name}</span>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${showServers ? "rotate-180 text-white" : ""}`} />
                            </button>
                            
                            <AnimatePresence>
                                {showServers && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        className="absolute left-0 right-0 mt-2 bg-[#12131A] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-[220px] overflow-y-auto divide-y divide-white/5"
                                    >
                                        {(type === "anime" ? [...serversList, ...ANIME_SERVERS] : serversList).map((server) => (
                                            <button
                                                key={server.id}
                                                onClick={() => { handleManualServerSelect(server); setShowServers(false); }}
                                                className={`w-full px-4 py-3 text-xs text-left hover:bg-white/5 transition-colors flex items-center justify-between ${
                                                    activeServer.id === server.id ? "text-[#FF9D00] bg-orange-500/5 font-black" : "text-zinc-300 font-medium"
                                                }`}
                                            >
                                                <span className="truncate flex items-center gap-2">
                                                    {activeServer.id === server.id && <Play className="w-3 h-3 fill-current text-[#FF9D00]" />}
                                                    {server.name}
                                                </span>
                                                {server.badge && (
                                                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 uppercase">
                                                        {server.badge}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            {/* Next Episode Button */}
                            {type === 'tv' && episodes && episodes.length > 0 && (
                                <button
                                    onClick={() => {
                                        const currentIndex = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
                                        if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
                                            router.push(`/watch/${type}/${id}?season=${selectedSeason}&ep=${episodes[currentIndex + 1].episode_number}`);
                                        } else if (details?.seasons && details.seasons.length > 0) {
                                            const currentSeasonIndex = details?.seasons?.findIndex((s: any) => s.season_number === selectedSeason);
                                            if (currentSeasonIndex !== undefined && currentSeasonIndex !== -1 && currentSeasonIndex < (details?.seasons?.length || 0) - 1) {
                                                router.push(`/watch/${type}/${id}?season=${details.seasons![currentSeasonIndex + 1].season_number}&ep=1`);
                                            }
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-500 hover:to-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                                >
                                    Next Episode <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                            )}

                            {/* Trailer button */}
                            {details.trailer && (
                                <button
                                    onClick={() => setShowTrailer(!showTrailer)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Trailer
                                </button>
                            )}

                            {/* Multi-Audio Quick Select */}
                            <button
                                onClick={() => {
                                    const peachify = SERVERS.find(s => s.id === "peachify");
                                    if (peachify) {
                                        setActiveServer(peachify);
                                        toast.success("Switched to Multi-Audio Server", { icon: "🎧" });
                                    } else {
                                        toast.error("Multi-Audio not available for this title");
                                    }
                                }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border transition-all ${
                                    activeServer.id === "peachify" 
                                    ? "bg-amber-600/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${activeServer.id === "peachify" ? "animate-pulse" : ""}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Multi-Audio</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Trailer Modal */}
                <AnimatePresence>
                    {showTrailer && details.trailer && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={() => setShowTrailer(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <iframe
                                    src={`https://www.youtube.com/embed/${details.trailer.key}?autoplay=1`}
                                    className="w-full h-full border-0"
                                    allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                                />
                            </motion.div>
                            <button
                                onClick={() => setShowTrailer(false)}
                                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Movie Details — CineVibe glassmorphism style */}
                <div className="w-full px-4 md:px-6 py-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Poster — visible on all devices */}
                        <div className="flex-shrink-0 w-[120px] md:w-[220px]">
                            {details.poster_path && (
                                <div className="relative group">
                                    <img
                                        src={`${IMG_BASE}/w500${details.poster_path}`}
                                        alt={title}
                                        loading="lazy"
                                        className="w-full rounded-2xl shadow-2xl border border-[var(--border-color)] transition-transform group-hover:scale-[1.02]"
                                    />
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>

                        {/* Info Panel */}
                        <div className="flex-1 min-w-0">
                            {/* Title Section */}
                            <div className="mb-6">
                                <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 font-sora line-clamp-2">{title}</h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
                                    <span className="flex items-center gap-1.5 font-bold text-green-400">
                                        <Sparkles className="w-4 h-4" /> {matchPercent}% Match
                                    </span>
                                    <span>{year}</span>
                                    {details?.runtime ? (
                                        <span>{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
                                    ) : (
                                        <span>{type === "tv" ? `${details?.number_of_seasons || 0} Seasons` : type === "anime" ? "Anime" : ""}</span>
                                    )}
                                    <span className="px-2 py-0.5 rounded border border-[var(--border-color)] text-[10px] font-bold tracking-widest uppercase">
                                        {details?.status || "Released"}
                                    </span>
                                </div>
                            </div>

                            {/* Player Metadata & Controls */}
                            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 md:p-6 mb-8">
                                {type === "anime" && episodes.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <Play className="w-4 h-4 text-blue-500 fill-current" /> Episodes
                                            </h3>
                                            <div className="flex bg-[var(--bg-main)] p-1 rounded-lg border border-[var(--border-color)]">
                                                <button 
                                                    onClick={() => setMode("sub")}
                                                    className={`px-4 py-1 rounded-md text-xs font-bold transition-all ${mode === "sub" ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-white"}`}
                                                >SUB</button>
                                                <button 
                                                    onClick={() => setMode("dub")}
                                                    className={`px-4 py-1 rounded-md text-xs font-bold transition-all ${mode === "dub" ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-white"}`}
                                                >DUB</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[200px] overflow-y-auto scrollbar-none p-1">
                                            {episodes.map((epNum: string) => (
                                                <button
                                                    key={epNum}
                                                    onClick={() => setSelectedEpisode(parseInt(epNum))}
                                                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                                                        selectedEpisode === parseInt(epNum)
                                                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                                                            : "bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20 hover:text-white"
                                                    }`}
                                                >
                                                    {epNum}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-500/20">
                                            <Play className="w-6 h-6 text-blue-500 fill-current" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Now Playing</p>
                                            <p className="font-bold text-sm">
                                                {type === "anime" ? `Episode ${selectedEpisode}` : type === "tv" ? `Season ${selectedSeason}, Episode ${selectedEpisode}` : "Full Movie"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button 
                                            onClick={toggleWatchlist} 
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xl active:scale-95 ${inWatchlist ? "bg-orange-500 text-white shadow-orange-500/20 hover:scale-105" : "bg-white text-black shadow-white/5 hover:scale-105"}`}
                                        >
                                            <Heart className={`w-4 h-4 ${inWatchlist ? "fill-white" : ""}`} /> {inWatchlist ? "In Watchlist" : "Watchlist"}
                                        </button>
                                        <button
                                            onClick={() => setShowDownloadModal(true)}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                        >
                                            <Download className="w-4 h-4" /> Download
                                        </button>
                                        <button 
                                            onClick={handleShare} 
                                            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-white rounded-xl font-bold text-sm hover:bg-[var(--border-color)] transition-all active:scale-95"
                                        >
                                            <Share2 className="w-4 h-4" /> Share
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Genres */}
                            <div className="flex flex-wrap gap-2 mb-5">
                                {details.genres?.map((genre) => (
                                    <span key={genre.id} className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full text-xs font-medium text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors">
                                        {genre.name}
                                    </span>
                                ))}
                            </div>

                            {/* Overview */}
                            <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed mb-6 max-w-2xl">
                                {details.overview}
                            </p>

                            {/* Additional Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                {director && (
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-[var(--border-color)]">
                                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Director</span>
                                        <p className="text-white font-medium mt-0.5">{director.name}</p>
                                    </div>
                                )}
                                {details.spoken_languages && details.spoken_languages.length > 0 && (
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-[var(--border-color)]">
                                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> Language
                                        </span>
                                        <p className="text-white font-medium mt-0.5">{details?.spoken_languages?.[0]?.english_name || "English"}</p>
                                    </div>
                                )}
                                {details.status && (
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-[var(--border-color)]">
                                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Status</span>
                                        <p className="text-white font-medium mt-0.5">{details.status}</p>
                                    </div>
                                )}
                                {details.vote_count && (
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-[var(--border-color)]">
                                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Votes</span>
                                        <p className="text-white font-medium mt-0.5">{details?.vote_count?.toLocaleString() || "0"}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TV Show Seasons & Episodes (Bottom list for mobile/tablet screens) */}
                    {type === 'tv' && details.seasons && details.seasons.length > 0 && (
                        <section className="mt-10 xl:hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-6 bg-orange-500 rounded-full shadow-[0_0_10px_#f97316]" />
                                    <h2 className="text-xl font-bold">Episodes</h2>
                                    {episodes.length > 0 && (
                                        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-1 rounded-md">
                                            {episodes.length} EP{episodes.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Season Selector */}
                                <div className="relative">
                                    <select
                                        value={selectedSeason}
                                        onChange={(e) => {
                                            setSelectedSeason(Number(e.target.value));
                                            setSelectedEpisode(1);
                                        }}
                                        className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] font-medium py-2 pl-4 pr-10 rounded-xl outline-none focus:border-blue-500 transition-colors cursor-pointer text-sm"
                                    >
                                        {details.seasons
                                            .filter(s => s.season_number > 0)
                                            .sort((a, b) => a.season_number - b.season_number)
                                            .map((season) => (
                                                <option key={season.id} value={season.season_number}>
                                                    Season {season.season_number} ({season.episode_count} eps)
                                                </option>
                                            ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                </div>
                            </div>

                            {/* Episodes */}
                            {loadingEpisodes ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Mobile: Compact List View */}
                                    <div className="flex flex-col gap-2 sm:hidden">
                                        {episodes.map((ep) => (
                                            <button
                                                key={ep.id}
                                                onClick={() => {
                                                    setSelectedEpisode(ep.episode_number);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                    selectedEpisode === ep.episode_number
                                                        ? 'border-[#FF9D00] bg-[#FF9D00]/10 shadow-[0_0_12px_rgba(255,157,0,0.15)]'
                                                        : 'border-[var(--border-color)] bg-[#12131A] hover:border-[#FF9D00]/30'
                                                }`}
                                            >
                                                {/* Thumbnail */}
                                                <div className="w-24 h-14 rounded-lg overflow-hidden bg-[var(--bg-main)] flex-shrink-0 relative">
                                                    {ep.still_path ? (
                                                        <img
                                                            src={`${IMG_BASE}/w185${ep.still_path}`}
                                                            alt={ep.name}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">No Img</div>
                                                    )}
                                                    {selectedEpisode === ep.episode_number && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                            <Play className="w-5 h-5 text-white fill-current" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold line-clamp-1 ${
                                                        selectedEpisode === ep.episode_number ? 'text-[#FF9D00]' : 'text-white'
                                                    }`}>
                                                        E{ep.episode_number}. {ep.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {ep.air_date && <span className="text-[10px] text-[var(--text-muted)]">{ep.air_date}</span>}
                                                        {ep.runtime > 0 && <span className="text-[10px] text-[var(--text-muted)]">{ep.runtime}m</span>}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Desktop/Tablet: Card Grid View */}
                                    <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {episodes.map((ep) => (
                                            <button
                                                key={ep.id}
                                                onClick={() => {
                                                    setSelectedEpisode(ep.episode_number);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className={`text-left group relative overflow-hidden rounded-xl border transition-all duration-300 ${selectedEpisode === ep.episode_number
                                                    ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                                    : 'border-[var(--border-color)] hover:border-blue-500/50 hover:shadow-lg'
                                                    }`}
                                            >
                                                <div className="aspect-video bg-[var(--bg-card)] relative overflow-hidden">
                                                    {ep.still_path ? (
                                                        <img
                                                            src={`${IMG_BASE}/w300${ep.still_path}`}
                                                            alt={ep.name}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-black/20">
                                                            No Image
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

                                                    {/* Play Icon Overlay */}
                                                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${selectedEpisode === ep.episode_number ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                                            <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                                                        </div>
                                                    </div>

                                                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow">
                                                        E{ep.episode_number}
                                                    </div>
                                                    {ep.runtime > 0 && (
                                                        <div className="absolute bottom-2 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-[var(--text-muted)]">
                                                            {ep.runtime}m
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-3 bg-[var(--bg-main)]">
                                                    <h3 className={`font-semibold text-sm line-clamp-1 mb-1 ${selectedEpisode === ep.episode_number ? 'text-blue-400' : 'text-[var(--text-main)] group-hover:text-blue-400'} transition-colors`}>
                                                        {ep.episode_number}. {ep.name}
                                                    </h3>
                                                    <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                                                        {ep.overview || "No description available."}
                                                    </p>
                                                    {ep.air_date && (
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> {ep.air_date}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    )}

                    {/* Cast */}
                    {details.cast && details.cast.length > 0 && (
                        <section className="mt-10">
                            <div className="flex items-center gap-3 mb-5">
                                <Users className="w-5 h-5 text-blue-400" />
                                <h2 className="text-lg font-bold">Top Cast</h2>
                            </div>
                            <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
                                {details.cast.slice(0, 15).map((person) => (
                                    <div key={person.id} className="flex-shrink-0 w-[100px] text-center group">
                                        <div className="w-[80px] h-[80px] mx-auto mb-2 rounded-full overflow-hidden bg-[var(--bg-card)] border-2 border-transparent group-hover:border-blue-500/50 transition-all">
                                            {person.profile_path ? (
                                                <img
                                                    src={`${IMG_BASE}/w185${person.profile_path}`}
                                                    alt={person.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg font-bold bg-gradient-to-br from-zinc-800 to-zinc-900">
                                                    {person.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-[var(--text-main)] line-clamp-1">{person.name}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{person.character}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div> {/* End Left column */}

                {/* Download Modal */}
                <AnimatePresence>
                    {showDownloadModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col"
                            onClick={() => setShowDownloadModal(false)}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                        <Download className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-white">Download — {title}</h3>
                                        <p className="text-[11px] text-zinc-500">{type === 'tv' ? `Season ${selectedSeason}, Episode ${selectedEpisode}` : 'Full Movie'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={type === 'tv'
                                            ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}`
                                            : `https://dl.vidsrc.vip/movie/${id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                                    </a>
                                    <button onClick={() => setShowDownloadModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                        <X className="w-5 h-5 text-zinc-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Download Iframe */}
                            <div className="flex-1 relative" onClick={(e) => e.stopPropagation()}>
                                <iframe
                                    src={type === 'tv'
                                        ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}`
                                        : `https://dl.vidsrc.vip/movie/${id}`}
                                    className="w-full h-full border-0"
                                    allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                                    referrerPolicy="no-referrer"
                                />
                            </div>

                            {/* Alternative Sources Bar */}
                            <div className="shrink-0 p-3 border-t border-white/10 bg-black/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest shrink-0">Alt:</span>
                                    <a
                                        href={type === 'tv'
                                            ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}`
                                            : `https://dl.vidsrc.vip/movie/${id}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-bold shrink-0 hover:bg-emerald-600/30 transition-colors"
                                    >
                                        <Download className="w-3 h-3" /> VidSrc DL
                                    </a>
                                    <a
                                        href={type === 'tv'
                                            ? `https://vidfast.pro/tv/${id}/${selectedSeason}/${selectedEpisode}?autoPlay=true`
                                            : `https://vidfast.pro/movie/${id}?autoPlay=true`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-[11px] font-bold shrink-0 hover:bg-blue-600/30 transition-colors"
                                    >
                                        <Download className="w-3 h-3" /> VidFast Pro
                                    </a>
                                    <a
                                        href={type === 'tv'
                                            ? `https://embed.su/embed/tv/${id}/${selectedSeason}/${selectedEpisode}`
                                            : `https://embed.su/embed/movie/${id}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg text-[11px] font-bold shrink-0 hover:bg-orange-500/30 transition-colors"
                                    >
                                        <Download className="w-3 h-3" /> Embed.su
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div> {/* End Left column */}

                {/* Right Column: Episode List (TV Shows Only) */}
                {type === "tv" && details.seasons && details.seasons.length > 0 && (
                    <div className="hidden xl:block w-full xl:w-[380px] xl:shrink-0 xl:sticky xl:top-[80px] xl:max-h-[calc(100vh-120px)] xl:flex xl:flex-col xl:overflow-hidden pr-2 bg-[var(--bg-card)]/40 backdrop-blur-md rounded-2xl border border-[var(--border-color)] p-4 space-y-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-orange-500 rounded-full shadow-[0_0_10px_#a855f7]" />
                                    <h2 className="text-base font-bold text-white">Episodes</h2>
                                </div>
                                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-main)] px-2 py-0.5 rounded-md font-bold">
                                    {episodes.length} EP{episodes.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Season Selector */}
                            <div className="relative">
                                <select
                                    value={selectedSeason}
                                    onChange={(e) => {
                                        setSelectedSeason(Number(e.target.value));
                                        setSelectedEpisode(1);
                                    }}
                                    className="w-full appearance-none bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold py-2 pl-3 pr-10 rounded-xl outline-none focus:border-orange-500 transition-colors cursor-pointer text-xs"
                                >
                                    {details.seasons
                                        .filter(s => s.season_number > 0)
                                        .sort((a, b) => a.season_number - b.season_number)
                                        .map((season) => (
                                            <option key={season.id} value={season.season_number}>
                                                Season {season.season_number} ({season.episode_count} eps)
                                            </option>
                                        ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                            </div>
                        </div>

                        {/* Episode List Scroll Area */}
                        {loadingEpisodes ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {episodes.map((ep) => (
                                    <button
                                        key={ep.id}
                                        onClick={() => {
                                            setSelectedEpisode(ep.episode_number);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                                            selectedEpisode === ep.episode_number
                                                ? 'border-[#FF9D00] bg-[#FF9D00]/10 shadow-[0_0_12px_rgba(255,157,0,0.15)]'
                                                : 'border-[var(--border-color)] bg-[#08080B] hover:border-[#FF9D00]/30'
                                        }`}
                                    >
                                        {/* Compact Image */}
                                        <div className="w-20 h-12 rounded-lg overflow-hidden bg-[var(--bg-card)] flex-shrink-0 relative">
                                            {ep.still_path ? (
                                                <img
                                                    src={`${IMG_BASE}/w185${ep.still_path}`}
                                                    alt={ep.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[9px] text-[var(--text-muted)]">No Img</div>
                                            )}
                                            {selectedEpisode === ep.episode_number && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                    <Play className="w-4 h-4 text-white fill-current" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Detail */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold line-clamp-1 ${
                                                selectedEpisode === ep.episode_number ? 'text-[#FF9D00]' : 'text-white'
                                            }`}>
                                                E{ep.episode_number}. {ep.name}
                                            </p>
                                            <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block">{ep.runtime > 0 ? `${ep.runtime}m` : 'TV Show'}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div> {/* End xl:flex-row */}

            {/* Recommendations - Full Width Below Player+Sidebar */}
            {details.recommendations && details.recommendations.length > 0 && (
                <section className="mt-10 px-0 sm:px-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-6 bg-orange-500 rounded-full shadow-[0_0_10px_#f97316]" />
                        <h2 className="text-lg font-bold">You May Also Like</h2>
                    </div>
                    <MovieRow items={details.recommendations} type={type} />
                </section>
            )}

            {/* Similar - Full Width Below Player+Sidebar */}
            {details.similar && details.similar.length > 0 && (
                <section className="mt-6 mb-12 px-0 sm:px-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-6 bg-orange-500 rounded-full shadow-[0_0_10px_#a855f7]" />
                        <h2 className="text-lg font-bold">Similar</h2>
                    </div>
                    <MovieRow items={details.similar} type={type} />
                </section>
            )}

        </div> {/* End pt-14 wrapper */}


            {/* Scroll to Top */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-6 right-6 z-40 p-3 bg-orange-500/90 hover:bg-orange-600 text-white rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)] backdrop-blur-sm transition-colors"
                    >
                        <ChevronUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>
        </main>
        <Script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" strategy="afterInteractive" />
        </>
    );
}
