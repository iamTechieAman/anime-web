"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";

export default function GlobalErrorListener() {
    useEffect(() => {
        // Intercept uncaught exceptions
        const handleError = (event: ErrorEvent) => {
            console.error("[Global Error Interceptor]:", event.error || event.message);
            // In production, you might send this to Sentry/Datadog
            // For now, we show a clean toast instead of letting the browser crash the view
            if (process.env.NODE_ENV === "development") {
                toast.error(`Dev Error: ${event.message}`, { id: "global-error" });
            }
        };

        // Intercept unhandled promise rejections (like failed axios calls without catch)
        const handleRejection = (event: PromiseRejectionEvent) => {
            console.error("[Unhandled Promise Rejection]:", event.reason);
            if (process.env.NODE_ENV === "development") {
                toast.error(`Dev Promise Error: ${event.reason?.message || 'Unknown rejection'}`, { id: "global-rejection" });
            }
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleRejection);

        // Optional: Override console.error directly to catch React rendering boundary warnings
        // Only do this if you want absolute control over the console output
        const originalConsoleError = console.error;
        console.error = (...args) => {
            originalConsoleError.apply(console, args);
        };

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleRejection);
            console.error = originalConsoleError;
        };
    }, []);

    return null; // This is a logic-only component
}
