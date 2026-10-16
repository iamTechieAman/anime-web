import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Watchlist & Favorites | ToonPlayer",
    description: "Your saved collection of movies, TV series, and anime with custom folders and tags.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
