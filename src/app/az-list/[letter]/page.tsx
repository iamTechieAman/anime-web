"use client";

import { useState, useEffect, use } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Loader2, ArrowLeft } from "lucide-react";
import AZFilter from "@/components/AZFilter";
import { AnimeGrid, type Show } from "@/components/AnimeCard";

export default function AZListPage({ params }: { params: Promise<{ letter: string }> }) {
    // Correctly unwrap params using React.use() or await in async component
    // But since this is client component, we use the hook if available or just consume prop Promise
    const resolvedParams = use(params);
    const letter = resolvedParams.letter;

    // Normalize letter display (0-9 stays 0-9, single letters uppercase)
    const displayLetter = letter === "0-9" ? "0-9" : letter.toUpperCase();

    const [shows, setShows] = useState<Show[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchShows = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch from our new robust API
                const res = await axios.get(`/api/anime/az?letter=${letter}&page=${page}`);
                setShows(res.data.shows || []);
            } catch (err: any) {
                console.error("Failed to fetch A-Z list", err);
                setError(err.response?.data?.error || err.message || "Failed to load anime list. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchShows();
    }, [letter, page]);

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans">
            {/* Navbar Placeholder / Back */}
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-[var(--bg-overlay)] backdrop-blur-xl border-b border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </Link>
                    <h1 className="font-bold text-lg">Browse Anime: <span className="text-purple-400">{displayLetter}</span></h1>
                </div>
            </div>

            <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 md:px-6 space-y-8">
                {/* A-Z Filter Bar */}
                <div className="bg-[#111] p-4 rounded-xl border border-white/5 sticky top-20 z-40 shadow-xl">
                    <AZFilter />
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
                        <p className="text-zinc-500 animate-pulse">Fetching anime starting with "{displayLetter}"...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-red-400">
                        <p>{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <>
                        <AnimeGrid shows={shows} />

                        {/* Simple Pagination Buttons */}
                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                disabled={page === 1}
                                onClick={() => {
                                    setPage(p => Math.max(1, p - 1));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-6 py-2 bg-zinc-800 rounded-lg disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="flex items-center px-4 font-bold text-zinc-500">Page {page}</span>
                            <button
                                disabled={shows.length === 0} // Rudimentary check
                                onClick={() => {
                                    setPage(p => p + 1);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
