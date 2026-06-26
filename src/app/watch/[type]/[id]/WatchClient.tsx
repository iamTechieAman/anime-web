"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import React from "react";
import Script from "next/script";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Star, Clock, Calendar, Globe, Users, ChevronDown, ChevronUp, X, Shield, Server, Sparkles, Share2, Heart, Zap, Loader2, Check, Download, ExternalLink, ChevronRight, ChevronLeft, RefreshCw, LayoutGrid, List, Search, Film, Tag, Trophy, Tv, MonitorPlay, Info, Layers, ChevronUp as ChevronUpIcon, Volume2, VolumeX } from "lucide-react";
import { MovieRow, type MovieItem } from "@/components/MovieCard";
import toast from "react-hot-toast";
import { useAdBlock } from "@/context/AdBlockContext";
import { useWatch } from "@/context/WatchContext";
import Image from "next/image";
import CommentsSection from "@/components/CommentsSection";
import dynamic from "next/dynamic";
import MovieHero from "../../components/MovieHero";
import ProviderBar from "../../components/ProviderBar";
import { useUser } from "@clerk/nextjs";
import { useUserStore } from "@/store/userStore";

const DownloadModal = dynamic(() => import("@/components/DownloadModal"), { ssr: false });

const IMG_BASE = "https://image.tmdb.org/t/p";

const SERVERS = [
    {
        id: 'peachify',
        name: 'Toon Player VIP',
        badge: 'Multi-Audio',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://peachify.top/?type=tv&id=${id}&s=${s || 1}&e=${e || 1}&autoplay=1`
                : `https://peachify.top/?type=movie&id=${id}&autoplay=1`,
    },
    {
        id: 'vidlink',
        name: 'VidLink',
        badge: 'Auto-Next',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidlink.pro/tv/${id}/${s || 1}/${e || 1}?primaryColor=7C3AED&title=false&autoplay=true`
                : `https://vidlink.pro/movie/${id}?primaryColor=7C3AED&title=false&autoplay=true`,
    },
    {
        id: 'toon4k',
        name: 'Toon4K',
        badge: 'Premium 4K',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidsrc.pro/embed/tv/${id}/${s || 1}/${e || 1}?autoplay=1`
                : `https://vidsrc.pro/embed/movie/${id}?autoplay=1`,
    },
    {
        id: 'toon_ultimate',
        name: 'Toon Player Ultimate',
        badge: 'Best',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidsrc.to/embed/tv/${id}/${s || 1}/${e || 1}`
                : `https://vidsrc.to/embed/movie/${id}`,
    },
    {
        id: 'autoembed',
        name: 'Toon Player Auto',
        badge: 'Fast',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://autoembed.co/tv/tmdb/${id}/${s || 1}/${e || 1}`
                : `https://autoembed.co/movie/tmdb/${id}`,
    },
    {
        id: 'nontongo',
        name: 'ToonNortan',
        badge: 'Classic',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://www.nontongo.win/embed/tv/${id}/${s || 1}/${e || 1}`
                : `https://www.nontongo.win/embed/movie/${id}`,
    },
    {
        id: 'vidsrcto',
        name: 'Toon Player Pro',
        badge: 'CinEvo',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidsrc.to/embed/tv/${id}/${s || 1}/${e || 1}`
                : `https://vidsrc.to/embed/movie/${id}`,
    },
    {
        id: 'toon_titan',
        name: 'Toon Player Titan',
        badge: '4K/HD',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://embed.su/embed/tv/${id}/${s || 1}/${e || 1}`
                : `https://embed.su/embed/movie/${id}`,
    },
    {
        id: 'multiembed',
        name: 'Toon Player Multi',
        badge: 'Multi-Q',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s || 1}&e=${e || 1}`
                : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    },
    {
        id: 'vidfast',
        name: 'Toon Player Xtreme',
        badge: 'Reliable',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidfast.pro/tv/${id}/${s || 1}/${e || 1}?autoPlay=true&theme=7C3AED`
                : `https://vidfast.pro/movie/${id}?autoPlay=true&theme=7C3AED`,
    },
    {
        id: 'smashystream',
        name: 'SmashyStream',
        badge: 'CinEvo',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://embed.smashystream.com/playere.php?tmdb=${id}&s=${s || 1}&e=${e || 1}`
                : `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    },
    {
        id: 'toon_abyss',
        name: 'ToonAbyss',
        badge: 'AnimeSalt',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://vidsrc.cc/v2/embed/tv/${id}/${s || 1}/${e || 1}`
                : `https://vidsrc.cc/v2/embed/movie/${id}`,
    },
    {
        id: 'cineby',
        name: 'CineBy',
        badge: 'Fast',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://cineby.pro/tv/${id}/${s || 1}/${e || 1}?autoplay=true`
                : `https://cineby.pro/movie/${id}?autoplay=true`,
    },
    {
        id: 'rivestream',
        name: 'RiveStream',
        badge: 'HD',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://api.rivestream.xyz/embed/tv/?tmdb=${id}&season=${s || 1}&episode=${e || 1}`
                : `https://api.rivestream.xyz/embed/movie/?tmdb=${id}`,
    },
    {
        id: 'cinemaos',
        name: 'CinemaOS',
        badge: 'HD',
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            type === 'tv'
                ? `https://cinemaos.to/embed/tv/${id}/${s || 1}/${e || 1}`
                : `https://cinemaos.to/embed/movie/${id}`,
    },
];

const ANIME_SERVERS = [
    {
        id: "toon4k_anime",
        name: "Toon4K",
        badge: "4K",
        getUrl: (id: string, ep: number, tmdbId: string | null) =>
            tmdbId ? `https://vidlink.pro/tv/${tmdbId}/1/${ep}?primaryColor=3b82f6&title=false&autoplay=true` : `https://vidsrc.me/embed/anime?anilist=${id}&episode=${ep}`
    },
    {
        id: "vidsrc_anime",
        name: "VidSrc",
        badge: "Sub",
        getUrl: (id: string, ep: number, tmdbId: string | null) =>
            tmdbId ? `https://vidsrc.to/embed/tv/${tmdbId}/1/${ep}` : `https://vidsrc.me/embed/anime?anilist=${id}&episode=${ep}`
    },
    {
        id: "vidsrc_pro_anime",
        name: "VidSrc Pro",
        badge: "HD",
        getUrl: (id: string, ep: number, tmdbId: string | null) =>
            tmdbId ? `https://vidsrc.pro/embed/tv/${tmdbId}/1/${ep}?autoplay=1` : `https://vidsrc.me/embed/anime?anilist=${id}&episode=${ep}`
    },
    {
        id: "vidsrc_me_anime",
        name: "VidSrc Alt",
        badge: "Dub",
        getUrl: (id: string, ep: number, tmdbId: string | null) =>
            `https://vidsrc.me/embed/anime?anilist=${id}&episode=${ep}`
    },
];


