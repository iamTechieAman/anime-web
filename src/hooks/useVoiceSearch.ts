"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export type MicPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export interface DiagnosticsReport {
  secureContext: boolean;
  mediaDevicesSupported: boolean;
  browserName: string;
  hasAudioInput: boolean;
  permissionsPolicyOk: boolean;
}

export function useVoiceSearch(onTranscriptReady: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [recordingFallbackActive, setRecordingFallbackActive] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [browserName, setBrowserName] = useState("Unknown");
  const [permissionStatus, setPermissionStatus] = useState<MicPermissionState>("prompt");
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Browser detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      const isSamsung = /SamsungBrowser/i.test(ua);
      const isChrome = /Chrome/i.test(ua) && !/Edge|Edg/i.test(ua) && !/SamsungBrowser/i.test(ua);
      const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
      const isEdge = /Edge|Edg|EdgiOS|EdgA/i.test(ua);

      let bName = "Unknown Browser";
      if (isSamsung) bName = "Samsung Internet";
      else if (isEdge) bName = "Microsoft Edge Mobile";
      else if (isChrome) bName = isAndroid ? "Android Chrome" : "Chrome Desktop";
      else if (isSafari) bName = isIOS ? "Safari iOS" : "Safari Desktop";
      else if (/Firefox/i.test(ua)) bName = "Firefox Mobile";

      setBrowserName(bName);
    }
  }, []);

  // Run diagnostics check
  const runDiagnostics = useCallback(async (): Promise<DiagnosticsReport> => {
    const report: DiagnosticsReport = {
      secureContext: typeof window !== "undefined" ? window.isSecureContext : false,
      mediaDevicesSupported: typeof navigator !== "undefined" && !!navigator.mediaDevices,
      browserName: browserName,
      hasAudioInput: false,
      permissionsPolicyOk: true,
    };

    if (report.mediaDevicesSupported) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        report.hasAudioInput = devices.some(d => d.kind === "audioinput");
      } catch (e) {
        report.hasAudioInput = false;
      }
    }

    // Check Permissions-Policy dynamically via query
    if (typeof document !== "undefined" && report.mediaDevicesSupported) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        report.permissionsPolicyOk = true;
      } catch (e: any) {
        if (e.name === "SecurityError" || e.message?.includes("Permissions-Policy")) {
          report.permissionsPolicyOk = false;
        }
      }
    }

    setDiagnostics(report);
    return report;
  }, [browserName]);

  // Cleanup helper
  const stopAllMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Trigger fallback MediaRecorder recording
  const startRecordingFallback = useCallback(async () => {
    stopAllMedia();
    setRecordingFallbackActive(true);
    setIsListening(true);
    setErrorMsg(null);
    audioChunksRef.current = [];

    try {
      console.log("[useVoiceSearch] Requesting raw getUserMedia audio stream...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionStatus("granted");

      // Check supported MIME types for recording
      let options = { mimeType: "audio/webm" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/mp4" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "" }; // default
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecordingFallbackActive(false);
        setIsListening(false);
        setIsTranscribing(true);

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        console.log(`[useVoiceSearch] Audio recording stopped. Blob size: ${audioBlob.size} bytes`);

        if (audioBlob.size < 1000) {
          setErrorMsg("Audio recorded was too short. Please speak clearly.");
          toast.error("Audio too short. Please speak clearly.");
          setIsTranscribing(false);
          return;
        }

        // Upload to server-side transcription API
        try {
          const form = new FormData();
          form.append("file", audioBlob, `voice-search.${recorder.mimeType.split("/")[1] || "webm"}`);

          const toastId = toast.loading("Processing your voice command...");
          const res = await axios.post("/api/transcribe", form, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          toast.dismiss(toastId);

          if (res.data.text && res.data.text.trim()) {
            toast.success(`Heard: "${res.data.text}"`);
            onTranscriptReady(res.data.text);
          } else if (res.data.error === "transcription-key-missing") {
            setErrorMsg("transcription-key-missing");
            toast.error("Voice server offline. Please search using the keyboard.");
          } else {
            setErrorMsg("Could not understand your speech. Try again.");
            toast.error("Could not transcribe audio.");
          }
        } catch (err: any) {
          console.error("[useVoiceSearch] Upload transcription failed:", err);
          setErrorMsg("Transcription connection error.");
          toast.error("Transcription connection error.");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250); // Slice every 250ms
      console.log("[useVoiceSearch] Fallback MediaRecorder started successfully.");
    } catch (err: any) {
      console.error("[useVoiceSearch] Fallback recording error:", err);
      stopAllMedia();
      setRecordingFallbackActive(false);
      setIsListening(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionStatus("denied");
        setErrorMsg("not-allowed");
        toast.error("Microphone permission denied. Please enable mic access.");
      } else {
        setErrorMsg("audio-capture");
        toast.error("Microphone error: " + err.message);
      }
    }
  }, [onTranscriptReady, stopAllMedia]);

  // Main start listening toggle
  const startListening = useCallback(async () => {
    setErrorMsg(null);

    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("[useVoiceSearch] SpeechRecognition Web API not supported. Switching to fallback MediaRecorder.");
      await startRecordingFallback();
      return;
    }

    try {
      stopAllMedia();
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setRecordingFallbackActive(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          toast.success(`Voice query: "${text}"`);
          onTranscriptReady(text);
        }
      };

      rec.onerror = async (event: any) => {
        setIsListening(false);
        console.error("[useVoiceSearch] SpeechRecognition Web API error:", event.error);

        // Crucial: Fall back if service is not allowed, or permissions blocked
        if (event.error === "service-not-allowed") {
          console.warn("[useVoiceSearch] Service not allowed. Swapping to MediaRecorder fallback...");
          await startRecordingFallback();
        } else if (event.error === "not-allowed") {
          setPermissionStatus("denied");
          setErrorMsg("not-allowed");
          toast.error("Microphone permission denied.");
        } else if (event.error === "no-speech") {
          setErrorMsg("no-speech");
          toast.error("No speech detected. Please speak clearly.");
        } else if (event.error === "network") {
          setErrorMsg("network");
          toast.error("Speech service network error. Swapping to MediaRecorder...");
          await startRecordingFallback();
        } else {
          setErrorMsg(event.error);
          toast.error(`Voice search error: ${event.error}`);
        }
      };

      rec.start();
    } catch (e: any) {
      console.error("[useVoiceSearch] Web Speech API initialization failed:", e);
      await startRecordingFallback();
    }
  }, [onTranscriptReady, startRecordingFallback, stopAllMedia]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    stopAllMedia();
    setIsListening(false);
    setRecordingFallbackActive(false);
  }, [stopAllMedia]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      stopAllMedia();
    };
  }, [stopAllMedia]);

  return {
    isListening,
    recordingFallbackActive,
    isTranscribing,
    errorMsg,
    browserName,
    permissionStatus,
    diagnostics,
    startListening,
    stopListening,
    runDiagnostics,
  };
}
