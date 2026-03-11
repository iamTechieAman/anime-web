"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Tv, ChevronLeft, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import axios from "axios";

type ScheduleAnime = {
  id: string | number;
  title: string;
  image: string;
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SCHEDULE_QUERY = `
query ($weekStart: Int, $weekEnd: Int) {
  Page(page: 1, perPage: 50) {
    airingSchedules(airingAt_greater: $weekStart, airingAt_lesser: $weekEnd, sort: TIME) {
      id
      episode
      airingAt
      timeUntilAiring
      media {
        id
        title { romaji english }
        coverImage { medium large }
        format
        status
      }
    }
  }
}
`;

function getWeekBounds(offsetDays: number = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return {
    weekStart: Math.floor(weekStart.getTime() / 1000),
    weekEnd: Math.floor(weekEnd.getTime() / 1000),
    startDate: weekStart,
    endDate: weekEnd,
    today: now.getDay(),
  };
}

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatCountdown(seconds: number) {
  if (seconds < 0) return "Aired";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState(new Date().getDay());
  const [scheduleByDay, setScheduleByDay] = useState<Record<number, ScheduleAnime[]>>({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const { weekStart, weekEnd, startDate, today } = getWeekBounds(weekOffset * 7);

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    setScheduleByDay({});

    const fetchSchedule = async () => {
      try {
        const res = await axios.post("https://graphql.anilist.co", {
          query: SCHEDULE_QUERY,
          variables: { weekStart, weekEnd },
        });

        const schedules = res.data?.data?.Page?.airingSchedules || [];
        const grouped: Record<number, ScheduleAnime[]> = {};

        schedules.forEach((s: any) => {
          if (!s.media) return;
          const dayOfWeek = new Date(s.airingAt * 1000).getDay();
          if (!grouped[dayOfWeek]) grouped[dayOfWeek] = [];
          grouped[dayOfWeek].push({
            id: s.media.id,
            title: s.media.title.english || s.media.title.romaji,
            image: s.media.coverImage.medium,
            episode: s.episode,
            airingAt: s.airingAt,
            timeUntilAiring: s.timeUntilAiring,
          });
        });

        setScheduleByDay(grouped);
      } catch (err) {
        console.error("Schedule fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [weekStart, weekEnd]);

  const weekLabel = weekOffset === 0
    ? "This Week"
    : weekOffset === 1 ? "Next Week" : weekOffset === -1 ? "Last Week" : `Week of ${startDate.toLocaleDateString()}`;

  const dayItems = scheduleByDay[activeDay] || [];

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-16 md:pt-0 pb-24 md:pb-10 md:pl-[72px]">
      <div className="sticky top-0 z-40 bg-[var(--bg-overlay)] backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl md:text-2xl font-bold font-sora">Airing Schedule</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold px-3">{weekLabel}</span>
            <button
              onClick={() => setWeekOffset((p) => p + 1)}
              className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day tabs */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex gap-1 overflow-x-auto hide-scrollbar pb-3">
          {DAYS.map((day, i) => {
            const count = (scheduleByDay[i] || []).length;
            const isToday = weekOffset === 0 && i === today;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(i)}
                className={`flex flex-col items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 relative ${
                  activeDay === i
                    ? "bg-white text-black"
                    : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)]"
                }`}
              >
                <span className="hidden sm:block">{day}</span>
                <span className="sm:hidden">{SHORT_DAYS[i]}</span>
                {count > 0 && (
                  <span className={`text-[10px] mt-0.5 font-bold ${activeDay === i ? "text-black/60" : "text-purple-400"}`}>
                    {count}
                  </span>
                )}
                {isToday && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF5722] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4.5] rounded-lg bg-[var(--bg-card)]" />
                <div className="h-4 mt-2 rounded bg-[var(--bg-card)] w-3/4" />
                <div className="h-3 mt-1 rounded bg-[var(--bg-card)] w-1/2" />
              </div>
            ))}
          </div>
        ) : dayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
            <Calendar className="w-16 h-16 mb-4 text-[var(--text-muted)]" />
            <p className="text-xl font-bold">No Anime Airing</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">No episodes scheduled for {DAYS[activeDay]}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-5">
            {dayItems.map((anime, idx) => {
              const isAiredOrAiring = anime.airingAt <= now;
              const countdown = anime.airingAt - now;
              // Use search by title since AniList IDs don't map to provider IDs
              const watchHref = `/search?query=${encodeURIComponent(anime.title)}`;
              return (
                <Link key={`${anime.id}-${idx}`} href={watchHref} className="group flex flex-col gap-2">
                  <div className="relative aspect-[3/4.5] rounded-lg overflow-hidden bg-[var(--bg-card)] shadow-lg">
                    <img
                      src={anime.image}
                      alt={anime.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {isAiredOrAiring ? (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-[#FF5722] rounded-sm text-white text-[10px] font-bold">
                        <Play className="w-2 h-2 fill-white" />
                        EP {anime.episode}
                      </div>
                    ) : (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur rounded-sm text-white text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatCountdown(countdown)}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur rounded-sm text-white text-[9px] font-bold">
                      <Tv className="w-2.5 h-2.5 inline mr-0.5" />
                      TV
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="px-1">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-snug font-sora group-hover:text-white transition-colors">
                      {anime.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(anime.airingAt)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
