import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Profile | ToonPlayer",
    description: "ToonPlayer - Profile page.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
