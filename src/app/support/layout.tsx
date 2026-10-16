import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Support | ToonPlayer",
    description: "Get assistance, report bugs, or submit inquiries to the ToonPlayer team.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
