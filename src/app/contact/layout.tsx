import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact & Support | ToonPlayer",
    description: "Get in touch with the ToonPlayer team for assistance, bug reports, and DMCA inquiries.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
