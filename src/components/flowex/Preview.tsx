import { useEffect, useMemo, useRef } from "react";
import type { Project } from "@/lib/flowex/types";
import { buildStageDoc } from "@/lib/flowex/stage";

export function Preview({
  project,
  playing,
  time,
  seekToken,
  onTime,
  assetUrls,
}: {
  project: Project;
  playing: boolean;
  time: number;
  seekToken: number;
  onTime: (t: number) => void;
  assetUrls: Record<string, string>;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timeRef = useRef(time);
  timeRef.current = time;

  const doc = useMemo(() => buildStageDoc(project, assetUrls), [project, assetUrls]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string; t?: number };
      if (d?.source === "flowex" && d.type === "time" && typeof d.t === "number") onTime(d.t);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onTime]);

  const post = (msg: Record<string, unknown>) =>
    ref.current?.contentWindow?.postMessage({ source: "flowex-host", ...msg }, "*");

  useEffect(() => {
    post({ type: playing ? "play" : "pause" });
  }, [playing, doc]);

  useEffect(() => {
    post({ type: "seek", t: time });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToken, doc]);

  // Keep real audio clips in sync with the playhead.
  useEffect(() => {
    const els = audioRefs.current;
    const tick = () => {
      const t = timeRef.current;
      for (const clip of project.audio) {
        const el = els.get(clip.id);
        if (!el) continue;
        el.volume = clip.muted ? 0 : clip.volume;
        const local = t - clip.start;
        const dur = Number.isFinite(el.duration) ? el.duration : Infinity;
        const inside = local >= 0 && local < dur;
        if (playing && inside && !clip.muted) {
          if (Math.abs(el.currentTime - local) > 0.25) el.currentTime = local;
          if (el.paused) el.play().catch(() => {});
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
