"use client";

// Removed edge runtime for better compatibility

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { MovieGrid, type MovieItem } from "@/components/MovieCard";

function MovieSearchContent() {
    const searchParams = useSearchParams();
    const query = searchParams?.get("query") || "";
    const genre = searchParams?.get("genre") || "";
    const status = searchParams?.get("status") || "";
    
    const [results, setResults] = useState<MovieItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        if (genre) params.set("genre", genre);
        if (status) params.set("status", status);

        axios.get(`/api/prime/search?${params.toString()}`)
            .then(res => setResults(res.data.results || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [query, genre, status]);

    const title = query 
        ? `Search Results for "${query}"` 
        : genre 
        ? `${genre} Movies & TV` 
        : status 
        ? `${status} Content`
        : "Discover Content";

    return (
        <main className="min-h-screen pt-24 px-4 md:px-8 max-w-7xl mx-auto bg-[var(--bg-main)]">
            <h1 className="text-2xl md:text-3xl font-black mb-8 text-[var(--text-main)]">
                {title}
            </h1>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </div>
            ) : results.length > 0 ? (
                <div className="pb-12">
                    <MovieGrid items={results} />
                </div>
            ) : (
                <div className="flex flex-col flex-1 items-center justify-center text-center opacity-60 py-20">
                    <p className="text-xl font-medium mb-2 text-[var(--text-main)]">No results found</p>
                    <p className="text-sm text-[var(--text-muted)] max-w-xs">
                        {query ? "We couldn't find any movies or TV shows matching your search terms." : "No content found for this filter."}
                    </p>
                </div>
            )}
        </main>
    );
}

export default function MovieSearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen pt-24 text-center text-blue-400 font-bold bg-[var(--bg-main)]">
                Loading Search...
            </div>
        }>
            <MovieSearchContent />
        </Suspense>
    );
}
