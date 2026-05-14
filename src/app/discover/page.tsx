import { Metadata } from "next";
import DiscoverClient from "./DiscoverClient";

export const metadata: Metadata = {
  title: "AI Discovery - Find What To Watch",
  description: "Use our AI Discovery tool to find the perfect movie, anime, or TV show based on your mood or prompt.",
  alternates: {
    canonical: 'https://toonplayer.in/discover',
  },
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
