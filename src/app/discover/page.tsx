"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles, Loader2, Search, ArrowLeft } from "lucide-react";
import axios from "axios";
import { MovieGrid } from "@/components/MovieCard";

export default function DiscoverPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const prompt = searchParams?.get("prompt") || "";

    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!prompt) {
            setLoading(false);
            return;
        }

        const fetchDiscovery = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/discover", { params: { prompt } });
                setResults(res.data.results || []);
            } catch (err) {
                console.error("Discovery error:", err);
                setError("Failed to fetch discovery results. Please try another query.");
            } finally {
                setLoading(false);
            }
        };

        fetchDiscovery();
    }, [prompt]);

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-[max(5rem,env(safe-area-inset-top))] pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <button 
                            onClick={() => router.back()} 
                            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-purple-400 font-bold mb-3 transition-colors text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-purple-500 shrink-0" />
                            AI Discovery
                        </h1>
                        <p className="text-[var(--text-muted)] mt-2 font-medium">
                            {prompt ? `Results for "${prompt}"` : "Describe what you want to watch..."}
                        </p>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse" />
                            <Loader2 className="w-12 h-12 text-purple-500 animate-spin relative z-10" />
                        </div>
                        <p className="text-sm font-black text-purple-400 uppercase tracking-widest animate-pulse">Analyzing Prompt...</p>
                    </div>
                ) : error ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
                    </div>
                ) : !prompt ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-opacity max-w-md mx-auto">
                        <Sparkles className="w-16 h-16 text-purple-500 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-2">What are you in the mood for?</h3>
                        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                            Try searching for things like "sad romance anime with good animation" or "action movies in space".
                        </p>
                    </div>
                ) : results.length > 0 ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <MovieGrid items={results} />
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-60">
                        <Search className="w-16 h-16 text-[var(--text-muted)] mb-6" />
                        <h3 className="text-xl font-bold text-white mb-2">No recommendations found</h3>
                        <p className="text-[var(--text-muted)] text-sm">Try using different keywords or genres.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
