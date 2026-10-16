import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Watch History | ToonPlayer",
    description: "Track your watched movies, TV series, and anime with progress resume.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
