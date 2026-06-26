import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Profile | ToonPlayer",
    description: "ToonPlayer - Profile page.",
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
