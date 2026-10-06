"use client";

import React, { useEffect } from "react";

export interface VideoEmbedProps {
  url: string;
  title?: string;
  className?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement>) => void;
  onError?: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export const VideoEmbed = React.memo(function VideoEmbed({
  url,
  title = "ToonPlayer Stream",
  className = "w-full h-full border-0",
  onLoad,
  onError,
  iframeRef,
}: VideoEmbedProps) {
  useEffect(() => {
    if (url) {
      console.log("[DEBUG] Playing URL:", url);
    }
  }, [url]);

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-xl">
      <iframe
        key={url}
        ref={iframeRef}
        src={url}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="origin"
        title={title}
        onLoad={onLoad}
        onError={onError}
      />
    </div>
  );
}, (prev, next) => prev.url === next.url);

export default VideoEmbed;
