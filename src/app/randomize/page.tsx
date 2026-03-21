"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// A curated list of popular TMDB IDs for randomization
const RANDOM_POOL = [
  "tv/31911", // Fullmetal Alchemist: Brotherhood
  "tv/37854", // One Piece
  "tv/46260", // Naruto
  "tv/85937", // Demon Slayer
  "tv/95479", // Jujutsu Kaisen
  "tv/114410", // Chainsaw Man
  "tv/60625", // Rick and Morty
  "movie/129", // Spirited Away
  "movie/372058", // Your Name
  "movie/324857", // Spider-Man: Into the Spider-Verse
  "movie/569094", // Spider-Man: Across the Spider-Verse
  "movie/155", // The Dark Knight
  "tv/1396", // Breaking Bad
  "tv/60059", // Better Call Saul
  "tv/119051", // Wednesday
  "tv/66732", // Stranger Things
  "movie/27205", // Inception
  "movie/157336", // Interstellar
  "movie/299534", // Avengers: Endgame
];

export default function RandomizePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
        const pick = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
        const [type, id] = pick.split("/");
        router.replace(`/watch/${type}/${id}`);
    }, 1500); // 1.5s delay for a dramatic effect

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-4">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-pink-500/20 rounded-full animate-ping"></div>
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full shadow-[0_0_30px_rgba(236,72,153,0.3)]">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        </div>
      </div>
      <h1 className="text-2xl md:text-3xl font-black font-sora text-white tracking-tighter mb-2 text-center">
        Feeling Lucky?
      </h1>
      <p className="text-[var(--text-muted)] text-sm md:text-base font-medium animate-pulse text-center">
        Finding a random masterpiece just for you...
      </p>
    </div>
  );
}
