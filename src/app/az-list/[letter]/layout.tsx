import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ letter: string }> }): Promise<Metadata> {
    const resolved = await params;
    const letter = resolved.letter.toUpperCase();
    return {
        title: `Browse ${letter} | ToonPlayer`,
        description: `Browse content starting with ${letter} on ToonPlayer.`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
