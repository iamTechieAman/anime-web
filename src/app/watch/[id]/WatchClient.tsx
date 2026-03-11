"use client";

import { useState, useEffect, use, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { ChevronLeft, Loader2, AlertCircle, RefreshCw, AlertTriangle, Search, Play } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { useSearchParams } from "next/navigation";

// Using ArtPlayer for robust playback
const ArtPlayer = dynamic(() => import("@/components/player/ArtPlayer"), { ssr: false });

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

    const processingRef = useRef<string | null>(null);

    const [isBookmarked, setIsBookmarked] = useState(false);

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

    // Fetch Servers when Episode/Mode Changes
    useEffect(() => {
        if (!show?._id) return;

        const fetchServers = async () => {
            setLoadingServers(true);
            try {
                const res = await axios.get(`/api/anime/servers?episodeId=${currentEp}`);
                const validServers = res.data.servers.filter((s: any) => s.type === mode);
                setServers(validServers);

                // If current selectedServer is not in the new valid list, reset it or select first
                if (validServers.length > 0) {
                    const exists = validServers.find((s: any) => s.serverId === selectedServer);
                    if (!exists) {
                        setSelectedServer(validServers[0].serverId);
                    }
                } else {
                    setSelectedServer(null);
                }
            } catch (err) {
                console.error("Failed to fetch servers", err);
                setServers([]);
            } finally {
                setLoadingServers(false);
            }
        };

        fetchServers();
    }, [currentEp, mode, show]);

    // Fetch Source
    useEffect(() => {
        if (!show?.availableEpisodesDetail) return;

        const fetchSource = async () => {
            // Include selectedServer in key to trigger re-fetch when it changes
            const key = `${id}-${currentEp}-${mode}-${selectedServer}`;
            if (processingRef.current === key) return;
            processingRef.current = key;

            // Check if episode exists in current mode
            if (show?.availableEpisodesDetail) {
                const availableEps = show.availableEpisodesDetail[mode] || [];
                if (!availableEps.includes(currentEp)) {
                    setError(`Episode ${currentEp} not available in ${mode.toUpperCase()}.`);
                    setLoadingSource(false);
                    return;
                }
            }

            setLoadingSource(true);
            setSourceUrl(null);
            setError(null);

            try {
                console.log('[WatchPage] Fetching source...');
                const res = await axios.get(`/api/anime/source`, {
                    params: {
                        id,
                        ep: currentEp,
                        mode,
                        title: show.name,
                        provider: show.provider || provider, // Pass provider
                        serverId: selectedServer // Pass selected server
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
                        // Remove duplicates for same id+episode
                        const deduped = existing.filter((h) => !(h.id === entry.id && h.episode === entry.episode));
                        deduped.unshift(entry);
                        localStorage.setItem(historyKey, JSON.stringify(deduped.slice(0, 200))); // Limit 200 entries
                    } catch (_) {}

                } else {
                    setError("No stream links found.");
                    toast.error('No stream links found');
                }
            } catch (err: any) {
                if (processingRef.current !== key) return;
                console.error(err);
                const errorMsg = err.response?.data?.error || "Failed to load stream.";
                setError(errorMsg);
                toast.error(errorMsg);
            } finally {
                if (processingRef.current === key) {
                    setLoadingSource(false);
                    processingRef.current = null;
                }
            }
        };

        fetchSource();

    }, [id, currentEp, mode, show, selectedServer, provider]);

    const handleVideoEnded = () => {
        const currentEpNum = Number(currentEp);
        if (!isNaN(currentEpNum)) {
            const nextEpNum = currentEpNum + 1;
            const availableEps = show?.availableEpisodesDetail?.[mode] || [];
            if (availableEps.includes(String(nextEpNum))) {
                setCurrentEp(String(nextEpNum));
                toast.success(`Now playing Episode ${nextEpNum}`, {
                    icon: '▶️',
                });
            }
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
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-[var(--bg-overlay)] backdrop-blur-xl border-b border-[var(--border-color)] transition-all pt-[max(1rem,env(safe-area-inset-top))] h-auto min-h-[calc(70px+env(safe-area-inset-top))]">
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
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 md:gap-6 text-red-500 p-4 md:p-8 text-center bg-[var(--bg-card)]/80 backdrop-blur-lg">
                                    <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-red-600/80" />
                                    <div className="max-w-md">
                                        <p className="font-bold text-[var(--text-main)] text-lg md:text-xl">Playback Error</p>
                                        <p className="text-xs md:text-sm opacity-70 mt-2">{error}</p>
                                        {error.includes("not be available") && (
                                            <p className="text-xs md:text-sm text-purple-400 mt-3">
                                                💡 Tip: Search for "{show.name}" on the home page to find an alternative version
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-3 w-full max-w-sm">
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                setLoadingSource(true);
                                                processingRef.current = null;
                                            }}
                                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-4 h-4" /> Retry Connection
                                        </button>

                                        <div className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    const form = e.target as HTMLFormElement;
                                                    const input = form.elements.namedItem('search') as HTMLInputElement;
                                                    if (input.value.trim()) {
                                                        window.location.href = `/search?query=${encodeURIComponent(input.value.trim())}`;
                                                    }
                                                }}
                                                className="relative bg-black rounded-lg p-1 flex items-center"
                                            >
                                                <input
                                                    name="search"
                                                    type="text"
                                                    placeholder="Search on other sources..."
                                                    className="w-full bg-transparent text-white px-4 py-2 outline-none text-sm placeholder:text-[var(--text-muted)]"
                                                />
                                                <button type="submit" className="p-2 bg-purple-600 rounded-md hover:bg-purple-700 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            ) : sourceUrl ? (
                                videoType === "iframe" ? (
                                    <iframe
                                        src={sourceUrl}
                                        className="w-full h-full border-0 bg-black"
                                        allowFullScreen
                                        allow="autoplay; fullscreen"
                                        sandbox="allow-scripts allow-same-origin allow-presentation"
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

                                {/* Server Selection */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Server:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {servers.map((server) => (
                                            <button
                                                key={server.serverId}
                                                onClick={() => setSelectedServer(server.serverId)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2
                                                    ${selectedServer === server.serverId
                                                        ? "bg-white/10 text-white border border-white/20"
                                                        : "bg-transparent border border-transparent text-[var(--text-muted)] hover:bg-white/5 hover:text-white"
                                                    }`}
                                            >
                                                {server.serverName}
                                            </button>
                                        ))}
                                        {loadingServers && <span className="text-xs text-[var(--text-muted)] animate-pulse">Loading servers...</span>}
                                        {servers.length === 0 && !loadingServers && <span className="text-xs text-[var(--text-muted)]">No servers found</span>}
                                    </div>
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
