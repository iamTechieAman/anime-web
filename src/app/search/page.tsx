"use client";

export const runtime = 'edge';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { AnimeGrid, type Show } from "@/components/AnimeCard";
import { MovieGrid, type MovieItem } from "@/components/MovieCard";
import { Play, Film, Tv, Sparkles } from "lucide-react";

function SearchContent() {
    const searchParams = useSearchParams();
    const query = searchParams?.get("query") || "";
    const genre = searchParams?.get("genre") || "";
    const format = searchParams?.get("format") || "";
    const status = searchParams?.get("status") || "";
    
    const [animeResults, setAnimeResults] = useState<Show[]>([]);
    const [movieResults, setMovieResults] = useState<MovieItem[]>([]);
    const [scraplingResults, setScraplingResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchType, setSearchType] = useState<"all" | "movies" | "anime">("all");

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            const params = new URLSearchParams();
            if (query) params.set('query', query);
            if (genre) params.set('genre', genre);
            if (format) params.set('format', format);
            if (status) params.set('status', status);

            try {
                const [animeRes, movieRes, scrapeRes] = await Promise.allSettled([
                    axios.get(`/api/anime/search?${params.toString()}`),
                    query ? axios.get(`/api/prime/search?q=${encodeURIComponent(query)}`) : Promise.resolve({ data: { results: [] } }),
                    query ? axios.get(`/api/scrape?q=${encodeURIComponent(query)}`) : Promise.resolve({ data: { onoflix: [] } })
                ]);

                if (animeRes.status === 'fulfilled') setAnimeResults(animeRes.value.data.shows || []);
                if (movieRes.status === 'fulfilled') setMovieResults(movieRes.value.data.results || []);
                if (scrapeRes.status === 'fulfilled') {
                    const data = scrapeRes.value.data;
                    setScraplingResults([
                        ...(data.onoflix || []),
                        ...(data.aniwatch || [])
                    ]);
                }
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, genre, format, status]);

    const hasResults = animeResults.length > 0 || movieResults.length > 0;

    return (
        <main className="min-h-screen pt-24 px-4 md:px-8 max-w-7xl mx-auto bg-[var(--bg-main)]">
            <h1 className="text-2xl md:text-3xl font-black mb-8 text-[var(--text-main)]">
                {query ? (
                    <>Search Results for <span className="text-purple-400">"{query}"</span></>
                ) : (
                    <>Filtering Anime: <span className="text-purple-400">{genre || format || status}</span></>
                )}
            </h1>
            
            {/* Search Type Selector */}
            <div className="flex bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-color)] mb-8 w-fit mx-auto sm:mx-0 shadow-xl">
                {(["all", "movies", "anime"] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setSearchType(type)}
                        className={`px-8 py-2.5 rounded-xl text-sm font-black capitalize transition-all duration-300 ${
                            searchType === type 
                            ? type === 'movies' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40 transform scale-105" 
                              : type === 'anime' ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40 transform scale-105"
                              : "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-900/40 transform scale-105"
                            : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                        }`}
                    >
                        {type === 'all' ? 'Everything' : type}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                </div>
            ) : hasResults ? (
                <div className="space-y-12 pb-20">
                    {/* Movie/TV Results */}
                    {(searchType === "all" || searchType === "movies") && movieResults.length > 0 && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center gap-2 mb-6">
                                <Film className="w-5 h-5 text-blue-400" />
                                <h2 className="text-xl font-bold">Movies & TV Shows</h2>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold ml-2">TMDB Content</span>
                            </div>
                            <MovieGrid items={movieResults} />
                        </section>
                    )}

                    {/* Anime Results */}
                    {(searchType === "all" || searchType === "anime") && animeResults.length > 0 && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                            <div className="flex items-center gap-2 mb-6">
                                <Play className="w-5 h-5 text-purple-400" />
                                <h2 className="text-xl font-bold">Anime Results</h2>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold ml-2">AniList/Multi Source</span>
                            </div>
                            <AnimeGrid shows={animeResults} />
                        </section>
                    )}

                    {/* Scrapling Extra Results */}
                    {scraplingResults.length > 0 && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                            <div className="flex items-center gap-2 mb-6">
                                <Sparkles className="w-5 h-5 text-yellow-400" />
                                <h2 className="text-xl font-bold">Enhanced Results</h2>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-bold ml-2">Scrapling Powered</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                                {scraplingResults.map((item: any) => (
                                    <div key={item.id} className="group relative bg-[var(--bg-card)] rounded-xl overflow-hidden border border-[var(--border-color)] hover:border-yellow-500/50 transition-all hover:scale-[1.02] duration-300 shadow-lg cursor-pointer" 
                                         onClick={() => window.location.href = item.type === 'anime' ? `/watch/${item.id}` : `/movies/watch/${item.type}/${item.id}?provider=onoflix`}>
                                        <div className="aspect-[2/3] relative">
                                            <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-white uppercase tracking-wider">
                                                {item.type}
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-yellow-400 transition-colors uppercase tracking-tight">{item.title}</h3>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            ) : (
                <div className="flex flex-col flex-1 items-center justify-center text-center opacity-60 py-20 animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-[var(--bg-card)] rounded-full flex items-center justify-center mb-6 border border-[var(--border-color)]">
                        <Sparkles className="w-10 h-10 text-[var(--text-muted)]" />
                    </div>
                    <p className="text-xl font-medium mb-2 text-[var(--text-main)]">No results found</p>
                    <p className="text-sm text-[var(--text-muted)] max-w-xs">We couldn't find anything matching your search. Try adjusting your query or filters.</p>
                </div>
            )}
        </main>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen pt-24 text-center text-purple-400 font-bold bg-[var(--bg-main)]">
                Loading Search...
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}
