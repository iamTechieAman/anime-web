import { Metadata } from "next";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Search Movies, TV Shows & Anime",
  description: "Find your favorite movies, TV series, and anime to watch in HD.",
  alternates: {
    canonical: 'https://www.toonplayer.in/search',
  },
};

export default function SearchPage() {
  return <SearchClient />;
}
