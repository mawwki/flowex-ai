import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Project } from "@/lib/flowex/types";
import { buildStageDoc } from "@/lib/flowex/stage";
import { cn } from "@/lib/utils";

export function Preview({
  project,
  playing,
  time,
  seekToken,
  onTime,
  assetUrls,
  onError,
  onTogglePlay,
  busy,
  children,
}: {
  project: Project;
  playing: boolean;
  time: number;
  seekToken: number;
  onTime: (t: number) => void;
  assetUrls: Record<string, string>;
  onError?: (message: string) => void;
  onTogglePlay?: () => void;
  busy?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timeRef = useRef(time);
  timeRef.current = time;
  const [hovered, setHovered] = useState(false);

  const post = useCallback((msg: Record<string, unknown>) => {
    ref.current?.contentWindow?.postMessage({ source: "flowex-host", ...msg }, "*");
  }, []);

  const doc = useMemo(
    () => buildStageDoc(project, assetUrls),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      project.scene,
      project.width,
      project.height,
      project.duration,
      project.fps,
      project.config,
      assetUrls,
    ],
  );

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string; t?: number; error?: string };
      if (d?.source !== "flowex") return;
      if (d.type === "time" && typeof d.t === "number") onTime(d.t);
      if (d.type === "ready") {
        post({ type: "seek", t: timeRef.current });
        if (d.error) onError?.(d.error);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onTime, onError, post]);

  useEffect(() => {
    post({ type: playing ? "play" : "pause" });
  }, [playing, doc, post]);

  useEffect(() => {
    post({ type: "seek", t: time });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToken, doc, post]);

  // Push user overlay elements into the sandbox whenever they change so the
  // canvas (and the recorded export) match drag-and-drop edits without reloading.
  useEffect(() => {
    post({ type: "elements", list: project.elements ?? [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.elements, doc, post]);

  // Keep real audio clips in sync with the playhead.
  useEffect(() => {
    const els = audioRefs.current;
    const tick = () => {
      const t = timeRef.current;
      for (const clip of project.audio) {
        const el = els.get(clip.id);
        if (!el) continue;
        el.volume = clip.muted ? 0 : clip.volume;
        const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;
        if (Math.abs(el.playbackRate - speed) > 0.01) el.playbackRate = speed;
        const len = clip.length ?? (Number.isFinite(el.duration) ? el.duration : Infinity);
        const local = t - clip.start;
        const inside = local >= 0 && local < len;
        if (playing && inside && !clip.muted) {
          const srcTime = (clip.offset ?? 0) + local * speed;
          if (srcTime < (el.duration || Infinity)) {
            if (Math.abs(el.currentTime - srcTime) > 0.25 * speed) el.currentTime = srcTime;
            if (el.paused) el.play().catch(() => {});
          } else if (!el.paused) {
            el.pause();
          }
        } else if (!el.paused) {
          el.pause();
        }
      }
    };
    tick();
    if (!playing) return;
    const id = window.setInterval(tick, 150);
    return () => window.clearInterval(id);
  }, [playing, project.audio, seekToken]);

  return (
    <div className="panel p-2 sm:p-3">
      <div
        className="relative overflow-hidden rounded-2xl bg-black shadow-lg shadow-black/40"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="mx-auto w-full"
          style={{ aspectRatio: `${project.width} / ${project.height}`, maxHeight: "62vh" }}
        >
          <iframe
            ref={ref}
            title={`Сцена ${project.name}`}
            srcDoc={doc}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />

          {/* Drag-and-drop element overlay */}
          {children}

          {/* AI generating overlay */}
          {busy ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-surface/90 px-5 py-4 shadow-xl">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                <div>
                  <p className="text-sm font-medium">ИИ создаёт сцену…</p>
                  <p className="text-[11px] text-muted-foreground">
                    формируем дизайн, шрифты и анимации
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Hover gradient + play/pause overlay */}
          {onTogglePlay ? (
            <>
              {/* Bottom gradient for time indicator */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />

              {/* Center play/pause button — visible on hover or when paused */}
              <button
                onClick={onTogglePlay}
                aria-label={playing ? "Пауза" : "Воспроизвести"}
                title={playing ? "Пауза (Space)" : "Воспроизвести (Space)"}
                className={cn(
                  "absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition-all duration-200",
                  hovered || !playing
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-90 pointer-events-none",
                )}
              >
                {playing ? (
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="ml-1 h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.5-7.36a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
                  </svg>
                )}
              </button>

              {/* Time label at bottom-right */}
              <span className="pointer-events-none absolute right-3 bottom-3 z-10 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[11px] text-white/80 backdrop-blur-sm tabular-nums">
                {playing ? "▶" : "⏸"} {time.toFixed(1)}с
              </span>
            </>
          ) : null}
        </div>
      </div>
      {project.audio.map((c) =>
        assetUrls[c.assetId] ? (
          <audio
            key={c.id}
            ref={(el) => {
              if (el) audioRefs.current.set(c.id, el);
              else audioRefs.current.delete(c.id);
            }}
            src={assetUrls[c.assetId]}
            preload="auto"
            className="hidden"
          />
        ) : null,
      )}
    </div>
  );
}
