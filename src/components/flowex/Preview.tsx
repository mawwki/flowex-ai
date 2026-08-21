import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { Project } from "@/lib/flowex/types";
import { buildStageDoc } from "@/lib/flowex/stage";

export function Preview({
  project,
  playing,
  onTogglePlay,
  time,
  seekToken,
  onTime,
}: {
  project: Project;
  playing: boolean;
  onTogglePlay: () => void;
  time: number;
  seekToken: number;
  onTime: (t: number) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const doc = useMemo(() => buildStageDoc(project), [project]);

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

  return (
    <div className="panel p-2 sm:p-3">
      <div className="group relative overflow-hidden rounded-2xl bg-black">
        <div className="aspect-video w-full">
          <iframe
            ref={ref}
            title={`Сцена ${project.name}`}
            srcDoc={doc}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        <button
          onClick={onTogglePlay}
          aria-label={playing ? "Пауза" : "Воспроизвести"}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition group-hover:bg-black/60">
            {playing ? (
              <Pause className="h-7 w-7 text-white" />
            ) : (
              <Play className="ml-1 h-7 w-7 text-white" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
