import { Metadata } from "next";

export const metadata: Metadata = {
    title: "DMCA Policy | ToonPlayer",
    description: "Copyright and DMCA takedown procedures for ToonPlayer.",
};

export default function DmcaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
