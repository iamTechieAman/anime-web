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
        className={`shrink-0 select-none ${className}`}
        style={{ 
          width: size, 
          height: size, 
          aspectRatio: '1/1', 
          borderRadius: '9999px',
          padding: 0,
          margin: 0,
          background: 'transparent',
          boxShadow: 'none',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-br from-accent to-accent-secondary"
          style={{ borderRadius: '9999px', width: '100%', height: '100%' }}
        />
        <span style={{ fontSize: size * 0.4, position: 'relative', zIndex: 1, color: '#ffffff', fontWeight: 800 }}>
          {safeInitials}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`shrink-0 ${className}`}
      style={{ 
        width: size, 
        height: size, 
        aspectRatio: '1/1', 
        borderRadius: '9999px',
        padding: 0,
        margin: 0,
        background: 'transparent',
        boxShadow: 'none',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <img
        src={src}
        alt={alt}
        decoding="async"
        className={`transition-opacity duration-[220ms] ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          objectPosition: 'center center',
          borderRadius: '9999px'
        }}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
