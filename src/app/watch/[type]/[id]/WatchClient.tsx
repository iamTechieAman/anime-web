"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import React from "react";
import Script from "next/script";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ServerHealthManager } from "@/utils/ServerHealthManager";
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
import { EpisodeListSkeleton, PlayerContainerSkeleton, DetailsSkeleton } from "@/components/SkeletonLoader";
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
    {
        id: 'kartoons',
        name: 'Kartoons Direct',
        badge: 'Toon Player',
        requiresScrape: true,
        getUrl: (type: string, id: string, s?: number, e?: number) =>
            `/api/scrape/kartoons?showId=${id}&s=${s || 1}&e=${e || 1}&type=${type}`,
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
    {
        id: "kartoons_toon",
        name: "Kartoons Toon",
        badge: "Toon Hub",
        requiresScrape: true,
        getUrl: (id: string, ep: number, tmdbId: string | null) =>
            `/api/scrape/kartoons?showId=${id}&e=${ep}&type=show`,
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

import { isValidEmbedUrl } from "@/components/VideoEmbed";

interface VideoIframeProps {
    src: string;
    mediaKey: string;
    title: string;
    playerLoaded: boolean;
    isFocusMode?: boolean;
    onLoad: (e: React.SyntheticEvent<HTMLIFrameElement>) => void;
    onError: () => void;
    iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

const VideoIframeEmbed = React.memo(function VideoIframeEmbed({
    src,
    mediaKey,
    title,
    playerLoaded,
    isFocusMode,
    onLoad,
    onError,
    iframeRef,
}: VideoIframeProps) {
    useEffect(() => {
        if (src) {
            console.log("[DEBUG] Playing URL:", src);
        }
    }, [src]);

    if (!src || src.trim() === "") {
        return (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black gap-3">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider animate-pulse">Loading server...</p>
            </div>
        );
    }

    if (!isValidEmbedUrl(src)) {
        return (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 text-center p-4">
                <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs mb-1">
                    Invalid Stream Source Protected
                </div>
                <p className="text-zinc-500 text-[11px] max-w-xs leading-relaxed">
                    Raw website URL blocked from iframe execution.
                </p>
            </div>
        );
    }

    return (
        <iframe
            key={src}
            ref={iframeRef}
            src={src}
            className={`absolute top-0 left-0 w-full h-full border-0 bg-black transition-opacity duration-200 ${
                playerLoaded ? "opacity-100" : "opacity-0"
            }`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen={true}
            referrerPolicy="origin"
            title={title}
            onError={onError}
            onLoad={onLoad}
        />
    );
}, (prevProps, nextProps) => prevProps.src === nextProps.src);

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
    episode_runtime?: number;
    episode_run_time?: number[];
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
    const [reloadCount, setReloadCount] = useState(0);

    // Initial season/episode derived from URL searchParams
    const initialSeason = useMemo(() => {
        const s = searchParams?.get('season') || searchParams?.get('s');
        return s ? Math.max(1, parseInt(s, 10) || 1) : 1;
    }, [searchParams]);

    const initialEpisode = useMemo(() => {
        const e = searchParams?.get('episode') || searchParams?.get('e') || searchParams?.get('ep');
        return e ? Math.max(1, parseInt(e, 10) || 1) : 1;
    }, [searchParams]);

    // Unified playback state
    const [animeData, setAnimeData] = useState<ShowData | null>(null);
    const [selectedSeason, setSelectedSeason] = useState(initialSeason);
    const [selectedEpisode, setSelectedEpisode] = useState(initialEpisode);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [mode, setMode] = useState<"sub" | "dub">("sub");
    const [tmdbIdForAnime, setTmdbIdForAnime] = useState<string | null>(null);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isTheatreMode, setIsTheatreMode] = useState(false);
    const [episodeSearch, setEpisodeSearch] = useState("");
    const [episodeLayoutMode, setEpisodeLayoutMode] = useState<"list" | "grid">("list");
    const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
    const [failedServers, setFailedServers] = useState<Set<string>>(new Set());
    const [serversList, setServersList] = useState<any[]>(SERVERS);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [aggressiveSandbox, setAggressiveSandbox] = useState(true);
    const [playerLoaded, setPlayerLoaded] = useState(false);
    const [sourceError, setSourceError] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("Initializing Stream");
    const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('toonplayer_autoplay_next');
            return saved !== null ? saved === 'true' : true;
        }
        return true;
    });

    const handleToggleAutoPlayNext = useCallback((val: boolean) => {
        setAutoPlayNext(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem('toonplayer_autoplay_next', String(val));
        }
        toast(val ? 'Auto-play Next: ON' : 'Auto-play Next: OFF', { icon: val ? '⚡' : '⏸️' });
    }, []);

    // Refs to always get current episode/season inside callbacks without stale closures
    const selectedEpisodeRef = useRef(selectedEpisode);
    const selectedSeasonRef = useRef(selectedSeason);
    useEffect(() => { selectedEpisodeRef.current = selectedEpisode; }, [selectedEpisode]);
    useEffect(() => { selectedSeasonRef.current = selectedSeason; }, [selectedSeason]);

    const handleSelectEpisode = useCallback((epNum: number, sNum?: number) => {
        const seasonToUse = sNum !== undefined ? sNum : selectedSeasonRef.current;
        setSelectedEpisode(epNum);
        if (sNum !== undefined && sNum !== selectedSeasonRef.current) {
            setSelectedSeason(sNum);
        }
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            params.set('s', seasonToUse.toString());
            params.set('e', epNum.toString());
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            router.replace(newUrl, { scroll: false });
        }
    }, [router]);

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
    const activeRequestRef = useRef<string | null>(null);

    // Cleanup countdown timer on unmount
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        return () => {
            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
            if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
        };
    }, []);

    const activeFilteredEpisodes = useMemo(() => {
        if (!episodeSearch.trim()) return episodes;
        const search = episodeSearch.toLowerCase();
        return episodes.filter((ep: any) => {
            if (typeof ep === "string" || typeof ep === "number") return ep.toString() === search;
            return (
                ep.episode_number?.toString() === search ||
                ep.name?.toLowerCase().includes(search) ||
                (ep.overview ?? "").toLowerCase().includes(search)
            );
        });
    }, [episodes, episodeSearch]);

    const renderEpisodesList = (mode: 'desktop' | 'mobile') => {
        // Show episode list for both TV and cartoon content types
        if ((type !== 'tv' && type !== 'cartoon') || !details?.seasons || details?.seasons.length === 0) return null;
        return (
            <div className={`w-full ${mode === 'desktop' ? 'h-full flex flex-col' : ''}`}>
                <div className="flex flex-col gap-4 mb-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-5 bg-gradient-to-b from-accent to-accent-warm rounded-full shadow-[0_0_12px_var(--accent-glow)]" />
                            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">Episodes</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-[#0d0e14] p-0.5 rounded-xl border border-white/[0.08] shadow-inner">
                                <button
                                    onClick={() => setEpisodeLayoutMode("list")}
                                    aria-label="List view"
                                    className={`p-1.5 rounded-lg transition-all ${episodeLayoutMode === "list" ? "bg-white/15 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setEpisodeLayoutMode("grid")}
                                    aria-label="Grid view"
                                    className={`p-1.5 rounded-lg transition-all ${episodeLayoutMode === "grid" ? "bg-white/15 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {episodes.length > 0 && (
                                <span className="text-[11px] font-black text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-lg">
                                    {activeFilteredEpisodes.length} EP{activeFilteredEpisodes.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                        {details?.seasons && details?.seasons.filter(s => s.season_number > 0).length > 1 && (
                            <div className="relative flex-1 sm:max-w-[200px]">
                                <select
                                    value={selectedSeason}
                                    onChange={(e) => { handleSelectEpisode(1, Number(e.target.value)); }}
                                    className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] text-white font-semibold py-2 pl-3.5 pr-8 rounded-xl outline-none focus:border-accent transition-colors cursor-pointer text-xs"
                                >
                                    {details.seasons.filter(s => s.season_number > 0).sort((a, b) => a.season_number - b.season_number).map((season) => (
                                        <option key={season.id} value={season.season_number} className="bg-[#12131a] text-white">
                                            Season {season.season_number} ({season.episode_count} eps)
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            </div>
                        )}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search episode number or title..."
                                value={episodeSearch}
                                onChange={(e) => setEpisodeSearch(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-xs rounded-xl py-2 pl-9 pr-8 outline-none focus:border-accent transition-colors placeholder:text-zinc-500"
                            />
                            {episodeSearch && (
                                <button
                                    onClick={() => setEpisodeSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {loadingEpisodes ? (
                    <EpisodeListSkeleton mode={episodeLayoutMode} count={episodeLayoutMode === 'grid' ? 24 : 6} />
                ) : (
                    <>
                        {activeFilteredEpisodes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                                <List className="w-8 h-8 text-zinc-600 mb-2.5" />
                                <p className="text-sm font-bold text-zinc-300">No episodes found</p>
                                <p className="text-xs text-zinc-500 mt-1">Try adjusting your search criteria</p>
                            </div>
                        ) : episodeLayoutMode === "grid" ? (
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-1">
                                {activeFilteredEpisodes.map((ep) => {
                                    const isCurrent = selectedEpisode === ep.episode_number;
                                    return (
                                        <button
                                            key={ep.id}
                                            onClick={() => { handleSelectEpisode(ep.episode_number, selectedSeason); }}
                                            className={`group relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                                                isCurrent
                                                    ? 'border-accent bg-gradient-to-b from-accent/25 to-accent-warm/15 text-white shadow-[0_0_16px_var(--accent-glow)] ring-1 ring-accent scale-[1.02]'
                                                    : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                {isCurrent ? (
                                                    <span className="flex items-end gap-[1.5px] h-2.5 mr-0.5">
                                                        <span className="w-[2px] h-1.5 bg-accent rounded-full animate-soundwave-1" />
                                                        <span className="w-[2px] h-2.5 bg-accent rounded-full animate-soundwave-2" />
                                                        <span className="w-[2px] h-1 bg-accent rounded-full animate-soundwave-3" />
                                                    </span>
                                                ) : null}
                                                <span className="tracking-tight">{ep.episode_number}</span>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase mt-0.5 tracking-wider ${isCurrent ? 'text-accent' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                                {ep.air_date ? 'SUB' : 'HD'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={mode === 'mobile' ? "flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-col sm:overflow-visible sm:snap-none sm:pb-0" : "flex flex-col gap-2.5"}>
                                {activeFilteredEpisodes.map((ep) => {
                                    const isCurrent = selectedEpisode === ep.episode_number;
                                    const thumbSrc = ep.still_path || details?.backdrop_path || details?.poster_path;
                                    return (
                                        <button
                                            key={ep.id}
                                            onClick={() => { handleSelectEpisode(ep.episode_number, selectedSeason); }}
                                            className={`group flex ${mode === 'mobile' ? 'flex-col min-w-[220px] snap-center items-start' : 'items-center'} gap-3.5 p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 text-left cursor-pointer ${
                                                isCurrent
                                                    ? 'border-accent/80 bg-accent/10 shadow-[0_4px_20px_var(--accent-glow)] ring-1 ring-accent/40'
                                                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]'
                                            }`}
                                        >
                                            <div className={`${mode === 'mobile' ? 'w-full aspect-video' : 'w-24 sm:w-28 h-16'} rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 relative border border-white/[0.08]`}>
                                                {thumbSrc ? (
                                                    <Image
                                                        src={`${IMG_BASE}/w185${thumbSrc}`}
                                                        alt={ep.name || `Episode ${ep.episode_number}`}
                                                        fill
                                                        sizes="185px"
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                                                        <span className="text-zinc-600 text-xs font-black">EP {ep.episode_number}</span>
                                                    </div>
                                                )}
                                                {isCurrent ? (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                                                        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-lg">
                                                            <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-black text-white">
                                                        EP {ep.episode_number}
                                                    </div>
                                                )}
                                                {ep.runtime > 0 && (
                                                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[8px] font-bold text-zinc-300">
                                                        {ep.runtime}m
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 w-full">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className={`text-xs font-black uppercase tracking-wider ${isCurrent ? 'text-accent' : 'text-zinc-400'}`}>
                                                        Episode {ep.episode_number}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/20 border border-accent/40 text-[9px] font-black tracking-wider text-accent uppercase">
                                                            <span className="flex items-end gap-[2px] h-2.5">
                                                                <span className="w-[2px] h-1.5 bg-accent rounded-full animate-soundwave-1" />
                                                                <span className="w-[2px] h-2.5 bg-accent rounded-full animate-soundwave-2" />
                                                                <span className="w-[2px] h-1 bg-accent rounded-full animate-soundwave-3" />
                                                            </span>
                                                            Playing
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider bg-white/[0.06] text-zinc-400">
                                                        Sub/Dub
                                                    </span>
                                                </div>
                                                <p className={`text-sm font-bold line-clamp-1 ${isCurrent ? 'text-white font-extrabold' : 'text-zinc-200 group-hover:text-white'}`}>
                                                    {ep.name || `Episode ${ep.episode_number}`}
                                                </p>
                                                {ep.air_date && (
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                                        Aired: {ep.air_date}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    // User Settings Support
    const currentMediaTypeServers = useMemo(() => {
        const filtered = typeof type === "string"
            ? serversList.filter(s => {
                if (!s.type) return true;
                const targetType = (type === "cartoon") ? "tv" : type;
                return s.type === targetType;
            })
            : serversList;
        return ServerHealthManager.filterAndSortServers(filtered, 'id');
    }, [type, serversList]);

    // Watchlist
    const inWatchlist = isInWatchlist(id);

    const triviaFacts = useMemo(() => {
        return generateTriviaFacts(details);
    }, [details]);


    // TV and Cartoon Auto-Next logic
    const handleVideoEnded = useCallback(() => {
        if (!autoPlayNext) return;
        if (type !== 'tv' && type !== 'cartoon') return;  // Include cartoon in auto-next
        if (episodes.length === 0) return;
        
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
    }, [autoPlayNext, type, episodes, selectedEpisode, showNextOverlay]);

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
        if (historyRestoredRef.current) return;

        const s = searchParams?.get("season") || searchParams?.get("s");
        const e = searchParams?.get("episode") || searchParams?.get("e") || searchParams?.get("ep");
        
        if (s || e) {
            historyRestoredRef.current = true;
            if (s) setSelectedSeason(parseInt(s) || 1);
            if (e) setSelectedEpisode(parseInt(e) || 1);
        } else if (type === 'tv' && id && history && history.length > 0) {
            historyRestoredRef.current = true;
            // Find most recently watched episode of this TV show from history (once per mount)
            const historyItem = history.find((i: any) => i.showId === id);
            if (historyItem) {
                if (historyItem.season) setSelectedSeason(historyItem.season);
                if (historyItem.episodeNumber || historyItem.episodeId) {
                    setSelectedEpisode(Number(historyItem.episodeNumber || historyItem.episodeId) || 1);
                }
            }
        }
    // Keep history in the dependencies to re-trigger once it is loaded asynchronously
    }, [searchParams, id, type, history]);

    // Handle Browser Back / Forward buttons (popstate)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const s = params.get('s') || params.get('season');
            const e = params.get('e') || params.get('episode') || params.get('ep');
            if (s) {
                const sNum = parseInt(s);
                if (!isNaN(sNum) && sNum !== selectedSeasonRef.current) {
                    setSelectedSeason(sNum);
                }
            }
            if (e) {
                const eNum = parseInt(e);
                if (!isNaN(eNum) && eNum !== selectedEpisodeRef.current) {
                    setSelectedEpisode(eNum);
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);




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

    // Scroll to top only on initial mount when media ID or type changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [id, type]);

    useEffect(() => {
        setPlayerLoaded(false);
        setSourceError(false);
    }, [activeServer?.id, selectedSeason, selectedEpisode, mode]);

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



    const fallbackCountRef = useRef<number>(0);

    // Automatic Provider Fallback Engine (Intelligent Circular Rotation)
    const handleAutoFallback = useCallback(() => {
        if (!activeServer) return;
        
        const listToUse = isAnimeServer ? ANIME_SERVERS : currentMediaTypeServers;
        if (!listToUse || listToUse.length === 0) {
            setSourceError(true);
            return;
        }

        setFailedServers(prev => {
            const nextFailed = new Set(prev);
            nextFailed.add(activeServer.id);
            ServerHealthManager.blacklistServer(activeServer.id);

            // Show error screen ONLY if every single server in the available servers list has failed
            const allFailed = listToUse.every(s => nextFailed.has(s.id));
            if (allFailed || nextFailed.size >= listToUse.length) {
                console.warn(`[ToonPlayer Fallback] All ${listToUse.length} servers exhausted. Displaying fallback UI.`);
                setSourceError(true);
                return nextFailed;
            }

            // Circular transition: nextIndex = (currentIndex + 1) % servers.length
            const currentIndex = listToUse.findIndex(s => s.id === activeServer.id);
            const startIdx = currentIndex >= 0 ? currentIndex : 0;
            let nextServer = null;

            for (let i = 1; i <= listToUse.length; i++) {
                const nextIndex = (startIdx + i) % listToUse.length;
                const candidate = listToUse[nextIndex];
                if (candidate && !nextFailed.has(candidate.id)) {
                    nextServer = candidate;
                    break;
                }
            }

            if (nextServer) {
                console.warn(`[ToonPlayer Fallback] Server ${activeServer.name} (${activeServer.id}) failed. Auto-switching to next server: ${nextServer.name} (${nextServer.id})`);
                setLoadingStatus(`Switching to backup server: ${nextServer.name}...`);
                if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
                manualServerRef.current = nextServer.id;
                setPlayerLoaded(false);
                setSourceError(false);
                // Update active server state -> UI button highlight updates automatically
                setActiveServer(nextServer);
            } else {
                setSourceError(true);
            }
            return nextFailed;
        });
    }, [activeServer, currentMediaTypeServers, isAnimeServer]);

    // Manual "Retry All Servers" handler: resets failed servers tracker and retries Server 1
    const handleResetAndRetryAllServers = useCallback(() => {
        fallbackCountRef.current = 0;
        setFailedServers(new Set());
        setSourceError(false);
        setPlayerLoaded(false);
        const listToUse = isAnimeServer ? ANIME_SERVERS : currentMediaTypeServers;
        const firstServer = (listToUse && listToUse.length > 0) ? listToUse[0] : SERVERS[0];
        setLoadingStatus(`Connecting to ${firstServer.name}...`);
        manualServerRef.current = firstServer.id;
        setActiveServer(firstServer);
        toast.success(`Reset server tracker — trying ${firstServer.name}...`, { icon: '🔄' });
    }, [isAnimeServer, currentMediaTypeServers]);

    // Manual Server Select
    const handleManualServerSelect = useCallback((server: any) => {
        fallbackCountRef.current = 0;
        setFailedServers(prev => {
            const next = new Set(prev);
            next.delete(server.id);
            return next;
        });
        setSourceError(false);
        setPlayerLoaded(false);
        setLoadingStatus(`Connecting to ${server.name}...`);
        manualServerRef.current = server.id;
        setActiveServer(server);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[GlobalContentDebugger] 📡 STREAMING: Server="${server.name}", ContentID=${id}`);
        }
    }, [id]);



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
        activeRequestRef.current = String(id);

        const fetchData = async () => {
            // Synchronously reset previous media state to prevent race conditions & stale URL rendering
            setLoading(true);
            setDetails(null);
            setAnimeData(null);
            setTmdbIdForAnime(null);
            setSourceError(false);
            setPlayerLoaded(false);
            try {
                if (initialType === "anime" || initialType === "cartoon") {
                    // 1. Fetch Anime/Cartoon Episodes/Metadata
                    const animeRes = await axios.get(`/api/anime/episodes?id=${id}`, { signal: controller.signal });
                    if (activeRequestRef.current !== String(id)) return;
                    const show = animeRes.data.show;
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[GlobalContentDebugger] 🎬 ANIME REQUESTED: ID=${id}, Title="${show.name}", Type=${initialType}, Provider=${show.provider || 'unknown'}`);
                    }
                    setAnimeData(show);

                    // 2. Optimized TMDB Metadata Resolution
                    // External IDs (AniList, MAL) mapping can be implemented here as Priority 1 if provider supports it.
                    // Fallback to title matching:
                    const searchQueries = [show.name, show.englishName, show.romajiName].filter(Boolean);
                    let tmdbMatch = null;
                    const expectedMediaType = (show.type?.toLowerCase() === 'movie' || show.totalEpisodes === 1) ? 'movie' : 'tv';
                    
                    for (const q of searchQueries) {
                        try {
                            const tmdbSearch = await axios.get(`/api/prime/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
                            if (tmdbSearch.data.results?.length > 0) {
                                let bestMatch = null;
                                let highestScore = -1;

                                for (const r of tmdbSearch.data.results) {
                                    let score = 0;
                                    const rTitle = (r.name || r.title || r.original_name || "").toLowerCase();
                                    const qLower = q.toLowerCase();
                                    
                                    // Normalize titles
                                    const clean = (str: string) => str.replace(/[^\w\s]/gi, '').trim();
                                    const cleanRTitle = clean(rTitle);
                                    const cleanQLower = clean(qLower);

                                    // Hard Rule 1: Media Type MUST match
                                    if (r.media_type !== expectedMediaType && r.media_type) {
                                        continue; // Reject immediately
                                    }

                                    // Hard Rule 2: Release Year MUST match within ±1 year (if provider specifies it)
                                    const rYear = parseInt((r.release_date || r.first_air_date || "").substring(0, 4));
                                    const pYear = parseInt(String(show.year));
                                    if (!isNaN(pYear) && !isNaN(rYear)) {
                                        if (Math.abs(rYear - pYear) > 1) {
                                            continue; // Reject immediately
                                        }
                                    }

                                    // Score calculation (only reaches here if hard rules pass)
                                    // Priority 4: Exact Normalized Title Match (+50)
                                    if (cleanRTitle === cleanQLower || cleanRTitle.includes(cleanQLower) || cleanQLower.includes(cleanRTitle)) {
                                        score += 50;
                                    } else {
                                        // Priority 5: Fuzzy match as secondary (+10)
                                        const qWords = cleanQLower.split(' ').filter((w: string) => w.length > 2);
                                        if (qWords.length > 0 && qWords.some((w: string) => cleanRTitle.includes(w))) {
                                            score += 10;
                                        }
                                    }

                                    // Add points for matching year (+30)
                                    if (!isNaN(pYear) && !isNaN(rYear) && rYear === pYear) {
                                        score += 30;
                                    }

                                    // Add points for exact media type match (+20)
                                    if (r.media_type === expectedMediaType) {
                                        score += 20;
                                    }

                                    if (score > highestScore) {
                                        highestScore = score;
                                        bestMatch = r;
                                    }
                                }
                                
                                // Threshold validation (minimum 70 required)
                                if (bestMatch && highestScore >= 70) {
                                    tmdbMatch = bestMatch;
                                    if (process.env.NODE_ENV !== 'production') {
                                        console.log(`[GlobalContentDebugger] 🟢 TMDB MATCHED: Score=${highestScore}, ID=${tmdbMatch.id}, Title="${tmdbMatch.name || tmdbMatch.title}"`);
                                    }
                                    break;
                                } else {
                                    if (process.env.NODE_ENV !== 'production' && bestMatch) {
                                        console.log(`[GlobalContentDebugger] ❌ TMDB Match Rejected (Score: ${highestScore}): Title="${bestMatch.name || bestMatch.title}"`);
                                    }
                                }
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
                        if (activeRequestRef.current !== String(id)) return;
                        setDetails(detailsRes.data);
                        // DO NOT OVERWRITE initialType = anime with movie/tv just because TMDB resolved it as such.
                        // This prevents the UI from suddenly breaking out of the Anime player layout.
                    } else {
                        // Minimal details if TMDB match fails — player still plays via anime servers
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
                    
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[GlobalContentDebugger] 🎬 TMDB REQUESTED: ID=${id}, Type=${initialType}`);
                    }
                    let res = null;
                    for (let attempt = 0; attempt < 2; attempt++) {
                        try {
                            res = await axios.get(`/api/prime/details?id=${id}&type=${initialType}`, { signal: controller.signal });
                            if (res.data) {
                                if (process.env.NODE_ENV !== 'production') {
                                    console.log(`[GlobalContentDebugger] 🟢 API FETCHED ID (TMDB): ${res.data.id}, Title="${res.data.name || res.data.title}"`);
                                }
                                break;
                            }
                        } catch (retryErr) {
                            if (axios.isCancel(retryErr)) throw retryErr;
                            if (attempt === 1) throw retryErr;
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                    if (res?.data) {
                        // Strict ID Validation
                        if (String(res.data.id) !== String(id)) {
                            console.error('[WatchClient] ID Mismatch Detected!', { requested: id, received: res.data.id });
                            throw new Error("CONTENT_MISMATCH");
                        }
                        
                        console.log(`[GlobalClickDebugger] 🌐 API FETCHED ID (TMDB): ${res.data.id}`);
                        
                        if (activeRequestRef.current !== String(id)) return;
                        setDetails(res.data);
                        const resolvedType = (res.data.resolvedType || initialType) as "movie" | "tv" | "anime";
                        setType(resolvedType);

                        if (resolvedType === "tv" && res.data.seasons?.length > 0) {
                            const historyItem = history.find((i: any) => i.showId === String(id));
                            if (historyItem && historyItem.season) {
                                setSelectedSeason(historyItem.season);
                                if (historyItem.episodeNumber) setSelectedEpisode(historyItem.episodeNumber);
                            } else {
                                setSelectedSeason(res.data.seasons[0].season_number || 1);
                            }
                            if (historyItem?.serverId && serversList.find(s => s.id === historyItem.serverId)) {
                                setActiveServer(serversList.find(s => s.id === historyItem.serverId)!);
                            }
                        } else if (resolvedType === "movie") {
                            const historyItem = history.find((i: any) => i.showId === String(id));
                            if (historyItem?.serverId && serversList.find(s => s.id === historyItem.serverId)) {
                                setActiveServer(serversList.find(s => s.id === historyItem.serverId)!);
                            }
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
                        let resolvedType = (fallbackRes.data.resolvedType || initialType) as "movie" | "tv" | "anime";
                        setType(resolvedType);

                        if (resolvedType === "tv" && fallbackRes.data.seasons?.length > 0) {
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

const seasonCacheMap = new Map<string, EpisodeInfo[]>();

    // Fetch episodes when season changes — with AbortController, cache, and season identity verification
    useEffect(() => {
        // Include cartoon type in episode fetching (same TMDB season API applies)
        if (type !== 'tv' && type !== 'cartoon') return;
        if (!id || !details) return;

        const targetSeason = selectedSeason;
        const cacheKey = `${id}-s${targetSeason}`;

        if (seasonCacheMap.has(cacheKey)) {
            const cachedEps = seasonCacheMap.get(cacheKey)!;
            setEpisodes(cachedEps);
            setLoadingEpisodes(false);
            const epExists = cachedEps.some((e: any) => e.episode_number === selectedEpisodeRef.current);
            if (!epExists && cachedEps.length > 0) {
                setSelectedEpisode(cachedEps[0].episode_number);
            }
            return;
        }

        setEpisodes([]); // Clear episodes immediately when season changes to prevent stale UI
        const controller = new AbortController();

        const fetchEpisodes = async () => {
            setLoadingEpisodes(true);
            try {
                const res = await axios.get(`/api/prime/season?id=${id}&season=${targetSeason}`, {
                    signal: controller.signal
                });
                if (controller.signal.aborted || selectedSeasonRef.current !== targetSeason) return;

                const returnedSeason = res.data?.season_number ?? res.data?.season;
                if (returnedSeason !== undefined && Number(returnedSeason) !== Number(targetSeason)) {
                    console.warn(`[WatchClient] Stale season response ignored. Target S${targetSeason}, Got S${returnedSeason}`);
                    return;
                }

                const eps = res.data.episodes || [];
                eps.sort((a: EpisodeInfo, b: EpisodeInfo) => a.episode_number - b.episode_number);
                
                seasonCacheMap.set(cacheKey, eps);
                setEpisodes(eps);

                // Auto-clamp selected episode if current episode number exceeds target season length
                const epExists = eps.some((e: any) => e.episode_number === selectedEpisodeRef.current);
                if (!epExists && eps.length > 0) {
                    setSelectedEpisode(eps[0].episode_number);
                }
            } catch (err: any) {
                if (axios.isCancel(err) || err?.name === 'CanceledError' || controller.signal.aborted) return;
                console.error("Failed to fetch episodes:", err);
            } finally {
                if (!controller.signal.aborted && selectedSeasonRef.current === targetSeason) {
                    setLoadingEpisodes(false);
                }
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
            // For anime, use tmdbIdForAnime if available for consistent history restoration
            const finalId = (type === 'anime' || type === 'cartoon') ? (animeData?._id || id) : id;
            const animeHistoryId = type === 'anime' ? (tmdbIdForAnime || finalId) : finalId;
            const historyId = type === 'movie' ? animeHistoryId : `${animeHistoryId}-${selectedSeason}-${selectedEpisode}`;
            addToHistory({
                id: historyId,
                showId: animeHistoryId,
                type: type as any,
                title: details?.title || details?.name || animeData?.name || "Untitled",
                poster: details?.poster_path ? `https://image.tmdb.org/t/p/w200${details?.poster_path}` : (animeData?.thumbnail || ""),
                episodeId: type === 'movie' ? undefined : String(selectedEpisode),
                episodeNumber: type === 'movie' ? undefined : selectedEpisode,
                // Only persist currentTime = 0 on first mount; do NOT overwrite real progress
                currentTime: 0,
                duration: 0,
                season: type === 'movie' ? undefined : selectedSeason,
            } as any);
        } catch (e) {
            console.error("Failed to save history:", e);
        }
    // Intentionally limit deps — only write history when the user actually switches ep/season
    }, [selectedSeason, selectedEpisode, type, id]);

    // Unified URL logic: Use tmdbIdForAnime if we're on an anime page trying a movie server
    const activeId = (type === "anime" || type === "cartoon") ? (tmdbIdForAnime || id) : id;
    
    // Auto-detect and resolve media classification
    let resolvedMediaType = type;
    if (details && (details as any).resolvedType) {
        resolvedMediaType = (details as any).resolvedType;
    } else if (type === "cartoon" || type === "anime") {
        resolvedMediaType = "tv";
    }
    const rawEmbedUrl = isAnimeServer 
        ? (activeServer as any)?.getUrl?.(animeData?.aniListId || animeData?._id || id, selectedEpisode, tmdbIdForAnime) || ""
        : activeServer?.getUrl?.(resolvedMediaType, activeId, selectedSeason, selectedEpisode) || "";

    const [resolvedScrapedUrl, setResolvedScrapedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (rawEmbedUrl.startsWith('/api/scrape/')) {
            setResolvedScrapedUrl(null);
            const controller = new AbortController();
            axios.get(rawEmbedUrl, { signal: controller.signal })
                .then(res => {
                    if (res.data?.success && res.data?.embedUrl) {
                        setResolvedScrapedUrl(res.data.embedUrl);
                    } else {
                        console.warn('[Scraper API] Extract failed, switching server...');
                        handleAutoFallback();
                    }
                })
                .catch(err => {
                    if (!axios.isCancel(err)) {
                        console.warn('[Scraper API] Error during scrape, switching server:', err.message);
                        handleAutoFallback();
                    }
                });
            return () => controller.abort();
        } else {
            setResolvedScrapedUrl(null);
        }
    }, [rawEmbedUrl]);

    const embedUrl = rawEmbedUrl.startsWith('/api/scrape/') ? (resolvedScrapedUrl || "") : rawEmbedUrl;



    if (loading && !details && !animeData) {
        return (
            <main className="min-h-dvh bg-bg-main text-[var(--text-main)] pt-[calc(72px+env(safe-area-inset-top)+16px)] px-4 sm:px-6 md:px-8 max-w-[1800px] mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-8 w-64 rounded-xl shimmer-card bg-zinc-900 border border-white/5" />
                    <div className="h-8 w-28 rounded-xl shimmer-card bg-zinc-900 border border-white/5" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[74%_minmax(0,26%)] gap-6 items-start">
                    <div className="space-y-4">
                        <PlayerContainerSkeleton />
                        <div className="h-14 w-full rounded-2xl shimmer-card bg-zinc-900 border border-white/5" />
                    </div>
                    <div className="hidden lg:block w-full rounded-2xl p-5 bg-[#12141d]/80 border border-white/5">
                        <div className="h-6 w-32 rounded-lg shimmer-card bg-zinc-900 mb-4" />
                        <EpisodeListSkeleton mode="list" count={5} />
                    </div>
                </div>
            </main>
        );
    }

    if (!details) {
        // Show a minimal player page instead of "Content Not Found"
        const fallbackTitle = type === 'tv' ? 'TV Show' : type === 'anime' ? 'Anime' : type === 'cartoon' ? 'Cartoon' : 'Movie';
        const fallbackId = (type === "anime" || type === "cartoon") ? (tmdbIdForAnime || id) : id;
        const fallbackEmbedUrl = SERVERS[0].getUrl(
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
                            <div className="relative w-full aspect-video bg-black overflow-hidden">
                                <iframe 
                                    src={getProxiedEmbedUrl(fallbackEmbedUrl)} 
                                    className="absolute inset-0 w-full h-full border-0 bg-black rounded-b-xl" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                    allowFullScreen={true}
                                    referrerPolicy="no-referrer" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="w-full px-4 py-8 text-center">
                        <p className="text-[var(--text-muted)]">Detailed metadata is unavailable. Try switching servers if the content doesn&apos;t play.</p>
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                            {(SERVERS || []).slice(0, 6).map((server) => (
                                <a key={server.id} href={server.getUrl?.(type === "anime" ? "tv" : type, fallbackId, 1, 1) || '#'} target="_blank" rel="noopener" className="px-3 py-1.5 bg-bg-card border border-border-color rounded-lg text-xs font-medium hover:bg-border-color transition-colors">{server.name}</a>
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

    const renderPlayer = () => {
        return (
            <div className="relative w-full z-20">
                {/* ── VIDEO CONTAINER ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative w-full aspect-video rounded-[32px] overflow-hidden bg-black/50 ring-1 ring-white/10 shadow-2xl ${
                        isFocusMode ? "!h-[100dvh] !max-w-none !aspect-auto rounded-none" : "max-w-[1600px] mx-auto"
                    }`}
                >
                    {/* Loading State */}
                    {!playerLoaded && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-4">
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



                    {/* IFRAME — only render when we have a confirmed non-empty URL */}
                    {embedUrl && embedUrl.trim() !== "" ? (
                        <VideoIframeEmbed
                            mediaKey={`${activeServer?.id || 'server'}-${type}-${activeId}-s${selectedSeason}-e${selectedEpisode}-${mode}-${reloadCount}`}
                            src={getProxiedEmbedUrl(embedUrl)}
                            title={`${title} - ToonPlayer`}
                            playerLoaded={playerLoaded}
                            isFocusMode={isFocusMode}
                            onError={handleAutoFallback}
                            onLoad={(e) => {
                                setPlayerLoaded(true);
                                try {
                                    const iframe = e.target as HTMLIFrameElement;
                                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                    if (doc) {
                                        const text = doc.body?.innerText || '';
                                        if (text.includes('Embed fetch failed') || text.includes('Embed proxy error') || text.includes('404 Not Found') || text.includes('502 Bad Gateway') || text.includes('Server Not Responding') || text.includes('⚠️')) {
                                            console.warn('[ToonPlayer] Proxy/404 error detected inside iframe. Triggering auto fallback...');
                                            handleAutoFallback();
                                        }
                                    }
                                } catch (_) {}
                            }}
                        />
                    ) : sourceError ? (
                        // Only show the fallback screen when every single server in the available servers list has been tried and failed
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center">
                            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                <X className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold mb-1 text-white">Source Temporarily Unavailable</h3>
                            <p className="text-zinc-400 text-xs mb-5 max-w-[320px] leading-relaxed">
                                The player encountered an issue across all available servers. This usually fixes itself — try resetting and retrying all servers.
                            </p>
                            <div className="flex gap-3 flex-wrap justify-center">
                                <button
                                    onClick={handleResetAndRetryAllServers}
                                    className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-accent/25"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" /> Retry All Servers
                                </button>
                            </div>
                        </div>
                    ) : (
                        // URL is being resolved — show a spinner, NOT an error
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-4">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-20 h-20 rounded-full border border-accent/20 animate-ping" />
                                <div className="w-14 h-14 rounded-full border-[3px] border-accent/20 border-t-accent animate-spin" />
                                <Play className="absolute w-5 h-5 text-accent" />
                            </div>
                            <p className="text-white text-xs font-black uppercase tracking-[0.2em] animate-pulse">Connecting to server…</p>
                            <p className="text-zinc-600 text-[10px] font-medium uppercase tracking-wider">{activeServer?.name || 'Loading'}</p>
                        </div>
                    )}

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
                                            if (ci !== -1 && ci + 1 < episodes.length) { ne = episodes[ci + 1].episode_number; }
                                            const csData = details?.seasons?.find(s => s.season_number === selectedSeason);
                                            if (csData && ne > csData.episode_count) { ns += 1; ne = 1; }
                                            handleSelectEpisode(ne, ns);
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
                    <div data-watch-controls className="flex items-center justify-between mt-2.5 px-3 sm:px-1 gap-3 select-none">
                        {/* Episode Nav */}
                        {(type !== 'movie' && resolvedMediaType !== 'movie') ? (
                            <div className="flex items-center gap-1.5">
                                <button onClick={handlePrevEpisode} disabled={!hasPrevEpisode()}
                                    className="w-8 h-8 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-30 border border-white/[0.08] rounded-lg text-white transition-all cursor-pointer"
                                    title="Previous Episode">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold text-zinc-400 px-2 min-w-[56px] text-center">
                                    {`S${selectedSeason}E${selectedEpisode}`}
                                </span>
                                <button onClick={handleNextEpisode} disabled={!hasNextEpisode()}
                                    className="w-8 h-8 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-30 border border-white/[0.08] rounded-lg text-white transition-all cursor-pointer"
                                    title="Next Episode">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-[11px] font-black text-accent uppercase tracking-wider">
                                    Feature Film
                                </span>
                            </div>
                        )}
                        {/* View Controls */}
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setReloadCount(prev => prev + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
                                title="Reload">
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setIsTheatreMode(!isTheatreMode); if (isFocusMode) setIsFocusMode(false); }}
                                className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all ${
                                    isTheatreMode ? 'bg-accent/20 border-accent text-accent' : 'bg-white/[0.06] border-white/[0.08] text-zinc-400 hover:text-white'
                                }`} title="Theatre Mode">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="16" x2="22" y2="16"/></svg>
                            </button>
                            <button onClick={() => { setIsFocusMode(!isFocusMode); if (isTheatreMode) setIsTheatreMode(false); }}
                                className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all ${
                                    isFocusMode ? 'bg-accent/20 border-accent text-accent' : 'bg-white/[0.06] border-white/[0.08] text-zinc-400 hover:text-white'
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
                isTheatreMode={isTheatreMode}
                onToggleTheatre={() => {
                    setIsTheatreMode(prev => !prev);
                    if (isFocusMode) setIsFocusMode(false);
                }}
                isFocusMode={isFocusMode}
                onToggleFocus={() => {
                    setIsFocusMode(prev => !prev);
                    if (isTheatreMode) setIsTheatreMode(false);
                }}
                autoPlayNext={autoPlayNext}
                onToggleAutoPlayNext={handleToggleAutoPlayNext}
                onReloadPlayer={() => setReloadCount(c => c + 1)}
            />
        );
    };

    const renderTheaterEpisodes = () => {
        if (type === 'movie' || resolvedMediaType === 'movie') return null;
        if (!isAnimeServer && (!details?.seasons || details.seasons.length === 0)) return null;
        if (isAnimeServer && (!animeData?.availableEpisodesDetail || !episodes || episodes.length === 0)) return null;

        return (
            <div className="w-full rounded-2xl overflow-hidden bg-[#12141d]/80 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-6 shadow-xl">
                {renderEpisodesList('desktop')}
            </div>
        );
    };

    const renderEpisodesSidebar = () => {
        if (type === 'movie' || resolvedMediaType === 'movie') return null;
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
        if (type === 'movie' || resolvedMediaType === 'movie') return null;
        if (!isAnimeServer && (!details?.seasons || details.seasons.length === 0)) return null;
        if (isAnimeServer && (!animeData?.availableEpisodesDetail || !episodes || episodes.length === 0)) return null;
        
        return (
            <>
                {/* Mobile View: Carousel (under max-md) */}
                <div className="w-full md:hidden mb-6 block mt-2 px-4 sm:px-6">
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
                    {(showAllCast ? (details?.cast || []) : (details?.cast || []).slice(0, 15)).map((person: any) => (
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

    if (loading) {
        return <DetailsSkeleton />;
    }

    return (
        <>
        <div className="relative isolate min-h-dvh overflow-x-clip bg-[#000000] text-white/90 selection:bg-white selection:text-black font-sans tracking-tight">
            {!isFocusMode && (
                <div className={`fixed top-0 left-0 right-0 z-[100] min-h-[calc(60px+env(safe-area-inset-top))] md:min-h-[calc(72px+env(safe-area-inset-top))] pt-[calc(env(safe-area-inset-top)+8px)] md:pt-[calc(env(safe-area-inset-top)+12px)] lg:pt-[calc(env(safe-area-inset-top)+16px)] bg-bg-main/98 backdrop-blur-3xl shadow-lg border-b border-white/10 flex items-center px-4 md:px-6 gap-3 transition-all duration-[250ms] ease-apple will-change-transform ${
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
                    <div className="fixed inset-0 z-[999] bg-black flex flex-col justify-center items-center overflow-hidden">
                        <button 
                            onClick={() => setIsFocusMode(false)} 
                            className="fixed top-4 left-4 z-[1000] flex items-center gap-2 px-4 py-2 bg-[#12141d]/90 hover:bg-black border border-white/15 rounded-xl text-xs font-bold text-white transition-all shadow-2xl backdrop-blur-md cursor-pointer mt-[env(safe-area-inset-top)] ml-[env(safe-area-inset-left)] group"
                        >
                            <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Exit Focus Mode
                        </button>
                        <div className="w-full max-w-[1700px] h-full flex flex-col items-center justify-center p-2 sm:p-4">
                            {renderPlayer()}
                        </div>
                    </div>
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
                            {isTheatreMode ? (
                                <div className="relative z-10 w-full max-w-[1800px] mx-auto px-0 sm:px-4 md:px-6 flex flex-col gap-6">
                                    {/* Theater Player Container (Full Width) */}
                                    <div data-watch-player className="w-full bg-[#12141d]/85 backdrop-blur-xl p-0 rounded-none sm:rounded-[24px] shadow-[0_12px_45px_rgba(0,0,0,0.65)] border-0 sm:border border-white/[0.08] overflow-hidden">
                                        <div className="mb-0">{renderPlayer()}</div>
                                        <div className="mt-0">{renderProviders()}</div>
                                    </div>
                                    {/* Episodes placed directly underneath */}
                                    {renderTheaterEpisodes()}
                                </div>
                            ) : (
                                <div className={`relative z-10 w-full max-w-[1800px] mx-auto mt-0 mb-0 ${
                                    (type === 'movie' || resolvedMediaType === 'movie') 
                                        ? 'flex flex-col' 
                                        : 'grid grid-cols-1 lg:grid-cols-[74%_minmax(0,26%)] gap-6 items-start'
                                }`}>
                                    {/* Player Column */}
                                    <div data-watch-player className={`w-full min-w-0 bg-[#12141d]/70 backdrop-blur-xl p-0 rounded-none sm:rounded-[22px] shadow-[0_10px_40px_rgba(0,0,0,0.45)] border-0 sm:border border-white/[0.08] overflow-hidden ${
                                        (type === 'movie' || resolvedMediaType === 'movie') ? 'max-w-[1300px] mx-auto' : ''
                                    }`}>
                                        <div className="mb-0">{renderPlayer()}</div>
                                        {/* ── SERVER SELECTION BAR ── */}
                                        <div className="mt-0">
                                            {renderProviders()}
                                        </div>
                                    </div>

                                    {/* Desktop Episodes Sidebar (26%) */}
                                    {renderDesktopEpisodes()}
                                </div>
                            )}

                            {/* Mobile/Tablet Episodes (Only when NOT in Theatre mode, because Theatre mode already rendered episodes) */}
                            {!isTheatreMode && renderMobileEpisodes()}

                            {/* Metadata Section (Providers -> Metadata = 20px, pb-0 to let description bottom margin control spacing) */}
                            <div data-watch-metadata className="relative z-10 bg-bg-main p-4 sm:p-6 md:p-8 rounded-none sm:rounded-[24px] border-y sm:border border-white/5 w-full max-w-[1800px] mx-auto mt-[20px] flex flex-col gap-6 items-start pb-0 sm:pb-0 md:pb-0">
                                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start w-full">
                                    <div data-watch-poster className="flex-shrink-0 w-[120px] sm:w-[140px] md:w-[200px] lg:w-[220px] relative mx-auto lg:mx-0">
                                        {details?.poster_path && (
                                            <div className="relative group aspect-[2/3] w-full">
                                                <Image src={`${IMG_BASE}/w500${details.poster_path}`} alt={title} fill priority={true} sizes="(max-width: 768px) 50vw, 30vw" className="object-cover rounded-2xl shadow-2xl border border-border-color transition-transform group-hover:scale-[1.02] will-change-transform" />
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
                                                    {(type === "tv" || (type === "anime" && resolvedMediaType !== "movie")) ? (
                                                        <>
                                                            <span>{details?.number_of_seasons || 0} Seasons</span>
                                                            {details?.episode_runtime && <span>~{details.episode_runtime}m / ep</span>}
                                                        </>
                                                    ) : (
                                                        <span>{details?.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : ""}</span>
                                                    )}
                                                    <span className="px-2 py-0.5 rounded border border-border-color text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">{details?.status || (type === 'movie' || resolvedMediaType === 'movie' ? "Released" : "Ongoing")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                                            {(details?.genres || []).map((genre: any) => (
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
                                                        {(episodes || []).map((epNum: string) => (
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
                                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-auto w-full md:w-auto mt-4 md:mt-0">
                                                    <button onClick={toggleWatchlist} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xl active:scale-95 flex-1 md:flex-none justify-center min-h-[44px] ${inWatchlist ? "bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-accent/20 hover:scale-105" : "bg-white text-black shadow-white/5 hover:scale-105"}`}><Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${inWatchlist ? "fill-white" : ""}`} /> {inWatchlist ? "In Watchlist" : "Watchlist"}</button>
                                                    <button onClick={() => setShowDownloadModal(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex-1 md:flex-none justify-center min-h-[44px]"><Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Download</button>
                                                    <button onClick={handleShare} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-bg-card border border-border-color text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-border-color transition-all active:scale-95 flex-1 md:flex-none justify-center min-h-[44px]"><Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Share</button>
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
                    <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-6 z-40 p-3 bg-gradient-to-r from-accent to-accent-warm hover:opacity-90 text-white rounded-full shadow-[0_0_20px_var(--accent-glow)] backdrop-blur-sm transition-opacity cursor-pointer"><ChevronUp className="w-5 h-5" /></motion.button>
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
        {(type !== 'movie' && resolvedMediaType !== 'movie') && (
            <button 
                onClick={() => setShowEpisodesDrawer(true)}
                className="fixed bottom-20 right-6 z-[99] md:max-lg:flex hidden items-center gap-2 px-5 py-3 bg-gradient-to-r from-accent to-accent-warm text-white rounded-full font-bold shadow-2xl active:scale-95 transition-all hover:scale-105 cursor-pointer"
            >
                <List className="w-4 h-4" /> View Episodes
            </button>
        )}
        </>
    );
}
