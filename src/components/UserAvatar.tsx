import { useState, useEffect } from "react";

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  initials?: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({ src, alt = "Avatar", initials, size = 40, className = "" }: UserAvatarProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset states if src changes
  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [src]);

  const isInvalidSrc = !src || 
    src === "null" || 
    src === "undefined" || 
    src.trim() === "" || 
    src.includes("undefined") ||
    src.includes("/undefined") ||
    src.includes("/null");

  const safeInitials = (initials && initials.trim().length > 0)
    ? initials.trim()
    : (alt && alt.trim().length > 0 ? alt.trim().charAt(0).toUpperCase() : "?");

  // If no source or error occurred, show fallback
  if (isInvalidSrc || error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-accent to-accent-secondary text-white font-extrabold select-none shrink-0 ${className}`}
        style={{ width: size, height: size, borderRadius: "50%" }}
      >
        <span style={{ fontSize: size * 0.4 }}>{safeInitials}</span>
      </div>
    );
  }

  return (
    <div 
      className={`relative shrink-0 overflow-hidden ${!loaded ? 'bg-white/10 animate-pulse' : ''} ${className}`}
      style={{ width: size, height: size, borderRadius: "50%" }}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-[220ms] ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
