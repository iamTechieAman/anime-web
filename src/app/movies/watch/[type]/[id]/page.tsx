"use client";

export const runtime = 'edge';

import { useState, useEffect, use, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Star, Clock, Calendar, Globe, Users, ChevronDown, ChevronUp, X, Shield, Server } from "lucide-react";
import { MovieRow, type MovieItem } from "@/components/MovieCard";

const IMG_BASE = "https://image.tmdb.org/t/p";

const SERVERS = [
    {
        id: "peachify",
        name: "ToonPlayer-VIP",
        badge: "Multi-Audio",
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://peachify.top/?type=tv&id=${id}&s=${s || 1}&e=${e || 1}` : `https://peachify.top/?type=movie&id=${id}`,
    },
    {
        id: "fmovies",
        name: "FMovies",
        badge: "New",
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://fmovies.gd/embed/tv/${id}/${s || 1}/${e || 1}` : `https://fmovies.gd/embed/movie/${id}`,
    },
    {
        id: "vidlink",
        name: "VidLink",
        badge: "Recommended",
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidlink.pro/tv/${id}/${s || 1}/${e || 1}?primaryColor=3b82f6&secondaryColor=1e3a5f&autoplay=true&title=false` : `https://vidlink.pro/movie/${id}?primaryColor=3b82f6&secondaryColor=1e3a5f&autoplay=true&title=false`,
    },
    {
        id: "vidsrc_me",
        name: "VidSrc US",
        badge: "Fast",
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s || 1}&episode=${e || 1}` : `https://vidsrc.me/embed/movie?tmdb=${id}`,
    },
    {
        id: "vidsrc_pro",
        name: "VidSrc Pro",
        badge: null,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidsrc.pro/embed/tv/${id}/${s || 1}/${e || 1}` : `https://vidsrc.pro/embed/movie/${id}`,
    },
    {
        id: "superembed",
        name: "SuperEmbed",
        badge: "Stable",
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s || 1}&e=${e || 1}` : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
    },
    {
        id: "autoembed",
        name: "AutoEmbed",
        badge: null,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://player.autoembed.cc/embed/tv/${id}/${s || 1}/${e || 1}` : `https://player.autoembed.cc/embed/movie/${id}`,
    },
    {
        id: "smashy",
        name: "SmashyStream",
        badge: null,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s || 1}&episode=${e || 1}` : `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    },
    {
        id: "vidfast",
        name: "VidFast",
        badge: null,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === "tv" ? `https://vidfast.pro/tv/${id}/${s || 1}/${e || 1}` : `https://vidfast.pro/movie/${id}`,
    },
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

