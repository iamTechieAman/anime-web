"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import Script from "next/script";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Star, Clock, Calendar, Globe, Users, ChevronDown, ChevronUp, X, Shield, Server, Sparkles, Share2, Heart, Zap, Loader2, Check, Download, ExternalLink, ChevronRight, ChevronLeft, RefreshCw, LayoutGrid, List, Search } from "lucide-react";
import { MovieRow, type MovieItem } from "@/components/MovieCard";
import toast from "react-hot-toast";
import { useAdBlock } from "@/context/AdBlockContext";
import { useWatch } from "@/context/WatchContext";
import CommentsSection from "@/components/CommentsSection";

const IMG_BASE = "https://image.tmdb.org/t/p";

const SERVERS = [
    {
        id: 'toon4k',
        name: 'Toon4K',
        badge: 'Premium 4K',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidlink.pro/tv/${id}/${s || 1}/${e || 1}?primaryColor=7C3AED&title=false&autoplay=true`
                : `https://vidlink.pro/movie/${id}?primaryColor=7C3AED&title=false&autoplay=true`,
    },
    {
        id: 'vidsrcto',
        name: 'Toon Player Pro',
        badge: 'Pro',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidsrc.to/embed/tv/${id}/${s || 1}/${e || 1}`
                : `https://vidsrc.to/embed/movie/${id}`,
    },
    {
        id: 'toon_ultimate',
        name: 'Toon Ultimate',
        badge: 'Ultimate',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidsrc.pro/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=1`
                : `https://vidsrc.pro/embed/movie/${id}?autoplay=1`,
    },
    {
        id: 'autoembed',
        name: 'Toon Stream',
        badge: 'Stream',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://autoembed.co/tv/tmdb/${id}/${s || 1}/${e || 1}`
                : `https://autoembed.co/movie/tmdb/${id}`,
    },
    {
        id: 'cinevo',
        name: 'Cinevo HD',
        badge: 'HD',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://cineby.pro/tv/${id}/${s || 1}/${e || 1}?autoplay=true`
                : `https://cineby.pro/movie/${id}?autoplay=true`,
    },
    {
        id: 'vidfast',
        name: 'Toon Fast',
        badge: 'Fast',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidfast.pro/tv/${id}/${s || 1}/${e || 1}?autoPlay=true&theme=7C3AED`
                : `https://vidfast.pro/movie/${id}?autoPlay=true&theme=7C3AED`,
    },
    {
        id: 'peachify',
        name: 'Toon VIP',
        badge: 'Multi-Audio',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://peachify.top/?type=tv&id=${id}&s=${s || 1}&e=${e || 1}&autoplay=1`
                : `https://peachify.top/?type=movie&id=${id}&autoplay=1`,
    },
    {
        id: 'multiembed',
        name: 'Toon Backup',
        badge: 'Backup',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s || 1}&e=${e || 1}`
                : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    },
    {
        id: 'vidsrcme',
        name: 'Toon Mirror',
        badge: 'Mirror',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s || 1}&episode=${e || 1}`
                : `https://vidsrc.me/embed/movie?tmdb=${id}`,
    },
];

const ANIME_SERVERS = [
    {
        id: "toon4k_anime",
        name: "Toon4K",
        badge: "4K",
        getUrl: (id: string, ep: number) =>
            `https://vidlink.pro/tv/${id}/1/${ep}?primaryColor=3b82f6&title=false&autoplay=true`
    },
    {
        id: "vidsrc_anime",
        name: "VidSrc",
        badge: "Sub",
        getUrl: (id: string, ep: number) =>
            `https://vidsrc.to/embed/anime/${id}/${ep}`
    },
    {
        id: "vidsrc_pro_anime",
        name: "VidSrc Pro",
        badge: "HD",
        getUrl: (id: string, ep: number) =>
            `https://vidsrc.pro/embed/anime/${id}/1/${ep}?autoplay=1`
    },
    {
        id: "vidsrc_me_anime",
        name: "VidSrc Alt",
        badge: "Dub",
        getUrl: (id: string, ep: number) =>
            `https://vidsrc.me/embed/anime?anilist=${id}&episode=${ep}`
    },
];



const getProxiedEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith('/') || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
        return rawUrl;
    }
    try {
        const parsed = new URL(rawUrl);
        const host = parsed.hostname;

        // ONLY proxy true anime CDN servers that require server-side HTML rewriting to resolve
        // CORS blocks on their sub-resources. These cannot be loaded as plain iframes.
        //
        // DO NOT proxy commercial embed providers (vidsrc, peachify, nontongo, autoembed, cineby,
        // vidfast, multiembed, vidlink) — they use Cloudflare bot protection that blocks
        // server-side fetches with 403/500, and they load perfectly as direct browser iframes.
        const needsProxy =
            host.includes('megacloud') ||
            host.includes('rapid-cloud') ||
            host.includes('rabbitstream') ||
            host.includes('gogocdn') ||
            host.includes('playtaku') ||
            host.includes('vidstreaming') ||
            host.includes('allanime') ||
            host.includes('anime-taku') ||
            host.includes('filemoon') ||
            host.includes('embed.su');

        if (needsProxy) {
            return `/api/proxy/embed?url=${encodeURIComponent(rawUrl)}&referer=${encodeURIComponent(parsed.origin)}`;
        }
    } catch (_) {}
    // All other embeds load directly in the iframe — browser handles them natively
    return rawUrl;
};



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

    const isAnimeServer = type === 'anime' || (activeServer ? (activeServer.type === 'anime' || ANIME_SERVERS.some(s => s.id === activeServer.id)) : false);


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
    const currentMediaTypeServers = typeof type === "string"
        ? serversList.filter(s => {
            if (!s.type) return true;
            const targetType = (type === "cartoon") ? "tv" : type;
            return s.type === targetType;
        })
        : serversList;
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
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isTheatreMode, setIsTheatreMode] = useState(false);
    const [episodeSearch, setEpisodeSearch] = useState("");
    const [episodeLayoutMode, setEpisodeLayoutMode] = useState<"list" | "grid">("list");

    const hasNextEpisode = () => {
        if (type === 'movie') return false;
        if (type === 'anime') {
            const currentIdx = episodes.indexOf(String(selectedEpisode));
            return currentIdx !== -1 && currentIdx + 1 < episodes.length;
        }
        const currentIdx = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
        if (currentIdx !== -1 && currentIdx + 1 < episodes.length) return true;
        const currentSeasonData = details?.seasons?.find(s => s.season_number === selectedSeason);
        const nextSeasonData = details?.seasons?.find(s => s.season_number === selectedSeason + 1);
        if (currentSeasonData && selectedEpisode >= currentSeasonData.episode_count && nextSeasonData) return true;
        return false;
    };

    const hasPrevEpisode = () => {
        if (type === 'movie') return false;
        if (type === 'anime') {
            const currentIdx = episodes.indexOf(String(selectedEpisode));
            return currentIdx > 0;
        }
        const currentIdx = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
        if (currentIdx > 0) return true;
        if (selectedSeason > 1) {
            const prevSeasonData = details?.seasons?.find(s => s.season_number === selectedSeason - 1);
            if (prevSeasonData) return true;
        }
        return false;
    };

    const handleNextEpisode = () => {
        if (type === 'anime') {
            const currentIdx = episodes.indexOf(String(selectedEpisode));
            if (currentIdx !== -1 && currentIdx + 1 < episodes.length) {
                const nextEp = episodes[currentIdx + 1];
                setSelectedEpisode(parseInt(nextEp) || (selectedEpisode + 1));
            }
            return;
        }
        const currentIdx = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
        let nextEp = selectedEpisode + 1;
        let nextSeason = selectedSeason;
        if (currentIdx !== -1 && currentIdx + 1 < episodes.length) {
            nextEp = episodes[currentIdx + 1].episode_number;
        } else {
            const currentSeasonData = details?.seasons?.find(s => s.season_number === selectedSeason);
            if (currentSeasonData && selectedEpisode >= currentSeasonData.episode_count) {
                nextSeason += 1;
                nextEp = 1;
            }
        }
        setSelectedEpisode(nextEp);
        setSelectedSeason(nextSeason);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("s", nextSeason.toString());
        newUrl.searchParams.set("e", nextEp.toString());
        router.push(newUrl.pathname + newUrl.search);
    };

    const handlePrevEpisode = () => {
        if (type === 'anime') {
            const currentIdx = episodes.indexOf(String(selectedEpisode));
            if (currentIdx > 0) {
                const prevEp = episodes[currentIdx - 1];
                setSelectedEpisode(parseInt(prevEp) || (selectedEpisode - 1));
            }
            return;
        }
        const currentIdx = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
        let prevEp = selectedEpisode - 1;
        let prevSeason = selectedSeason;
        if (currentIdx > 0) {
            prevEp = episodes[currentIdx - 1].episode_number;
        } else if (selectedSeason > 1) {
            const prevSeasonData = details?.seasons?.find(s => s.season_number === selectedSeason - 1);
            if (prevSeasonData) {
                prevSeason -= 1;
                prevEp = prevSeasonData.episode_count || 1;
            }
        }
        setSelectedEpisode(prevEp);
        setSelectedSeason(prevSeason);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("s", prevSeason.toString());
        newUrl.searchParams.set("e", prevEp.toString());
        router.push(newUrl.pathname + newUrl.search);
    };

    // Read query parameters or history on load
    useEffect(() => {
        const s = searchParams?.get("season") || searchParams?.get("s");
        const e = searchParams?.get("episode") || searchParams?.get("e") || searchParams?.get("ep");
        
        if (s || e) {
            if (s) setSelectedSeason(parseInt(s) || 1);
            if (e) setSelectedEpisode(parseInt(e) || 1);
        } else if (type === 'tv' && id) {
            const finalId = id;
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

            if (isEndEvent && (type === 'tv' || type === 'anime') && resolvedMediaType !== 'movie') {
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
                            type: srv.type,
                            getUrl: (param1: string, param2: string, s?: number, e?: number) => {
                                if (srv.type === 'anime' || type === 'anime') {
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
                    console.error('Failed to fetch servers, using fallback', err);
                }

                // Combine DB servers and hardcoded fallbacks to ensure no servers are ever missing
                let baseServers = [];
                const hardcodedList = type === 'anime' ? ANIME_SERVERS : SERVERS;
                if (fetchedServers.length > 0) {
                    baseServers = [...fetchedServers];
                    hardcodedList.forEach((hc: any) => {
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
                } else {
                    baseServers = [...hardcodedList];
                }

                // Keep original order from SERVERS array (do not re-sort; priority is defined in SERVERS const)
                setServersList([...baseServers]);
                if (isFirstLoadRef.current) {
                    const targetType = (type === "cartoon") ? "tv" : type;
                    const filtered = baseServers.filter((s: any) => !s.type || s.type === targetType);
                    setActiveServer(filtered[0] || baseServers[0]);
                    isFirstLoadRef.current = false;
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

    // Switch active server if media type changes (e.g., UCR resolves movie -> tv)
    useEffect(() => {
        if (!activeServer || !activeServer.type) return;
        if (activeServer.type !== type) {
            // Find a server of the new type with the same name or similar serverId prefix
            const matchingServer = serversList.find(s => 
                s.type === type && 
                (s.name === activeServer.name || s.id.replace(/_movie|_tv|_anime/, '') === activeServer.id.replace(/_movie|_tv|_anime/, ''))
            );
            if (matchingServer) {
                console.log(`[ToonPlayer] Switching active server from ${activeServer.id} to ${matchingServer.id} due to media type resolution to ${type}`);
                setActiveServer(matchingServer);
            } else {
                // Fallback to first server of the new type
                const firstOfNewType = serversList.find(s => s.type === type);
                if (firstOfNewType) {
                    setActiveServer(firstOfNewType);
                }
            }
        }
    }, [type, serversList]);

    // Automatic Provider Fallback Engine (Intelligent Rotation & Health Recovery)
    const handleAutoFallback = useCallback(() => {
        if (!activeServer) return;
        
        console.warn(`[ToonPlayer Fallback] Server ${activeServer.name} (${activeServer.id}) timed out or failed. Initiating rotation...`);
        
        setFailedServers(prev => {
            const next = new Set(prev);
            next.add(activeServer.id);
            
            // Find next server in the list that hasn't failed yet
            const listToUse = isAnimeServer ? ANIME_SERVERS : currentMediaTypeServers;
            const nextServer = listToUse.find(s => !next.has(s.id) && s.id !== activeServer.id);

            if (nextServer) {
                setLoadingStatus(`Switching to backup server: ${nextServer.name}...`);
                toast.error(`Server ${activeServer.name} is unresponsive. Rotating to ${nextServer.name}...`, {
                    icon: "🔄",
                    style: {
                        background: "rgba(20, 20, 20, 0.95)",
                        border: "1px solid rgba(124, 58, 237, 0.3)",
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

    // Automatic background health checks and timeout rotations have been removed for improved stability and UX.

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
                                    src={getProxiedEmbedUrl(embedUrl)} 
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
        resolvedMediaType = "tv";
    }
    const embedUrl = isAnimeServer 
        ? (activeServer as any).getUrl(animeData?.aniListId || animeData?._id || id, selectedEpisode)
        : activeServer.getUrl(resolvedMediaType, activeId, selectedSeason, selectedEpisode);
    const renderPlayer = () => {
        return (
            <div className="relative w-full">
                {/* ── VIDEO CONTAINER ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className={`relative w-full ${
                        isFocusMode ? "h-screen rounded-none" : "aspect-video rounded-xl sm:rounded-2xl"
                    } bg-[#0a0a0a] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]`}
                >
                    {/* Loading State */}
                    {!playerLoaded && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-20 h-20 rounded-full border border-[var(--accent)]/20 animate-ping" />
                                <div className="w-14 h-14 rounded-full border-[3px] border-[var(--accent)]/20 border-t-[var(--accent)] animate-spin" />
                                <Play className="absolute w-5 h-5 text-[var(--accent)]" />
                            </div>
                            <div className="text-center">
                                <p className="text-white text-xs font-black uppercase tracking-[0.2em] animate-pulse">{loadingStatus}</p>
                                <p className="text-zinc-600 text-[10px] font-medium mt-1 uppercase tracking-wider">{activeServer.name}</p>
                            </div>
                            {isUpcoming && (
                                <span className="px-4 py-1.5 bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 rounded-full text-[10px] font-black uppercase tracking-widest">Upcoming Release</span>
                            )}
                        </div>
                    )}

                    {/* Upcoming Release Overlay */}
                    {isUpcoming && playerLoaded && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                            <div className="text-center max-w-sm">
                                <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--accent)]/20">
                                    <Calendar className="w-8 h-8 text-[var(--accent)]" />
                                </div>
                                <h2 className="text-lg font-black text-white uppercase tracking-wide mb-2">Upcoming</h2>
                                <p className="text-xs text-zinc-400 leading-relaxed mb-6">This episode hasn't aired yet. Check back soon.</p>
                                <button onClick={() => router.back()} className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all">Go Back</button>
                            </div>
                        </div>
                    )}

                    {/* Source Error Overlay */}
                    {sourceError && !isAnimeServer && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-6 text-center">
                            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                                <X className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-base font-bold mb-1 text-white">Server Unavailable</h3>
                            <p className="text-zinc-500 text-xs mb-5 max-w-[260px]">Try a different server below</p>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <button onClick={() => { setSourceError(false); setIframeKey(prev => prev + 1); }}
                                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-bold text-xs transition-all flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                                </button>
                                <button onClick={handleAutoFallback}
                                    className="px-4 py-2 bg-white/10 border border-white/10 text-white rounded-lg font-bold text-xs transition-all flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5" /> Next Server
                                </button>
                            </div>
                        </div>
                    )}

                    {/* IFRAME */}
                    <iframe
                        key={iframeKey}
                        src={getProxiedEmbedUrl(embedUrl)}
                        className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${playerLoaded ? 'opacity-100' : 'opacity-0'}`}
                        allow="fullscreen; autoplay; encrypted-media; picture-in-picture; gyroscope; accelerometer; web-share; clipboard-write"
                        allowFullScreen
                        title={`${title} - ToonPlayer`}
                        onError={handleAutoFallback}
                        onLoad={(e) => {
                            setPlayerLoaded(true);
                            try {
                                const iframe = e.target as HTMLIFrameElement;
                                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                if (doc) {
                                    const text = doc.body?.innerText || '';
                                    if (text.includes('Embed fetch failed') || text.includes('Embed proxy error') || text.includes('⚠️')) {
                                        handleAutoFallback();
                                    }
                                }
                            } catch (_) {}
                        }}
                    />

                    {/* Auto-Next Overlay */}
                    <AnimatePresence>
                        {showNextOverlay && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[60] bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6"
                            >
                                <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} className="max-w-[280px] w-full">
                                    <div className="relative w-20 h-20 mx-auto mb-5">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                                            <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
                                            <motion.circle cx="40" cy="40" r="34" stroke="var(--accent)" strokeWidth="6" fill="none"
                                                strokeDasharray="213.6"
                                                animate={{ strokeDashoffset: 213.6 - (213.6 * (5 - nextCountdown)) / 5 }}
                                                transition={{ duration: 1, ease: "linear" }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl font-black text-white">{nextCountdown}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Up Next</h3>
                                    <p className="text-zinc-400 text-xs font-medium mb-6">Episode {selectedEpisode + 1}</p>
                                    <div className="flex items-center gap-2 justify-center">
                                        <button onClick={() => { if (nextIntervalRef.current) clearInterval(nextIntervalRef.current); setShowNextOverlay(false); }}
                                            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-all">Cancel</button>
                                        <button onClick={() => {
                                            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                                            setNextCountdown(0); setShowNextOverlay(false);
                                            const ci = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
                                            let ne = selectedEpisode + 1, ns = selectedSeason;
                                            if (ci !== -1 && ci + 1 < episodes.length) { ne = episodes[ci + 1].episode_number; setSelectedEpisode(ne); }
                                            const csData = details?.seasons?.find(s => s.season_number === selectedSeason);
                                            if (csData && ne > csData.episode_count) { ns += 1; ne = 1; }
                                            const u = new URL(window.location.href);
                                            u.searchParams.set("s", ns.toString()); u.searchParams.set("e", ne.toString());
                                            router.push(u.pathname + u.search);
                                        }} className="px-6 py-2.5 bg-white text-black hover:bg-white/90 rounded-xl font-black text-sm transition-all flex items-center gap-1.5">
                                            <Play className="w-4 h-4 fill-current" /> Play Now
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── CONTROL BAR ── */}
                {!isFocusMode && (
                    <div className="flex items-center justify-between mt-2.5 px-1 gap-3 select-none">
                        {/* Episode Nav */}
                        <div className="flex items-center gap-1.5">
                            <button onClick={handlePrevEpisode} disabled={!hasPrevEpisode()}
                                className="w-8 h-8 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-30 border border-white/[0.08] rounded-lg text-white transition-all"
                                title="Previous Episode">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-zinc-400 px-2 min-w-[56px] text-center">
                                {type === 'movie' ? 'Movie' : `S${selectedSeason}E${selectedEpisode}`}
                            </span>
                            <button onClick={handleNextEpisode} disabled={!hasNextEpisode()}
                                className="w-8 h-8 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-30 border border-white/[0.08] rounded-lg text-white transition-all"
                                title="Next Episode">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        {/* View Controls */}
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setIframeKey(prev => prev + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] rounded-lg text-zinc-400 hover:text-white transition-all"
                                title="Reload">
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setIsTheatreMode(!isTheatreMode); if (isFocusMode) setIsFocusMode(false); }}
                                className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all ${
                                    isTheatreMode ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]' : 'bg-white/[0.06] border-white/[0.08] text-zinc-400 hover:text-white'
                                }`} title="Theatre Mode">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="16" x2="22" y2="16"/></svg>
                            </button>
                            <button onClick={() => { setIsFocusMode(!isFocusMode); if (isTheatreMode) setIsTheatreMode(false); }}
                                className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all ${
                                    isFocusMode ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]' : 'bg-white/[0.06] border-white/[0.08] text-zinc-400 hover:text-white'
                                }`} title="Focus Mode">
                                <Shield className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    const getFilteredEpisodes = () => {
        if (!episodeSearch.trim()) return episodes;
        const search = episodeSearch.toLowerCase();
        return episodes.filter((ep: any) => {
            if (typeof ep === "string" || typeof ep === "number") return ep.toString() === search;
            return (ep.episode_number?.toString() === search || ep.name?.toLowerCase().includes(search) || ep.overview?.toLowerCase().includes(search));
        });
    };
    const activeFilteredEpisodes = getFilteredEpisodes();
    return (
        <>
        <main className="bg-[var(--bg-main)] text-[var(--text-main)]">
            {!isFocusMode && (
                <div className="fixed top-0 left-0 md:left-[72px] right-0 z-[100] h-14 md:h-16 bg-[#050505] border-b border-white/[0.06] flex items-center px-4 md:px-6 gap-3">
                    <Link href="/" className="shrink-0 flex items-center justify-center w-9 h-9 bg-white/[0.06] hover:bg-white/[0.12] rounded-full border border-white/10 text-zinc-400 hover:text-white transition-all group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-sm md:text-base leading-tight text-white truncate tracking-tight">{type === 'cartoon' ? `Cartoon: ${title}` : title}</h1>
                        {(type === 'tv' || type === 'anime' || type === 'cartoon') && resolvedMediaType !== 'movie' && (
                            <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase mt-0.5">Season {selectedSeason} · Episode {selectedEpisode}</p>
                        )}
                    </div>
                    {details?.vote_average > 0 && (
                        <div className="shrink-0 hidden sm:flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-md">
                            <span className="text-yellow-400 text-[11px]">★</span>
                            <span className="text-[11px] font-bold text-zinc-300">{details.vote_average.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            )}
            <div className={`${isFocusMode ? "pt-0 w-full" : "pt-16 w-full max-w-[1600px] mx-auto px-0 sm:px-4 md:px-6 lg:px-8 py-4 mt-[env(safe-area-inset-top)] mb-[env(safe-area-inset-bottom)]"}`}>
                {isFocusMode && (
                    <button onClick={() => setIsFocusMode(false)} className="fixed top-4 left-4 z-[999] flex items-center gap-1.5 px-3.5 py-2 bg-black/80 hover:bg-black border border-white/10 rounded-xl text-xs font-bold text-white transition-all shadow-xl mt-[env(safe-area-inset-top)] ml-[env(safe-area-inset-left)]">
                        <X className="w-3.5 h-3.5" /> Exit Focus Mode
                    </button>
                )}
                {(isTheatreMode || isFocusMode) && (
                    <div className={`w-full ${isFocusMode ? "h-screen bg-black rounded-none border-0 overflow-hidden" : "mb-6"}`}>{renderPlayer()}</div>
                )}
                {!isFocusMode && (
                    <div className="flex flex-col xl:flex-row gap-6 items-start">
                        <div className="flex-1 w-full min-w-0">
                            {!isTheatreMode && <div className="mb-6">{renderPlayer()}</div>}
                            {/* ── SERVER SELECTION BAR ── */}
                            <div className="mb-4 rounded-xl bg-[var(--bg-card)]/50 border border-white/[0.06] overflow-hidden">
                                {/* Now Playing Banner */}
                                <div className="px-4 py-2.5 bg-[var(--accent)]/8 border-b border-white/[0.04] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                                    <p className="text-xs font-semibold text-zinc-400 truncate">
                                        Watching <span className="text-white font-bold">{title}</span>
                                        {resolvedMediaType !== 'movie' && (
                                            <span className="text-zinc-500"> · S{selectedSeason}E{selectedEpisode}</span>
                                        )}
                                    </p>
                                    <span className="ml-auto text-[10px] font-black text-[var(--accent)] uppercase tracking-widest shrink-0 flex items-center gap-1">
                                        <Server className="w-3 h-3" /> {activeServer.name}
                                    </span>
                                </div>
                                {/* Scrollable Server Pills — same on all screen sizes */}
                                <div className="px-3 py-2.5 overflow-x-auto scrollbar-none">
                                    <div className="flex items-center gap-2 min-w-max">
                                        {(() => {
                                            const base = type === "anime"
                                                ? [...ANIME_SERVERS, ...serversList.filter((s: any) => !s.type || s.type === 'tv')]
                                                : serversList.filter((s: any) => !s.type || s.type === (type === 'cartoon' ? 'tv' : type) || s.type === 'movie' || s.type === 'tv');
                                            const seen = new Set<string>();
                                            return base.filter((s: any) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
                                        })().map((server: any) => {
                                            const isActive = activeServer.id === server.id;
                                            const isFailed = failedServers.has(server.id);
                                            return (
                                                <button
                                                    key={server.id}
                                                    onClick={() => handleManualServerSelect(server)}
                                                    disabled={isFailed && !isActive}
                                                    title={isFailed ? `${server.name} — unavailable` : server.name}
                                                    className={`flex-none flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                                                        isActive
                                                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]'
                                                            : isFailed
                                                                ? 'bg-transparent border-white/[0.05] text-zinc-600 opacity-40 cursor-not-allowed'
                                                                : 'bg-white/[0.04] border-white/[0.07] text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15]'
                                                    }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                        isActive ? 'bg-white animate-pulse' : isFailed ? 'bg-red-500' : 'bg-zinc-600'
                                                    }`} />
                                                    {server.name}
                                                    {server.badge && (
                                                        <span className={`text-[8px] font-black tracking-widest px-1 py-px rounded uppercase ${
                                                            isActive ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-zinc-500'
                                                        }`}>{server.badge}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col lg:flex-row gap-8 items-start">
                                <div className="flex-shrink-0 w-[100px] sm:w-[140px] md:w-[200px] lg:w-[220px]">
                                    {details.poster_path && (
                                        <div className="relative group">
                                            <img src={`${IMG_BASE}/w500${details.poster_path}`} alt={title} loading="lazy" className="w-full rounded-2xl shadow-2xl border border-[var(--border-color)] transition-transform group-hover:scale-[1.02]" />
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="mb-4 sm:mb-6">
                                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-2 sm:mb-3 font-sora leading-tight">{title}</h2>
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-3 sm:gap-x-4 text-xs sm:text-sm font-medium text-[var(--text-muted)]">
                                            <span className="flex items-center gap-1 sm:gap-1.5 font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md"><Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> {matchPercent}% Match</span>
                                            <span>{year}</span>
                                            {details?.runtime ? <span>{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span> : <span>{type === "tv" ? `${details?.number_of_seasons || 0} Seasons` : type === "anime" ? "Anime" : ""}</span>}
                                            <span className="px-2 py-0.5 rounded border border-[var(--border-color)] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">{details?.status || "Released"}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                                        {details.genres?.map((genre) => (
                                            <span key={genre.id} className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/5 border border-white/10 rounded-lg sm:rounded-full text-[10px] sm:text-xs font-bold tracking-wide text-zinc-300 hover:text-white hover:bg-white/10 transition-all">{genre.name}</span>
                                        ))}
                                    </div>
                                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 md:p-6 mb-6 sm:mb-8">
                                        {type === "anime" && resolvedMediaType !== "movie" && episodes.length > 0 && (
                                            <div className="mb-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2"><Play className="w-4 h-4 text-blue-500 fill-current" /> Episodes</h3>
                                                    <div className="flex bg-[var(--bg-main)] p-1 rounded-lg border border-[var(--border-color)]">
                                                        <button onClick={() => setMode("sub")} className={`px-3 sm:px-4 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all ${mode === "sub" ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-white"}`}>SUB</button>
                                                        <button onClick={() => setMode("dub")} className={`px-3 sm:px-4 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all ${mode === "dub" ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-white"}`}>DUB</button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[200px] overflow-y-auto scrollbar-none p-1">
                                                    {episodes.map((epNum: string) => (
                                                        <button key={epNum} onClick={() => setSelectedEpisode(parseInt(epNum))} className={`py-2 rounded-lg text-xs font-bold transition-all border ${selectedEpisode === parseInt(epNum) ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30" : "bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white"}`}>{epNum}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="bg-blue-600/10 p-2.5 sm:p-3 rounded-xl border border-blue-500/20"><Play className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 fill-current" /></div>
                                                <div>
                                                    <p className="text-[10px] sm:text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Now Playing</p>
                                                    <p className="font-bold text-xs sm:text-sm">{type === "anime" ? `Episode ${selectedEpisode}` : type === "tv" ? `Season ${selectedSeason}, Episode ${selectedEpisode}` : "Full Movie"}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                                <button onClick={toggleWatchlist} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xl active:scale-95 flex-1 md:flex-none justify-center ${inWatchlist ? "bg-[var(--accent)] text-white shadow-[var(--accent)]/20 hover:scale-105" : "bg-white text-black shadow-white/5 hover:scale-105"}`}><Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${inWatchlist ? "fill-white" : ""}`} /> {inWatchlist ? "In Watchlist" : "Watchlist"}</button>
                                                <button onClick={() => setShowDownloadModal(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex-1 md:flex-none justify-center"><Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Download</button>
                                                <button onClick={handleShare} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-[var(--border-color)] transition-all active:scale-95 flex-1 md:flex-none justify-center"><Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Share</button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[var(--text-muted)] text-xs sm:text-sm md:text-base leading-relaxed mb-6 max-w-3xl">{details.overview}</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                                        {director && <div className="bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-[var(--border-color)]"><span className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider">Director</span><p className="text-white font-medium mt-0.5 truncate">{director.name}</p></div>}
                                        {details.spoken_languages && details.spoken_languages.length > 0 && <div className="bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-[var(--border-color)]"><span className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" /> Language</span><p className="text-white font-medium mt-0.5 truncate">{details?.spoken_languages?.[0]?.english_name || "English"}</p></div>}
                                        {details.status && <div className="bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-[var(--border-color)]"><span className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider">Status</span><p className="text-white font-medium mt-0.5 truncate">{details.status}</p></div>}
                                        {details.vote_count && <div className="bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-[var(--border-color)]"><span className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider">Votes</span><p className="text-white font-medium mt-0.5 truncate">{details?.vote_count?.toLocaleString() || "0"}</p></div>}
                                    </div>
                                </div>
                            </div>
                            {type === 'tv' && details.seasons && details.seasons.length > 0 && (
                                <section className="mt-10 xl:hidden">
                                    <div className="flex flex-col gap-4 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1 h-6 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent-glow)]" />
                                                <h2 className="text-xl font-bold">Episodes</h2>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex bg-[var(--bg-main)] p-0.5 rounded-lg border border-[var(--border-color)]">
                                                    <button onClick={() => setEpisodeLayoutMode("list")} className={`p-1 rounded-md transition-all ${episodeLayoutMode === "list" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}><List className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setEpisodeLayoutMode("grid")} className={`p-1 rounded-md transition-all ${episodeLayoutMode === "grid" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                                                </div>
                                                {episodes.length > 0 && <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-1 rounded-md">{activeFilteredEpisodes.length} EP{activeFilteredEpisodes.length !== 1 ? 's' : ''}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            {details.seasons && details.seasons.filter(s => s.season_number > 0).length > 1 && (
                                                <div className="relative flex-1 sm:max-w-[200px]">
                                                    <select value={selectedSeason} onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }} className="w-full appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] font-medium py-2 pl-4 pr-10 rounded-xl outline-none focus:border-blue-500 transition-colors cursor-pointer text-sm">
                                                        {details.seasons.filter(s => s.season_number > 0).sort((a, b) => a.season_number - b.season_number).map((season) => <option key={season.id} value={season.season_number}>Season {season.season_number} ({season.episode_count} eps)</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                                </div>
                                            )}
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                                <input type="text" placeholder="Search episode name or number..." value={episodeSearch} onChange={(e) => setEpisodeSearch(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-white text-xs rounded-xl py-2 pl-9 pr-4 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-zinc-500" />
                                                {episodeSearch && <button onClick={() => setEpisodeSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
                                            </div>
                                        </div>
                                    </div>
                                    {loadingEpisodes ? (
                                        <div className="flex justify-center items-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                                    ) : (
                                        <>
                                            {episodeLayoutMode === "grid" ? (
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-1">
                                                    {activeFilteredEpisodes.map((ep) => (
                                                        <button key={ep.id} onClick={() => { setSelectedEpisode(ep.episode_number); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`py-3 rounded-lg text-xs font-bold transition-all border text-center ${selectedEpisode === ep.episode_number ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] font-black' : 'border-[var(--border-color)] bg-[#08080B] text-zinc-400 hover:text-white'}`}>{ep.episode_number}</button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    {activeFilteredEpisodes.map((ep) => (
                                                        <button key={ep.id} onClick={() => { setSelectedEpisode(ep.episode_number); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedEpisode === ep.episode_number ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_12px_var(--accent-glow)]' : 'border-[var(--border-color)] bg-[#12131A] hover:border-[var(--accent)]/30'}`}>
                                                            <div className="w-24 h-14 rounded-lg overflow-hidden bg-[var(--bg-main)] flex-shrink-0 relative">
                                                                {ep.still_path ? <img src={`${IMG_BASE}/w185${ep.still_path}`} alt={ep.name} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">No Img</div>}
                                                                {selectedEpisode === ep.episode_number && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Play className="w-5 h-5 text-white fill-current" /></div>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-semibold line-clamp-1 ${selectedEpisode === ep.episode_number ? 'text-[var(--accent)]' : 'text-white'}`}>E{ep.episode_number}. {ep.name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">{ep.air_date && <span className="text-[10px] text-[var(--text-muted)]">{ep.air_date}</span>}{ep.runtime > 0 && <span className="text-[10px] text-[var(--text-muted)]">{ep.runtime}m</span>}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </section>
                            )}
                            {details.cast && details.cast.length > 0 && (
                                <section className="mt-10">
                                    <div className="flex items-center gap-3 mb-5"><Users className="w-5 h-5 text-blue-400" /><h2 className="text-lg font-bold">Top Cast</h2></div>
                                    <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
                                        {details.cast.slice(0, 15).map((person) => (
                                            <div key={person.id} className="flex-shrink-0 w-[100px] text-center group">
                                                <div className="w-[80px] h-[80px] mx-auto mb-2 rounded-full overflow-hidden bg-[var(--bg-card)] border-2 border-transparent group-hover:border-blue-500/50 transition-all">{person.profile_path ? <img src={`${IMG_BASE}/w185${person.profile_path}`} alt={person.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg font-bold bg-gradient-to-br from-zinc-800 to-zinc-900">{person.name.charAt(0)}</div>}</div>
                                                <p className="text-xs font-medium text-[var(--text-main)] line-clamp-1">{person.name}</p>
                                                <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{person.character}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                        {type === "tv" && details.seasons && details.seasons.length > 0 && (
                            <div className="hidden xl:flex w-full xl:w-[380px] xl:shrink-0 xl:sticky xl:top-[80px] xl:max-h-[calc(100vh-120px)] xl:flex-col xl:overflow-hidden bg-[var(--bg-card)]/40 backdrop-blur-md rounded-2xl border border-[var(--border-color)] py-4 pl-4 pr-1 space-y-4">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent-glow)]" /><h2 className="text-base font-bold text-white">Episodes</h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex bg-[var(--bg-main)] p-0.5 rounded-lg border border-[var(--border-color)]">
                                                <button onClick={() => setEpisodeLayoutMode("list")} className={`p-1 rounded-md transition-all ${episodeLayoutMode === "list" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`} title="List View"><List className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => setEpisodeLayoutMode("grid")} className={`p-1 rounded-md transition-all ${episodeLayoutMode === "grid" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`} title="Grid View"><LayoutGrid className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-main)] px-2 py-0.5 rounded-md font-bold">{activeFilteredEpisodes.length} EP{activeFilteredEpisodes.length !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                    {details.seasons && details.seasons.filter(s => s.season_number > 0).length > 1 && (
                                        <div className="relative">
                                            <select value={selectedSeason} onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }} className="w-full appearance-none bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold py-2 pl-3 pr-10 rounded-xl outline-none focus:border-[var(--accent)] transition-colors cursor-pointer text-xs">
                                                {details.seasons.filter(s => s.season_number > 0).sort((a, b) => a.season_number - b.season_number).map((season) => <option key={season.id} value={season.season_number}>Season {season.season_number} ({season.episode_count} eps)</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                        <input type="text" placeholder="Search episode name or number..." value={episodeSearch} onChange={(e) => setEpisodeSearch(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-white text-xs rounded-xl py-2 pl-9 pr-4 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-zinc-500" />
                                        {episodeSearch && <button onClick={() => setEpisodeSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
                                    </div>
                                </div>
                                {loadingEpisodes ? (
                                    <div className="flex justify-center items-center py-12"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
                                ) : (
                                    <>
                                        {episodeLayoutMode === "grid" ? (
                                            <div className="grid grid-cols-5 gap-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                                {activeFilteredEpisodes.map((ep) => (
                                                    <button key={ep.id} onClick={() => { setSelectedEpisode(ep.episode_number); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`py-2.5 rounded-lg text-xs font-bold transition-all border text-center ${selectedEpisode === ep.episode_number ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] font-black' : 'border-[var(--border-color)] bg-[#08080B] text-zinc-400 hover:text-white'}`}>{ep.episode_number}</button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                                {activeFilteredEpisodes.map((ep) => (
                                                    <button key={ep.id} onClick={() => { setSelectedEpisode(ep.episode_number); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${selectedEpisode === ep.episode_number ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_12px_var(--accent-glow)]' : 'border-[var(--border-color)] bg-[#08080B] hover:border-[var(--accent)]/30'}`}>
                                                        <div className="w-20 h-12 rounded-lg overflow-hidden bg-[var(--bg-card)] flex-shrink-0 relative">
                                                            {ep.still_path ? <img src={`${IMG_BASE}/w185${ep.still_path}`} alt={ep.name} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[9px] text-[var(--text-muted)]">No Img</div>}
                                                            {selectedEpisode === ep.episode_number && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Play className="w-4 h-4 text-white fill-current" /></div>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-bold line-clamp-1 ${selectedEpisode === ep.episode_number ? 'text-[var(--accent)]' : 'text-white'}`}>E{ep.episode_number}. {ep.name}</p>
                                                            <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block">{ep.runtime > 0 ? `${ep.runtime}m` : 'TV Show'}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {!isFocusMode && details.recommendations && details.recommendations.length > 0 && (
                <section className="mt-10 px-0 sm:px-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-4"><div className="w-1 h-6 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent-glow)]" /><h2 className="text-lg font-bold">You May Also Like</h2></div>
                    <MovieRow items={details.recommendations} type={type} />
                </section>
            )}
            {!isFocusMode && details.similar && details.similar.length > 0 && (
                <section className="mt-6 mb-6 px-0 sm:px-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-4"><div className="w-1 h-6 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent-glow)]" /><h2 className="text-lg font-bold">Similar</h2></div>
                    <MovieRow items={details.similar} type={type} />
                </section>
            )}
            {!isFocusMode && (
                <section className="mt-6 mb-12 px-0 sm:px-4 md:px-6 lg:px-8">
                    <CommentsSection contentId={id} category={type === "movie" ? "movie" : "anime"} />
                </section>
            )}
            <AnimatePresence>
                {showScrollTop && !isFocusMode && (
                    <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 z-40 p-3 bg-[var(--accent)]/90 hover:opacity-90 text-white rounded-full shadow-[0_0_20px_var(--accent-glow)] backdrop-blur-sm transition-colors"><ChevronUp className="w-5 h-5" /></motion.button>
                )}
            </AnimatePresence>
        </main>
        <Script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" strategy="afterInteractive" />
        <AnimatePresence>
            {showDownloadModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col" onClick={() => setShowDownloadModal(false)}>
                    <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center"><Download className="w-5 h-5 text-emerald-400" /></div>
                            <div>
                                <h3 className="font-bold text-sm text-white">Download — {title}</h3>
                                <p className="text-[11px] text-zinc-500">{type === 'tv' ? `Season ${selectedSeason}, Episode ${selectedEpisode}` : 'Full Movie'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a href={type === 'tv' ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}` : `https://dl.vidsrc.vip/movie/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"><ExternalLink className="w-3.5 h-3.5" /> Open in New Tab</a>
                            <button onClick={() => setShowDownloadModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
                        </div>
                    </div>
                    <div className="flex-1 relative" onClick={(e) => e.stopPropagation()}>
                        <iframe src={getProxiedEmbedUrl(type === 'tv' ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}` : `https://dl.vidsrc.vip/movie/${id}`)} className="w-full h-full border-0" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" referrerPolicy="no-referrer" />
                    </div>
                    <div className="shrink-0 p-3 border-t border-white/10 bg-black/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest shrink-0">Alt:</span>
                            <a href={type === 'tv' ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}` : `https://dl.vidsrc.vip/movie/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-bold shrink-0 hover:bg-emerald-600/30 transition-colors"><Download className="w-3 h-3" /> VidSrc DL</a>
                            <a href={type === 'tv' ? `https://vidfast.pro/tv/${id}/${selectedSeason}/${selectedEpisode}?autoPlay=true` : `https://vidfast.pro/movie/${id}?autoPlay=true`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-[11px] font-bold shrink-0 hover:bg-blue-600/30 transition-colors"><Download className="w-3 h-3" /> VidFast Pro</a>
                            <a href={type === 'tv' ? `https://www.2embed.cc/embedtv/${id}&s=${selectedSeason}&e=${selectedEpisode}` : `https://www.2embed.cc/embed/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent)] rounded-lg text-[11px] font-bold shrink-0 hover:bg-[var(--accent)]/30 transition-colors"><Download className="w-3 h-3" /> 2Embed</a>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
}
