import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact | ToonPlayer",
    description: "ToonPlayer - Contact page.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
