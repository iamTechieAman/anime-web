"use client";

import React, { useState, useEffect, memo } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle, ChevronDown, ChevronUp, Clock, Film, Flame, Heart, History, Info, Laugh, LogOut, Play, Popcorn, Search, Skull, SlidersHorizontal, Sparkles, Star, Swords, TrendingUp, Tv, User, X, Zap } from "lucide-react";
import { MovieGrid, type MovieItem } from "@/components/MovieCard";
import { AnimeGrid, type Show } from "@/components/AnimeCard";
import useSWR from 'swr';
import type { ProviderSlug } from "@/components/ProviderBar";
import dynamic from "next/dynamic";

const HeroCarousel = dynamic(() => import("@/components/HeroCarousel"), { ssr: false, loading: () => <div className="h-[50vh] sm:h-[60vh] md:h-[70vh] min-h-[340px] sm:min-h-[420px] md:min-h-[480px] bg-bg-elevated animate-pulse w-full" /> });
const MovieRow = dynamic(() => import("@/components/MovieCard").then(mod => mod.MovieRow), { ssr: false });

const AnimeCardHorizontal = dynamic(() => import("@/components/AnimeCard").then(mod => mod.AnimeCardHorizontal), { ssr: false });
const ContinueWatchingRow = dynamic(() => import("@/components/ContinueWatchingRow"), { ssr: false });
const ProviderBar = dynamic(() => import("@/components/ProviderBar"), { ssr: false });
import LazySection from "@/components/LazySection";

// CineVibe-style category sections with TMDB genre IDs
const GENRE_ROWS = [
    { title: "Action & Adventure", icon: Swords, genreId: "28", type: "movie" },
    { title: "Comedy", icon: Laugh, genreId: "35", type: "movie" },
    { title: "Romance", icon: Heart, genreId: "10749", type: "movie" },
    { title: "Horror & Thriller", icon: Skull, genreId: "27,53", type: "movie" },
    { title: "Animation", icon: Sparkles, genreId: "16", type: "movie" },
    { title: "Science Fiction", icon: Flame, genreId: "878", type: "movie" },
];

// Network IDs for streaming platform rows with brand styling colors
const NETWORK_ROWS = [
    { title: "Netflix Originals", networkId: "213", brandColor: "text-[#E50914]" },
    { title: "Prime Video", networkId: "1024", brandColor: "text-[#00A8E1]" },
    { title: "Disney+", networkId: "2739", brandColor: "text-[#0063E5]" },
    { title: "Hulu", networkId: "453", brandColor: "text-[#1CE783]" },
    { title: "HBO Shows", networkId: "49", brandColor: "text-[#9933FF]" },
    { title: "Apple TV+", networkId: "2552", brandColor: "text-white" },
    { title: "Paramount+", networkId: "4330", brandColor: "text-[#0064FF]" },
    { title: "Peacock", networkId: "3353", brandColor: "text-[#00579F]" },
];

// Fallback lists to prevent empty gaps and show user's requested titles
const DEFAULT_TOP_RATED: MovieItem[] = [
  { id: "dracula-2025", title: "Dracula", poster_path: "/2B9W3D9l1uK1l0XW1eX3r4n6u9k.jpg", vote_average: 7.1, release_date: "2025-10-31", media_type: "movie" },
  { id: "titanic-1997", title: "Titanic", poster_path: "/9xjZS243BwOK75N1t8Eb6Zc0dgn.jpg", vote_average: 7.9, release_date: "1997-12-19", media_type: "movie" },
  { id: "your-name-2016", title: "Your Name.", poster_path: "/q71QZCxIWzaND7761R28su4J3Ur.jpg", vote_average: 8.5, release_date: "2016-08-26", media_type: "movie" },
  { id: "forrest-gump-1994", title: "Forrest Gump", poster_path: "/arOei5A2gH6fS05J76i3eJ9H8S6t.jpg", vote_average: 8.5, release_date: "1994-07-06", media_type: "movie" },
  { id: "after-we-fell-2021", title: "After We Fell", poster_path: "/dU4w7w0tHTKV5V1w19hcCEiAI3d.jpg", vote_average: 7.0, release_date: "2021-09-01", media_type: "movie" },
  { id: "my-fault-2023", title: "My Fault", poster_path: "/w46Vw536RL9C4yJm6n7cHQm6485.jpg", vote_average: 7.7, release_date: "2023-06-08", media_type: "movie" },
  { id: "chainsaw-man-reze-2025", title: "Chainsaw Man - The Movie: Reze Arc", poster_path: "/pe1af4Nf9Z8gC8W5J6c8S0qWk9t.jpg", vote_average: 8.4, release_date: "2025-12-25", media_type: "movie" },
  { id: "top-gun-1986", title: "Top Gun", poster_path: "/xZ2BIGQ7d5c7f8a7X2G24v1u8p5.jpg", vote_average: 7.1, release_date: "1986-05-16", media_type: "movie" }
];

const DEFAULT_NOW_PLAYING: MovieItem[] = [
  { id: "your-heart-will-be-broken-2026", title: "Your Heart Will Be Broken", poster_path: "/qhbcfZ1eZTDbZaTQwQA6EvrLz2n.jpg", vote_average: 6.8, release_date: "2026-02-14", media_type: "movie" },
  { id: "my-dearest-assassin-2026", title: "My Dearest Assassin", poster_path: "/f49tQJ49cRPvFSnegAzV76a6qd1.jpg", vote_average: 8.6, release_date: "2026-05-01", media_type: "movie" },
  { id: "accidental-partners-2026", title: "Accidental Partners", poster_path: "/h117F866S500eX3781s6v44p20m.jpg", vote_average: 9.2, release_date: "2026-03-20", media_type: "movie" },
  { id: "wuthering-heights-2026", title: "Wuthering Heights", poster_path: "/81D5Zq7WlUu929C4n2Wc9n8d11S.jpg", vote_average: 6.6, release_date: "2026-04-10", media_type: "movie" },
  { id: "the-drama-2026", title: "The Drama", poster_path: "/9662nB04nGl25g4fW2o11S7x8bF.jpg", vote_average: 6.9, release_date: "2026-06-01", media_type: "movie" },
  { id: "the-gorge-2025", title: "The Gorge", poster_path: "/7Oo6720cr6Qad272P5Ux4R9U86C.jpg", vote_average: 7.6, release_date: "2025-02-13", media_type: "movie" },
  { id: "hamnet-2025", title: "Hamnet", poster_path: "/9G1c5W0r1g8fX8C7n5G6k2tD1g1.jpg", vote_average: 7.7, release_date: "2025-11-20", media_type: "movie" },
  { id: "fifty-shades-freed-2018", title: "Fifty Shades Freed", poster_path: "/jjPJ42602IYvX247tQzs45jU54u.jpg", vote_average: 6.7, release_date: "2018-02-09", media_type: "movie" }
];

