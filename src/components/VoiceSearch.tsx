"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Volume2 } from "lucide-react";

interface VoiceSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (query: string) => void;
}

export default function VoiceSearch({ isOpen, onClose, onResult }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [note, setNote] = useState("Click the microphone to start speaking...");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNote("Speech recognition is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsListening(true);
      setNote("Listening... Speak now.");
      setInterimText("");
    };

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
      }

      if (final) {
        onResult(final);
        setIsListening(false);
        onClose();
      }
    };

    rec.onerror = (e: any) => {
      console.error("[VoiceSearch] Error:", e.error);
      if (e.error === "not-allowed") {
        setNote("Microphone permission denied. Enable microphone access.");
      } else {
        setNote(`Error: ${e.error || "Could not capture voice"}`);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    // Auto-start recording when opened
    try {
      rec.start();
    } catch (err) {
      console.warn("[VoiceSearch] Failed to auto-start:", err);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, [isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (_) {}
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div 
        className="relative max-w-md w-full bg-[#12121a] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          data-focusable="true"
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Pulsating Wave Background when listening */}
            {isListening && (
              <>
                <div className="absolute w-24 h-24 bg-orange-500/10 rounded-full animate-ping" />
                <div className="absolute w-20 h-20 bg-orange-500/25 rounded-full animate-pulse" />
              </>
            )}

            <button
              onClick={toggleListening}
              data-focusable="true"
              className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40" 
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              } outline-none focus:outline-none`}
            >
              {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
            </button>
          </div>

          <h3 className="text-lg font-black text-white uppercase tracking-tighter">
            {isListening ? "Listening" : "Speech Offline"}
          </h3>
          
          <p className="text-zinc-400 text-sm max-w-xs leading-relaxed min-h-12">
            {note}
          </p>

          {interimText && (
            <div className="flex items-center justify-center gap-2 bg-white/5 border border-white/5 rounded-xl px-4 py-3 max-w-xs animate-pulse">
              <Volume2 className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-orange-400 font-bold text-xs italic truncate">
                "{interimText}..."
              </p>
            </div>
          )}
        </div>

        <div className="pt-2 text-[10px] text-zinc-600 uppercase tracking-widest font-black">
          ToonPlayer voice controls
        </div>
      </div>
    </div>
  );
}
