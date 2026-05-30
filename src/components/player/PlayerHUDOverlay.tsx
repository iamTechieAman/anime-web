"use client";

import React, { useEffect, useState, useRef } from "react";
import { Play, Pause, RotateCcw, RotateCw, SkipForward, SkipBack, Languages, Volume2, X } from "lucide-react";
import Artplayer from "artplayer";

interface PlayerHUDOverlayProps {
  art: Artplayer;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  hasSubtitles?: boolean;
  hasMultipleAudio?: boolean;
}

export default function PlayerHUDOverlay({
  art,
  onNextEpisode,
  onPrevEpisode,
  hasSubtitles = false,
  hasMultipleAudio = false
}: PlayerHUDOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [activeAudioIndex, setActiveAudioIndex] = useState(-1);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);

  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synced states
  useEffect(() => {
    if (!art) return;

    setIsPlaying(art.playing);
    setCurrentTime(art.currentTime);
    setDuration(art.duration || 0);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(art.currentTime);
    const onDurationChange = () => setDuration(art.duration || 0);

    art.on("play", onPlay);
    art.on("pause", onPause);
    art.on("video:timeupdate", onTimeUpdate);
    art.on("video:durationchange", onDurationChange);

    return () => {
      art.off("play", onPlay);
      art.off("pause", onPause);
      art.off("video:timeupdate", onTimeUpdate);
      art.off("video:durationchange", onDurationChange);
    };
  }, [art]);

  // Show/Hide timer
  const triggerVisibility = () => {
    setIsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    
    // Auto hide after 4 seconds of inactivity if audio/subtitle menu is not open
    if (!showAudioMenu && !showSubtitlesMenu) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    }
  };

  // Listen to remote key activities
  useEffect(() => {
    const handleRemoteControl = (e: any) => {
      const { key } = e.detail;
      
      triggerVisibility();

      if (key === "ArrowLeft") {
        art.currentTime = Math.max(0, art.currentTime - 10);
        art.notice.show = "Seek Back -10s";
      } else if (key === "ArrowRight") {
        art.currentTime = Math.min(art.duration || Infinity, art.currentTime + 10);
        art.notice.show = "Seek Forward +10s";
      } else if (key === "Enter") {
        if (!isVisible) {
          // If hud hidden, Enter just wakes it up
          return;
        }
        // Let normal click handle it when visible
      } else if (key === "ArrowUp" || key === "ArrowDown") {
        // Just wakes up HUD
      }
    };

    window.addEventListener("tv-player-control", handleRemoteControl);
    
    // Wake up HUD on mouse movement as well (for PC users)
    const handleMouseMove = () => {
      triggerVisibility();
    };
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("tv-player-control", handleRemoteControl);
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isVisible, showAudioMenu, showSubtitlesMenu, art]);

  // Handle Play / Pause
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerVisibility();
    if (art.playing) {
      art.pause();
    } else {
      art.play();
    }
  };

  const handleRewind = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerVisibility();
    art.currentTime = Math.max(0, art.currentTime - 10);
  };

  const handleForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerVisibility();
    art.currentTime = Math.min(art.duration || Infinity, art.currentTime + 10);
  };

  // Audio track logic
  const handleAudioClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const hls = (art as any).hls;
    if (hls && hls.audioTracks) {
      setAudioTracks(hls.audioTracks);
      setActiveAudioIndex(hls.audioTrack);
      setShowAudioMenu(true);
      setShowSubtitlesMenu(false);
      triggerVisibility();
    } else {
      art.notice.show = "Only 1 Audio Track Available";
    }
  };

  const selectAudioTrack = (index: number) => {
    const hls = (art as any).hls;
    if (hls) {
      hls.audioTrack = index;
      setActiveAudioIndex(index);
      art.notice.show = `Audio switched to: ${hls.audioTracks[index]?.name || "Track " + index}`;
    }
    setShowAudioMenu(false);
  };

  // Subtitle track logic
  const handleSubtitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // In Artplayer, text tracks are natively on the video element
    setShowSubtitlesMenu(true);
    setShowAudioMenu(false);
    triggerVisibility();
  };

  const selectSubtitleTrack = (mode: "show" | "hide") => {
    if (mode === "show") {
      art.subtitle.show = true;
      art.notice.show = "Subtitles Enabled";
    } else {
      art.subtitle.show = false;
      art.notice.show = "Subtitles Disabled";
    }
    setShowSubtitlesMenu(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isVisible) return null;

  return (
    <div 
      className="absolute inset-0 z-40 bg-gradient-to-t from-black/90 via-black/40 to-black/60 flex flex-col justify-between p-6 select-none animate-[fadeIn_0.2s_ease-out]"
      onClick={triggerVisibility}
    >
      {/* Top Bar: Title & Status */}
      <div className="flex items-center justify-between w-full">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight drop-shadow">
            {art.option.title || "Now Playing"}
          </h2>
          <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mt-1">
            Smart TV Native OSD Active
          </p>
        </div>
        <div className="flex gap-2">
          {onPrevEpisode && (
            <button
              onClick={onPrevEpisode}
              data-focusable="true"
              className="p-3 bg-white/10 hover:bg-orange-500 rounded-full text-white transition-all transform hover:scale-110 border border-white/5 cursor-pointer outline-none focus:outline-none"
            >
              <SkipBack className="w-5 h-5" />
            </button>
          )}
          {onNextEpisode && (
            <button
              onClick={onNextEpisode}
              data-focusable="true"
              className="p-3 bg-white/10 hover:bg-orange-500 rounded-full text-white transition-all transform hover:scale-110 border border-white/5 cursor-pointer outline-none focus:outline-none"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Middle: Custom audio/subtitle lists */}
      <div className="flex-1 flex items-center justify-center relative">
        {showAudioMenu && (
          <div 
            className="absolute bg-zinc-950/95 border border-white/10 rounded-xl p-4 w-72 max-h-60 overflow-y-auto z-50 shadow-2xl backdrop-blur-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black uppercase text-orange-400 tracking-wider">Select Audio Language</span>
              <button onClick={() => setShowAudioMenu(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1">
              {audioTracks.map((track, i) => (
                <button
                  key={track.id || i}
                  data-focusable="true"
                  onClick={() => selectAudioTrack(i)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeAudioIndex === i 
                      ? "bg-orange-500 text-white" 
                      : "bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {track.name || `Track ${i + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {showSubtitlesMenu && (
          <div 
            className="absolute bg-zinc-950/95 border border-white/10 rounded-xl p-4 w-60 z-50 shadow-2xl backdrop-blur-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black uppercase text-orange-400 tracking-wider">Subtitles</span>
              <button onClick={() => setShowSubtitlesMenu(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1">
              <button
                data-focusable="true"
                onClick={() => selectSubtitleTrack("show")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  art.subtitle.show ? "bg-orange-500 text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                Enable Subtitles
              </button>
              <button
                data-focusable="true"
                onClick={() => selectSubtitleTrack("hide")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  !art.subtitle.show ? "bg-orange-500 text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                Disable Subtitles
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="space-y-4">
        {/* Timeline Slider */}
        <div className="flex items-center gap-4 text-xs font-bold text-zinc-300">
          <span>{formatTime(currentTime)}</span>
          <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden relative cursor-pointer group">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-100" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRewind}
              data-focusable="true"
              className="p-3 bg-white/5 hover:bg-orange-500 rounded-xl text-white transition-all transform hover:scale-105 border border-white/5 cursor-pointer outline-none focus:outline-none"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              data-focusable="true"
              className="p-4 bg-orange-500 hover:bg-orange-600 rounded-2xl text-white transition-all transform hover:scale-110 shadow-lg shadow-orange-500/35 border border-orange-400/20 cursor-pointer outline-none focus:outline-none"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>

            <button
              onClick={handleForward}
              data-focusable="true"
              className="p-3 bg-white/5 hover:bg-orange-500 rounded-xl text-white transition-all transform hover:scale-105 border border-white/5 cursor-pointer outline-none focus:outline-none"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAudioClick}
              data-focusable="true"
              className="p-3 bg-white/5 hover:bg-orange-500 rounded-xl text-white transition-all border border-white/5 cursor-pointer outline-none focus:outline-none flex items-center gap-1.5"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider hidden md:inline">Audio</span>
            </button>

            <button
              onClick={handleSubtitleClick}
              data-focusable="true"
              className="p-3 bg-white/5 hover:bg-orange-500 rounded-xl text-white transition-all border border-white/5 cursor-pointer outline-none focus:outline-none flex items-center gap-1.5"
            >
              <Languages className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider hidden md:inline">Subtitles</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
