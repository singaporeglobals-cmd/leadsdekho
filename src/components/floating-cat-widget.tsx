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
 * Behavior (as of 2026-08-03 — user-requested changes):
 *  - FIXED position bottom-right (NO dragging). Position is locked on every
 *    screen size (desktop / tablet / mobile).
 *  - POINTER EVENTS PASS-THROUGH: the entire widget container has
 *    `pointer-events: none`, so clicks on the transparent rectangle area
 *    fall through to the CRM features underneath. Only the small control
 *    buttons (close / replay / play-pause) have `pointer-events: auto` and
 *    are interactive. This means users can click any CRM button, link, or
 *    table row that sits behind the widget area.
 *  - 5-MINUTE SHOW CYCLE: the widget is NOT always visible. It plays the
 *    10-second cat video once, hides itself, waits 5 minutes, then plays
 *    again. On page load it plays immediately; afterwards it cycles:
 *      show 10s → hide 5min → show 10s → hide 5min → ...
 *
 * Implementation notes:
 *  - Server-side ffmpeg build cannot encode VP9 alpha on this Debian system,
 *    so we ship the original green-screen MP4 and do the chroma key in the
 *    browser via canvas 2D API. This works in Chrome, Edge, Firefox, Safari.
 *  - Canvas runs at 30 FPS for performance; video runs at native 24 fps.
 *  - The <video> element is hidden; only the <canvas> is visible.
 *  - `loop` is REMOVED from the video — we want it to end naturally after
 *    10s so we can hide the widget and start the 5-min wait timer.
 */

const VIDEO_SRC = "/cat-greenscreen.mp4";
const SHOW_DURATION_MS = 10_000;          // video is 10s — show widget for this long
const HIDE_INTERVAL_MS = 5 * 60 * 1000;    // 5 minutes between shows
const CANVAS_WIDTH = 320;                  // displayed width of the cat widget
const CANVAS_HEIGHT = 180;                 // 16:9 aspect ratio

export function FloatingCatWidget() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `visible` controls whether the widget is currently shown.
  // On mount it is `true` (play immediately). After video ends it becomes
  // `false` and a 5-min timer sets it back to `true`.
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false); // user clicked close → stop cycling
  const [replayKey, setReplayKey] = useState(0);     // bump to force video reload
  const [isPlaying, setIsPlaying] = useState(true);

  // ----------------------------------------------------------------
  // Schedule the show / hide cycle.
  //
  // When `visible` becomes true:
  //   - Set a timer for SHOW_DURATION_MS (10s) to hide the widget.
  //   - When that fires, set visible=false. The effect below will then
  //     schedule a 5-min timer to set visible=true again.
  //
  // When `visible` becomes false (and not dismissed):
  //   - Set a timer for HIDE_INTERVAL_MS (5min) to show the widget.
  //
  // ----------------------------------------------------------------
  useEffect(() => {
    if (dismissed) return;

    if (visible) {
      // Currently showing — schedule auto-hide after video plays
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, SHOW_DURATION_MS);
      return () => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
      };
    } else {
      // Currently hidden — schedule next show in 5 min
      showTimerRef.current = setTimeout(() => {
        setReplayKey((k) => k + 1); // force video to reload from start
        setVisible(true);
      }, HIDE_INTERVAL_MS);
      return () => {
        if (showTimerRef.current) {
          clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
      };
    }
  }, [visible, dismissed]);

  // ----------------------------------------------------------------
  // Auto-play on mount / replayKey change (when visible)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!visible || dismissed) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Autoplay blocked — user will need to click play
        setIsPlaying(false);
      });
  }, [replayKey, visible, dismissed]);

  // ----------------------------------------------------------------
  // Canvas chroma-key rendering loop
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!visible || dismissed) return;
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
          // Tolerance: G > R*1.35 AND G > B*1.35 AND G > 60
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
  }, [visible, dismissed, replayKey]);

  // ----------------------------------------------------------------
  // Cleanup all timers on unmount
  // ----------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

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

  // ----------------------------------------------------------------
  // Manual replay from start
  // ----------------------------------------------------------------
  const replayNow = () => {
    setReplayKey((k) => k + 1);
    // Also reset the show-timer so the widget stays visible for another
    // full SHOW_DURATION_MS after this manual replay.
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setVisible(false), SHOW_DURATION_MS);
    }
  };

  // ----------------------------------------------------------------
  // Dismiss — stops the show/hide cycle entirely for this session
  // ----------------------------------------------------------------
  const dismiss = () => {
    setDismissed(true);
    setVisible(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
  };

  if (dismissed || !visible) return null;

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  // CRITICAL: container has `pointerEvents: "none"` so all clicks pass
  // through to the CRM features underneath. Only the control buttons
  // (close / replay / play-pause) override this with `pointerEvents: "auto"`.
  // The canvas itself does NOT need to be interactive.
  // ----------------------------------------------------------------
  const style: React.CSSProperties = {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: 9999,
    pointerEvents: "none", // container is click-through
  };

  return (
    <div style={style} className="select-none">
      {/* Hidden video element — source of frames for canvas.
          NOTE: `loop` is intentionally NOT set — we want the video to end
          naturally after 10s so the show/hide cycle can proceed. */}
      <video
        key={replayKey}
        ref={videoRef}
        src={VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        style={{ display: "none" }}
        crossOrigin="anonymous"
      />

      {/* Visible canvas — shows the cat with green keyed out.
          `pointerEvents: "none"` so clicks pass through to CRM features
          behind the widget area. */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block rounded-lg shadow-2xl"
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          background: "transparent",
          pointerEvents: "none",
        }}
      />

      {/* Top-right: dismiss button (visible on hover).
          `pointerEvents: "auto"` so it stays clickable. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="absolute -top-2 -right-2 z-10 rounded-full bg-red-500 hover:bg-red-600 text-white p-1 shadow-lg transition"
        style={{
          opacity: 0,
          transition: "opacity 0.2s",
          pointerEvents: "auto",
        }}
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

      {/* Bottom-left: small caption (visible on hover).
          Purely informational — `pointerEvents: "none"`. */}
      <div
        className="absolute left-1 bottom-1 z-10 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm"
        style={{
          opacity: 0,
          transition: "opacity 0.2s",
          pointerEvents: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Replays every 5 min
      </div>

      {/* Bottom-right: replay + play/pause buttons (visible on hover).
          Wrapper stays click-through; buttons themselves opt back in. */}
      <div
        className="absolute right-1 bottom-1 z-10 flex gap-1"
        style={{
          opacity: 0,
          transition: "opacity 0.2s",
          pointerEvents: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          className="rounded-full bg-black/60 hover:bg-black/80 text-white p-1 backdrop-blur-sm transition"
          style={{ pointerEvents: "auto" }}
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
            replayNow();
          }}
          className="rounded-full bg-black/60 hover:bg-black/80 text-white p-1 backdrop-blur-sm transition"
          style={{ pointerEvents: "auto" }}
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
