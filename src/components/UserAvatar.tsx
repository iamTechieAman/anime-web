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

  // Shared container style — block layout, overflow hidden, perfect circle
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '9999px',
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    display: 'block', // CRITICAL: block, not flex — so children fill naturally
  };

  if (isInvalidSrc || error) {
    return (
      <div style={containerStyle} className={className}>
        {/* Gradient fill that exactly matches the circle */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: size * 0.38, color: '#fff', fontWeight: 800, lineHeight: 1, userSelect: 'none' }}>
            {safeInitials}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className={className}>
      <img
        src={src!}
        alt={alt}
        decoding="async"
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        style={{
          // Fill the container completely — no flex tricks needed
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />
    </div>
  );
}
