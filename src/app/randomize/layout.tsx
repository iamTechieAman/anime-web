import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Randomize | ToonPlayer",
    description: "ToonPlayer - Randomize page.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
