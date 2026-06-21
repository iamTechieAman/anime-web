import { Metadata } from "next";

export const metadata: Metadata = {
    title: "History | ToonPlayer",
    description: "ToonPlayer - History page.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
