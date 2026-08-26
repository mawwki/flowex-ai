import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Project } from "@/lib/flowex/types";
import { buildStageDoc } from "@/lib/flowex/stage";

export function Preview({
  project,
  playing,
  time,
  seekToken,
  onTime,
  assetUrls,
  onError,
  onTogglePlay,
}: {
  project: Project;
  playing: boolean;
  time: number;
  seekToken: number;
  onTime: (t: number) => void;
  assetUrls: Record<string, string>;
  onError?: (message: string) => void;
  onTogglePlay?: () => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timeRef = useRef(time);
  timeRef.current = time;

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
      <div className="relative overflow-hidden rounded-2xl bg-black">
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
          {onTogglePlay ? (
            <button
              onClick={onTogglePlay}
              aria-label={playing ? "Пауза" : "Воспроизвести"}
              title="Клик — пауза / воспроизведение"
              className="absolute inset-0 z-10 cursor-pointer opacity-0 transition-opacity hover:opacity-100"
            >
              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-sm">
                {playing ? "II пауза" : "▶ играть"}
              </span>
            </button>
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
