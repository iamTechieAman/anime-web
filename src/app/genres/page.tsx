"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { 
    Sword, Compass, Sparkles, Laugh, Shield, Film,
    Heart, Users, Zap, History, Ghost, Music,
    Target, Rocket, Skull, ArrowRight
} from "lucide-react";

interface GenreDef {
    id: string;
    name: string;
    icon: any;
    desc: string;
    badge: string;
    backdrop?: string;
}

const GENRE_LIST: GenreDef[] = [
    {
        id: "28",
        name: "Action",
        icon: Sword,
        desc: "High-stakes battles, adrenaline-fueled adventures, and explosive stunts.",
        badge: "Adrenaline",
        backdrop: "/dd31qJxOarrHyGZwYsCzOjobQzP.jpg",
    },
    {
        id: "12",
        name: "Adventure",
        icon: Compass,
        desc: "Expeditions into uncharted territory, mythical quests, and grand journeys.",
        badge: "Expeditions",
    },
    {
        id: "16",
        name: "Animation",
        icon: Sparkles,
        desc: "Vibrant hand-drawn anime, cinematic CGI, and imaginative worlds brought to life.",
        badge: "Anime & CGI",
        backdrop: "/9Z2uDYXqJrlmePznQQJhL6d92Rq.jpg",
    },
    {
        id: "35",
        name: "Comedy",
        icon: Laugh,
        desc: "Witty satire, hilarious escapades, and feel-good stories designed to make you laugh.",
        badge: "Feel Good",
        backdrop: "/9Z2uDYXqJrlmePznQQJhL6d92Rq.jpg",
    },
    {
        id: "80",
        name: "Crime",
        icon: Shield,
        desc: "Underworld syndicates, sharp detectives, complex heists, and gritty noir mysteries.",
        badge: "Noir & Heist",
    },
    {
        id: "99",
        name: "Documentary",
        icon: Film,
        desc: "Inspiring true stories, wildlife chronicles, cultural investigations, and deep dives.",
        badge: "True Stories",
    },
    {
        id: "18",
        name: "Drama",
        icon: Heart,
        desc: "Compelling human narratives, intense personal struggles, and heartfelt storytelling.",
        badge: "Emotion",
    },
    {
        id: "10751",
        name: "Family",
        icon: Users,
        desc: "Heartwarming, wholesome entertainment curated for audiences of all ages.",
        badge: "All Ages",
    },
    {
        id: "14",
        name: "Fantasy",
        icon: Zap,
        desc: "Mythical realms, ancient sorcery, legendary beasts, and epic supernatural sagas.",
        badge: "Magic & Myth",
    },
    {
        id: "36",
        name: "History",
        icon: History,
        desc: "Monumental historical events, legendary figures, and period biographical dramas.",
        badge: "Chronicles",
    },
    {
        id: "27",
        name: "Horror",
        icon: Ghost,
        desc: "Supernatural terror, psychological dread, dark mysteries, and hair-raising frights.",
        badge: "Chills",
        backdrop: "/gYumbUCWyUI6Mutgd7oILOCunk8.jpg",
    },
    {
        id: "10402",
        name: "Music",
        icon: Music,
        desc: "Melodic journeys, musical theater, celebrated artist biopics, and live performances.",
        badge: "Soundtrack",
    },
    {
        id: "9648",
        name: "Mystery",
        icon: Target,
        desc: "Cryptic secrets, forensic investigations, whodunits, and suspenseful plot twists.",
        badge: "Whodunits",
    },
    {
        id: "10749",
        name: "Romance",
        icon: Heart,
        desc: "Passionate connections, heartwarming modern love stories, and timeless romantic bonds.",
        badge: "Love Stories",
        backdrop: "/1x9e0qWonw634NhIsRdvnneeqvN.jpg",
    },
    {
        id: "878",
        name: "Sci-Fi",
        icon: Rocket,
        desc: "Futuristic societies, advanced robotics, space explorations, and cosmic anomalies.",
        badge: "Futuristic",
        backdrop: "/2I1OFQJ0L9T0dpU6FobKFWV2PxX.jpg",
    },
    {
        id: "53",
        name: "Thriller",
        icon: Skull,
        desc: "White-knuckle pacing, psychological suspense, espionage, and treacherous conspiracies.",
        badge: "Suspense",
    },
    {
        id: "10752",
        name: "War",
        icon: Shield,
        desc: "Battlefield courage, military conflicts, historical campaigns, and tales of brotherhood.",
        badge: "Conflict",
    },
    {
        id: "37",
        name: "Western",
        icon: Compass,
        desc: "Rugged frontiers, frontier outlaws, desert duels, and classic old-west showdowns.",
        badge: "Frontier",
    }
];

