import { Eye, EyeOff, Music, Video, Volume2, VolumeX } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/flowex/types";
import { renderThumb } from "@/lib/flowex/stage";

function tc(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Timeline({
  project,
  time,
  onSeek,
}: {
  project: Project;
  time: number;
  onSeek: (t: number) => void;
}) {
  const [videoVisible, setVideoVisible] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const dur = project.duration || 1;

  const thumbs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => renderThumb(project, (dur * i) / 6, 220)).filter(Boolean),
    [project, dur],
  );

  const ticks = useMemo(() => {
    const step = dur <= 12 ? 2 : dur <= 40 ? 5 : 10;
    const out: number[] = [];
    for (let t = 0; t <= dur; t += step) out.push(t);
    return out;
  }, [dur]);

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(dur, ((clientX - r.left) / r.width) * dur)));
  };

  const startDrag = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromEvent(e.clientX);
    const move = (ev: PointerEvent) => seekFromEvent(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const pct = (time / dur) * 100;

  return (
    <div className="panel px-4 py-4 sm:px-6">
      <div className="relative ml-14 h-5 text-[11px] text-muted-foreground">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: `${(t / dur) * 100}%` }}
          >
            {tc(t)}
          </span>
        ))}
      </div>

      <div className="relative mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex w-12 shrink-0 items-center justify-between pr-1 text-muted-foreground">
            <Video className="h-4 w-4" />
            <button
              onClick={() => setVideoVisible((v) => !v)}
              aria-label="Показать дорожку видео"
              className="hover:text-foreground"
            >
              {videoVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <div
            ref={trackRef}
            onPointerDown={startDrag}
            className="relative h-14 flex-1 cursor-pointer overflow-hidden rounded-xl bg-track"
          >
            {videoVisible ? (
              <div className="flex h-full w-full">
                {thumbs.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    draggable={false}
                    className="h-full flex-1 object-cover opacity-95"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex w-12 shrink-0 items-center justify-between pr-1 text-muted-foreground">
            <Music className="h-4 w-4" />
            <button
              onClick={() => setAudioOn((v) => !v)}
              aria-label="Звук дорожки"
              className="hover:text-foreground"
            >
              {audioOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
          <div
            onPointerDown={startDrag}
            className="relative flex h-11 flex-1 cursor-pointer items-center gap-[3px] overflow-hidden rounded-xl bg-track px-3"
          >
            {Array.from({ length: 64 }, (_, i) => {
              const a = Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 0.9 + 0.1;
              return (
                <span
                  key={i}
                  className="w-[3px] shrink-0 rounded-full bg-wave"
                  style={{ height: `${(audioOn ? a : 0.06) * 100}%` }}
                />
              );
            })}
          </div>
        </div>

        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-playhead"
          style={{ left: `calc(3.5rem + (100% - 3.5rem) * ${pct / 100})` }}
        >
          <span className="absolute -top-2 -left-[5px] h-3 w-[11px] rounded-sm bg-playhead" />
        </div>

      </div>
    </div>
  );
}
