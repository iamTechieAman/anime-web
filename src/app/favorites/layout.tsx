import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Favorites | ToonPlayer",
    description: "Your saved favorite movies, television series, and anime on ToonPlayer.",
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
