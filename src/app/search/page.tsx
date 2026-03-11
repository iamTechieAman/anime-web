"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { AnimeGrid, type Show } from "@/components/AnimeCard";

function SearchContent() {
    const searchParams = useSearchParams();
    const query = searchParams?.get("query") || "";
    const [results, setResults] = useState<Show[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!query) {
            setLoading(false);
            return;
        }
        setLoading(true);
        axios.get(`/api/anime/search?query=${encodeURIComponent(query)}`)
            .then(res => setResults(res.data.shows || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [query]);

    return (
        <main className="min-h-screen pt-24 px-4 md:px-8 max-w-7xl mx-auto bg-[var(--bg-main)]">
            <h1 className="text-2xl md:text-3xl font-black mb-8 text-[var(--text-main)]">
                Search Results for <span className="text-purple-400">"{query}"</span>
            </h1>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                </div>
            ) : results.length > 0 ? (
                <div className="pb-12">
                    <AnimeGrid shows={results} />
                </div>
            ) : (
                <div className="flex flex-col flex-1 items-center justify-center text-center opacity-60 py-20">
                    <p className="text-xl font-medium mb-2 text-[var(--text-main)]">No results found</p>
                    <p className="text-sm text-[var(--text-muted)] max-w-xs">We couldn't find any anime matching your search terms. Try different keywords.</p>
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
