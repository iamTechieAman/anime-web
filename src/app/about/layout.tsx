import { Metadata } from "next";

export const metadata: Metadata = {
    title: "About | ToonPlayer",
    description: "Learn more about ToonPlayer, architecture, technology stack, and performance metrics.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
