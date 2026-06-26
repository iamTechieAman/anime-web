import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Discover Movies & Anime",
    description: "Discover new and trending movies, anime, and TV shows in HD quality on ToonPlayer.",
    alternates: {
        canonical: "https://www.toonplayer.in/discover",
    },
};

export default function DiscoverLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
