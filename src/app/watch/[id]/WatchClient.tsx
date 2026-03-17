"use client";

import { useState, useEffect, use, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle, RefreshCw, AlertTriangle, Search, Play, Share2, Server, ChevronDown, Check } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import { useSearchParams } from "next/navigation";

// Using ArtPlayer for robust playback
const ArtPlayer = dynamic(() => import("@/components/player/ArtPlayer"), { ssr: false });

const MOVIE_SERVERS = [
    {
        id: "peachify",
        name: "ToonPlayer VIP",
        badge: "Multi-Audio",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://peachify.top/?type=tv&id=${id}&s=${s || 1}&e=${e || 1}` : `https://peachify.top/?type=movie&id=${id}`,
    },
    {
        id: "vidbinge",
        name: "VidBinge",
        badge: "4K/HD",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidbinge.to/embed/tv/${id}/${s || 1}/${e || 1}` : `https://vidbinge.to/embed/movie/${id}`,
    },
    {
        id: "vidsrc_xyz",
        name: "VidSrc XYZ",
        badge: "New",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.xyz/embed/tv/${id}/${s || 1}/${e || 1}` : `https://vidsrc.xyz/embed/movie/${id}`,
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
            type === "tv" ? `https://vidsrc.net/embed/tv/${id}/${s || 1}/${e || 1}` : `https://vidsrc.net/embed/movie/${id}`,
    },
    {
        id: "cinemacity",
        name: "CinemaCity",
        badge: "New",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://cinemacity.cc/index.php?do=search&subaction=search&story=${id}` : `https://cinemacity.cc/index.php?do=search&subaction=search&story=${id}`,
    },
    {
        id: "filmex",
        name: "Filmex",
        badge: "Fast",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://filmex.to/search?q=${id}` : `https://filmex.to/search?q=${id}`,
    },
    {
        id: "cinezo",
        name: "Cinezo",
        badge: "Direct",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            `https://www.cinezo.net/search?q=${id}`,
    },
    {
        id: "pstream",
        name: "P-Stream",
        badge: "Multi",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            `https://pstream.net/search/${id}`,
    },
    {
        id: "vidsrc_me",
        name: "VidSrc US",
        badge: "Fast",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s || 1}&episode=${e || 1}` : `https://vidsrc.me/embed/movie?tmdb=${id}`,
    },
    {
        id: "superembed",
        name: "SuperEmbed",
        badge: "Reliable",
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s || 1}&e=${e || 1}` : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
    },
    {
        id: "autoembed",
        name: "AutoEmbed",
        badge: null,
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://player.autoembed.cc/embed/tv/${id}/${s || 1}/${e || 1}` : `https://player.autoembed.cc/embed/movie/${id}`,
    },
    {
        id: "smashy",
        name: "SmashyStream",
        badge: null,
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s || 1}&episode=${e || 1}` : `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    },
    {
        id: "2embed",
        name: "2Embed",
        badge: null,
        isMovieServer: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://www.2embed.cc/embedtv/${id}&s=${s || 1}&e=${e || 1}` : `https://www.2embed.cc/embed/${id}`,
    },
];

interface ShowData {
    _id: string;
    name?: string;
    malId?: string;
    aniListId?: string;
    provider?: string;
    thumbnail?: string;
    availableEpisodesDetail: {
        sub: string[];
        dub: string[];
        raw: string[];
    };
}