// ── Trivia Generator ──────────────────────────────────────────────────────────
function generateTriviaFacts(details: any): string[] {
    const facts: string[] = [];
    const keywords: { name: string }[] = details?.keywords || [];
    const title = details?.title || details?.name || 'This title';
    const year = (details?.release_date || details?.first_air_date || '').slice(0, 4);
    const runtime = details?.runtime;
    const voteCount = details?.vote_count;
    const voteAvg = details?.vote_average;
    const director = details?.crew?.find((c: any) => c.job === 'Director');
    const genres: { name: string }[] = details?.genres || [];
    const companies: { name: string }[] = details?.production_companies || [];

    // TMDB keyword-based facts
    keywords.slice(0, 6).forEach(kw => {
        const k = kw?.name?.toLowerCase() || "";
        if (k.includes('based on novel') || k.includes('based on book')) facts.push(`"${title}" is based on a novel or book adaptation.`);
        else if (k.includes('sequel')) facts.push(`This is a sequel in an ongoing cinematic series.`);
        else if (k.includes('true story') || k.includes('based on true')) facts.push(`The story is inspired by or based on real-life events.`);
        else if (k.includes('post-apocalyptic')) facts.push(`Set in a post-apocalyptic world, the story explores survival and humanity.`);
        else if (k.includes('time travel')) facts.push(`Time travel is a central mechanic in the story, creating complex narrative loops.`);
        else if (k.includes('superhero')) facts.push(`A superhero narrative featuring extraordinary characters and universe-scale stakes.`);
        else if (k.includes('independent film')) facts.push(`"${title}" was produced as an independent film, outside major studio systems.`);
        else if (k.includes('anime')) facts.push(`Originally produced as a Japanese anime, known for its distinctive art style.`);
        else if (k.includes('martial arts')) facts.push(`The production features authentic martial arts choreography and training sequences.`);
        else if (k.includes('artificial intelligence') || k.includes('robot')) facts.push(`AI and robotics are central themes, reflecting near-future technological anxieties.`);
        else facts.push(`Tagged by audiences as: "${kw.name}".`);
    });

    // Metadata-based generated facts
    if (director) facts.push(`Directed by ${director.name}.`);
    if (runtime && runtime > 0) facts.push(`The total runtime is ${Math.floor(runtime / 60)}h ${runtime % 60}m — ${runtime > 150 ? 'an epic-length feature' : 'a tightly paced experience'}.`);
    if (year) facts.push(`Originally released in ${year}.`);
    if (voteCount && voteCount > 1000) facts.push(`Rated by over ${voteCount.toLocaleString()} users on TMDB with a ${voteAvg?.toFixed(1)}/10 score.`);
    if (genres.length > 0) facts.push(`Spans the ${genres.map((g: any) => g.name).join(', ')} genre${genres.length > 1 ? 's' : ''}.`);
    if (companies.length > 0) facts.push(`Produced by ${companies.slice(0, 2).map((c: any) => c.name).join(' and ')}.`);

    // Static fallback if nothing generated
    if (facts.length === 0) {
        return [
            'Production details were crafted with meticulous attention to set design.',
            'The score was developed in close collaboration with the director.',
            'Multiple drafts of the screenplay were written before principal photography.',
            'Key location sequences use real environments for authentic atmosphere.',
        ];
    }

    return facts.slice(0, 8);
}