// Nav tabs
const TABS = [
    { id: "movies", label: "Movies", icon: Popcorn },
    { id: "tv", label: "TV Shows", icon: Tv },
    { id: "anime", label: "Anime", icon: Sparkles },
    { id: "trending", label: "Trending", icon: TrendingUp },
    { id: "discover", label: "Discover", icon: Zap },
];

const CARTOONS_DATA = [
  { id: "60625", title: "Rick and Morty", poster_path: "/WGRQ8FpjkDTzivQJ43t94bOuY0.jpg", backdrop_path: "/zJZfxi8X3XPHAhxXseRugtnNVtt.jpg", vote_average: 8.7, release_date: "2013-12-02", media_type: "tv", isLive: true, viewers: "85,933" },
  { id: "15260", title: "Adventure Time", poster_path: "/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg", backdrop_path: "/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg", vote_average: 8.5, release_date: "2010-04-05", media_type: "tv" },
  { id: "1434", title: "Family Guy", poster_path: "/3PFsEuAiyLkWsP4GG6dIV37Q6gu.jpg", backdrop_path: "/l7wShoIdIUwaDIbsHno9pO5MZXT.jpg", vote_average: 7.4, release_date: "1999-01-31", media_type: "tv" },
  { id: "606", title: "Ed, Edd n Eddy", poster_path: "/nfKenwmfmdtoXGhaYiDIftrBchw.jpg", backdrop_path: "/iRbNLYmqlxbqkfCuAmHaFwZ9ocY.jpg", vote_average: 7.9, release_date: "1999-01-04", media_type: "tv" },
  { id: "47480", title: "The Tom and Jerry Show", poster_path: "/41EWXLXTZO4MLb2BL28mWZuydyq.jpg", backdrop_path: "/utqCOvMmjjMTlXNZz6PHOzRM5QP.jpg", vote_average: 7.3, release_date: "2014-04-09", media_type: "tv" },
  { id: "12971", title: "Dragon Ball Z", poster_path: "/yfyToia25GnvjY7FPAGaCm3lKRc.jpg", backdrop_path: "/ydf1CeiBLfdxiyNTpskM0802TKl.jpg", vote_average: 8.4, release_date: "1989-04-26", media_type: "tv" },
  { id: "360920", title: "The Grinch", poster_path: "/smxA8yvZ0LzDPer9BIRd4pyOpx1.jpg", backdrop_path: "/5lWIYxYEqWi8j3ZloxXntw3ImBo.jpg", vote_average: 6.9, release_date: "2018-11-08", media_type: "movie" }
];

const GAMING_STREAMS_DATA = [
  { id: "82690", title: "Fortnite Championship - Ninja Live", poster_path: "/cu52l826q8jU7C6Xta2wm6B61mY.jpg", backdrop_path: "/8mP4T02z807Z3XQd1s4n6XlM9b1.jpg", vote_average: 8.2, release_date: "2026", media_type: "movie", isLive: true, viewers: "85,933" },
  { id: "580489", title: "GTA V Roleplay - xQc Live", poster_path: "/xmbU4V6J1Yst64fgdyTIHTv6eOI.jpg", backdrop_path: "/8Y43POKjjw0L051Gv44Z5w17wLs.jpg", vote_average: 7.8, release_date: "2026", media_type: "movie", isLive: true, viewers: "64,205" },
  { id: "350312", title: "Minecraft Hardcore - Dream", poster_path: "/pU1jKVmrmz18g4IG9UB3FWt15qb.jpg", backdrop_path: "/q71QZCxIWzaND7761R28su4J3Ur.jpg", vote_average: 8.5, release_date: "2026", media_type: "movie", isLive: true, viewers: "42,150" },
  { id: "980489", title: "Valorant Radiant Lobby - Shroud", poster_path: "/51tA6WLVndnd4mDxuG2me7ZE0i5.jpg", backdrop_path: "/jZIUCJjScSM24goOJm6cjrxo5tI.jpg", vote_average: 8.0, release_date: "2026", media_type: "movie", isLive: true, viewers: "22,405" },
  { id: "257344", title: "League of Legends Worlds - Riot Games", poster_path: "/6tIK0Zqf3XN280j6bV5D1j64n3o.jpg", backdrop_path: "/5l67yMvLp3Ww1D1F5o3b28bE54r.jpg", vote_average: 7.5, release_date: "2026", media_type: "movie", isLive: true, viewers: "128,930" }
];

const TOP_COLLECTIONS = [
    {
        id: "shonen-legends",
        title: "Shonen Legends",
        description: "High-octane action, epic battles, and legendary journeys.",
        image: "https://image.tmdb.org/t/p/w780/ydf1CeiBLfdxiyNTpskM0802TKl.jpg",
        link: "/browse?genre=Action&type=anime"
    },
    {
        id: "ghibli-favorites",
        title: "Studio Ghibli Favorites",
        description: "Step into worlds of wonder, magic, and heartwarming tales.",
        image: "https://image.tmdb.org/t/p/w780/utqCOvMmjjMTlXNZz6PHOzRM5QP.jpg",
        link: "/browse?genre=Fantasy&type=anime"
    },
    {
        id: "mind-bending-toons",
        title: "Mind-Bending Cartoons",
        description: "Hilarious, surreal, and cosmic adventures for the curious.",
        image: "https://image.tmdb.org/t/p/w780/zJZfxi8X3XPHAhxXseRugtnNVtt.jpg",
        link: "/browse?genre=Sci-Fi&type=tv"
    },
    {
        id: "cinematic-masterpieces",
        title: "Blockbuster Movies",
        description: "Must-watch blockbusters and cinematic spectacles.",
        image: "https://image.tmdb.org/t/p/w780/8mP4T02z807Z3XQd1s4n6XlM9b1.jpg",
        link: "/browse?type=movie"
    }
];