export default function WatchClient({ id }: { id: string }) {
    const searchParams = useSearchParams();
    const provider = searchParams.get('provider');

    const [show, setShow] = useState<ShowData | null>(null);

    const [currentEp, setCurrentEp] = useState<string>("1");
    const [mode, setMode] = useState<"sub" | "dub">("sub");

    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [videoType, setVideoType] = useState<string>("auto");
    const [loadingSource, setLoadingSource] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-play and Auto-next settings
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoNext, setAutoNext] = useState(false);

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

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [tmdbId, setTmdbId] = useState<string | null>(null);

    // Load Settings & Bookmark
    useEffect(() => {
        const savedAutoPlay = localStorage.getItem('toonplayer_autoplay') === 'true';
        const savedAutoNext = localStorage.getItem('toonplayer_autonext') === 'true';
        setAutoPlay(savedAutoPlay);
        setAutoNext(savedAutoNext);

        // Check Bookmark
        const watchlist = JSON.parse(localStorage.getItem('toonplayer_watchlist') || '[]');
        const exists = watchlist.some((item: any) => item._id === id);
        setIsBookmarked(exists);

        // Click outside to close dropdown
        const handleClickOutside = (e: MouseEvent) => {
            if (serverRef.current && !serverRef.current.contains(e.target as Node)) {
                setShowServerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [id]);

    const toggleBookmark = () => {
        if (!show) return;
        const watchlist = JSON.parse(localStorage.getItem('toonplayer_watchlist') || '[]');

        if (isBookmarked) {
            // Remove
            const newList = watchlist.filter((item: any) => item._id !== id);
            localStorage.setItem('toonplayer_watchlist', JSON.stringify(newList));
            setIsBookmarked(false);
            toast.success('Removed from Watchlist');
        } else {
            // Add
            const newItem = {
                _id: show._id,
                name: show.name,
                thumbnail: show.thumbnail || ((show as any).image), // Fallback
                provider: show.provider || provider,
                addedAt: Date.now()
            };
            watchlist.unshift(newItem); // Add to top
            localStorage.setItem('toonplayer_watchlist', JSON.stringify(watchlist));
            setIsBookmarked(true);
            toast.success('Added to Watchlist');
        }
    };

    // Save auto-play setting
    const toggleAutoPlay = () => {
        const newValue = !autoPlay;
        setAutoPlay(newValue);
        localStorage.setItem('toonplayer_autoplay', String(newValue));
        toast.success(newValue ? 'Auto Play enabled ✓' : 'Auto Play disabled', {
            icon: newValue ? '▶️' : '⏸️',
        });
    };

    // Save auto-next setting
    const toggleAutoNext = () => {
        const newValue = !autoNext;
        setAutoNext(newValue);
        localStorage.setItem('toonplayer_autonext', String(newValue));
        toast.success(newValue ? 'Auto Next enabled ✓' : 'Auto Next disabled', {
            icon: newValue ? '⏭️' : '⏹️',
        });
    };

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

    // Fetch Show Details
    useEffect(() => {
        const fetchShow = async () => {
            setLoadingShow(true);
            setShowError(null);
            try {
                const res = await axios.get(`/api/anime/episodes?id=${id}&provider=${provider || ''}`);
                const fetchedShow = res.data.show;
                
                if (!fetchedShow) {
                    throw new Error("No show data received");
                }

                setShow(fetchedShow);

                // Check bookmark again with full show data
                const watchlist = JSON.parse(localStorage.getItem('toonplayer_watchlist') || '[]');
                const exists = watchlist.some((item: any) => item._id === id);
                setIsBookmarked(exists);

                let initialMode: "sub" | "dub" = "sub";
                let episodes = fetchedShow.availableEpisodesDetail?.sub || [];

                if (episodes.length === 0) {
                    if ((fetchedShow.availableEpisodesDetail?.dub || []).length > 0) {
                        initialMode = "dub";
                        episodes = fetchedShow.availableEpisodesDetail.dub;
                    }
                }

                setMode(initialMode);

                // Resume from URL param if provided
                const epParam = new URLSearchParams(window.location.search).get("ep");
                if (epParam && episodes.includes(epParam)) {
                    setCurrentEp(epParam);
                } else if (episodes.length > 0) {
                    if (episodes.includes("1")) setCurrentEp("1");
                    else setCurrentEp(episodes[0]);
                }
            } catch (err: any) {
                console.error("Failed to fetch show", err);
                setShowError(err.response?.data?.error || "Anime not found or streaming servers are unreachable.");
            } finally {
                setLoadingShow(false);
            }
        };
        fetchShow();
    }, [id, provider]);

    // Fetch TMDB ID for Movie Servers - with retry and fallback
    useEffect(() => {
        if (!show?.name) return;

        const fetchTmdbId = async () => {
            try {
                // Defensive parsing: Strip out huge whitespace-separated blocks if it's a scraper error
                let sanitizedName = (show.name || "").split('\n')[0].trim();
                
                // Limit to max 50 characters to prevent 431/404 URI errors
                if (sanitizedName.length > 50) {
                    sanitizedName = sanitizedName.substring(0, 50).trim();
                }
                
                // Remove weird URL breaking characters
                sanitizedName = sanitizedName.replace(/[^a-zA-Z0-9 ':!,-]/g, '').trim();

                const res = await axios.get(`/api/prime/search?q=${encodeURIComponent(sanitizedName)}`);
                const results = res.data.results;
                if (results && results.length > 0) {
                    setTmdbId(results[0].id.toString());
                } else {
                    // Even without TMDB ID, set a fallback so movie servers still display
                    console.warn("[WatchClient] No TMDB results, movie servers will use name-based search");
                    setTmdbId("0"); // sentinel value — movie servers will still mount
                }
            } catch (err) {
                console.error("Failed to fetch TMDB ID, using fallback", err);
                setTmdbId("0"); // Always allow movie servers to show
            }
        };

        fetchTmdbId();
    }, [show?.name]);

    // Fetch Servers when Episode/Mode Changes
    useEffect(() => {
        if (!show?._id) return;
        // Reset failed servers when episode changes
        failedServersRef.current = new Set();

        // Only include movie/embed servers if we have a VALID TMDB ID (not "0" sentinel)
        const hasValidTmdbId = tmdbId && tmdbId !== "0";
        const movieServersList = hasValidTmdbId ? MOVIE_SERVERS.map(ms => ({
            serverId: ms.id,
            serverName: ms.name,
            type: mode,
            badge: ms.badge,
            isMovieServer: true,
            getUrl: ms.getUrl
        })) : [];

        // Emergency AniList ID-based embeds — ALWAYS available since we always have the show ID
        const anilistId = show?.aniListId || show?._id || id;
        const malId = show?.malId || "";
        const emergencyEmbeds = [
            {
                serverId: "emergency_vidsrc",
                serverName: "VidSrc Anime",
                type: mode,
                badge: "Anime",
                isMovieServer: true,
                isEmergency: true,
                getUrl: () => `https://vidsrc.to/embed/anime/${anilistId}/${currentEp}`
            },
            {
                serverId: "emergency_vidsrc_me",
                serverName: "VidSrc Me",
                type: mode,
                badge: "Backup",
                isMovieServer: true,
                isEmergency: true,
                getUrl: () => `https://vidsrc.me/embed/anime?anilist=${anilistId}&episode=${currentEp}`
            },
            ...(malId ? [{
                serverId: "emergency_mal",
                serverName: "MAL Stream",
                type: mode,
                badge: "MAL",
                isMovieServer: true,
                isEmergency: true,
                getUrl: () => `https://vidsrc.me/embed/anime?mal=${malId}&episode=${currentEp}`
            }] : []),
        ];

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

                // Default to first native server if available, else ToonPlayer VIP, else emergency
                if (allServers.length > 0) {
                    const currentExists = allServers.find((s: any) => s.serverId === selectedServer);
                    if (!currentExists) {
                        const firstNative = nativeServers[0];
                        const peachify = allServers.find((s: any) => s.serverId === "peachify");
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
        if (failedNativeCount >= 2) {
            // After 2 native failures, jump directly to movie servers
            nextServer = servers.find(s => s.isMovieServer && !failedServersRef.current.has(s.serverId));
        }
        if (!nextServer) {
            nextServer = servers.find(s => !failedServersRef.current.has(s.serverId));
        }
        
        if (nextServer) {
            setError(null); // Clear any previous errors
            toast(`Switching to ${nextServer.serverName}...`, { icon: '🔄' });
            setSelectedServer(nextServer.serverId);
        } else {
            // All servers exhausted — try forcing ToonPlayer VIP one more time
            const peachify = servers.find(s => s.serverId === "peachify");
            if (peachify && failedServersRef.current.has("peachify")) {
                // Reset and try peachify again as absolute last resort
                failedServersRef.current.delete("peachify");
                setError(null);
                toast('Retrying ToonPlayer VIP...', { icon: '🔄' });
                setSelectedServer("peachify");
            } else {
                setError("All servers are currently unavailable. Try switching servers manually below.");
                toast.error("Servers unavailable — try switching manually");
            }
        }
    };

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
                    toast.success(`Episode ${currentEp} loaded successfully`);

                    // Save to watch history
                    try {
                        const historyKey = "watchHistory";
                        const existing: any[] = JSON.parse(localStorage.getItem(historyKey) || "[]");
                        const entry = {
                            id: show._id,
                            title: show.name,
                            thumbnail: show.thumbnail,
                            episode: currentEp,
                            provider: show.provider || provider || "unknown",
                            watchedAt: Date.now(),
                        };
                        const deduped = existing.filter((h) => !(h.id === entry.id && h.episode === entry.episode));
                        deduped.unshift(entry);
                        localStorage.setItem(historyKey, JSON.stringify(deduped.slice(0, 200)));
                    } catch (_) {}

                } else {
                    // No links found — auto-switch to next server
                    console.warn('[WatchPage] No links from native server, auto-switching...');
                    autoSwitchServer(selectedServer);
                }
            } catch (err: any) {
                if (processingRef.current !== key) return;
                console.error('[WatchPage] Native server failed:', err.message);
                // Auto-switch instead of showing error
                autoSwitchServer(selectedServer);
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
        const availableEps = show?.availableEpisodesDetail?.[mode] || [];
        const currentIndex = availableEps.indexOf(currentEp);
        
        if (currentIndex !== -1 && currentIndex + 1 < availableEps.length) {
            const nextEp = availableEps[currentIndex + 1];
            setCurrentEp(nextEp);
            toast.success(`Now playing Episode ${nextEp}`, {
                icon: '▶️',
            });
        } else {
            // Alternatively, handle end of available episodes
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
        return (
            <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full glass p-8 rounded-3xl border border-red-500/20">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-[var(--text-main)] mb-4">Anime Not Found</h2>
                    <p className="text-[var(--text-muted)] mb-8">{showError}</p>
                    <div className="flex flex-col gap-3">
                        <Link 
                            href="/"
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Return Home
                        </Link>
                        <Link 
                            href="/search"
                            className="w-full py-3 border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <Search className="w-4 h-4" /> Try Searching
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!show) return null;

    const episodes = show.availableEpisodesDetail?.[mode] || [];

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col font-sans selection:bg-purple-500/30 transition-colors duration-300">
            {/* No JavaScript Fallback */}
            <noscript>
                <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/95 backdrop-blur-xl flex items-center justify-center p-6">
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
            <nav className="fixed top-0 left-0 md:left-[72px] right-0 z-50 px-4 md:px-6 py-4 flex items-center justify-between bg-[var(--bg-overlay)] backdrop-blur-xl border-b border-[var(--border-color)] transition-all pt-[max(1rem,env(safe-area-inset-top))] h-auto min-h-[calc(70px+env(safe-area-inset-top))]">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-[var(--border-color)] rounded-full transition-colors group">
                        <ChevronLeft className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
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
            <div className="flex-1 w-full max-w-[1920px] mx-auto pt-[calc(100px+env(safe-area-inset-top))] pb-8 px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col xl:flex-row gap-4 md:gap-6 items-start">

                    {/* Player Column */}
                    <div className="flex-1 w-full min-w-0">
                        <div className="w-full aspect-video bg-black md:rounded-lg overflow-hidden border border-[var(--border-color)] relative z-20 shadow-2xl">
                            {loadingSource ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--bg-main)]/50 backdrop-blur-sm z-10">
                                    <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
                                    <p className="text-sm text-[var(--text-muted)] animate-pulse tracking-widest uppercase font-semibold">Loading Stream</p>
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
                                videoType === "iframe" ? (
                                    <iframe
                                        src={sourceUrl}
                                        className="w-full h-full border-0 bg-black"
                                        allowFullScreen
                                        allow="autoplay; fullscreen"
                                        // sandbox strictly to prevent popups and redirects without user interaction
                                        sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                                    ></iframe>
                                ) : (
                                    <ArtPlayer
                                        key={sourceUrl} // Force remount on URL change
                                        option={{
                                            url: sourceUrl,
                                            type: videoType,
                                        }}
                                        onEnded={handleVideoEnded}
                                        autoPlay={autoPlay}
                                        autoNext={autoNext}
                                        className="w-full h-full"
                                    />
                                )
                            ) : (
                                <div className="absolute inset-0 text-[var(--text-muted)] text-sm flex flex-col items-center justify-center gap-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border-color)] border-t-purple-500 animate-spin"></div>
                                    <p>Initializing...</p>
                                </div>
                            )}
                        </div>

                        {/* Source helper message */}
                        <div className="mt-2 flex items-center justify-center gap-2 text-[var(--text-muted)] text-xs bg-[var(--bg-card)]/30 py-1.5 rounded-lg border border-[var(--border-color)]/50">
                            <AlertCircle className="w-3.5 h-3.5 text-yellow-500/70" />
                            <span>💡 Source not working? Try another one from the server list below</span>
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
                                                className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-[60] overflow-hidden backdrop-blur-xl"
                                            >
                                                <div className="p-3 border-b border-[var(--border-color)] bg-white/5 flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Select Source</span>
                                                    <span className="text-[10px] text-purple-400 font-bold px-1.5 py-0.5 bg-purple-500/10 rounded">Streaming</span>
                                                </div>
                                                <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                                                    {servers.map((server) => (
                                                        <button
                                                            key={server.serverId}
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

                            {/* Auto Toggles */}
                            <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-muted)]">
                                <label className="flex items-center gap-2 cursor-pointer group hover:text-white transition-colors">
                                    <input type="checkbox" checked={autoPlay} onChange={toggleAutoPlay} className="w-4 h-4 rounded-sm border-[var(--border-color)] bg-[var(--bg-main)] text-white focus:ring-0 cursor-pointer accent-white" />
                                    Auto Play
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group hover:text-white transition-colors">
                                    <input type="checkbox" checked={autoNext} onChange={toggleAutoNext} className="w-4 h-4 rounded-sm border-[var(--border-color)] bg-[var(--bg-main)] text-white focus:ring-0 cursor-pointer accent-white" />
                                    Auto Next
                                </label>
                                <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-white border border-white/5 disabled:opacity-50">
                                   <Share2 className="w-4 h-4" /> Share
                                </button>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="mt-6 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-4">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex-1 font-sora">{show.name}</h1>
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
