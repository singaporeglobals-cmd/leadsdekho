"use client";

import { useEffect, useRef, useState } from "react";

/**
 * FloatingCatWidget
 * -----------------
 * A floating video-overlay widget that sits at the bottom-right of the screen
 * across ALL pages of the authenticated app. Plays a green-screen cat video
 * with the green keyed out in real-time via a hidden <canvas> (browser-side
 * chroma keying), so the cat appears to float directly on the page background.
 *
 * Behavior:
 *  - Fixed position bottom-right; visible on every page (admin / sales / telecalling)
 *  - Auto-plays muted (browser-policy compliant)
 *  - Loops internally while playing
 *  - Replays from the beginning every 5 minutes (300s)
 *  - Dismissible for the current session (close button top-right of widget)
 *  - "Replay now" button (bottom-right of widget)
 *  - Draggable (user can drag to reposition anywhere on screen)
 *  - Pause/Play toggle on click
 *
 * Implementation notes:
 *  - Server-side ffmpeg build cannot encode VP9 alpha on this Debian system,
 *    so we ship the original green-screen MP4 and do the chroma key in the
 *    browser via canvas 2D API. This works in Chrome, Edge, Firefox, Safari.
 *  - Canvas runs at 30 FPS for performance; video runs at native 24 fps.
 *  - The <video> element is hidden; only the <canvas> is visible.
 */

const VIDEO_SRC = "/cat-greenscreen.mp4";
const REPLAY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const CANVAS_WIDTH = 320;  // displayed width of the cat widget
const CANVAS_HEIGHT = 180; // 16:9 aspect ratio

export function FloatingCatWidget() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 }); // 0,0 = bottom-right default
  const draggingRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ----------------------------------------------------------------
  // Replay every 5 minutes
  // ----------------------------------------------------------------
  useEffect(() => {
    if (hidden) return;
    const interval = setInterval(() => {
      setReplayKey((k) => k + 1);
    }, REPLAY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hidden]);

  // ----------------------------------------------------------------
  // Auto-play on mount / replayKey change
  // ----------------------------------------------------------------
  useEffect(() => {
    if (hidden) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Autoplay blocked — user will need to click play
        setIsPlaying(false);
      });
  }, [replayKey, hidden]);

  // ----------------------------------------------------------------
  // Canvas chroma-key rendering loop
  // ----------------------------------------------------------------
  useEffect(() => {
    if (hidden) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let lastDrawnTime = 0;
    const FRAME_INTERVAL = 1000 / 30; // 30 FPS cap

    const draw = (now: number) => {
      if (now - lastDrawnTime >= FRAME_INTERVAL && v.readyState >= 2) {
        lastDrawnTime = now;
        // Draw the current video frame to the canvas
        ctx.drawImage(v, 0, 0, c.width, c.height);

        // Read the pixel data
        const imageData = ctx.getImageData(0, 0, c.width, c.height);
        const data = imageData.data;

        // Chroma key: key out green (and near-green) pixels
        // Green is approximately R<100, G>100, B<100
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // If pixel is predominantly green, make it transparent
          // Tolerance: G > R*1.4 AND G > B*1.4 AND G > 60
          if (g > 60 && g > r * 1.35 && g > b * 1.35) {
            data[i + 3] = 0; // alpha = 0 (transparent)
          }
          // Edge softening: pixels that are mostly green but close to threshold
          // get partial alpha for smoother edges
          else if (g > 50 && g > r * 1.2 && g > b * 1.2) {
            data[i + 3] = 80;
          }
        }

        ctx.putImageData(imageData, 0, 0);
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [hidden, replayKey]);

  // ----------------------------------------------------------------
  // Drag handling
  // ----------------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    // Don't drag if clicking on a button
    if ((e.target as HTMLElement).closest("button")) return;
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    setPosition({
      x: draggingRef.current.origX + dx,
      y: draggingRef.current.origY + dy,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (draggingRef.current) {
      draggingRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // ----------------------------------------------------------------
  // Pause / play toggle
  // ----------------------------------------------------------------
  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setIsPlaying(true));
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  if (hidden) return null;

  // Compute position style
  // Default (0,0) = bottom-right with 16px margin
  // Negative X = move left, Negative Y = move up
  const style: React.CSSProperties = {
    position: "fixed",
    right: position.x === 0 ? "16px" : undefined,
    bottom: position.y === 0 ? "16px" : undefined,
    left: position.x !== 0 ? `calc(100vw - ${CANVAS_WIDTH + 16 - position.x}px)` : undefined,
    top: position.y !== 0 ? `calc(100vh - ${CANVAS_HEIGHT + 16 - position.y}px)` : undefined,
    zIndex: 9999,
    cursor: draggingRef.current ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <div
      style={style}
      className="select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Hidden video element — source of frames for canvas */}
      <video
        key={replayKey}
        ref={videoRef}
        src={VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{ display: "none" }}
        crossOrigin="anonymous"
      />

      {/* Visible canvas — shows the cat with green keyed out */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block rounded-lg shadow-2xl"
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          background: "transparent",
        }}
      />

      {/* Top-right: dismiss button (visible on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setHidden(true);
        }}
        className="absolute -top-2 -right-2 z-10 rounded-full bg-red-500 hover:bg-red-600 text-white p-1 shadow-lg transition"
        style={{ opacity: 0, transition: "opacity 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
        aria-label="Hide cat widget"
        title="Hide for this session"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Bottom-left: small caption (visible on hover) */}
      <div
        className="absolute left-1 bottom-1 z-10 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none"
        style={{ opacity: 0, transition: "opacity 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Replays every 5 min · drag to move
      </div>

      {/* Bottom-right: replay + play/pause buttons (visible on hover) */}
      <div
        className="absolute right-1 bottom-1 z-10 flex gap-1"
        style={{ opacity: 0, transition: "opacity 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          className="rounded-full bg-black/60 hover:bg-black/80 text-white p-1 backdrop-blur-sm transition"
          aria-label={isPlaying ? "Pause" : "Play"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setReplayKey((k) => k + 1);
          }}
          className="rounded-full bg-black/60 hover:bg-black/80 text-white p-1 backdrop-blur-sm transition"
          aria-label="Replay"
          title="Replay from start"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
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
      </div>
    </div>
  );
}
