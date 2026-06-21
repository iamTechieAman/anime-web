import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms | ToonPlayer",
    description: "ToonPlayer - Terms page.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