const TopCollectionsRow = () => {
    return (
        <section className="mb-8 md:mb-12 w-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-accent rounded-full shadow-[0_0_10px_var(--accent-glow)]" />
                <Sparkles className="w-4 h-4 text-accent" />
                <h2 className="text-base md:text-lg font-black font-sora tracking-tight text-white">Curated Collections</h2>
            </div>
            <div className="w-full">
                <div className="flex items-center gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-2">
                    {TOP_COLLECTIONS.map((col) => (
                        <Link scroll={false} 
                            href={col.link} 
                            key={col.id}
                            className="snap-start shrink-0 relative w-[240px] sm:w-[280px] md:w-[320px] aspect-[16/10] rounded-2xl overflow-hidden border border-white/5 bg-bg-elevated shadow-lg group hover:border-accent/30 hover:shadow-2xl transition-all duration-350 hover:scale-[1.02]"
                        >
                            <Image 
                                src={col.image} 
                                alt={col.title} 
                                fill
                                sizes="(max-width: 768px) 280px, 320px"
                                className="absolute inset-0 object-cover opacity-60 group-hover:scale-105 transition-transform duration-[250ms] ease-apple" will-change-transform 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                            <div className="absolute inset-0 flex flex-col justify-end p-4 z-20 select-none">
                                <span className="text-[8px] font-black tracking-widest text-accent uppercase mb-1">COLLECTION</span>
                                <h3 className="text-sm md:text-base font-black text-white font-sora tracking-tight leading-tight mb-1 group-hover:text-accent transition-colors">
                                    {col.title}
                                </h3>
                                <p className="text-[10px] text-zinc-400 font-medium line-clamp-2 leading-relaxed">
                                    {col.description}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Global fetcher for SWR to prevent re-allocation on every render
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function MoviesPage() {
    const [activeTab, setActiveTab] = useState("movies");
    const [deviceMode, setDeviceMode] = useState<"mobile" | "pc" | "tv">("pc");

    useEffect(() => {
        const detectDevice = () => {
            if (typeof window !== "undefined") {
                const ua = navigator.userAgent;
                const width = window.innerWidth;
                const isTVUA = /SmartTV|GoogleTV|AppleTV|Roku|CastTV|Tizen|Web0S|NetCast|Opera TV|Viera|Bravia|PlayStation|Xbox/i.test(ua);
                if (isTVUA || width >= 2500) {
                    setDeviceMode("tv");
                } else if (width < 1024) {
                    setDeviceMode("mobile");
                } else {
                    setDeviceMode("pc");
                }
            }
        };
        detectDevice();
        window.addEventListener("resize", detectDevice);
        return () => window.removeEventListener("resize", detectDevice);
    }, []);

    // Sync tab from query parameters
    const paramsInUrl = useSearchParams();
    const tabParam = paramsInUrl?.get("tab");
    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);
    const [activeProvider, setActiveProvider] = useState<ProviderSlug>("all");
    const [providerData, setProviderData] = useState<Record<string, any>>({}); // keyed by slug
    const [providerLoading, setProviderLoading] = useState(false);
    const [trending, setTrending] = useState<MovieItem[]>([]);
    const [popular, setPopular] = useState<MovieItem[]>([]);
    const [topRated, setTopRated] = useState<MovieItem[]>(DEFAULT_TOP_RATED);
    const [nowPlaying, setNowPlaying] = useState<MovieItem[]>(DEFAULT_NOW_PLAYING);
    const [tvPopular, setTvPopular] = useState<MovieItem[]>([]);
    const [tvTopRated, setTvTopRated] = useState<MovieItem[]>([]);
    const [genreData, setGenreData] = useState<Record<string, MovieItem[]>>({});
    const [networkData, setNetworkData] = useState<Record<string, MovieItem[]>>({});
    const [animeLatest, setAnimeLatest] = useState<any[]>([]);
    const [animeTrending, setAnimeTrending] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [trendingPeople, setTrendingPeople] = useState<any[]>([]);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [profile, setProfile] = useState<{name: string, avatar: string} | null>(null);
    const [recommendedItems, setRecommendedItems] = useState<MovieItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Premium Extra Categories
    const [podcasts, setPodcasts] = useState<any[]>([]);
    const [books, setBooks] = useState<any[]>([]);
    const [songs, setSongs] = useState<any[]>([]);
    const [videos, setVideos] = useState<any[]>([]);
    const [mjItems, setMjItems] = useState<any[]>([]);

    // Fetch current user from secure API
    const { data: userData } = useSWR('/api/auth/me', fetcher, {
        revalidateOnFocus: false,       // don't re-fetch auth when user alt-tabs
        shouldRetryOnError: false,      // don't retry 4xx auth failures
        dedupingInterval: 60000,        // cache result for 60s
        onErrorRetry: (err, _key, _cfg, revalidate, { retryCount }) => {
            const status = err?.status ?? err?.response?.status;
            if (status === 401 || status === 403 || status === 404) return; // never retry auth failures
            if (retryCount >= 2) return;
            setTimeout(() => revalidate({ retryCount }), 5000);
        },
    });

    
    useEffect(() => {
        if (userData?.user) {
            setProfile(userData.user);
        } else {
            setProfile(null);
        }
    }, [userData]);

    const { data: movieTrending } = useSWR('/api/prime/trending', fetcher);
    const { data: moviePopular } = useSWR('/api/prime?category=popular', fetcher);
    const { data: movieUpcoming } = useSWR('/api/prime?category=now_playing', fetcher);
    const { data: moviePeople } = useSWR('/api/prime/trending?type=person', fetcher);

    // Scroll-to-top visibility
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 500);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (movieTrending?.results) {
            const rawTrending = movieTrending.results || [];
            const validTrending = rawTrending.filter((item: MovieItem) => item && (item.poster_path || item.backdrop_path));
            const enhancedTrending = validTrending.map((item: MovieItem, index: number) => ({
                ...item,
                rank: index < 10 ? index + 1 : undefined,
                isMostViewed: index < 3,
                liveViewers: index < 10 ? Math.floor(Math.random() * (5000 - 1000) + 1000) : undefined
            }));
            setTrending(enhancedTrending);
        }
    }, [movieTrending]);

    useEffect(() => { if (Array.isArray(moviePopular?.results)) setPopular(moviePopular.results.filter((i: any) => i && (i.poster_path || i.backdrop_path))); }, [moviePopular]);
    useEffect(() => { if (Array.isArray(movieUpcoming?.results)) setNowPlaying(movieUpcoming.results.filter((i: any) => i && (i.poster_path || i.backdrop_path))); }, [movieUpcoming]);
    useEffect(() => { if (Array.isArray(moviePeople?.results)) setTrendingPeople(moviePeople.results.filter((i: any) => i && i.profile_path).slice(0, 6)); }, [moviePeople]);

    // Pre-compute smart recommendations once when trending/popular loads to prevent CLS/re-shuffling
    useEffect(() => {
        if (trending.length > 0 && popular.length > 0) {
            const combined = [...trending.slice(2, 6), ...popular.slice(2, 6)];
            const shuffled = combined.sort(() => Math.random() - 0.5);
            setRecommendedItems(shuffled);
        }
    }, [trending, popular]);

    // Fetch main data sequentially (remaining axios calls)
    useEffect(() => {
        const loadOtherData = async () => {
            // Fetch top rated movies, tv popular, tv top rated
            try {
                const [topRatedRes, tvPopRes, tvTopRes] = await Promise.all([
                    axios.get("/api/prime?category=top_rated"),
                    axios.get("/api/prime/tv?category=popular"),
                    axios.get("/api/prime/tv?category=top_rated"),
                ]);

                setTopRated(Array.isArray(topRatedRes.data.results) ? topRatedRes.data.results.filter((i: any) => i && (i.poster_path || i.backdrop_path)) : []);
                setTvPopular(Array.isArray(tvPopRes.data.results) ? tvPopRes.data.results.filter((i: any) => i && (i.poster_path || i.backdrop_path)) : []);
                setTvTopRated(Array.isArray(tvTopRes.data.results) ? tvTopRes.data.results.filter((i: any) => i && (i.poster_path || i.backdrop_path)) : []);
            } catch (err) {
                console.error("Failed to fetch main data:", err);
            }

            // Fetch genres (since we only show these for movies now, it fits the movies tab)
            try {
                const promises = GENRE_ROWS.map((genre) =>
                    axios.get(`/api/prime/discover?media_type=${genre.type}&genre_id=${genre.genreId}`)
                );
                const results = await Promise.allSettled(promises);
                const newGenreData: Record<string, MovieItem[]> = {};
                GENRE_ROWS.forEach((genre, i) => {
                    const res = results[i];
                    if (res.status === "fulfilled" && res.value.data.results?.length > 0) {
                        newGenreData[genre.title] = res.value.data.results.filter((i: any) => i && (i.poster_path || i.backdrop_path));
                    }
                });
                setGenreData(newGenreData);
            } catch (err) {
                console.error("Failed to fetch genres:", err);
            }
            
            // Fetch networks
            try {
                const promises = NETWORK_ROWS.map((net) =>
                    axios.get(`/api/prime/discover?media_type=tv&network_id=${net.networkId}`)
                );
                const results = await Promise.allSettled(promises);
                const newNetworkData: Record<string, MovieItem[]> = {};
                NETWORK_ROWS.forEach((net, i) => {
                    const res = results[i];
                    if (res.status === "fulfilled") {
                        if (res.value.data.results && res.value.data.results.length > 0) {
                            newNetworkData[net.title] = res.value.data.results;
                        }
                    }
                });
                setNetworkData(newNetworkData);
            } catch (err) {
                console.error("Failed to fetch network data:", err);
            }

            // Fetch Anime Home
            try {
                const animeRes = await axios.get("/api/anime/home");
                if (Array.isArray(animeRes.data.latest)) setAnimeLatest(animeRes.data.latest.filter((i: any) => i && i.image));
                if (Array.isArray(animeRes.data.trending)) setAnimeTrending(animeRes.data.trending.filter((i: any) => i && i.image));
            } catch (err) {
                console.error("Failed to fetch anime home:", err);
            }


            // Fetch Premium Extra Content
            try {
                const premiumRes = await axios.get("/data/premium_content.json");
                const data = premiumRes.data;
                setPodcasts(data.trending_podcasts || []);
                setBooks(data.trending_books || []);
                setSongs(data.trending_songs || []);
                setVideos(data.trending_videos || []);
                
                // Group MJ items for theme alignment
                const allMj = [
                    ...(data.trending_movies || []),
                    ...(data.trending_tv_shows || []),
                    ...(data.trending_podcasts || []),
                    ...(data.trending_books || []),
                    ...(data.trending_songs || []),
                    ...(data.trending_videos || [])
                ].filter(item => item && (item.title?.toLowerCase().includes('michael jackson') || item.artist?.toLowerCase().includes('michael jackson') || item.author?.toLowerCase().includes('michael jackson') || item.title === "Michael" || item.title === "The Wiz" || item.title === "Moonwalker" || item.title === "This Is It"));
                
                setMjItems(allMj.slice(0, 8));
            } catch (err) {
                console.error("Failed to fetch premium content:", err);
            }
            setLoading(false);
        };

        loadOtherData();
    }, []);

    // Provider switching: fetch from /api/provider when activeProvider changes
    useEffect(() => {
        if (activeProvider === "all") return; // reset handled below
        if (providerData[activeProvider]) return; // already cached

        setProviderLoading(true);
        const controller = new AbortController();
        axios
            .get(`/api/provider?provider=${activeProvider}`, { signal: controller.signal })
            .then((res) => {
                setProviderData((prev) => ({ ...prev, [activeProvider]: res.data }));
            })
            .catch((err) => {
                if (!axios.isCancel(err)) console.error("Provider fetch error:", err);
            })
            .finally(() => setProviderLoading(false));

        return () => controller.abort();
    }, [activeProvider]);



    // Search handler
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/search/unified?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(res.data.results || []);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Check for search query in URL
    useEffect(() => {
        const q = paramsInUrl?.get('q');
        if (q) {
            setSearchQuery(q);
        }
    }, [paramsInUrl]);

    return (
        <div className="bg-bg-main text-[var(--text-main)] selection:bg-accent-warm/25 transition-colors duration-[250ms]">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-accent/[0.03] to-transparent" />
            </div>

            <div className="relative z-10 w-full">
                <h1 className="sr-only">ToonPlayer - Watch Free Anime & Movies</h1>
                <HeroCarousel />

                {/* Provider Bar — sticky, below hero */}
                <ProviderBar
                    activeProvider={activeProvider}
                    onProviderChange={(slug) => setActiveProvider(slug)}
                    isLoading={providerLoading}
                />

                {/* Genres & Categories Sub-Nav */}
                {deviceMode !== "tv" && (
                    <div className="bg-[var(--bg-overlay)]/95 backdrop-blur-3xl border-b border-white/5 z-30 shadow-[0_4px_16px_rgba(0,0,0,0.25)] py-1 transition-all duration-[250ms]">
                        <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar z-50">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer relative z-50 border ${activeTab === tab.id
                                            ? "bg-gradient-to-r from-accent to-accent-secondary text-white border-transparent shadow-[0_0_20px_rgba(88,101,242,0.35)] scale-105"
                                            : "bg-bg-card border-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                                        }`}
                                    >
                                        <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-white/10 ml-6">
                                <span className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)]">Quick Filters:</span>
                                {GENRE_ROWS.slice(0, 4).map(g => (
                                    <button 
                                        key={g.genreId}
                                        onClick={() => document.getElementById(`genre-${g.genreId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        {g.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 py-4">
                    {searchQuery ? (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <Search className="w-6 h-6 text-accent" />
                                {isSearching ? "Searching..." : `Results for "${searchQuery}"`}
                            </h2>
                            {searchResults.length > 0 ? (
                                <div className="responsive-grid">
                                    {searchResults.map((item: any) => (
                                        <Link
                                            key={`${item.type}-${item.id}`}
                                            href={item.href}
                                            className="group relative bg-bg-card rounded-xl overflow-hidden border border-border-color hover:border-accent/40 transition-all hover:scale-[1.02] duration-[250ms] shadow-lg"
                                        >
                                            <div className="aspect-[2/3] relative">
                                                <Image src={item.image} alt={item.title} fill sizes="(max-width: 768px) 33vw, 20vw" className="object-cover" />
                                                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/80 backdrop-blur-md text-[10px] font-black uppercase tracking-tighter text-white border border-white/10">
                                                    {item.type}
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <h3 className="text-sm font-bold text-white truncate leading-tight mb-1 group-hover:text-accent transition-colors tracking-tight">{item.title}</h3>
                                                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-medium">
                                                    <span>{item.format}</span>
                                                    <span>{item.year}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                !isSearching && <div className="text-center py-4 md:py-6 text-[var(--text-muted)]">No results found for your search.</div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0">
                            {/* Main Feed */}
                            <div className="flex-1 min-w-0">

                            {/* Provider empty state */}
                            {activeProvider !== "all" && !providerLoading && providerData[activeProvider] && (
                                (() => {
                                    const pd = providerData[activeProvider];
                                    const hasContent = (pd.trending?.length || 0) + (pd.movies?.length || 0) + (pd.tv?.length || 0) > 0;
                                    if (!hasContent) return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col items-center justify-center py-4 md:py-6 text-center gap-6"
                                        >
                                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl border border-white/10">
                                                🎬
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white mb-2">{pd.label} — No content found</h3>
                                                <p className="text-[var(--text-muted)] text-sm">This provider may have limited availability in your region.</p>
                                            </div>
                                            <button
                                                onClick={() => setActiveProvider("all")}
                                                className="px-6 py-3 rounded-full bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] hover:opacity-90 text-white font-bold text-sm transition-all"
                                            >
                                                Browse All Content
                                            </button>
                                        </motion.div>
                                    );
                                    return null;
                                })()
                            )}
                                <ContinueWatchingRow />

                                {/* Trending row for active provider */}
                                {activeProvider !== "all" && providerData[activeProvider]?.trending?.length > 0 && (
                                    <section className="mb-4 relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-24 bg-accent/8 rounded-full blur-[16px] pointer-events-none" />
                                        <SectionHeader icon={Sparkles} title={`Trending on ${providerData[activeProvider].label}`} color="text-accent" isFeatured />
                                        <LazySection><MovieRow items={providerData[activeProvider].trending} title={`${activeProvider}-trending`} isLarge /></LazySection>
                                    </section>
                                )}

                                {/* Smart Recommendations (only when no provider active) */}
                                {activeProvider === "all" && activeTab !== "anime" && recommendedItems.length > 0 && (
                                    <section className="mb-8 md:mb-12 relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-24 bg-accent/8 rounded-full blur-[16px] pointer-events-none" />
                                        <SectionHeader icon={Sparkles} title="Smart Recommendations For You" color="text-accent" isFeatured />
                                        <LazySection>
                                            <MovieRow 
                                                items={recommendedItems} 
                                                title="smart-recommendations" 
                                                isLarge 
                                            />
                                        </LazySection>
                                    </section>
                                )}

                                {/* Top Collections */}
                                {activeProvider === "all" && activeTab !== "anime" && (
                                    <TopCollectionsRow />
                                )}
                                
                                {deviceMode === "tv" ? (
                                    <div className="space-y-6 md:space-y-8">
                                        <section className="relative">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-24 bg-accent/8 rounded-full blur-[16px] pointer-events-none" />
                                            <SectionHeader icon={Tv} title="Featured Toons" color="text-accent" isFeatured />
                                            <LazySection><MovieRow items={CARTOONS_DATA} title="tv-featured-toons" isLarge /></LazySection>
                                        </section>
                                        
                                        <section className="relative">
                                            <SectionHeader icon={Flame} title="New Releases" color="text-accent-warm" />
                                            <LazySection><MovieRow items={[...CARTOONS_DATA, ...trending.slice(0, 5)]} title="tv-new-releases" /></LazySection>
                                        </section>

                                        <section className="relative">
                                            <SectionHeader icon={Play} title="Game-Streaming Highlights" color="text-accent-secondary" isFeatured />
                                            <LazySection><MovieRow items={GAMING_STREAMS_DATA} title="tv-gaming-highlights" /></LazySection>
                                        </section>
                                    </div>
                                ) : (
                                    <>
                                    {activeTab === "movies" && (
                                    <div
                                        key={`movies-${activeProvider}`}
                                        className="space-y-8 md:space-y-12"
                                    >
                                        {activeProvider !== "all" && providerData[activeProvider] ? (
                                            <>
                                                {providerData[activeProvider].movies?.length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Flame} title={`${providerData[activeProvider].label} Movies`} color="text-accent" isFeatured />
                                                        <LazySection><MovieRow items={providerData[activeProvider].movies} type="movie" title={`${activeProvider}-movies`} isLarge /></LazySection>
                                                    </section>
                                                )}
                                                {providerData[activeProvider].topRated?.length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Star} title="Top Rated" color="text-accent-warm" />
                                                        <LazySection><MovieRow items={providerData[activeProvider].topRated.filter((i:any) => !i.name)} type="movie" title={`${activeProvider}-toprated`} /></LazySection>
                                                    </section>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {((loading && trending.filter(m => (m as any).media_type === 'movie' || !m.name).length === 0) || trending.filter(m => (m as any).media_type === 'movie' || !m.name).length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Flame} title="Trending Movies" color="text-accent" isFeatured />
                                                        {trending.filter(m => (m as any).media_type === 'movie' || !m.name).length > 0 ? <LazySection><MovieRow items={trending.filter(m => (m as any).media_type === 'movie' || !m.name)} title="movie-trending" isLarge /></LazySection> : <RowSkeleton />}
                                                    </section>
                                                )}
                                                {((loading && popular.length === 0) || popular.length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Film} title="Popular Movies" color="text-accent" />
                                                        {popular.length > 0 ? <LazySection><MovieRow items={popular} type="movie" title="movies-popular" /></LazySection> : <RowSkeleton />}
                                                    </section>
                                                )}
                                                {((loading && nowPlaying.length === 0) || nowPlaying.length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Popcorn} title="Now Playing in Theaters" color="text-accent-warm" />
                                                        {nowPlaying.length > 0 ? <LazySection><MovieRow items={nowPlaying} type="movie" title="now-playing" /></LazySection> : <RowSkeleton />}
                                                    </section>
                                                )}
                                                {((loading && topRated.length === 0) || topRated.length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Star} title="Top Rated Movies" color="text-accent-warm" isFeatured />
                                                        {topRated.length > 0 ? <LazySection><MovieGrid items={topRated} type="movie" /></LazySection> : <RowSkeleton />}
                                                    </section>
                                                )}
                                                {GENRE_ROWS.map((genre) => {
                                                    const items = genreData[genre.title];
                                                    if ((loading && !items) || (items && items.length > 0)) {
                                                        return (
                                                            <section key={genre.title} id={`genre-${genre.genreId}`}>
                                                                <SectionHeader icon={genre.icon} title={genre.title} color="text-accent" />
                                                                {items && items.length > 0 ? (
                                                                    <LazySection><MovieRow items={items} type={genre.type} title={genre.title} /></LazySection>
                                                                ) : (
                                                                    <RowSkeleton />
                                                                )}
                                                            </section>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeTab === "tv" && (
                                    <div
                                        key={`tv-${activeProvider}`}
                                        className="space-y-8 md:space-y-12"
                                    >
                                        {activeProvider !== "all" && providerData[activeProvider] ? (
                                            <>
                                                {providerData[activeProvider].tv?.length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Flame} title={`${providerData[activeProvider].label} Series`} color="text-accent" isFeatured />
                                                        <LazySection><MovieRow items={providerData[activeProvider].tv} type="tv" title={`${activeProvider}-tv`} isLarge /></LazySection>
                                                    </section>
                                                )}
                                                {providerData[activeProvider].topRated?.filter((i:any) => !!i.name).length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Star} title="Top Rated Shows" color="text-accent-warm" />
                                                        <LazySection><MovieRow items={providerData[activeProvider].topRated.filter((i:any) => !!i.name)} type="tv" title={`${activeProvider}-toprated-tv`} /></LazySection>
                                                    </section>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {((loading && trending.filter(m => (m as any).media_type === 'tv' || m.name).length === 0) || trending.filter(m => (m as any).media_type === 'tv' || m.name).length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Flame} title="Trending TV Shows" color="text-accent" isFeatured />
                                                        {trending.filter(m => (m as any).media_type === 'tv' || m.name).length > 0 ? <LazySection><MovieRow items={trending.filter(m => (m as any).media_type === 'tv' || m.name)} title="tv-trending" isLarge /></LazySection> : <RowSkeleton />}
                                                    </section>
                                                )}
                                                {((loading && tvPopular.length === 0) || tvPopular.length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Tv} title="Popular TV Shows" color="text-accent" />
                                                        {tvPopular.length > 0 ? <LazySection><MovieRow items={tvPopular} type="tv" title="tv-popular" /></LazySection> : <RowSkeleton />}
                                                    </section>
                                                )}
                                                {((loading && tvTopRated.length === 0) || tvTopRated.length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Star} title="Top Rated TV Shows" color="text-accent-warm" isFeatured />
                                                        {tvTopRated.length > 0 ? <LazySection><MovieGrid items={tvTopRated} type="tv" /></LazySection> : <RowSkeleton />}
                                                    </section>
                                                )}
                                                {NETWORK_ROWS.map((net, idx) => {
                                                    const items = networkData[net.title];
                                                    if ((loading && !items) || (items && items.length > 0)) {
                                                        return (
                                                            <section key={net.title} id={`network-${net.networkId}`}>
                                                                <SectionHeader icon={Tv} title={net.title} color="text-white" brandColor={net.brandColor} />
                                                                {items && items.length > 0 ? (
                                                                    <LazySection><MovieRow items={items} type="tv" title={net.title} isLarge={idx === 1 || idx === 5} /></LazySection>
                                                                ) : (
                                                                    <RowSkeleton />
                                                                )}
                                                            </section>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </>
                                        )}
                                    </div>
                                )}
                                
                                {activeTab === "anime" && (
                                    <div
                                        key={`anime-${activeProvider}`}
                                        className="space-y-8 md:space-y-12 mt-4"
                                    >
                                        {/* Provider anime content (Crunchyroll / ToonPlayer Originals) */}
                                        {activeProvider !== "all" && providerData[activeProvider]?.isAnime && providerData[activeProvider].tv?.length > 0 ? (
                                            <>
                                                <section>
                                                    <SectionHeader icon={Flame} title={`${providerData[activeProvider].label} — Top Anime`} color="text-accent" isFeatured />
                                                    <LazySection><MovieRow items={providerData[activeProvider].tv} type="tv" title={`${activeProvider}-anime`} isLarge /></LazySection>
                                                </section>
                                                {providerData[activeProvider].movies?.length > 0 && (
                                                    <section>
                                                        <SectionHeader icon={Sparkles} title="Anime Movies" color="text-accent-secondary" />
                                                        <LazySection><MovieRow items={providerData[activeProvider].movies} type="movie" title={`${activeProvider}-anime-movies`} /></LazySection>
                                                    </section>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {((loading && animeTrending.length === 0) || animeTrending.length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Flame} title="Trending Anime" color="text-accent" isFeatured />
                                                        {animeTrending.length > 0 ? (
                                                            <LazySection>
                                                                <MovieRow
                                                                    items={animeTrending.map((item: any) => ({
                                                                        id: item.id || item._id,
                                                                        title: item.title || item.name,
                                                                        poster_path: null,
                                                                        image: item.image || item.thumbnail,
                                                                        media_type: 'anime',
                                                                    }))}
                                                                    type="anime"
                                                                    title="anime-trending-row"
                                                                    isLarge
                                                                />
                                                            </LazySection>
                                                        ) : <RowSkeleton />}
                                                    </section>
                                                )}
                                                {((loading && animeLatest.length === 0) || animeLatest.length > 0) && (
                                                    <section>
                                                        <SectionHeader icon={Sparkles} title="Recently Released Anime" color="text-accent" />
                                                        {animeLatest.length > 0 ? (
                                                            <LazySection>
                                                                <MovieRow
                                                                    items={animeLatest.map((item: any) => ({
                                                                        id: item.id || item._id,
                                                                        title: item.title || item.name,
                                                                        poster_path: null,
                                                                        image: item.image || item.thumbnail,
                                                                        media_type: 'anime',
                                                                    }))}
                                                                    type="anime"
                                                                    title="anime-latest-row"
                                                                />
                                                            </LazySection>
                                                        ) : <RowSkeleton />}
                                                    </section>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeTab === "toons" && (
                                    <div
                                        key={`toons-${activeProvider}`}
                                        className="space-y-8 md:space-y-12"
                                    >
                                        <section>
                                            <SectionHeader icon={Tv} title="Featured PC Toons" color="text-accent" isFeatured />
                                            <LazySection><MovieRow items={CARTOONS_DATA} title="featured-pc-toons" isLarge /></LazySection>
                                        </section>
                                        <section>
                                            <SectionHeader icon={Sparkles} title="Latest Animated Releases" color="text-accent-warm" />
                                            <LazySection><MovieGrid items={CARTOONS_DATA} type="tv" /></LazySection>
                                        </section>
                                    </div>
                                )}

                                {activeTab === "gaming" && (
                                    <div
                                        key={`gaming-${activeProvider}`}
                                        className="space-y-8 md:space-y-12"
                                    >
                                        <section>
                                            <SectionHeader icon={Play} title="Live Streaming Highlights" color="text-accent" isFeatured />
                                            <LazySection><MovieRow items={GAMING_STREAMS_DATA} title="live-streaming-highlights" isLarge /></LazySection>
                                        </section>
                                        <section>
                                            <SectionHeader icon={Sparkles} title="Popular Gaming Hub Channels" color="text-accent-secondary" />
                                            <LazySection><MovieGrid items={GAMING_STREAMS_DATA} type="movie" /></LazySection>
                                        </section>
                                    </div>
                                )}

                                {activeTab === "trending" && (
                                    <div className="space-y-8 md:space-y-12">
                                        {((loading && trending.length === 0) || trending.length > 0) && (
                                            <section>
                                                <SectionHeader icon={TrendingUp} title="Global Trending" color="text-accent" isFeatured />
                                                {trending.length > 0 ? <MovieRow items={trending} title="global-trending" isLarge /> : <RowSkeleton />}
                                            </section>
                                        )}
                                        {((loading && popular.length === 0) || popular.length > 0) && (
                                            <section>
                                                <SectionHeader icon={Sparkles} title="Most Popular Today" color="text-accent-secondary" />
                                                {popular.length > 0 ? <MovieRow items={popular} type="movie" title="movies-popular-trending" /> : <RowSkeleton />}
                                            </section>
                                        )}
                                        {((loading && tvPopular.length === 0) || tvPopular.length > 0) && (
                                            <section>
                                                <SectionHeader icon={Tv} title="Trending Series" color="text-accent" />
                                                {tvPopular.length > 0 ? <MovieRow items={tvPopular} type="tv" title="tv-popular-trending" /> : <RowSkeleton />}
                                            </section>
                                        )}
                                    </div>
                                )}

                                {activeTab === "discover" && (
                                    <div className="space-y-2 md:space-y-3">
                                        {((loading && mjItems.length === 0) || mjItems.length > 0) && (
                                            <section className="relative p-8 rounded-3xl bg-gradient-to-br from-accent/20 to-accent-warm/20 border border-accent/20 overflow-hidden">
                                                <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
                                                <SectionHeader icon={Star} title="Michael Jackson: Beyond the Music" color="text-accent-warm" isFeatured />
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                                                    {mjItems.map((item, i) => (
                                                        <div key={i} className="bg-bg-card p-4 rounded-2xl border border-white/5 hover:border-accent/30 transition-all cursor-pointer group">
                                                            <div className="aspect-square rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 mb-3 overflow-hidden flex items-center justify-center">
                                                                {item.poster ? (
                                                                    <Image src={`https://image.tmdb.org/t/p/w200${item.poster}`} alt={item.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-110 transition-transform duration-[250ms]" will-change-transform />
                                                                ) : (
                                                                    <div className="text-zinc-600 font-bold text-lg">{item.title?.charAt(0)}</div>
                                                                )}
                                                            </div>
                                                            <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                                                            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{item.type} • {item.year}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                        {((loading && podcasts.length === 0) || podcasts.length > 0) && (
                                            <section>
                                                <SectionHeader icon={Zap} title="Trending Podcasts" color="text-accent-secondary" />
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    {podcasts.map((pod, i) => (
                                                        <div key={i} className="flex items-center gap-4 bg-bg-card p-4 rounded-2xl border border-white/5 hover:border-accent-secondary/30 transition-all cursor-pointer group">
                                                            <div className="w-16 h-16 rounded-xl bg-accent-secondary/10 flex items-center justify-center border border-accent-secondary/20 flex-shrink-0 group-hover:bg-accent-secondary/20">
                                                                <Play className="w-6 h-6 text-accent-secondary" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="text-sm font-bold text-white truncate">{pod.title}</h3>
                                                                <p className="text-xs text-zinc-500 mt-1">{pod.year} • Podcast</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                        {((loading && books.length === 0) || books.length > 0) && (
                                            <section>
                                                <SectionHeader icon={Popcorn} title="Trending Books" color="text-accent" />
                                                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                                                    {books.map((book, i) => (
                                                        <div key={i} className="flex-shrink-0 w-[160px] group cursor-pointer">
                                                            <div className="aspect-[2/3] rounded-xl bg-zinc-800 border border-white/10 mb-3 shadow-lg group-hover:border-accent/40 transition-all flex flex-col items-center justify-center p-4 text-center">
                                                                <div className="w-10 h-1 bg-accent mb-4" />
                                                                <h3 className="text-xs font-bold text-white leading-tight mb-2">{book.title}</h3>
                                                                <p className="text-[9px] text-zinc-500">{book.author}</p>
                                                            </div>
                                                            <p className="text-[10px] text-center font-bold text-zinc-500 uppercase">{book.year}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                        {((loading && songs.length === 0) || songs.length > 0) && (
                                            <section>
                                                <SectionHeader icon={Flame} title="Trending Songs" color="text-accent" />
                                                <div className="space-y-2">
                                                    {songs.map((song, i) => (
                                                        <div key={i} className="flex items-center gap-4 bg-bg-card/50 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all cursor-pointer group">
                                                            <span className="text-xs font-bold text-zinc-600 w-4">{i + 1}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-sm font-bold text-white truncate">{song.title}</h3>
                                                                <p className="text-[10px] text-zinc-500">{song.artist}</p>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-zinc-500">{song.year}</span>
                                                            <Play className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                        {((loading && videos.length === 0) || videos.length > 0) && (
                                            <section>
                                                <SectionHeader icon={Film} title="Trending Videos" color="text-accent" />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {videos.map((vid, i) => (
                                                        <div key={i} className="relative aspect-video rounded-2xl bg-zinc-800 overflow-hidden group cursor-pointer border border-white/5">
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                                            <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                                                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                                                </div>
                                                            </div>
                                                            <div className="absolute bottom-4 left-4 z-20">
                                                                <h3 className="text-sm font-bold text-white">{vid.title}</h3>
                                                                <p className="text-[10px] text-zinc-300 mt-0.5">{vid.year} • HD Video</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-[1800px] mx-auto px-6 lg:px-12 my-12 md:my-16">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                <section className="mb-6 md:mb-8 max-w-[1400px] mx-auto px-6 lg:px-12 relative hidden">
                    {/* Subtle ambient glow for the bottom region */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-full max-w-2xl h-64 bg-accent/10 rounded-full blur-[24px] pointer-events-none z-0" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative z-10">
                        <div className="space-y-8">
                            <h2 className="text-display">
                                ToonPlayer – Watch Movies & Anime Online
                            </h2>
                            <p className="text-body-lg">
                                ToonPlayer is a modern streaming platform where you can watch the latest movies, anime, and TV shows online in high quality. Discover trending content, explore genres like action, comedy, and adventure, and enjoy a fast and smooth viewing experience.
                            </p>
                            <div className="pt-4">
                                <h3 className="text-title mb-6 flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 text-accent" />
                                    Why Choose ToonPlayer?
                                </h3>
                                <ul className="space-y-4">
                                    {["Watch HD movies and anime online", "Fast and user-friendly interface", "Explore trending and top-rated content", "Regularly updated library"].map((feat, i) => (
                                        <li key={i} className="flex items-center gap-4 text-body font-bold text-white/90">
                                            <CheckCircle className="w-5 h-5 text-accent" /> {feat}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-bg-card to-transparent rounded-[2rem] p-10 border border-white/5 relative overflow-hidden group shadow-2xl">
                           <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
                           <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-3 font-sora">
                               <Flame className="w-6 h-6 text-accent" /> 
                               Stream Anytime, Anywhere
                           </h3>
                           <p className="text-body mb-8">ToonPlayer works beautifully across all devices including mobile, tablet, and desktop, giving you seamless access to entertainment on the go.</p>
                           <div className="mt-8 border-t border-white/10 pt-8 flex items-center justify-between">
                                <div>
                                    <h4 className="text-metadata text-accent mb-2">Platform Status</h4>
                                    <p className="text-sm font-medium text-white/50 italic">Actively updated with thousands of titles.</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                    <Zap className="w-5 h-5 text-accent-secondary" />
                                </div>
                           </div>
                        </div>
                    </div>
                </section>

                <section className="mb-32 max-w-[900px] mx-auto px-6 lg:px-12 hidden">
                    <h2 className="text-heading mb-6 md:mb-8 flex items-center gap-4 justify-center">
                        <Info className="w-6 h-6 text-accent" /> Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                        {[
                            { q: "What is ToonPlayer?", a: "ToonPlayer is a free online streaming platform where you can watch movies, anime, and TV shows in HD quality without signing up." },
                            { q: "Is ToonPlayer free to use?", a: "Yes, ToonPlayer is completely free. Stream movies, anime, and TV shows without any subscription or registration." },
                            { q: "What devices does ToonPlayer support?", a: "ToonPlayer works on all devices — smartphones, tablets, laptops, desktops, and smart TVs through any modern web browser." },
                            { q: "Does ToonPlayer have anime?", a: "Yes! ToonPlayer has a massive anime library with sub and dub options. Browse by genre or search for your favorites." },
                        ].map((faq, i) => (
                            <details key={i} className="group bg-bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-accent/30 transition-all duration-[250ms] shadow-lg">
                                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-base font-bold text-white hover:text-accent transition-colors list-none">
                                    {faq.q}
                                    <ChevronDown className="w-5 h-5 text-[var(--text-muted)] group-open:rotate-180 transition-transform duration-[250ms]" will-change-transform />
                                </summary>
                                <div className="px-6 pb-6 text-body">{faq.a}</div>
                            </details>
                        ))}
                    </div>
                </section>
            </div>

            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-6 right-6 z-40 p-3 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] hover:opacity-90 text-white rounded-full shadow-[0_0_20px_rgba(88,101,242,0.4)] backdrop-blur-sm transition-colors"
                    >
                        <ChevronUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}

// Section Header Component — memoized to avoid re-renders on tab/provider changes
const SectionHeader = memo(function SectionHeader({ icon: Icon, title, color, brandColor, isFeatured = false }: { icon: any; title: string; color: string; brandColor?: string; isFeatured?: boolean }) {
    return (
        <div className="flex items-end gap-2.5 md:gap-3 mb-3 md:mb-4 text-[var(--text-main)] transition-all">
            {isFeatured ? (
                <div className="w-1.5 h-8 bg-gradient-to-t from-accent to-accent-secondary rounded-full shadow-[0_0_15px_var(--accent-glow)]" />
            ) : (
                <div className="w-1 h-5 bg-accent rounded-full shadow-[0_0_10px_var(--accent-glow)]" />
            )}
            <div className="flex flex-col">
                <div className="flex items-center gap-2 md:gap-3">
                    <Icon className={`${isFeatured ? 'w-5 h-5 md:w-6 md:h-6' : 'w-[18px] h-[18px] md:w-5 md:h-5'} text-accent drop-shadow-md`} />
                    <h2 className={`${isFeatured ? 'text-xl md:text-2xl font-black tracking-tight drop-shadow-sm font-sora' : 'text-base md:text-lg font-black tracking-tight font-sora'} ${brandColor || 'text-white'}`}>{title}</h2>
                </div>
                {isFeatured && (
                    <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-0.5 ml-0.5 opacity-75">Featured Collection</p>
                )}
            </div>
        </div>
    );
});

// Row Skeleton for Anime — memoized (static, never changes)
const RowSkeleton = memo(function RowSkeleton() {
    return (
        <div className="netflix-row px-0">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="netflix-card-snap w-[140px] sm:w-[160px] md:w-[200px] lg:w-[220px] shrink-0">
                    <div className="relative w-full aspect-[2/3] rounded-xl bg-white/5 overflow-hidden skeleton-shine mb-2 animate-pulse" />
                    <div className="space-y-2 px-0.5 animate-pulse">
                        <div className="h-3.5 bg-white/5 rounded w-4/5" />
                        <div className="h-2.5 bg-white/5 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
});
