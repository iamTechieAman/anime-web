import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolved = await params;
    const genre = resolved.id.charAt(0).toUpperCase() + resolved.id.slice(1);
    return {
        title: `${genre} | ToonPlayer`,
        description: `Watch ${genre} content on ToonPlayer.`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