export default function GenresPage() {
    return (
        <div className="flex-1 w-full pt-6 pb-20 px-4 sm:px-6 md:px-8 bg-bg-main min-h-[75vh] flex flex-col justify-between">
            <div className="w-full max-w-[1800px] mx-auto flex-1 flex flex-col">
                {/* Header */}
                <header className="mb-8 md:mb-10 border-b border-white/5 pb-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight font-sora">
                                Explore <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-secondary">Genres</span>
                            </h1>
                            <p className="text-zinc-400 text-sm md:text-base max-w-2xl font-medium mt-2 leading-relaxed">
                                Discover your next favorite movie, series, or anime by browsing our curated categories.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-zinc-500 bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-xl self-start md:self-auto">
                            <span className="text-white font-bold">{GENRE_LIST.length}</span> Categories Available
                        </div>
                    </div>
                </header>

                {/* Symmetrical, Responsive Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5 w-full">
                    {GENRE_LIST.map((genre, i) => {
                        const Icon = genre.icon;
                        return (
                            <motion.div
                                key={genre.id}
                                className="col-span-1"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                            >
                                <Link 
                                    scroll={false} 
                                    href={`/browse?genre_id=${genre.id}`}
                                    aria-label={`Explore ${genre.name}: ${genre.desc}`}
                                    title={`${genre.name} — ${genre.desc}`}
                                    className="group relative flex flex-col justify-between h-[190px] sm:h-[200px] md:h-[210px] w-full p-4 sm:p-5 rounded-2xl bg-[#0c0d13]/90 border border-white/[0.08] hover:border-accent/40 backdrop-blur-md overflow-hidden transition-all duration-300 ease-apple hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(229,9,20,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main active:scale-[0.98] select-none"
                                >
                                    {/* Optional Valid Backdrop Imagery */}
                                    {genre.backdrop && (
                                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                                            <Image
                                                src={`https://image.tmdb.org/t/p/w780${genre.backdrop}`}
                                                alt=""
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                                className="object-cover object-center opacity-15 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500 ease-out filter grayscale contrast-125"
                                            />
                                        </div>
                                    )}

                                    {/* Ambient subtle lighting */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent z-[1] pointer-events-none" />
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all z-[2]" />

                                    {/* Card Top: Icon & Badge */}
                                    <div className="relative z-10 flex items-start justify-between w-full">
                                        <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] group-hover:border-accent/40 group-hover:bg-accent/10 flex items-center justify-center text-zinc-300 group-hover:text-accent transition-all duration-300 shadow-sm">
                                            <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.05] transition-colors">
                                            {genre.badge}
                                        </span>
                                    </div>

                                    {/* Card Bottom: Title, Action Arrow, & Accessible Clamped Description */}
                                    <div className="relative z-10 mt-auto pt-3">
                                        <div className="flex items-center justify-between gap-1">
                                            <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-accent transition-colors tracking-tight font-sora">
                                                {genre.name}
                                            </h3>
                                            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-zinc-400 group-hover:text-zinc-300 line-clamp-2 leading-relaxed mt-1 font-normal transition-colors">
                                            {genre.desc}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
