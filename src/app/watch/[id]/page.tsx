"use client";

import { useState, useEffect, use, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { ChevronLeft, Loader2, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// Using ArtPlayer for robust playback
const ArtPlayer = dynamic(() => import("@/components/player/ArtPlayer"), { ssr: false });

interface ShowData {
    _id: string;
    name?: string;
    malId?: string;
    aniListId?: string;
    availableEpisodesDetail: {
        sub: string[];
        dub: string[];
        raw: string[];
    };
}

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [show, setShow] = useState<ShowData | null>(null);
    const [loading, setLoading] = useState(true);

    const [currentEp, setCurrentEp] = useState<string>("1");
    const [mode, setMode] = useState<"sub" | "dub">("sub");

    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [videoType, setVideoType] = useState<string>("auto");
    const [loadingSource, setLoadingSource] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-play and Auto-next settings
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoNext, setAutoNext] = useState(false);

    const processingRef = useRef<string | null>(null);

    // Load settings from localStorage
    useEffect(() => {
        const savedAutoPlay = localStorage.getItem('toonplayer_autoplay') === 'true';
        const savedAutoNext = localStorage.getItem('toonplayer_autonext') === 'true';
        setAutoPlay(savedAutoPlay);
        setAutoNext(savedAutoNext);
    }, []);

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
            try {
                const res = await axios.get(`/api/anime/episodes?id=${id}`);
                const fetchedShow = res.data.show;
                setShow(fetchedShow);

                let initialMode: "sub" | "dub" = "sub";
                let episodes = fetchedShow.availableEpisodesDetail?.sub || [];

                if (episodes.length === 0) {
                    if ((fetchedShow.availableEpisodesDetail?.dub || []).length > 0) {
                        initialMode = "dub";
                        episodes = fetchedShow.availableEpisodesDetail.dub;
                    }
                }

                setMode(initialMode);

                if (episodes.length > 0) {
                    if (episodes.includes("1")) setCurrentEp("1");
                    else setCurrentEp(episodes[0]);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load anime details.");
            } finally {
                setLoading(false);
            }
        };
        fetchShow();
    }, [id]);

    // Fetch Source
    useEffect(() => {
        // Wait for show data to be available before fetching source
        if (!show?.availableEpisodesDetail) return;

        const fetchSource = async () => {
            const key = `${id}-${currentEp}-${mode}`;
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
            setSourceUrl(null); // RESTORED: Unmount player to ensure clean state
            setError(null);

            try {
                console.log('[WatchPage] Fetching source...');
                const res = await axios.get(`/api/anime/source`, {
                    params: { id, ep: currentEp, mode }
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
                    setVideoType(selected.hls ? "m3u8" : "auto");
                    toast.success(`Episode ${currentEp} loaded successfully`);
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

    }, [id, currentEp, mode, show]); // Added 'show' dependency to ensure fetch runs when show data loads

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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!show) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
                <AlertTriangle className="w-12 h-12 text-red-500" />
                <p className="text-xl font-light">Anime not found.</p>
                <Link href="/" className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm">Return Home</Link>
            </div>
        );
    }

    const episodes = show.availableEpisodesDetail?.[mode] || [];

    return (
        <main className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-purple-500/30">

            {/* No JavaScript Fallback */}
            <noscript>
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-3">JavaScript Required</h2>
                        <p className="text-zinc-400 mb-6">
                            Video streaming requires JavaScript to function. Please enable JavaScript in your browser to watch anime.
                        </p>
                        <Link href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold inline-block">
                            Return Home
                        </Link>
                    </div>
                </div>
            </noscript>

            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen opacity-20"></div>
            </div>

            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-black/80 backdrop-blur-xl border-b border-white/5 h-[70px]">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                        <ChevronLeft className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg leading-tight line-clamp-1 tracking-tight max-w-[200px] md:max-w-md">
                            {show.name || "Anime Stream"}
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="text-purple-400 font-bold">EP {currentEp}</span>
                            <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
                            <span className="uppercase">{mode}</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Content Container - Padded from top to avoid Navbar overlap */}
            <div className="flex-1 w-full max-w-[1920px] mx-auto pt-[90px] md:pt-[100px] pb-8 px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col xl:flex-row gap-4 md:gap-6 items-start">

                    {/* Player Column - Takes available width but doesn't stretch height */}
                    <div className="flex-1 w-full min-w-0">
                        <div className="w-full aspect-video bg-black rounded-lg md:rounded-xl overflow-hidden shadow-2xl border border-white/5 relative z-20">
                            {loadingSource ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900/50 backdrop-blur-sm z-10">
                                    <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
                                    <p className="text-sm text-zinc-400 animate-pulse tracking-widest uppercase font-semibold">Loading Stream</p>
                                </div>
                            ) : error ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 md:gap-6 text-red-400 p-4 md:p-8 text-center bg-zinc-900/80 backdrop-blur-lg">
                                    <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-red-500/80" />
                                    <div className="max-w-md">
                                        <p className="font-bold text-white text-lg md:text-xl">Playback Error</p>
                                        <p className="text-xs md:text-sm opacity-70 mt-2">{error}</p>
                                        {error.includes("not be available") && (
                                            <p className="text-xs md:text-sm text-purple-400 mt-3">
                                                💡 Tip: Search for "{show.name}" on the home page to find an alternative version
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                setLoadingSource(true);
                                                processingRef.current = null;
                                            }}
                                            className="px-4 md:px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs md:text-sm font-bold transition-all min-h-[44px]"
                                        >
                                            <RefreshCw className="w-4 h-4 inline mr-2" /> Retry
                                        </button>
                                        {error.includes("not be available") && (
                                            <Link
                                                href="/"
                                                className="px-4 md:px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs md:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center"
                                            >
                                                Search Alternative
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ) : sourceUrl ? (
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
                            ) : (
                                <div className="absolute inset-0 text-zinc-500 text-sm flex flex-col items-center justify-center gap-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-purple-500 animate-spin"></div>
                                    <p>Initializing...</p>
                                </div>
                            )}
                        </div>

                        {/* Zoro-style Server & Meta Controls */}
                        <div className="mt-4 md:mt-6 bg-[#111] p-3 md:p-4 rounded-lg md:rounded-xl border border-white/5 shadow-inner">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Streaming Server
                                    </p>
                                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                        <button
                                            onClick={() => {
                                                setMode("sub");
                                                toast.success('Switched to SUB', { icon: '🎌' });
                                            }}
                                            className={`px-4 md:px-6 py-2.5 md:py-2 rounded-lg text-xs md:text-sm font-bold uppercase transition-all flex items-center gap-2 min-h-[44px] ${mode === 'sub' ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]" : "bg-white/5 text-zinc-400 hover:bg-white/10 active:bg-white/15"}`}
                                        >
                                            <span className="text-xs opacity-60 hidden sm:inline">Server</span>
                                            SUB
                                        </button>
                                        <button
                                            onClick={() => {
                                                setMode("dub");
                                                toast.success('Switched to DUB', { icon: '🎙️' });
                                            }}
                                            className={`px-4 md:px-6 py-2.5 md:py-2 rounded-lg text-xs md:text-sm font-bold uppercase transition-all flex items-center gap-2 min-h-[44px] ${mode === 'dub' ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]" : "bg-white/5 text-zinc-400 hover:bg-white/10 active:bg-white/15"}`}
                                        >
                                            <span className="text-xs opacity-60 hidden sm:inline">Server</span>
                                            DUB
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
                                    <div
                                        onClick={toggleAutoPlay}
                                        className="flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition-colors"
                                    >
                                        <div className={`w-10 h-5 rounded-full relative border transition-all ${autoPlay
                                            ? 'bg-purple-900/40 border-purple-500/30'
                                            : 'bg-zinc-800 border-white/10'
                                            }`}>
                                            <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full shadow-sm transition-all ${autoPlay
                                                ? 'right-0.5 bg-purple-500'
                                                : 'left-0.5 bg-zinc-600'
                                                }`}></div>
                                        </div>
                                        <span>Auto Play</span>
                                    </div>
                                    <div
                                        onClick={toggleAutoNext}
                                        className="flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition-colors"
                                    >
                                        <div className={`w-10 h-5 rounded-full relative border transition-all ${autoNext
                                            ? 'bg-purple-900/40 border-purple-500/30'
                                            : 'bg-zinc-800 border-white/10'
                                            }`}>
                                            <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full shadow-sm transition-all ${autoNext
                                                ? 'right-0.5 bg-purple-500'
                                                : 'left-0.5 bg-zinc-600'
                                                }`}></div>
                                        </div>
                                        <span>Auto Next</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="mt-3 md:mt-4 flex flex-col gap-1 md:gap-2">
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{show.name}</h2>
                            <p className="text-xs md:text-sm text-zinc-400 line-clamp-2 md:line-clamp-3">Watching Episode {currentEp} in {mode.toUpperCase()}. Switch servers or use buttons below if playback fails.</p>
                        </div>
                    </div>

                    {/* Sidebar - Fixed Height with Scroll for Episodes */}
                    <div className="w-full xl:w-[400px] flex-shrink-0">
                        <div className="bg-[#111] rounded-lg md:rounded-xl border border-white/5 overflow-hidden flex flex-col h-[500px] md:h-[600px] xl:h-[calc(100vh-120px)] xl:sticky xl:top-[90px] shadow-2xl">
                            <div className="px-5 py-4 flex items-center justify-between bg-black/40 border-b border-white/5">
                                <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider flex items-center gap-2">
                                    List of Episodes
                                </h3>
                                {/* Sub/Dub moved to main server bar, keeping only search/filter here if needed in future */}
                                <div className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded">
                                    {episodes.length} EPS
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 md:p-3 custom-scrollbar">
                                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-4 gap-1.5 md:gap-2">
                                    {episodes.map((ep) => (
                                        <button
                                            key={ep}
                                            onClick={() => {
                                                setCurrentEp(ep);
                                                toast.success(`Switching to Episode ${ep}`, {
                                                    icon: '📺',
                                                });
                                            }}
                                            className={`aspect-square flex items-center justify-center rounded-md md:rounded-lg text-xs md:text-sm font-bold transition-all duration-200 min-h-[44px] active:scale-95 ${currentEp === ep
                                                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                                                : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white active:bg-white/15"
                                                }`}
                                        >
                                            {ep}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
