import { useState } from "react";
import Image from "next/image";

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  initials?: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({ src, alt = "Avatar", initials = "?", size = 40, className = "" }: UserAvatarProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If no source or error occurred, show fallback
  if (!src || error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-accent to-accent-secondary text-white font-extrabold select-none shrink-0 ${className}`}
        style={{ width: size, height: size, borderRadius: "50%" }}
      >
        <span style={{ fontSize: size * 0.4 }}>{initials}</span>
      </div>
    );
  }

  return (
    <div 
      className={`relative shrink-0 overflow-hidden ${!loaded ? 'bg-white/10 animate-pulse' : ''} ${className}`}
      style={{ width: size, height: size, borderRadius: "50%" }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className={`object-cover transition-opacity duration-[250ms] ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
