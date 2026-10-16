import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy | ToonPlayer",
    description: "Learn how ToonPlayer handles privacy, local device storage, and data protection.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