export default function WatchPage({ params }: { params: Promise<{ type: string; id: string }> }) {
    const resolvedParams = use(params);
    const { type, id } = resolvedParams;
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeServer, setActiveServer] = useState(SERVERS[0]);
    const [showServers, setShowServers] = useState(false);
    const [showTrailer, setShowTrailer] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [playerLoaded, setPlayerLoaded] = useState(false);

    // TV Show State
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);

    // Scroll-to-top visibility
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Reset player loaded state on server change
    useEffect(() => {
        setPlayerLoaded(false);
    }, [activeServer]);

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
        const fetchDetails = async () => {
            try {
                const res = await axios.get(`/api/prime/details?id=${id}&type=${type}`);
                setDetails(res.data);
            } catch (err) {
                console.error("Failed to fetch details:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, type]);

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

    // Refresh iframe when server or episode changes
    useEffect(() => {
        setIframeKey((prev) => prev + 1);
    }, [activeServer, selectedSeason, selectedEpisode]);

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
        return (
            <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
                    <Link href="/movies" className="text-blue-400 hover:text-blue-300 transition-colors">← Back to Movies</Link>
                </div>
            </main>
        );
    }

    const title = details.title || details.name || "Untitled";
    const year = (details.release_date || details.first_air_date || "").slice(0, 4);
    const matchPercent = Math.round((details.vote_average || 0) * 10);
    const director = details.crew?.find((c) => c.job === "Director");

    const embedUrl = activeServer.getUrl(type, id, selectedSeason, selectedEpisode);

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-x-hidden">
            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-[var(--bg-main)]/90 backdrop-blur-xl border-b border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <Link href="/movies" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group shrink-0">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium hidden sm:inline">Back to Movies</span>
                    </Link>
                    <h1 className="text-sm font-bold truncate text-center flex-1 text-[var(--text-main)]">{title}</h1>
                    <div className="w-[100px] hidden sm:block" /> {/* Spacer to center title */}
                </div>
            </div>

            <div className="pt-14">
                {/* Video Player with Anti-Redirect Protection */}
                <div className="relative w-full bg-black">
                    <div className="max-w-7xl mx-auto">
                        <div className="relative w-full aspect-video bg-[var(--bg-card)] rounded-b-xl overflow-hidden">
                            {/* Loading skeleton */}
                            {!playerLoaded && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-card)]">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                                        <Play className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
                                    </div>
                                    <p className="mt-4 text-[var(--text-muted)] text-sm animate-pulse">Loading player...</p>
                                    <p className="mt-1 text-zinc-600 text-xs">Server: {activeServer.name}</p>
                                </div>
                            )}
                            <iframe
                                key={iframeKey}
                                src={embedUrl}
                                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${playerLoaded ? 'opacity-100' : 'opacity-0'}`}
                                allowFullScreen
                                allow="autoplay; encrypted-media; picture-in-picture"
                                referrerPolicy="origin"
                                onLoad={() => setPlayerLoaded(true)}
                            />
                        </div>
                    </div>
                </div>

                {/* Server Selector Bar */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5" /> Server:
                        </span>

                        {/* Server Buttons — show all inline on desktop */}
                        <div className="hidden md:flex items-center gap-2">
                            {SERVERS.map((server) => (
                                <button
                                    key={server.id}
                                    onClick={() => setActiveServer(server)}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeServer.id === server.id
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                        : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--border-color)] hover:text-[var(--text-main)]"
                                        }`}
                                >
                                    {activeServer.id === server.id ? (
                                        <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-2" />
                                    )}
                                    {server.name}
                                    {server.badge && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${server.badge === "Recommended" ? "bg-green-500/20 text-green-400" :
                                            server.badge === "Fast" ? "bg-yellow-500/20 text-yellow-400" :
                                                "bg-blue-500/20 text-blue-400"
                                            }`}>
                                            {server.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Mobile dropdown */}
                        <div className="relative md:hidden">
                            <button
                                onClick={() => setShowServers(!showServers)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-medium hover:border-blue-500/50 transition-colors"
                            >
                                {activeServer.name}
                                <ChevronDown className={`w-4 h-4 transition-transform ${showServers ? "rotate-180" : ""}`} />
                            </button>
                            {showServers && (
                                <div className="absolute top-full left-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-hidden shadow-2xl z-30 min-w-[160px]">
                                    {SERVERS.map((server) => (
                                        <button
                                            key={server.id}
                                            onClick={() => { setActiveServer(server); setShowServers(false); }}
                                            className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-card)] transition-colors flex items-center justify-between ${activeServer.id === server.id ? "text-blue-400 bg-blue-500/10" : "text-[var(--text-main)]"
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                {activeServer.id === server.id ? (
                                                    <Play className="w-4 h-4 mr-2 fill-current" />
                                                ) : (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mx-1.5 mr-2.5" />
                                                )}
                                                {server.name}
                                            </div>
                                            {server.badge && (
                                                <span className="text-[10px] text-[var(--text-muted)]">{server.badge}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Trailer button */}
                        {details.trailer && (
                            <button
                                onClick={() => setShowTrailer(!showTrailer)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all ml-auto"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Trailer
                            </button>
                        )}
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
                                    className="w-full h-full"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
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
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
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
                            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">{title}</h1>
                            {details.tagline && (
                                <p className="text-[var(--text-muted)] text-sm italic mb-4 font-medium">&ldquo;{details.tagline}&rdquo;</p>
                            )}

                            {/* Meta badges */}
                            <div className="flex items-center gap-3 mb-5 flex-wrap">
                                {matchPercent > 0 && (
                                    <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${matchPercent >= 70 ? "bg-green-500/15 text-green-400" :
                                        matchPercent >= 50 ? "bg-yellow-500/15 text-yellow-400" :
                                            "bg-red-500/15 text-red-400"
                                        }`}>
                                        {matchPercent}% Match
                                    </span>
                                )}
                                {year && (
                                    <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm bg-[var(--bg-card)] px-2.5 py-1 rounded-md">
                                        <Calendar className="w-3.5 h-3.5" /> {year}
                                    </span>
                                )}
                                {details.runtime && (
                                    <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm bg-[var(--bg-card)] px-2.5 py-1 rounded-md">
                                        <Clock className="w-3.5 h-3.5" /> {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                                    </span>
                                )}
                                {details.number_of_seasons && (
                                    <span className="text-[var(--text-muted)] text-sm bg-[var(--bg-card)] px-2.5 py-1 rounded-md">
                                        {details.number_of_seasons} Season{details.number_of_seasons !== 1 ? "s" : ""}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 text-yellow-400 text-sm font-semibold bg-yellow-500/10 px-2.5 py-1 rounded-md">
                                    <Star className="w-3.5 h-3.5 fill-yellow-400" /> {details.vote_average?.toFixed(1)}
                                </span>
                                <span className="px-2 py-1 bg-blue-500/15 text-blue-400 text-[10px] font-bold rounded-md tracking-wider">HD</span>
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
                                        <p className="text-white font-medium mt-0.5">{details.spoken_languages[0].english_name}</p>
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
                                        <p className="text-white font-medium mt-0.5">{details.vote_count.toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TV Show Seasons & Episodes */}
                    {type === 'tv' && details.seasons && details.seasons.length > 0 && (
                        <section className="mt-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
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
                                                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                                                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-blue-500/40'
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
                                                        selectedEpisode === ep.episode_number ? 'text-blue-400' : 'text-[var(--text-main)]'
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
                                                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
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

                    {/* Recommendations */}
                    {details.recommendations && details.recommendations.length > 0 && (
                        <section className="mt-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                                <h2 className="text-lg font-bold">You May Also Like</h2>
                            </div>
                            <MovieRow items={details.recommendations} type={type} />
                        </section>
                    )}

                    {/* Similar */}
                    {details.similar && details.similar.length > 0 && (
                        <section className="mt-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]" />
                                <h2 className="text-lg font-bold">Similar</h2>
                            </div>
                            <MovieRow items={details.similar} type={type} />
                        </section>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-[var(--border-color)] py-8 px-4 bg-[var(--bg-main)]">
                <div className="max-w-7xl mx-auto text-center text-zinc-600 text-xs">
                    <p>This platform serves as a content aggregator and does not host any media files directly.</p>
                    <p className="mt-2">© 2026 ToonPlayer Movies. All rights reserved.</p>
                </div>
            </footer>

            {/* Scroll to Top */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-6 right-6 z-40 p-3 bg-blue-500/90 hover:bg-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.4)] backdrop-blur-sm transition-colors"
                    >
                        <ChevronUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>
        </main>
    );
}
