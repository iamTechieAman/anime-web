import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Browse Genres - Movies & Anime",
    description: "Browse all movies and anime by genre. Find action, comedy, romance, and more in HD quality on ToonPlayer.",
    alternates: {
        canonical: "https://www.toonplayer.in/genres",
    },
};

export default function GenresLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
