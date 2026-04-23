import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Search Movies & Anime",
    description: "Search the ToonPlayer library for thousands of movies, anime, and TV shows in HD quality. No ads, free streaming.",
    alternates: {
        canonical: "https://toonplayer.in/search",
    },
};

export default function SearchLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
