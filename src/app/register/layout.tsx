import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Register | ToonPlayer",
    description: "ToonPlayer - Register page.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