// ── Simple inline markdown renderer ──────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
    if (!text) return null;
    // Bold **text**, italic *text*, inline code `code`
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-zinc-200">{part.slice(1, -1)}</em>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-white/10 text-purple-300 px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
    });
}


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
            host.includes('filemoon');

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
    keywords?: { id: number; name: string }[];
    watch_providers?: { provider_id: number; provider_name: string; logo_path: string }[];
    belongs_to_collection?: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null;
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
    const { isSignedIn } = useUser();
    const [type, setType] = useState(initialType);
    const { isAdBlockEnabled } = useAdBlock();
    const rawId = decodeURIComponent(encodedRawId || '');
    // Strip any prefix like 'tmdb:' from the ID so embed servers and API get a clean numeric ID
    const id = rawId.includes(':') ? rawId.split(':').pop()! : rawId;
    const router = useRouter();
    const searchParams = useSearchParams();
        const { history, addToHistory, getHistoryItem, watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isGuestProfile = activeProfile?.type === 'guest';
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [activeServer, setActiveServer] = useState<any>(SERVERS[0]); // Start with first server immediately
    const [loading, setLoading] = useState(true);
    const [showTrailer, setShowTrailer] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);

    const isAnimeServer = useMemo(() =>
        type === 'anime' || (activeServer ? (activeServer.type === 'anime' || ANIME_SERVERS.some(s => s.id === activeServer.id)) : false),
        [type, activeServer]
    );


    // Cast & Auto-Next state
    const [rawVideoSource, setRawVideoSource] = useState<string | null>(null);
    const [castAvailable, setCastAvailable] = useState(false);

    // Actor biography & dynamic detail tabs state
    const [selectedActor, setSelectedActor] = useState<any | null>(null);
    const [actorBioLoading, setActorBioLoading] = useState(false);
    const [actorCredits, setActorCredits] = useState<{ id: number; title?: string; name?: string; poster_path: string | null; media_type: string }[]>([]);
    const [activeDetailTab, setActiveDetailTab] = useState<"trivia" | "soundtrack" | "awards" | "providers">("trivia");
    const [showAllCast, setShowAllCast] = useState(false);

    const handleActorClick = async (person: any) => {
        setSelectedActor({
            id: person.id,
            name: person.name,
            character: person.character,
            profile_path: person.profile_path,
            biography: `Acclaimed cast member playing ${person.character} in this title. Their performance has garnered positive reviews.`
        });
        setActorCredits([]);
        setActorBioLoading(true);
        try {
            // Use server-side proxy to prevent API key exposure in client bundle
            const personRes = await axios.get(`/api/prime/person?id=${person.id}`);
            const { bio, credits } = personRes.data;
            if (bio?.biography) {
                setSelectedActor((prev: any) => {
                    if (prev && prev.id === person.id) {
                        return { ...prev, biography: bio.biography, birthday: bio.birthday, place_of_birth: bio.place_of_birth };
                    }
                    return prev;
                });
            }
            if (credits?.cast) {
                const sorted = [...credits.cast]
                    .filter((c: any) => c.poster_path)
                    .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0))
                    .slice(0, 6);
                setActorCredits(sorted);
            }
        } catch (err) {
            console.log("Failed to fetch actor details, using fallback bio.");
        } finally {
            setActorBioLoading(false);
        }
    };

    // Netflix-style Auto Next States
    const [showNextOverlay, setShowNextOverlay] = useState(false);
    const [nextCountdown, setNextCountdown] = useState(5);
    const nextIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const manualServerRef = useRef<string | null>(null);

    // Cleanup countdown timer on unmount
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        return () => {
            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
            if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
        };
    }, []);

    const renderEpisodesList = (mode: 'desktop' | 'mobile') => {
        if (type !== 'tv' || !details?.seasons || details?.seasons.length === 0) return null;
        return (
            <div className={`w-full ${mode === 'desktop' ? 'h-full flex flex-col' : ''}`}>
                                    <div className="flex flex-col gap-4 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1 h-6 bg-accent rounded-full shadow-[0_0_10px_var(--accent-glow)]" />
                                                <h2 className="text-xl font-bold">Episodes</h2>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex bg-bg-main p-0.5 rounded-lg border border-border-color">
                                                    <button onClick={() => setEpisodeLayoutMode("list")} className={`p-1 rounded-md transition-all ${episodeLayoutMode === "list" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}><List className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setEpisodeLayoutMode("grid")} className={`p-1 rounded-md transition-all ${episodeLayoutMode === "grid" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                                                </div>
                                                {episodes.length > 0 && <span className="text-xs text-[var(--text-muted)] bg-bg-card px-2 py-1 rounded-md">{activeFilteredEpisodes.length} EP{activeFilteredEpisodes.length !== 1 ? 's' : ''}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            {details?.seasons && details?.seasons.filter(s => s.season_number > 0).length > 1 && (
                                                <div className="relative flex-1 sm:max-w-[200px]">
                                                    <select value={selectedSeason} onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }} className="w-full appearance-none bg-bg-card border border-border-color text-[var(--text-main)] font-medium py-2 pl-4 pr-10 rounded-xl outline-none focus:border-blue-500 transition-colors cursor-pointer text-sm">
                                                        {details.seasons.filter(s => s.season_number > 0).sort((a, b) => a.season_number - b.season_number).map((season) => <option key={season.id} value={season.season_number}>Season {season.season_number} ({season.episode_count} eps)</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                                </div>
                                            )}
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                                <input type="text" placeholder="Search episode name or number..." value={episodeSearch} onChange={(e) => setEpisodeSearch(e.target.value)} className="w-full bg-bg-card border border-border-color text-white text-xs rounded-xl py-2 pl-9 pr-4 outline-none focus:border-accent transition-colors placeholder:text-zinc-500" />
                                                {episodeSearch && <button onClick={() => setEpisodeSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
                                            </div>
                                        </div>
                                    </div>
                                    {loadingEpisodes ? (
                                        <div className="flex justify-center items-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                                    ) : (
                                        <>
                                            {activeFilteredEpisodes.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                                                    <List className="w-8 h-8 text-zinc-600 mb-3" />
                                                    <p className="text-sm font-bold text-zinc-400">No episodes found</p>
                                                    <p className="text-xs text-zinc-600 mt-1">Try adjusting your search</p>
                                                </div>
                                            ) : episodeLayoutMode === "grid" ? (
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-1">
                                                    {activeFilteredEpisodes.map((ep) => (
                                                        <button key={ep.id} onClick={() => { setSelectedEpisode(ep.episode_number); }} className={`py-3 rounded-lg text-xs font-bold transition-all border text-center ${selectedEpisode === ep.episode_number ? 'border-accent bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02]/15 text-accent shadow-[0_0_8px_var(--accent-glow)] font-black' : 'border-border-color bg-[#08080B] text-zinc-400 hover:text-white'}`}>{ep.episode_number}</button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={mode === 'mobile' ? "flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-col sm:overflow-visible sm:snap-none sm:pb-0" : "flex flex-col gap-2"}>
                                                    {activeFilteredEpisodes.map((ep) => (
                                                        <button key={ep.id} onClick={() => { setSelectedEpisode(ep.episode_number); }} className={`flex ${mode === 'mobile' ? 'flex-col min-w-[200px] snap-center items-start' : 'items-center'} gap-3 p-3 rounded-xl border transition-all duration-[250ms] ease-out hover:-translate-y-[2px] hover:shadow-lg text-left ${selectedEpisode === ep.episode_number ? 'border-accent bg-accent/10 shadow-[0_0_12px_var(--accent-glow)]' : 'border-border-color bg-[#12131A] hover:border-accent/30'}`}>
                                                            <div className={`${mode === 'mobile' ? 'w-full aspect-video' : 'w-24 h-14'} rounded-lg overflow-hidden bg-bg-main flex-shrink-0 relative`}>
                                                                {(ep.still_path || details?.backdrop_path || details?.poster_path) ? <Image src={`${IMG_BASE}/w185${ep.still_path || details?.backdrop_path || details?.poster_path}`} alt={ep.name} fill sizes="185px" className="object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />}
                                                                {selectedEpisode === ep.episode_number && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Play className="w-5 h-5 text-white fill-current" /></div>}
                                                            </div>
                                                            <div className="flex-1 min-w-0 w-full">
                                                                <p className={`text-sm font-semibold line-clamp-1 ${selectedEpisode === ep.episode_number ? 'text-accent' : 'text-white'}`}>E{ep.episode_number}. {ep.name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">{ep.air_date && <span className="text-[10px] text-[var(--text-muted)]">{ep.air_date}</span>}{ep.runtime > 0 && <span className="text-[10px] text-[var(--text-muted)]">{ep.runtime}m</span>}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
            </div>
        );
    };


    
    // User Settings Support
    const [failedServers, setFailedServers] = useState<Set<string>>(new Set());
    const [serversList, setServersList] = useState<any[]>(SERVERS);
    const currentMediaTypeServers = useMemo(() =>
        typeof type === "string"
            ? serversList.filter(s => {
                if (!s.type) return true;
                const targetType = (type === "cartoon") ? "tv" : type;
                return s.type === targetType;
            })
            : serversList,
        [type, serversList]
    );
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [aggressiveSandbox, setAggressiveSandbox] = useState(true);
    const [playerLoaded, setPlayerLoaded] = useState(false);
    const [sourceError, setSourceError] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("Initializing Stream");
    
    // Watchlist
    const inWatchlist = isInWatchlist(id);

    // Unified playback state must be initialized before callbacks that close over it.
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
    const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);

    const activeFilteredEpisodes = useMemo(() => {
        if (!episodeSearch.trim()) return episodes;
        const search = episodeSearch.toLowerCase();
        return episodes.filter((ep: any) => {
            if (typeof ep === "string" || typeof ep === "number") return ep.toString() === search;
            return (ep.episode_number?.toString() === search || ep.name?.toLowerCase().includes(search) || ep.overview?.toLowerCase().includes(search));
        });
    }, [episodes, episodeSearch]);

    const triviaFacts = useMemo(() => {
        return generateTriviaFacts(details);
    }, [details]);


    // TV Auto-Next logic
    const handleVideoEnded = useCallback(() => {
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
    }, [type, episodes, selectedEpisode, showNextOverlay]);

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
        if (isGuestProfile) {
            toast.error("Watchlist is not available for Guest profiles. Please switch profiles or log in.", { icon: "🔒" });
            return;
        }
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
                toast.success("Link copied to clipboard! 📋");
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    };
    // Auto Server Selection State


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
        router.push(newUrl.pathname + newUrl.search, { scroll: false });
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
        router.push(newUrl.pathname + newUrl.search, { scroll: false });
    };

    // Read query parameters or history on load — use ref flag to run ONCE only
    const historyRestoredRef = useRef(false);
    useEffect(() => {
        const s = searchParams?.get("season") || searchParams?.get("s");
        const e = searchParams?.get("episode") || searchParams?.get("e") || searchParams?.get("ep");
        
        if (s || e) {
            if (s) setSelectedSeason(parseInt(s) || 1);
            if (e) setSelectedEpisode(parseInt(e) || 1);
        } else if (type === 'tv' && id && !historyRestoredRef.current && history && history.length > 0) {
            // Find most recently watched episode of this TV show from history (once per mount)
            const historyItem = history.find((i: any) => i.showId === id);
            if (historyItem) {
                historyRestoredRef.current = true;
                if (historyItem.season) setSelectedSeason(historyItem.season);
                if (historyItem.episodeNumber || historyItem.episodeId) {
                    setSelectedEpisode(Number(historyItem.episodeNumber || historyItem.episodeId) || 1);
                }
            }
        }
    // Keep history in the dependencies to re-trigger once it is loaded asynchronously
    }, [searchParams, id, type, history]);




    // Scroll-to-top visibility & header scroll visibility
    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }

            if (window.scrollY > 120) {
                setIsHeaderScrolled(true);
            } else {
                setIsHeaderScrolled(false);
            }
        };
        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    // Load App Settings
    useEffect(() => {
        const loadSettings = () => {
            try {
                const s = localStorage.getItem("toonplayer_settings");
                if (s) {
                    const parsed = JSON.parse(s);
                    if (parsed.aggressiveSandbox !== undefined) {
                        setAggressiveSandbox(parsed.aggressiveSandbox);
                    }
                }
            } catch (e) {}
        };
        loadSettings();
        window.addEventListener("profileUpdated", loadSettings);
        return () => window.removeEventListener("profileUpdated", loadSettings);
    }, []);


    // Refs to always get current episode/season inside setInterval (avoid stale closures)
    const selectedEpisodeRef = useRef(selectedEpisode);
    const selectedSeasonRef = useRef(selectedSeason);
    useEffect(() => { selectedEpisodeRef.current = selectedEpisode; }, [selectedEpisode]);
    useEffect(() => { selectedSeasonRef.current = selectedSeason; }, [selectedSeason]);

    // Sync TV season and episode state with URL search parameters
    useEffect(() => {
        if (type !== 'tv' && type !== 'cartoon') return;
        const params = new URLSearchParams(window.location.search);
        let changed = false;
        if (params.get('s') !== selectedSeason.toString()) {
            params.set('s', selectedSeason.toString());
            changed = true;
        }
        if (params.get('e') !== selectedEpisode.toString()) {
            params.set('e', selectedEpisode.toString());
            changed = true;
        }
        if (changed) {
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            router.replace(newUrl, { scroll: false });
        }
    }, [selectedSeason, selectedEpisode, type, router]);

    // Scroll to top exactly once when title (id/type), episode, or provider changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [id, type, selectedEpisode, selectedSeason, activeServer?.id]);

    useEffect(() => {
        setPlayerLoaded(false);
        setSourceError(false);
        setIframeKey(prev => prev + 1);
    }, [activeServer, selectedSeason, selectedEpisode, mode]);

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
                // Update active server state on the next tick to avoid state sync locks
                fallbackTimeoutRef.current = setTimeout(() => setActiveServer(nextServer), 50);
            } else {
                setSourceError(true);
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
        const controller = new AbortController();

        const fetchData = async () => {
            setLoading(true);
            try {
                if (initialType === "anime" || initialType === "cartoon") {
                    // 1. Fetch Anime/Cartoon Episodes/Metadata
                    const animeRes = await axios.get(`/api/anime/episodes?id=${id}`, { signal: controller.signal });
                    const show = animeRes.data.show;
                    setAnimeData(show);

                    // 2. Optimized TMDB Metadata Resolution
                    // Try to find a TMDB match using multiple title variants if available
                    const searchQueries = [show.name, show.englishName, show.romajiName].filter(Boolean);
                    let tmdbMatch = null;
                    
                    for (const q of searchQueries) {
                        try {
                            const tmdbSearch = await axios.get(`/api/prime/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
                            if (tmdbSearch.data.results?.length > 0) {
                                tmdbMatch = tmdbSearch.data.results[0];
                                break;
                            }
                        } catch (e) {
                            if (axios.isCancel(e)) throw e;
                        }
                    }

                    if (tmdbMatch) {
                        setTmdbIdForAnime(tmdbMatch.id.toString());
                        // Normalize media_type — TMDB multi-search can omit it
                        const mediaType = tmdbMatch.media_type === 'tv' ? 'tv' : 'movie';
                        const detailsRes = await axios.get(`/api/prime/details?id=${tmdbMatch.id}&type=${mediaType}`, { signal: controller.signal });
                        setDetails(detailsRes.data);
                        if (detailsRes.data.resolvedType && initialType !== "anime" && initialType !== "cartoon") {
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
                            res = await axios.get(`/api/prime/details?id=${id}&type=${initialType}`, { signal: controller.signal });
                            if (res.data) break;
                        } catch (retryErr) {
                            if (axios.isCancel(retryErr)) throw retryErr;
                            if (attempt === 1) throw retryErr;
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                    if (res?.data) {
                        setDetails(res.data);
                        let resolvedType = res.data.resolvedType || initialType;
                        const isJp = res.data.original_language === "ja" || 
                                     (Array.isArray(res.data.origin_country) && res.data.origin_country.includes("JP")) ||
                                     res.data.origin_country === "JP";
                        const genres = res.data.genres || [];
                        const isAnimation = Array.isArray(genres) && genres.some((g: any) => g.id === 16 || g.name === "Animation");
                        
                        if (isJp && isAnimation) {
                            resolvedType = "anime";
                        }
                        setType(resolvedType);

                        if (resolvedType === "anime") {
                            try {
                                const searchTitle = res.data.name || res.data.title;
                                if (searchTitle) {
                                    const animeSearch = await axios.get(`/api/search/unified?q=${encodeURIComponent(searchTitle)}`, { signal: controller.signal });
                                    const animeMatch = animeSearch.data.results?.find((item: any) => item.type === 'anime');
                                    if (animeMatch) {
                                        const animeRes = await axios.get(`/api/anime/episodes?id=${animeMatch.id}`, { signal: controller.signal });
                                        if (animeRes.data?.show) {
                                            setAnimeData(animeRes.data.show);
                                            const eps = animeRes.data.show.availableEpisodesDetail?.[mode] || [];
                                            setEpisodes(eps);
                                            if (eps.length > 0) setSelectedEpisode(parseInt(eps[0]) || 1);
                                            setTmdbIdForAnime(id);
                                        }
                                    }
                                }
                            } catch (animeErr) {
                                console.error("Failed to load anime mapping for TMDB show:", animeErr);
                            }
                        } else if ((resolvedType === "tv" || resolvedType === "cartoon") && res.data.seasons?.length > 0) {
                            setSelectedSeason(res.data.seasons[0].season_number || 1);
                        }
                    } else {
                        throw new Error('No data returned from TMDB');
                    }
                }
            } catch (err: any) {
                if (axios.isCancel(err) || err.name === 'CanceledError') return;
                console.error("Failed to fetch page data:", err);
                // Try robust fallback via TMDB Details which auto-classifies media type
                try {
                    const fallbackRes = await axios.get(`/api/prime/details?id=${id}&type=${initialType === 'movie' ? 'movie' : 'tv'}`, { signal: controller.signal });
                    if (fallbackRes.data) {
                        setDetails(fallbackRes.data);
                        let resolvedType = fallbackRes.data.resolvedType || initialType;
                        const isJp = fallbackRes.data.original_language === "ja" || 
                                     (Array.isArray(fallbackRes.data.origin_country) && fallbackRes.data.origin_country.includes("JP")) ||
                                     fallbackRes.data.origin_country === "JP";
                        const genres = fallbackRes.data.genres || [];
                        const isAnimation = Array.isArray(genres) && genres.some((g: any) => g.id === 16 || g.name === "Animation");
                        
                        if (isJp && isAnimation) {
                            resolvedType = "anime";
                        }
                        setType(resolvedType);

                        if (resolvedType === "anime") {
                            try {
                                const searchTitle = fallbackRes.data.name || fallbackRes.data.title;
                                if (searchTitle) {
                                    const animeSearch = await axios.get(`/api/search/unified?q=${encodeURIComponent(searchTitle)}`, { signal: controller.signal });
                                    const animeMatch = animeSearch.data.results?.find((item: any) => item.type === 'anime');
                                    if (animeMatch) {
                                        const animeRes = await axios.get(`/api/anime/episodes?id=${animeMatch.id}`, { signal: controller.signal });
                                        if (animeRes.data?.show) {
                                            setAnimeData(animeRes.data.show);
                                            const eps = animeRes.data.show.availableEpisodesDetail?.[mode] || [];
                                            setEpisodes(eps);
                                            if (eps.length > 0) setSelectedEpisode(parseInt(eps[0]) || 1);
                                            setTmdbIdForAnime(id);
                                        }
                                    }
                                }
                            } catch (animeErr) {
                                console.error("Failed to load anime mapping for TMDB show in fallback:", animeErr);
                            }
                        } else if ((resolvedType === "tv" || resolvedType === "cartoon") && fallbackRes.data.seasons?.length > 0) {
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
        return () => controller.abort();
    }, [id, initialType]);

    // Fetch episodes when season changes — with AbortController to prevent race conditions
    useEffect(() => {
        if (type !== 'tv' || !id || !details) return;
        setEpisodes([]); // Clear episodes immediately when season changes to prevent stale UI
        const controller = new AbortController();

        const fetchEpisodes = async () => {
            setLoadingEpisodes(true);
            try {
                const res = await axios.get(`/api/prime/season?id=${id}&season=${selectedSeason}`, {
                    signal: controller.signal
                });
                const eps = res.data.episodes || [];
                // Sort episodes by episode number ascending
                eps.sort((a: EpisodeInfo, b: EpisodeInfo) => a.episode_number - b.episode_number);
                setEpisodes(eps);
            } catch (err: any) {
                if (axios.isCancel(err) || err?.name === 'CanceledError') return; // ignore abort
                console.error("Failed to fetch episodes:", err);
            } finally {
                setLoadingEpisodes(false);
            }
        };
        fetchEpisodes();
        return () => controller.abort();
    }, [type, id, selectedSeason, details]);

    // Update anime episodes when mode (sub/dub) changes
    useEffect(() => {
        if (type === "anime" && animeData) {
            const eps = animeData.availableEpisodesDetail?.[mode] || [];
            setEpisodes(eps);
            if (eps.length > 0) setSelectedEpisode(parseInt(eps[0]) || 1);
        }
    }, [type, animeData, mode]);

    // Save to watch history when episode/season changes (separate from iframe reload)
    useEffect(() => {
        if (!details && !animeData) return;
        if (!id && !tmdbIdForAnime) return;
        try {
            const finalId = (type === 'anime' || type === 'cartoon') ? (animeData?._id || id) : id;
            const historyId = type === 'movie' ? finalId : `${finalId}-${selectedSeason}-${selectedEpisode}`;
            addToHistory({
                id: historyId,
                showId: finalId,
                type: type as any,
                title: details?.title || details?.name || animeData?.name || "Untitled",
                poster: details?.poster_path ? `https://image.tmdb.org/t/p/w200${details?.poster_path}` : (animeData?.thumbnail || ""),
                episodeId: type === 'movie' ? undefined : String(selectedEpisode),
                episodeNumber: type === 'movie' ? undefined : selectedEpisode,
                currentTime: 0,
                duration: 0,
                season: type === 'movie' ? undefined : selectedSeason,
            } as any);
        } catch (e) {
            console.error("Failed to save history:", e);
        }
    }, [selectedSeason, selectedEpisode, type, id, tmdbIdForAnime, details, animeData, addToHistory]);

    if (loading) {
        return (
            <main className="min-h-dvh bg-bg-main text-[var(--text-main)]">
                <div className="flex items-center justify-center min-h-dvh">
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
            <main className="bg-bg-main text-[var(--text-main)]">
                <div className="fixed top-0 left-0 right-0 z-50 h-[90px] md:h-[110px] lg:h-[140px] bg-bg-main/90 backdrop-blur-md border-b border-border-color flex items-center justify-center pt-[env(safe-area-inset-top)]">
                    <Link href="/" scroll={false} className="absolute top-[24px] left-[24px] z-50 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group shrink-0">
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform will-change-transform"  />
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
                            <div className="relative w-full aspect-video bg-bg-card rounded-b-xl overflow-hidden">
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
                                <a key={server.id} href={server.getUrl(type === "anime" ? "tv" : type, fallbackId, 1, 1)} target="_blank" rel="noopener" className="px-3 py-1.5 bg-bg-card border border-border-color rounded-lg text-xs font-medium hover:bg-border-color transition-colors">{server.name}</a>
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
        ? (activeServer as any)?.getUrl?.(animeData?.aniListId || animeData?._id || id, selectedEpisode, tmdbIdForAnime) || ""
        : activeServer?.getUrl?.(resolvedMediaType, activeId, selectedSeason, selectedEpisode) || "";
    const renderPlayer = () => {
        return (
            <div className="relative w-full z-20">
                {/* ── VIDEO CONTAINER ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className={`relative w-full will-change-transform ${
                        isFocusMode ? "h-[100dvh] rounded-none" : "aspect-video rounded-none sm:rounded-[24px]"
                    } bg-[#0a0a0a] overflow-hidden shadow-none sm:shadow-[0_8px_32px_rgba(0,0,0,0.6)]`}
                >
                    {/* Loading State */}
                    {!playerLoaded && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-20 h-20 rounded-full border border-accent/20 animate-ping" />
                                <div className="w-14 h-14 rounded-full border-[3px] border-accent/20 border-t-accent animate-spin" />
                                <Play className="absolute w-5 h-5 text-accent" />
                            </div>
                            <div className="text-center">
                                <p className="text-white text-xs font-black uppercase tracking-[0.2em] animate-pulse">{loadingStatus}</p>
                                <p className="text-zinc-600 text-[10px] font-medium mt-1 uppercase tracking-wider">{activeServer.name}</p>
                            </div>
                            {isUpcoming && (
                                <span className="px-4 py-1.5 bg-accent/20 text-accent border border-accent/30 rounded-full text-[10px] font-black uppercase tracking-widest">Upcoming Release</span>
                            )}
                        </div>
                    )}

                    {/* Upcoming Release Overlay */}
                    {isUpcoming && playerLoaded && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                            <div className="text-center max-w-sm">
                                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-accent/20">
                                    <Calendar className="w-8 h-8 text-accent" />
                                </div>
                                <h2 className="text-lg font-black text-white uppercase tracking-wide mb-2">Upcoming</h2>
                                <p className="text-xs text-zinc-400 leading-relaxed mb-6">This episode hasn't aired yet. Check back soon.</p>
                                <button onClick={() => router.back()} className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all">Go Back</button>
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
                                    className="px-4 py-2 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-lg font-bold text-xs transition-all flex items-center gap-1.5">
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
                        className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-[250ms] ${playerLoaded ? 'opacity-100' : 'opacity-0'}`}
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
                                            router.push(u.pathname + u.search, { scroll: false });
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
                                    isTheatreMode ? 'bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02]/15 border-accent/40 text-accent' : 'bg-white/[0.06] border-white/[0.08] text-zinc-400 hover:text-white'
                                }`} title="Theatre Mode">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="16" x2="22" y2="16"/></svg>
                            </button>
                            <button onClick={() => { setIsFocusMode(!isFocusMode); if (isTheatreMode) setIsTheatreMode(false); }}
                                className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all ${
                                    isFocusMode ? 'bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02]/15 border-accent/40 text-accent' : 'bg-white/[0.06] border-white/[0.08] text-zinc-400 hover:text-white'
                                }`} title="Focus Mode">
                                <Shield className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderHero = () => {
        return <MovieHero backdropPath={details?.backdrop_path} />;
    };

    const renderProviders = () => {
        return (
            <ProviderBar
                title={title}
                type={type}
                resolvedMediaType={resolvedMediaType as string}
                selectedSeason={selectedSeason}
                selectedEpisode={selectedEpisode}
                activeServer={activeServer}
                failedServers={failedServers}
                serversList={serversList}
                animeServers={ANIME_SERVERS}
                onSelectServer={handleManualServerSelect}
            />
        );
    };

    const renderEpisodesSidebar = () => {
        if (type === 'movie') return null;
        if (!isAnimeServer && (!details?.seasons || details.seasons.length === 0)) return null;
        if (isAnimeServer && (!animeData?.availableEpisodesDetail || !episodes || episodes.length === 0)) return null;
        
        return (
            <div className="hidden lg:flex flex-col w-full h-[calc(100dvh-120px)] sticky top-[90px] rounded-[22px] overflow-hidden bg-white/[0.02] backdrop-blur-md border border-white/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {renderEpisodesList('desktop')}
                </div>
            </div>
        );
    };

    const renderDesktopEpisodes = renderEpisodesSidebar;

    const renderMobileEpisodes = () => {
        if (type === 'movie') return null;
        if (!isAnimeServer && (!details?.seasons || details.seasons.length === 0)) return null;
        if (isAnimeServer && (!animeData?.availableEpisodesDetail || !episodes || episodes.length === 0)) return null;
        
        return (
            <>
                {/* Mobile View: Carousel (under max-md) */}
                <div className="w-full md:hidden mb-6 block mt-4 px-4 sm:px-6">
                    {renderEpisodesList('mobile')}
                </div>

                {/* Tablet View: Bottom Sheet Trigger Card (md to lg) */}
                <div className="w-full hidden md:max-lg:block mb-6 mt-4 px-4 sm:px-6">
                    <button 
                        onClick={() => setShowEpisodesDrawer(true)} 
                        className="w-full py-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-white font-bold transition-all active:scale-95 cursor-pointer shadow-lg"
                    >
                        <List className="w-5 h-5 text-accent" />
                        <span>Show Episodes List ({activeFilteredEpisodes.length} Episodes)</span>
                    </button>
                </div>
            </>
        );
    };

    const renderCast = () => {
        if (!details?.cast || details?.cast?.length === 0) return null;
        return (
            <section className="mt-6 w-full">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-400" />
                        <h2 className="text-base font-bold">Top Cast</h2>
                    </div>
                    {details?.cast?.length > 15 && (
                        <button onClick={() => setShowAllCast(!showAllCast)} className="text-xs font-bold text-accent hover:text-white transition-colors">
                            {showAllCast ? 'Show Less' : 'See All'}
                        </button>
                    )}
                </div>
                <div className={`flex flex-wrap gap-y-4 gap-x-2 w-full ${!showAllCast ? 'overflow-x-auto hide-scrollbar flex-nowrap pb-2' : 'justify-start'}`}>
                    {(showAllCast ? details?.cast : details?.cast?.slice(0, 15)).map((person: any) => (
                        <button 
                            key={person.id} 
                            onClick={() => handleActorClick(person)}
                            className={`flex-shrink-0 text-center group focus:outline-none outline-none ${showAllCast ? 'w-[calc(25%-8px)] sm:w-[calc(16.6%-8px)] md:w-[calc(12.5%-8px)] lg:w-[calc(10%-8px)]' : 'w-[80px]'}`}
                        >
                            <div className="w-[60px] h-[60px] mx-auto mb-1.5 rounded-full overflow-hidden bg-bg-card border border-white/5 group-hover:border-accent/50 transition-all active:scale-95 shadow-lg relative">
                                {person.profile_path ? (
                                    <Image src={`${IMG_BASE}/w185${person.profile_path}`} alt={person.name} fill sizes="185px" className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm font-bold bg-gradient-to-br from-zinc-800 to-zinc-900">
                                        {person.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-[var(--text-main)] line-clamp-1 group-hover:text-accent transition-all">{person.name}</p>
                            <p className="text-[9px] text-zinc-500 line-clamp-1 mt-0.5">{person.character}</p>
                        </button>
                    ))}
                </div>
            </section>
        );
    };

    const renderRecommendations = () => {
        if (!details?.recommendations || details?.recommendations?.length === 0) return null;
        return (
            <section className="relative z-10 mt-[40px] bg-bg-main px-0 py-6 sm:px-4 md:px-6 lg:px-8 max-w-[1800px] mx-auto w-full">
                <div className="flex items-center gap-3 mb-4"><div className="w-1 h-6 bg-accent rounded-full shadow-[0_0_10px_var(--accent-glow)]" /><h2 className="text-lg font-bold">You May Also Like</h2></div>
                <MovieRow items={details?.recommendations || []} type={type} />
            </section>
        );
    };

    const renderSimilar = () => {
        if (!details?.similar || details?.similar?.length === 0) return null;
        return (
            <section className="relative z-10 mt-[40px] bg-bg-main px-0 py-6 sm:px-4 md:px-6 lg:px-8 max-w-[1800px] mx-auto w-full">
                <div className="flex items-center gap-3 mb-4"><div className="w-1 h-6 bg-accent rounded-full shadow-[0_0_10px_var(--accent-glow)]" /><h2 className="text-lg font-bold">Similar</h2></div>
                <MovieRow items={details?.similar || []} type={type} />
            </section>
        );
    };

    const renderComments = () => {
        const slugStr = details?.title 
            ? details.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') 
            : undefined;
        return (
            <section className="relative z-10 mt-[48px] mb-[64px] bg-bg-main px-0 pt-6 pb-0 sm:px-4 md:px-6 lg:px-8 max-w-[1800px] mx-auto w-full">
                <CommentsSection 
                    contentId={id} 
                    category={type === "movie" ? "movie" : "anime"} 
                    episodeId={type === "movie" ? undefined : selectedEpisode}
                    seasonId={type === "movie" ? undefined : selectedSeason}
                    slug={slugStr}
                />
            </section>
        );
    };

    return (
        <>
        <div className="relative isolate min-h-dvh overflow-x-clip bg-bg-main text-[var(--text-main)]">
            {!isFocusMode && (
                <div className={`fixed top-0 left-0 right-0 z-[100] h-[calc(60px+env(safe-area-inset-top))] md:h-[calc(72px+env(safe-area-inset-top))] pt-[calc(env(safe-area-inset-top)+8px)] md:pt-[calc(env(safe-area-inset-top)+12px)] lg:pt-[calc(env(safe-area-inset-top)+16px)] bg-bg-main/98 backdrop-blur-3xl shadow-lg border-b border-white/10 flex items-center px-4 md:px-6 gap-3 transition-all duration-[250ms] ease-apple will-change-transform ${
                    isHeaderScrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
                }`}>
                    <Link href="/" scroll={false} className="shrink-0 flex items-center justify-center w-9 h-9 bg-white/[0.06] hover:bg-white/[0.12] rounded-full border border-white/10 text-zinc-400 hover:text-white transition-all group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform will-change-transform"  />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-black text-sm md:text-base leading-tight text-white truncate tracking-tight">{type === 'cartoon' ? `Cartoon: ${title}` : title}</h2>
                        {(type === 'tv' || type === 'anime' || type === 'cartoon') && resolvedMediaType !== 'movie' && (
                            <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase mt-0.5">Season {selectedSeason} · Episode {selectedEpisode}</p>
                        )}
                    </div>
                    {details?.vote_average && details.vote_average > 0 && (
                        <div className="shrink-0 hidden sm:flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-md">
                            <span className="text-yellow-400 text-[11px]">★</span>
                            <span className="text-[11px] font-bold text-zinc-300">{details.vote_average.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            )}
            <div className={`${isFocusMode ? "pt-0 w-full" : "w-full pt-[calc(60px+env(safe-area-inset-top)+16px)] md:pt-[calc(72px+env(safe-area-inset-top)+16px)] pb-4 mb-[env(safe-area-inset-bottom)]"}`}>
                {isFocusMode && (
                    <button onClick={() => setIsFocusMode(false)} className="fixed top-4 left-4 z-[999] flex items-center gap-1.5 px-3.5 py-2 bg-black/80 hover:bg-black border border-white/10 rounded-xl text-xs font-bold text-white transition-all shadow-xl mt-[env(safe-area-inset-top)] ml-[env(safe-area-inset-left)]">
                        <X className="w-3.5 h-3.5" /> Exit Focus Mode
                    </button>
                )}
                {(isTheatreMode || isFocusMode) && (
                    <div className={`w-full ${isFocusMode ? "h-[100dvh] bg-black rounded-none border-0 overflow-hidden" : "mb-6"}`}>{renderPlayer()}</div>
                )}
                {!isFocusMode && (
                    <div className="flex flex-col gap-0 items-start w-full bg-transparent">
                        <div className="flex-1 w-full min-w-0">
                            {/* HeroSection via Component */}
                            {renderHero()}

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
                                            {title}
                                        </h1>
                                        {((type === 'tv' || type === 'cartoon') && resolvedMediaType !== 'movie') && (
                                            <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                                Season {selectedSeason} <span className="text-zinc-600">·</span> Episode {selectedEpisode}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:ml-auto">
                                    {details?.trailer && (
                                        <button 
                                            onClick={() => setShowTrailer(true)} 
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-xs font-bold text-white transition-all shrink-0 cursor-pointer"
                                        >
                                            <Play className="w-3 h-3 fill-white" /> Trailer
                                        </button>
                                    )}
                                    {details?.vote_average && details.vote_average > 0 && (
                                        <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 font-bold text-xs">
                                            <span>★</span>
                                            <span>{details.vote_average.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Player & Episode Layout */}
                            <div className={`relative z-10 w-full max-w-[1800px] mx-auto mt-0 mb-0 ${
                                (type === 'movie' || resolvedMediaType === 'movie') 
                                    ? 'flex flex-col' 
                                    : 'grid grid-cols-1 lg:grid-cols-[74%_minmax(0,26%)] gap-6 items-start'
                            }`}>
                                {/* Player Column */}
                                <div className={`w-full min-w-0 bg-white/[0.02] backdrop-blur-md p-0 rounded-none sm:rounded-[22px] shadow-[0_10px_40px_rgba(0,0,0,0.45)] border-0 sm:border border-white/[0.05] overflow-hidden ${
                                    (type === 'movie' || resolvedMediaType === 'movie') ? 'max-w-[1300px] mx-auto' : ''
                                }`}>
                                    {!isTheatreMode && <div className="mb-0">{renderPlayer()}</div>}
                                    {/* ── SERVER SELECTION BAR ── */}
                                    <div className="mt-0">
                                        {renderProviders()}
                                    </div>
                                </div>

                                {/* Desktop Episodes Sidebar (26%) */}
                                {renderDesktopEpisodes()}
                            </div>

                            {/* Mobile/Tablet Episodes (Hidden on Desktop) */}
                            {renderMobileEpisodes()}

                            {/* Metadata Section (Providers -> Metadata = 20px, pb-0 to let description bottom margin control spacing) */}
                            <div className="relative z-10 bg-bg-main p-4 sm:p-6 md:p-8 rounded-none sm:rounded-[24px] border-y sm:border border-white/5 w-full max-w-[1800px] mx-auto mt-[20px] flex flex-col gap-6 items-start pb-0 sm:pb-0 md:pb-0">
                                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start w-full">
                                    <div className="flex-shrink-0 w-[120px] sm:w-[140px] md:w-[200px] lg:w-[220px] relative mx-auto lg:mx-0">
                                        {details?.poster_path && (
                                            <div className="relative group aspect-[2/3] w-full">
                                                <Image src={`${IMG_BASE}/w500${details.poster_path}`} alt={title} fill sizes="(max-width: 768px) 50vw, 30vw" className="object-cover rounded-2xl shadow-2xl border border-border-color transition-transform group-hover:scale-[1.02] will-change-transform"  />
                                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="mb-6 flex items-start justify-between gap-4">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-y-2 gap-x-3 sm:gap-x-4 text-xs sm:text-sm font-medium text-[var(--text-muted)]">
                                                    <span className="flex items-center gap-1 sm:gap-1.5 font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md"><Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> {matchPercent}% Match</span>
                                                    <span>{year}</span>
                                                    {details?.runtime ? <span>{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span> : <span>{type === "tv" ? `${details?.number_of_seasons || 0} Seasons` : type === "anime" ? "Anime" : ""}</span>}
                                                    <span className="px-2 py-0.5 rounded border border-border-color text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">{details?.status || "Released"}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                                            {details?.genres?.map((genre: any) => (
                                                <span key={genre.id} className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/5 border border-white/10 rounded-lg sm:rounded-full text-[10px] sm:text-xs font-bold tracking-wide text-zinc-300 hover:text-white hover:bg-white/10 transition-all">{genre.name}</span>
                                            ))}
                                        </div>
                                        <div className="bg-bg-card rounded-xl border border-border-color p-4 md:p-6 mb-6 sm:mb-8">
                                            {type === "anime" && resolvedMediaType !== "movie" && episodes.length > 0 && (
                                                <div className="mb-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="font-bold text-base sm:text-lg flex items-center gap-2"><Play className="w-4 h-4 text-blue-500 fill-current" /> Episodes</h3>
                                                        <div className="flex bg-bg-main p-1 rounded-lg border border-border-color">
                                                            <button onClick={() => setMode("sub")} className={`px-3 sm:px-4 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all ${mode === "sub" ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-white"}`}>SUB</button>
                                                            <button onClick={() => setMode("dub")} className={`px-3 sm:px-4 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all ${mode === "dub" ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-white"}`}>DUB</button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[200px] overflow-y-auto scrollbar-none p-1">
                                                        {episodes.map((epNum: string) => (
                                                            <button key={epNum} onClick={() => setSelectedEpisode(parseInt(epNum))} className={`py-2 rounded-lg text-xs font-bold transition-all border ${selectedEpisode === parseInt(epNum) ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-lg shadow-accent/30" : "bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white"}`}>{epNum}</button>
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
                                                <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto w-full md:w-auto mt-4 md:mt-0">
                                                    <button onClick={toggleWatchlist} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xl active:scale-95 flex-1 md:flex-none justify-center ${inWatchlist ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-accent/20 hover:scale-105" : "bg-white text-black shadow-white/5 hover:scale-105"}`}><Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${inWatchlist ? "fill-white" : ""}`} /> {inWatchlist ? "In Watchlist" : "Watchlist"}</button>
                                                    <button onClick={() => setShowDownloadModal(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex-1 md:flex-none justify-center"><Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Download</button>
                                                    <button onClick={handleShare} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-bg-card border border-border-color text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-border-color transition-all active:scale-95 flex-1 md:flex-none justify-center"><Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Share</button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {details?.belongs_to_collection && (
                                            <div className="bg-gradient-to-r from-bg-card to-transparent border border-white/10 rounded-xl p-4 mb-6 flex items-center gap-4 hover:border-white/20 transition-all cursor-pointer" onClick={() => router.push(`/search?q=${encodeURIComponent(details.belongs_to_collection!.name)}`, { scroll: false })}>
                                                {details.belongs_to_collection.poster_path && (
                                                    <div className="w-12 h-16 shrink-0 rounded overflow-hidden relative">
                                                        <Image src={`${IMG_BASE}/w92${details.belongs_to_collection.poster_path}`} alt="" fill sizes="92px" className="object-cover" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[10px] text-accent font-bold uppercase tracking-widest mb-0.5">Part of Collection</p>
                                                    <h4 className="text-sm font-bold text-white mb-1">{details.belongs_to_collection.name}</h4>
                                                    <p className="text-xs text-zinc-500 font-medium">Click to see all titles in this franchise</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto" />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                                            {director && <div className="bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-border-color"><span className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider">Director</span><p className="text-white font-medium mt-0.5 truncate">{director.name}</p></div>}
                                            {details?.spoken_languages && details.spoken_languages.length > 0 && <div className="bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-border-color"><span className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" /> Language</span><p className="text-white font-medium mt-0.5 truncate">{details?.spoken_languages?.[0]?.english_name || "English"}</p></div>}
                                            {details?.status && <div className="bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-border-color"><span className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider">Status</span><p className="text-white font-medium mt-0.5 truncate">{details.status}</p></div>}
                                            {details?.vote_count && <div className="bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-border-color"><span className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider">Votes</span><p className="text-white font-medium mt-0.5 truncate">{details?.vote_count?.toLocaleString() || "0"}</p></div>}
                                        </div>
                                    </div>
                                </div>

                                {/* Cast list inside Metadata Section */}
                                {renderCast()}

                                {/* Cinematic Insights Tabs Panel inside Metadata Section */}
                                <section className="mt-6 border border-white/5 rounded-2xl bg-[#111111] overflow-hidden w-full">
                                    <div className="flex border-b border-white/5 bg-black/20 text-[10px] sm:text-xs font-black tracking-wider uppercase overflow-x-auto hide-scrollbar flex-nowrap md:flex-wrap">
                                        {(["trivia", "soundtrack", "awards", "providers"] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveDetailTab(tab)}
                                                className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer flex justify-center items-center gap-1.5 ${
                                                    activeDetailTab === tab 
                                                        ? "border-accent text-white bg-white/[0.02]" 
                                                        : "border-transparent text-zinc-500 hover:text-white"
                                                }`}
                                            >
                                                {tab === "trivia" && <Info className="w-3.5 h-3.5" />}
                                                {tab === "soundtrack" && <Volume2 className="w-3.5 h-3.5" />}
                                                {tab === "awards" && <Trophy className="w-3.5 h-3.5" />}
                                                {tab === "providers" && <MonitorPlay className="w-3.5 h-3.5" />}
                                                <span className="hidden sm:inline">{tab}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-5 min-h-[140px]">
                                        {activeDetailTab === "trivia" && (
                                            <ul className="space-y-3 text-xs text-zinc-300 leading-relaxed font-inter">
                                                {triviaFacts.map((fact, i) => (
                                                    <li key={i} className="flex gap-3">
                                                        <span className="text-accent shrink-0 mt-0.5">•</span>
                                                        <span>{renderMarkdown(fact)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {activeDetailTab === "soundtrack" && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1 flex items-center gap-2"><Tag className="w-3 h-3" /> Keywords & Themes</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {details?.keywords && details.keywords.length > 0 ? (
                                                        details.keywords.map((kw: any) => (
                                                            <Link key={kw.id} href={`/search?q=${encodeURIComponent(kw.name)}`} scroll={false} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold text-zinc-300 hover:text-white transition-colors">
                                                                #{kw.name}
                                                            </Link>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-zinc-500 italic">No specific keywords recorded.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {activeDetailTab === "awards" && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-xl bg-gradient-to-br from-bg-main to-black border border-white/5 flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-full border-[3px] border-accent flex items-center justify-center bg-black/50 shrink-0">
                                                        <span className="text-lg font-black text-white">{details?.vote_average?.toFixed(1) || "N/A"}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white mb-0.5">ToonPlayer Community Score</p>
                                                        <p className="text-[10px] text-zinc-400 font-medium">Based on {details?.vote_count?.toLocaleString() || "0"} global verified ratings</p>
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                                        <Trophy className="w-6 h-6 text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white mb-0.5">Popularity Index</p>
                                                        <p className="text-[10px] text-zinc-400 font-medium">Trending highly among global audiences this week.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {activeDetailTab === "providers" && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Available Streaming Partners (US)</p>
                                                <div className="flex flex-wrap gap-3">
                                                    {details?.watch_providers && details.watch_providers.length > 0 ? (
                                                        details.watch_providers.map((prov: any) => (
                                                            <div key={prov.provider_id} className="flex items-center gap-2 px-3.5 py-2 bg-[#08080B] border border-white/5 rounded-xl">
                                                                <Image src={`${IMG_BASE}/w92${prov.logo_path}`} alt={prov.provider_name} width={24} height={24} className="rounded bg-zinc-800" />
                                                                <span className="text-xs font-bold text-white">{prov.provider_name}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-zinc-500 italic">No official streaming data available. Use our provided servers above.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Description (Overview) - exactly at the bottom of the Metadata container (Metadata -> Description = 24px, Description -> Recommendations = 40px) */}
                                <div className="mt-[24px] mb-[40px] w-full">
                                    <p className="text-[var(--text-muted)] text-xs sm:text-sm md:text-base leading-relaxed max-w-3xl">{details?.overview}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {!isFocusMode && renderRecommendations()}
            {!isFocusMode && renderSimilar()}
            {!isFocusMode && renderComments()}
            <AnimatePresence>
                {showScrollTop && !isFocusMode && (
                    <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 z-40 p-3 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02]/90 hover:opacity-90 text-white rounded-full shadow-[0_0_20px_var(--accent-glow)] backdrop-blur-sm transition-colors"><ChevronUp className="w-5 h-5" /></motion.button>
                )}
            </AnimatePresence>
        </div>
        <Script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" strategy="afterInteractive" />
        <AnimatePresence>
            {showDownloadModal && (
                <DownloadModal 
                    type={type} 
                    id={id} 
                    selectedSeason={selectedSeason} 
                    selectedEpisode={selectedEpisode} 
                    title={title} 
                    onClose={() => setShowDownloadModal(false)} 
                />
            )}
        </AnimatePresence>
        <AnimatePresence>
            {showTrailer && details?.trailer && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4" onClick={() => setShowTrailer(false)}>
                    <div className="w-full max-w-5xl bg-bg-elevated border border-white/10 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                            <h3 className="font-bold text-white flex items-center gap-2"><Film className="w-4 h-4 text-accent" /> Official Trailer</h3>
                            <button onClick={() => setShowTrailer(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
                        </div>
                        <div className="aspect-video w-full relative bg-black">
                            <iframe
                                src={`https://www.youtube.com/embed/${details.trailer.key}?autoplay=1&rel=0&modestbranding=1`}
                                className="absolute inset-0 w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </motion.div>
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
                        className="fixed inset-0 bg-black z-[100] md:max-lg:block hidden"
                    />
                    {/* Drawer Container */}
                    <motion.div 
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 h-[60dvh] bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-white/10 rounded-t-[24px] z-[101] md:max-lg:flex flex-col hidden p-6"
                    >
                        {/* Handle bar */}
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowEpisodesDrawer(false)} />
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-lg">Episodes</h3>
                            <button onClick={() => setShowEpisodesDrawer(false)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {renderEpisodesList('desktop')}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        {/* Floating Button for Tablet Episodes Drawer */}
        <button 
            onClick={() => setShowEpisodesDrawer(true)}
            className="fixed bottom-20 right-6 z-[99] md:max-lg:flex hidden items-center gap-2 px-5 py-3 bg-gradient-to-r from-accent to-accent-warm text-white rounded-full font-bold shadow-2xl active:scale-95 transition-all hover:scale-105 cursor-pointer"
        >
            <List className="w-4 h-4" /> View Episodes
        </button>
        </>
    );
}
