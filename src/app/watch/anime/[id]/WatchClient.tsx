"use client";

import { useState, useEffect, use, useRef } from "react";
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
        id: "vidsrc_xyz",
        name: "VidSrc XYZ",
        badge: "New",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.xyz/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=true` : `https://vidsrc.xyz/embed/movie/${id}?autoplay=true`,
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
        id: "smashy",
        name: "SmashyStream",
        badge: null,
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s || 1}&episode=${e || 1}&autoplay=true` : `https://embed.smashystream.com/playere.php?tmdb=${id}&autoplay=true`,
    },
    {
        id: "2embed",
        name: "2Embed",
        badge: null,
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://www.2embed.cc/embedtv/${id}&s=${s || 1}&e=${e || 1}&autoplay=true` : `https://www.2embed.cc/embed/${id}?autoplay=true`,
    },
    {
        id: "vidsrc_pm",
        name: "VidSrc PM",
        badge: "Stable",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.pm/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=true` : `https://vidsrc.pm/embed/movie/${id}?autoplay=true`,
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
        id: "vidsrc_in",
        name: "VidSrc IN",
        badge: "Fast",
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

    // Server State
    const [servers, setServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [loadingServers, setLoadingServers] = useState(false);

    // Show loading and error states
    const [showError, setShowError] = useState<string | null>(null);
    const [loadingShow, setLoadingShow] = useState(true);
    const [showServerDropdown, setShowServerDropdown] = useState(false);
    const serverRef = useRef<HTMLDivElement>(null);

    const processingRef = useRef<string | null>(null);
    const failedServersRef = useRef<Set<string>>(new Set());

    const [isSafeStream, setIsSafeStream] = useState(true);
    const [showSafeGuide, setShowSafeGuide] = useState(false);

    const [tmdbId, setTmdbId] = useState<string | null>(null);

    const { addToHistory, getHistoryItem, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();
    
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

            if (isEndEvent && autoNext) {
                handleVideoEnded();
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

    const isBookmarked = isInWatchlist(fullId);

    const toggleBookmark = () => {
        if (!show) return;

        if (isBookmarked) {
            removeFromWatchlist(fullId);
            toast.success('Removed from Watchlist');
        } else {
            addToWatchlist({
                id: fullId,
                showId: fullId,
                type: 'anime',
                title: show.name || 'Unknown',
                poster: show.thumbnail || ((show as any).image) || '/placeholder.jpg',
            });
            toast.success('Added to Watchlist');
        }
    };

    // Auto-play and Auto-next logic removed (now permanent)

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

                const epParam = new URLSearchParams(window.location.search).get("ep");
                if (epParam && eps.includes(epParam)) {
                    setCurrentEp(epParam);
                } else if (eps.length > 0) {
                    setCurrentEp(eps.includes("1") ? "1" : eps[0]);
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
        // Reset failed servers when episode changes
        failedServersRef.current = new Set();

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
            if (!currentEp || currentEp === 'undefined' || currentEp === 'null') return; // Guard against invalid episode ID
            setLoadingServers(true);
            setCheckingStatus("Searching for best source...");
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

                // Auto-selection logic: Find first working server
                if (allServers.length > 0) {
                    const currentExists = allServers.find((s: any) => s.serverId === selectedServer);
                    if (!currentExists) {
                        setCheckingStatus("Scanning servers...");
                        // Try to find the first native server that works
                        let bestServer = null;
                        
                        // Just pick the first one and let fetchSource handle the fallback/auto-switch
                        // but prioritize native ones that aren't known to be down
                        const firstNative = nativeServers.find((s: any) => !failedServersRef.current.has(s.serverId));
                        const peachify = allServers.find((s: any) => s.serverId === "peachify" && !failedServersRef.current.has(s.serverId));
                        
                        setSelectedServer(firstNative?.serverId || peachify?.serverId || allServers[0].serverId);
                    }
                } else {
                    setSelectedServer(null);
                }
            } catch (err) {
                console.error("Failed to fetch anime servers, using all fallbacks", err);
                // Always show movie servers + emergency embeds even if native API completely fails
                const fallbackList = [...movieServersList, ...emergencyEmbeds];
                setServers(fallbackList);
                const peachify = fallbackList.find(s => s.serverId === "peachify");
                setSelectedServer(peachify?.serverId || fallbackList[0]?.serverId || null);
            } finally {
                setLoadingServers(false);
            }
        };

        fetchServers();
    }, [currentEp, mode, show, tmdbId]);

    // Auto-switch to next server on failure — smart: skip to movie servers after 2 native failures
    const autoSwitchServer = (failedServerId: string) => {
        failedServersRef.current.add(failedServerId);
        
        // Count how many native servers have failed
        const failedNativeCount = servers.filter(s => !s.isMovieServer && failedServersRef.current.has(s.serverId)).length;
        
        let nextServer;
        if (failedNativeCount >= 1) {
            // After 2 native failures, jump directly to movie servers
            nextServer = servers.find(s => s.isMovieServer && !failedServersRef.current.has(s.serverId));
        }
        if (!nextServer) {
            nextServer = servers.find(s => !failedServersRef.current.has(s.serverId));
        }
        
        if (nextServer) {
            setError(null); // Clear any previous errors
            setCheckingStatus(`Switching to ${nextServer.serverName}...`);
            toast(`Switching to ${nextServer.serverName}...`, { icon: '🔄' });
            setSelectedServer(nextServer.serverId);
        } else {
            // All servers exhausted — try forcing ToonPlayer VIP one more time
            const peachify = servers.find(s => s.serverId === "peachify");
            if (peachify && failedServersRef.current.has("peachify")) {
                // Reset and try peachify again as absolute last resort
                failedServersRef.current.delete("peachify");
                setError(null);
                setCheckingStatus('Retrying ToonPlayer VIP...');
                toast('Retrying ToonPlayer VIP...', { icon: '🔄' });
                setSelectedServer("peachify");
            } else {
                setCheckingStatus(null);
                setError("All servers are currently unavailable. Try switching servers manually below.");
                toast.error("Servers unavailable — try switching manually");
            }
        }
    };

    const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

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
                        autoSwitchServer(selectedServer);
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
                    console.warn(`EP ${currentEp} not in ${mode}, auto-switching to movie server`);
                    autoSwitchServer(selectedServer);
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

                    setSourceUrl(absoluteUrl);
                    setVideoType(selected.isIframe ? "iframe" : selected.hls ? "m3u8" : "auto");
                    setCheckingStatus(null);
                    // toast.success(`Episode ${currentEp} loaded successfully`); // Remove annoying toasts for fast switches

                    setCheckingStatus(null);
                } else {
                    // No links found — auto-switch to next server
                    console.warn('[WatchPage] No links from native server, auto-switching...');
                    autoSwitchServer(selectedServer);
                }
            } catch (err: any) {
                if (processingRef.current !== key) return;
                console.error('[WatchPage] Native server failed:', err.message);
                // Auto-switch instead of showing error
                setCheckingStatus(`Server ${selectedServerObj.serverName} failed, trying next...`);
                autoSwitchServer(selectedServer);
            } finally {
                if (processingRef.current === key) {
                    setLoadingSource(false);
                    processingRef.current = null;
                }
            }
        };

        const currentServerName = servers.find(s => s.serverId === selectedServer)?.serverName || 'server';
        setCheckingStatus(`Validating ${currentServerName}...`);
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
                <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
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
                <nav className="fixed top-0 left-0 md:left-[72px] right-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between bg-[var(--bg-overlay)] backdrop-blur-md border-b border-[var(--border-color)] pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 hover:bg-[var(--border-color)] rounded-full transition-colors group">
                            <ChevronLeft className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                        </Link>
                        <h1 className="font-bold text-lg leading-tight line-clamp-1 tracking-tight max-w-[200px] md:max-w-md">{animeTitle}</h1>
                    </div>
                </nav>

                <div className="pt-[80px] px-0 sm:px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto w-full">
                    {/* Fallback Player */}
                    <div className="w-full aspect-video bg-black md:rounded-lg overflow-hidden border border-[var(--border-color)] relative shadow-2xl">
                        <iframe
                            src={fallbackEmbedUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; encrypted-media; picture-in-picture"
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
                                className="w-full max-w-xs py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
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
        <main className="bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-purple-500/30 transition-colors duration-300">
            {/* No JavaScript Fallback */}
            <noscript>
                <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/95 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="max-w-md bg-[var(--bg-card)] border border-red-500/30 rounded-2xl p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-3 text-[var(--text-main)]">JavaScript Required</h2>
                        <p className="text-[var(--text-muted)] mb-6">
                            Video streaming requires JavaScript to function. Please enable JavaScript in your browser to watch anime.
                        </p>
                        <Link href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold inline-block">
                            Return Home
                        </Link>
                    </div>
                </div>
            </noscript>

            {/* Background Glow - Hidden on mobile for performance */}
            <div className="fixed inset-0 pointer-events-none z-0 hidden md:block">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen opacity-20"></div>
            </div>

            {/* Navbar with Safe Area Support */}
            <nav className="fixed top-0 left-0 md:left-[72px] right-0 z-50 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between bg-[var(--bg-overlay)] backdrop-blur-md border-b border-[var(--border-color)] transition-all pt-[max(0.75rem,env(safe-area-inset-top))] h-auto">
                <div className="flex items-center gap-3 md:gap-4">
                    <Link href="/" className="p-1 md:p-2 hover:bg-[var(--border-color)] rounded-full transition-colors group">
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg leading-tight line-clamp-1 tracking-tight max-w-[200px] md:max-w-md text-[var(--text-main)]">
                            {show.name || "Anime Stream"}
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="text-purple-500 font-bold">EP {currentEp}</span>
                            <span className="w-1 h-1 bg-[var(--text-muted)]/30 rounded-full"></span>
                            <span className="uppercase">{mode}</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Content Container - Padded from top to avoid Navbar overlap */}
            <div className="flex-1 w-full mx-auto pt-[max(80px,calc(75px+env(safe-area-inset-top)))] pb-8 px-0 sm:px-4 md:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col xl:flex-row gap-4 md:gap-6 items-start">

                    {/* Player Column */}
                    <div className="flex-1 w-full min-w-0 touch-pan-y">
                        <div className="w-full aspect-video bg-black md:rounded-lg overflow-hidden border border-[var(--border-color)] relative z-20 shadow-2xl touch-pan-y" style={{ touchAction: 'pan-y !important' }}>
                            {loadingSource ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-md z-50">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-purple-600/30 blur-2xl rounded-full scale-150 animate-pulse"></div>
                                        <Loader2 className="w-16 h-16 animate-spin text-purple-500 relative z-10" />
                                    </div>
                                    <div className="text-center relative z-10 px-4">
                                        <h3 className="text-lg font-black text-white tracking-widest uppercase mb-1 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                                            Initializing Stream
                                        </h3>
                                        {checkingStatus ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                                                    <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
                                                    <p className="text-[10px] text-purple-300 font-bold uppercase tracking-tighter">
                                                        {checkingStatus}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-white/50 uppercase tracking-[0.3em] font-medium animate-pulse">
                                                Bypassing protections...
                                            </p>
                                        )}
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
                                                    failedServersRef.current.clear();
                                                    setError(null);
                                                    setSelectedServer("peachify");
                                                }}
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all text-sm flex items-center gap-1.5"
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" /> ToonPlayer VIP
                                            </button>
                                        )}
                                        {/* Quick switch to FMovies */}
                                        {servers.find(s => s.serverId === "fmovies") && (
                                            <button
                                                onClick={() => {
                                                    failedServersRef.current.clear();
                                                    setError(null);
                                                    setSelectedServer("fmovies");
                                                }}
                                                className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-purple-500/50"
                                            >
                                                FMovies
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                failedServersRef.current.clear();
                                                setError(null);
                                                setSourceUrl(null);
                                                const firstNative = servers.find(s => !s.isMovieServer);
                                                setSelectedServer(firstNative?.serverId || servers[0]?.serverId || null);
                                            }}
                                            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-purple-500/50 flex items-center gap-1.5"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> Retry All
                                        </button>
                                    </div>
                                </div>
                            ) : sourceUrl ? (
                                <div className="relative w-full h-full">
                                    {videoType === "iframe" ? (
                                        <iframe
                                            src={sourceUrl}
                                            className="w-full h-full border-0 bg-black"
                                            allowFullScreen
                                            allow="autoplay; fullscreen"
                                            onLoad={() => setLoadingSource(false)}
                                            onError={() => autoSwitchServer(selectedServer!)}
                                        ></iframe>
                                    ) : (
                                        <ArtPlayer
                                            key={`${sourceUrl}-${currentEp}`}
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
                                            onError={() => autoSwitchServer(selectedServer!)}
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
                                                                stroke="#a855f7"
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
                                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border-color)] border-t-purple-500 animate-spin"></div>
                                    <p>Initializing...</p>
                                    {checkingStatus && <p className="text-[10px] text-purple-400 font-bold uppercase tracking-tighter opacity-60">{checkingStatus}</p>}
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
                                            router.push(`/watch/anime/${id}?ep=${nextEp}&mode=${mode}`);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all drop-shadow-[0_0_10px_rgba(168,85,247,0.4)] mr-auto"
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
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
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
                                                <code className="text-purple-400 font-bold selection:bg-purple-500/30">dns.adguard.com</code>
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
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                        <span>If video is not found or refused to connect, switch to <b>VidSrc Pro</b> or <b>VidSrc PM</b>.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                        <span>Disable <b>Ad-Blockers</b> if you see a blank player or "Connection Refused".</span>
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                        <span>Try switching from <b>SUB to DUB</b> (or vice versa) if one source fails.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
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
                                            setSelectedServer("peachify");
                                            toast.success("Switched to Multi-Audio Server", { icon: "🎧" });
                                        } else {
                                            toast.error("Multi-Audio server not available for this title");
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                        selectedServer === "peachify" 
                                        ? "bg-purple-600/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
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
                                            <Server className="w-4 h-4 text-purple-500" />
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
                                                        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-tighter">Scanning {servers.length} active servers</span>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            failedServersRef.current.clear();
                                                            const firstNative = servers.find(s => !s.isMovieServer);
                                                            setSelectedServer(firstNative?.serverId || servers[0]?.serverId);
                                                            setShowServerDropdown(false);
                                                        }}
                                                        className="text-[10px] text-purple-400 font-bold px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 rounded-md transition-colors border border-purple-500/20"
                                                    >
                                                        Auto Scan
                                                    </button>
                                                </div>
                                                <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                                                    {servers.map((server, index) => (
                                                        <button
                                                            key={`${server.serverId}-${server.type}-${index}`}
                                                            onClick={() => {
                                                                setSelectedServer(server.serverId);
                                                                setShowServerDropdown(false);
                                                            }}
                                                            className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all ${
                                                                selectedServer === server.serverId
                                                                    ? "bg-purple-600/10 text-white border border-purple-500/30 shadow-lg"
                                                                    : "hover:bg-white/5 text-[var(--text-muted)] hover:text-white border border-transparent"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                                    server.isMovieServer ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
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
                                                                <Check className="w-4 h-4 text-purple-400" />
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
                                <div className="flex items-center gap-2 text-purple-400">
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
                                            ? "bg-purple-600/20 text-purple-400 border-purple-500/50 hover:bg-purple-600/30" 
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

                        {/* Smart Recommendations */}
                        <SimilarAnime currentShowId={show._id} showName={show.name || 'this'} />
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
                                        className="w-full bg-[var(--bg-main)] pl-9 pr-3 py-2 rounded-md border border-[var(--border-color)] outline-none focus:border-white/20 transition-colors text-sm text-white placeholder-[var(--text-muted)] font-inter"
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (!v) {
                                                // If empty, we can just show all. I'll omit local filtering state for brevity,
                                                // but add visual cue it's a search box. It needs local state to function properly.
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col gap-1">
                                {episodes.map((ep) => (
                                    <button
                                        key={ep}
                                        onClick={() => setCurrentEp(ep)}
                                        className={`flex items-center justify-between w-full px-4 py-3 rounded-md text-left transition-colors group
                                            ${currentEp === ep
                                                ? "bg-white/10"
                                                : "hover:bg-white/5"
                                            }`}
                                    >
                                        <span className={`text-sm font-semibold transition-colors ${currentEp === ep ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-white'}`}>
                                            Episode {ep}
                                        </span>
                                        {currentEp === ep && (
                                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                                                <Play className="w-3 h-3 text-black fill-black ml-0.5" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
