import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy | ToonPlayer",
    description: "ToonPlayer - Privacy page.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
