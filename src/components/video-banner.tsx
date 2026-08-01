"use client";

import { useEffect, useRef, useState } from "react";

/**
 * VideoBanner
 * Shows an auto-playing muted video banner on the dashboard.
 * Replays the video every 5 minutes (300 seconds) for all logged-in users
 * (admin / super_admin / sales / telecalling — same behavior).
 *
 * Behavior:
 *  - Video auto-plays muted (browser policy compliant)
 *  - Loops internally while playing
 *  - Every 5 minutes, the video restarts from the beginning
 *  - Dismissible: user can hide it for the current session
 *  - Visible to all roles (admin, super_admin, sales, telecalling)
 */
export function VideoBanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  // Replay the video every 5 minutes (300,000 ms)
  useEffect(() => {
    if (hidden) return;
    const interval = setInterval(() => {
      setReplayKey((k) => k + 1);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hidden]);

  // Auto-play when key changes
  useEffect(() => {
    if (hidden) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {
      // Autoplay may be blocked — show unmute button as fallback
    });
  }, [replayKey, hidden]);

  if (hidden) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/20 shadow-lg bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-900/20">
      {/* Close / dismiss button */}
      <button
        onClick={() => setHidden(true)}
        className="absolute right-2 top-2 z-10 rounded-full bg-black/40 hover:bg-black/60 text-white p-1.5 backdrop-blur-sm transition"
        aria-label="Hide video"
        title="Hide video for this session"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* "Replay now" button — bottom right */}
      <button
        onClick={() => setReplayKey((k) => k + 1)}
        className="absolute right-2 bottom-2 z-10 rounded-full bg-black/40 hover:bg-black/60 text-white p-1.5 backdrop-blur-sm transition"
        aria-label="Replay video"
        title="Replay video now"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      {/* The video — 16:9, muted, looping, auto-playing */}
      <video
        key={replayKey}
        ref={videoRef}
        className="w-full aspect-video object-cover"
        src="/cat-animation.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />

      {/* Small caption */}
      <div className="absolute left-3 bottom-2 z-10 text-[11px] bg-black/30 text-white px-2 py-0.5 rounded backdrop-blur-sm">
        Replays every 5 min
      </div>
    </div>
  );
}
