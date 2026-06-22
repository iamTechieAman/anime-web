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

  // If no source or error occurred, show fallback
  if (!src || error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] text-white font-extrabold select-none shrink-0 ${className}`}
        style={{ width: size, height: size, borderRadius: "50%" }}
      >
        <span style={{ fontSize: size * 0.4 }}>{initials}</span>
      </div>
    );
  }

  return (
    <div 
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: "50%" }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
