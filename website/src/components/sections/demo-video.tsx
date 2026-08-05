"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";

export function DemoVideo() {
  const t = useTranslations("showcase");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
  };

  return (
    <div className="group relative cursor-pointer" onClick={toggle} role="button" aria-label={t("playVideo")}>
      <video
        ref={videoRef}
        src="/videos/demo-walkthrough.mp4"
        poster="/product-screenshots/screenshot-demo-light.png"
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full rounded-lg"
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity group-hover:opacity-90">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition-transform group-hover:scale-110 sm:h-20 sm:w-20">
            <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
          </span>
        </div>
      )}
      {playing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          aria-label={muted ? t("unmuteVideo") : t("muteVideo")}
          className="absolute right-3 bottom-3 rounded-full bg-black/60 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
