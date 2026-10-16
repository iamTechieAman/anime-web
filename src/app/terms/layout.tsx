import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service & DMCA | ToonPlayer",
    description: "Terms of service, usage guidelines, and DMCA procedures for ToonPlayer.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
