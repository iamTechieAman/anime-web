import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Upcoming Releases | ToonPlayer",
    description: "Anticipated new movies, anime, and television series releasing soon on ToonPlayer.",
};

export default function UpcomingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
