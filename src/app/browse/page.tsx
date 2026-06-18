import { Suspense } from "react";
import { Metadata } from "next";
import BrowseClient from "./BrowseClient";

export const metadata: Metadata = {
    title: "Browse Content - Movies, Shows & Anime",
    description: "Browse the complete collection of movies, TV shows, and anime on ToonPlayer. Use advanced filters to discover your next watch.",
    alternates: {
        canonical: "https://toonplayer.in/browse",
    },
};

export default function BrowsePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen pt-24 flex items-center justify-center bg-[var(--bg-main)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-[#FF9D00]/30 border-t-[#FF9D00] rounded-full animate-spin" />
                    <p className="text-sm text-[var(--text-muted)] animate-pulse font-bold tracking-widest uppercase">Loading Catalog...</p>
                </div>
            </div>
        }>
            <BrowseClient />
        </Suspense>
    );
}
