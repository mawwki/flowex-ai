import { Eye, EyeOff, Mic, Music, Plus, Trash2, Video, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioClip, Project } from "@/lib/flowex/types";
import { renderThumb } from "@/lib/flowex/stage";
import { startVoiceRecording, type VoiceSession } from "@/lib/flowex/media";
import { cn } from "@/lib/utils";

function tickLabel(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Timeline({
  project,
  time,
  onSeek,
  onUpdateClip,
  onRemoveClip,
  onToggleMuteAll,
  onAddAudioFiles,
  onAddVoice,
}: {
  project: Project;
  time: number;
  onSeek: (t: number) => void;
  onUpdateClip: (id: string, patch: Partial<AudioClip>) => void;
  onRemoveClip: (id: string) => void;
  onToggleMuteAll: () => void;
  onAddAudioFiles: (files: FileList | null) => void;
  onAddVoice: (blob: Blob, startAt: number) => void;
}) {
  const [videoVisible, setVideoVisible] = useState(true);
  const dragRef = useRef<{
    id: string;
    startX: number;
    origStart: number;
    moved: boolean;
    trackEl: HTMLElement | null;
  } | null>(null);
  const voiceRef = useRef<VoiceSession | null>(null);
  const voiceStartRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const audioInputRef = useRef<HTMLInputElement>(null);
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

  const seekFromEvent = (el: HTMLElement | null, clientX: number) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(dur, ((clientX - r.left) / r.width) * dur)));
  };

  const startSeekDrag = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromEvent(el, e.clientX);
    const move = (ev: PointerEvent) => seekFromEvent(el, ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const clipLen = (clip: AudioClip) => {
    const a = project.assets.find((x) => x.id === clip.assetId);
    return Math.min(a?.duration && a.duration > 0 ? a.duration : dur - clip.start, dur);
  };

  const clipPointerDown = (e: React.PointerEvent, clip: AudioClip) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const trackEl = (e.currentTarget as HTMLElement).parentElement;
    dragRef.current = {
      id: clip.id,
      startX: e.clientX,
      origStart: clip.start,
      moved: false,
      trackEl,
    };

    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !d.trackEl) return;
      const dx = ev.clientX - d.startX;
      if (Math.abs(dx) > 3) d.moved = true;
      const dt = (dx / d.trackEl.getBoundingClientRect().width) * dur;
      const len = clipLen(project.audio.find((c) => c.id === d.id)!);
      const next = Math.max(0, Math.min(d.origStart + dt, dur - len));
      onUpdateClip(d.id, { start: Math.round(next * 20) / 20 });
    };
    const up = () => {
      const wasMoved = dragRef.current?.moved;
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!wasMoved) setSelectedId((cur) => (cur === clip.id ? null : clip.id));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      const session = voiceRef.current;
      voiceRef.current = null;
      if (session) {
        const blob = await session.stop();
        if (blob.size > 512) onAddVoice(blob, voiceStartRef.current);
      }
      return;
    }
    try {
      voiceStartRef.current = time;
      voiceRef.current = await startVoiceRecording();
      setRecSeconds(0);
      setRecording(true);
    } catch {
      /* microphone denied */
    }
  };

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const selected = project.audio.find((c) => c.id === selectedId) ?? null;
  const anyUnmuted = project.audio.some((c) => !c.muted);
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
            {tickLabel(t)}
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
            onPointerDown={startSeekDrag}
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
              onClick={onToggleMuteAll}
              aria-label={anyUnmuted ? "Заглушить все дорожки" : "Включить звук дорожек"}
              title={anyUnmuted ? "Заглушить всё" : "Включить звук"}
              className="hover:text-foreground"
            >
              {anyUnmuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
          <div
            onPointerDown={(e) => {
              setSelectedId(null);
              startSeekDrag(e);
            }}
            className="relative flex h-11 flex-1 items-center overflow-hidden rounded-xl bg-track"
          >
            {project.audio.length === 0 ? (
              <button
                onClick={() => audioInputRef.current?.click()}
                className="flex h-full w-full items-center justify-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Добавьте музыку или озвучку
              </button>
            ) : (
              project.audio.map((clip) => {
                const len = clipLen(clip);
                return (
                  <div
                    key={clip.id}
                    onPointerDown={(e) => clipPointerDown(e, clip)}
                    style={{
                      left: `${(clip.start / dur) * 100}%`,
                      width: `${Math.max(2, ((len || dur) / dur) * 100)}%`,
                    }}
                    className={cn(
                      "group absolute top-1 bottom-1 cursor-grab touch-none overflow-hidden rounded-lg px-2 text-left ring-1 transition-colors active:cursor-grabbing",
                      clip.muted
                        ? "bg-surface-2 text-muted-foreground ring-border"
                        : "bg-wave/25 text-foreground ring-wave/50",
                      selectedId === clip.id && "ring-2 ring-[var(--accent)]",
                    )}
                  >
                    <span className="pointer-events-none flex h-full items-center gap-1 truncate text-[11px]">
                      {clip.muted ? (
                        <VolumeX className="h-3 w-3 shrink-0" />
                      ) : (
                        <Volume2 className="h-3 w-3 shrink-0" />
                      )}
                      {clip.voice ? "🎙 " : ""}
                      {clip.name}
                    </span>
                  </div>
                );
              })
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onAddAudioFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {selected ? (
          <div className="ml-14 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs">
            <span className="max-w-[140px] truncate font-medium">{selected.name}</span>
            <label className="flex items-center gap-2">
              Громкость
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selected.volume}
                onChange={(e) => onUpdateClip(selected.id, { volume: Number(e.target.value) })}
                className="w-28 accent-[var(--accent)]"
              />
              <span className="w-8 tabular-nums text-muted-foreground">
                {Math.round(selected.volume * 100)}%
              </span>
            </label>
            <button
              onClick={() => onUpdateClip(selected.id, { muted: !selected.muted })}
              className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-surface-2"
            >
              {selected.muted ? (
                <>
                  <Volume2 className="h-3.5 w-3.5" /> Включить
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" /> Заглушить
                </>
              )}
            </button>
            <span className="tabular-nums text-muted-foreground">
              {selected.start.toFixed(1)}с → {(selected.start + clipLen(selected)).toFixed(1)}с ·
              тяните клип мышью
            </span>
            <button
              onClick={() => {
                onRemoveClip(selected.id);
                setSelectedId(null);
              }}
              className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 hover:bg-surface-2 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Удалить
            </button>
          </div>
        ) : null}

        <div className="ml-14 mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <button
            onClick={toggleRecording}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 transition hover:bg-surface-2",
              recording && "border-destructive/60 text-destructive",
            )}
          >
            <Mic className="h-3.5 w-3.5" />
            {recording ? `Остановить запись · ${recSeconds}с` : "Записать озвучку с микрофона"}
            {recording ? (
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            ) : null}
          </button>
          {recording ? (
            <span>запись начнётся на таймлайне с {voiceStartRef.current.toFixed(1)}с</span>
          ) : null}
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
