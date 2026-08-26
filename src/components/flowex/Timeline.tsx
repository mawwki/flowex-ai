import {
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  Mic,
  Music,
  Plus,
  Scissors,
  Trash2,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioClip, Project } from "@/lib/flowex/types";
import { renderThumb } from "@/lib/flowex/stage";
import { parseScenes } from "@/lib/flowex/scenes-edit";
import { startVoiceRecording, type VoiceSession } from "@/lib/flowex/media";
import { cn } from "@/lib/utils";

function tickLabel(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MIN_LEN = 0.3;

export function Timeline({
  project,
  time,
  onSeek,
  onUpdateClip,
  onRemoveClip,
  onToggleMuteAll,
  onAddAudioFiles,
  onAddVoice,
  onSplitClip,
  onSetSceneDurations,
  onMoveScene,
  onDeleteScene,
}: {
  project: Project;
  time: number;
  onSeek: (t: number) => void;
  onUpdateClip: (id: string, patch: Partial<AudioClip>) => void;
  onRemoveClip: (id: string) => void;
  onToggleMuteAll: () => void;
  onAddAudioFiles: (files: FileList | null) => void;
  onAddVoice: (blob: Blob, startAt: number) => void;
  onSplitClip: (id: string) => void;
  onSetSceneDurations: (durs: number[]) => void;
  onMoveScene: (index: number, dir: -1 | 1) => void;
  onDeleteScene: (index: number) => void;
}) {
  const [videoVisible, setVideoVisible] = useState(true);
  const clipDragRef = useRef<{
    id: string;
    mode: "move" | "trim-left" | "trim-right";
    startX: number;
    orig: AudioClip;
    moved: boolean;
    trackEl: HTMLElement | null;
  } | null>(null);
  const voiceRef = useRef<VoiceSession | null>(null);
  const voiceStartRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [draftDurs, setDraftDurs] = useState<number[] | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const dur = project.duration || 1;

  const scenes = useMemo(() => parseScenes(project.scene.js), [project.scene.js]);
  const effDurs = draftDurs ?? scenes?.map((s) => s.dur) ?? null;

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

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    setSelectedId(null);
    setSelectedScene(null);
  }, [project.id]);

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

  const clipLen = (clip: AudioClip) => Math.max(MIN_LEN, clip.length ?? dur - clip.start);

  const sourceLen = (clip: AudioClip) => {
    const a = project.assets.find((x) => x.id === clip.assetId);
    return a?.duration && a.duration > 0 ? a.duration : clipLen(clip) * (clip.speed || 1);
  };

  const clipPointerDown = (
    e: React.PointerEvent,
    clip: AudioClip,
    mode: "move" | "trim-left" | "trim-right",
  ) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const trackEl = (e.currentTarget as HTMLElement).closest(
      "[data-audio-track]",
    ) as HTMLElement | null;
    clipDragRef.current = {
      id: clip.id,
      mode,
      startX: e.clientX,
      orig: { ...clip },
      moved: false,
      trackEl,
    };
    if (mode === "move") setSelectedId(clip.id);

    const move = (ev: PointerEvent) => {
      const d = clipDragRef.current;
      if (!d?.trackEl) return;
      const dt = ((ev.clientX - d.startX) / d.trackEl.getBoundingClientRect().width) * dur;
      if (Math.abs(ev.clientX - d.startX) > 3) d.moved = true;
      const speed = d.orig.speed ?? 1;
      const len = d.orig.length ?? clipLen(d.orig);

      if (d.mode === "move") {
        const next = Math.max(0, Math.min(d.orig.start + dt, dur - len));
        onUpdateClip(d.id, { start: Math.round(next * 20) / 20 });
      } else if (d.mode === "trim-left") {
        const maxShrink = len - MIN_LEN;
        const shrink = Math.max(-d.orig.start, Math.min(dt, maxShrink));
        const newLen = len - shrink;
        const srcAvail = sourceLen(d.orig) - (d.orig.offset ?? 0) - shrink * speed;
        onUpdateClip(d.id, {
          start: Math.round((d.orig.start + shrink) * 20) / 20,
          offset: Math.round(((d.orig.offset ?? 0) + shrink * speed) * 100) / 100,
          length: Math.round(Math.max(MIN_LEN, Math.min(newLen, srcAvail / speed)) * 100) / 100,
        });
      } else {
        const grow = Math.min(dt, dur - d.orig.start - len);
        const srcAvail = (sourceLen(d.orig) - (d.orig.offset ?? 0)) / speed - len;
        onUpdateClip(d.id, {
          length: Math.round(Math.max(MIN_LEN, Math.min(len + grow, len + srcAvail)) * 100) / 100,
        });
      }
    };
    const up = () => {
      const wasMoved = clipDragRef.current?.moved;
      const wasMode = clipDragRef.current?.mode;
      clipDragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!wasMoved && wasMode === "move") {
        setSelectedId((cur) => (cur === clip.id ? null : clip.id));
        setSelectedScene(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startBoundaryDrag = (e: React.PointerEvent, boundary: number) => {
    e.stopPropagation();
    if (!scenes || !effDurs) return;
    const el = (e.currentTarget as HTMLElement).parentElement;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    let next = [...effDurs];
    const baseW = el?.getBoundingClientRect().width ?? 1;

    const move = (ev: PointerEvent) => {
      const dt = ((ev.clientX - e.clientX) / baseW) * dur;
      next = [...effDurs];
      next[boundary] = Math.max(MIN_LEN, next[boundary]! + dt);
      next[boundary + 1] = Math.max(MIN_LEN, next[boundary + 1]! - dt);
      setDraftDurs(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDraftDurs(null);
      onSetSceneDurations(next.map((d) => Math.round(d * 100) / 100));
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

  const selected = project.audio.find((c) => c.id === selectedId) ?? null;
  const anyUnmuted = project.audio.some((c) => !c.muted);
  const pct = (time / dur) * 100;
  const sceneBounds = useMemo(() => {
    if (!scenes || !effDurs) return [];
    let acc = 0;
    return effDurs.map((d) => {
      const b = { left: acc, width: d };
      acc += d;
      return b;
    });
  }, [scenes, effDurs]);

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
            data-video-track
            onPointerDown={(e) => {
              setSelectedScene(null);
              setSelectedId(null);
              startSeekDrag(e);
            }}
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

            {sceneBounds.length && videoVisible
              ? sceneBounds.map((b, i) => (
                  <div key={i}>
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedScene(i);
                        setSelectedId(null);
                      }}
                      title={scenes?.[i]?.id || `Сцена ${i + 1}`}
                      className={cn(
                        "absolute top-1 bottom-1 overflow-hidden rounded-lg px-2 text-left text-[10px] font-medium text-white/95 ring-1 backdrop-blur-[1px] transition-colors",
                        selectedScene === i
                          ? "bg-black/45 ring-2 ring-[var(--accent)]"
                          : "bg-black/30 ring-white/25 hover:bg-black/40",
                      )}
                      style={{
                        left: `${(b.left / dur) * 100}%`,
                        width: `${(b.width / dur) * 100}%`,
                      }}
                    >
                      <span className="block truncate leading-[3rem]">
                        {scenes?.[i]?.id || `Сцена ${i + 1}`} · {Math.round(b.width * 10) / 10}с
                      </span>
                    </button>
                    {i < sceneBounds.length - 1 ? (
                      <span
                        onPointerDown={(e) => startBoundaryDrag(e, i)}
                        title="Тяните, чтобы изменить длину соседних сцен"
                        className="absolute top-0 bottom-0 z-10 w-2.5 cursor-col-resize"
                        style={{ left: `calc(${((b.left + b.width) / dur) * 100}% - 5px)` }}
                      >
                        <span className="absolute top-1 bottom-1 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-playhead/70 opacity-40 transition-opacity hover:opacity-100" />
                      </span>
                    ) : null}
                  </div>
                ))
              : null}
          </div>
        </div>

        {selectedScene !== null && scenes?.[selectedScene] ? (
          <div className="ml-14 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs">
            <span className="max-w-[140px] truncate font-medium">
              {scenes[selectedScene]!.id || `Сцена ${selectedScene + 1}`}
            </span>
            <label className="flex items-center gap-1.5">
              Длина
              <input
                type="number"
                min={0.3}
                step={0.1}
                value={scenes[selectedScene]!.dur}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 0.3) {
                    const durs = scenes.map((s, i) => (i === selectedScene ? v : s.dur));
                    onSetSceneDurations(durs.map((d) => Math.round(d * 100) / 100));
                  }
                }}
                className="w-16 rounded-md border border-border bg-surface px-1.5 py-0.5 text-center tabular-nums outline-none"
              />
              с
            </label>
            <button
              onClick={() => onMoveScene(selectedScene, -1)}
              disabled={selectedScene === 0}
              aria-label="Переместить сцену влево"
              className="rounded-full p-1.5 hover:bg-surface-2 disabled:opacity-40"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onMoveScene(selectedScene, 1)}
              disabled={selectedScene >= scenes.length - 1}
              aria-label="Переместить сцену вправо"
              className="rounded-full p-1.5 hover:bg-surface-2 disabled:opacity-40"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                onDeleteScene(selectedScene);
                setSelectedScene(null);
              }}
              className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-surface-2 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Удалить сцену
            </button>
            <span className="text-muted-foreground">границы сцен можно тянуть мышью</span>
          </div>
        ) : null}

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
            data-audio-track
            onPointerDown={(e) => {
              setSelectedId(null);
              setSelectedScene(null);
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
                    onPointerDown={(e) => clipPointerDown(e, clip, "move")}
                    style={{
                      left: `${(clip.start / dur) * 100}%`,
                      width: `${Math.max(2, (len / dur) * 100)}%`,
                    }}
                    className={cn(
                      "group absolute top-1 bottom-1 cursor-grab touch-none overflow-hidden rounded-lg ring-1 transition-colors active:cursor-grabbing",
                      clip.muted
                        ? "bg-surface-2 text-muted-foreground ring-border"
                        : "bg-wave/25 text-foreground ring-wave/50",
                      selectedId === clip.id && "ring-2 ring-[var(--accent)]",
                    )}
                  >
                    <span
                      onPointerDown={(e) => clipPointerDown(e, clip, "trim-left")}
                      title="Обрезать начало"
                      className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize bg-gradient-to-r from-black/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                    />
                    <span className="pointer-events-none flex h-full items-center gap-1 truncate px-3 text-[11px]">
                      {clip.muted ? (
                        <VolumeX className="h-3 w-3 shrink-0" />
                      ) : (
                        <Volume2 className="h-3 w-3 shrink-0" />
                      )}
                      {clip.voice ? "🎙 " : ""}
                      {clip.name}
                      {(clip.speed ?? 1) !== 1 ? ` · ${clip.speed}x` : ""}
                    </span>
                    <span
                      onPointerDown={(e) => clipPointerDown(e, clip, "trim-right")}
                      title="Обрезать конец"
                      className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize bg-gradient-to-l from-black/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                    />
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
          <div className="ml-14 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs">
            <span className="max-w-[120px] truncate font-medium">{selected.name}</span>
            <label className="flex items-center gap-2">
              Громкость
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selected.volume}
                onChange={(e) => onUpdateClip(selected.id, { volume: Number(e.target.value) })}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-9 tabular-nums text-muted-foreground">
                {Math.round(selected.volume * 100)}%
              </span>
            </label>
            <label className="flex items-center gap-2" title="Ускорение и замедление">
              Скорость
              <input
                type="range"
                min={0.25}
                max={3}
                step={0.25}
                value={selected.speed ?? 1}
                onChange={(e) => {
                  const speed = Number(e.target.value);
                  const oldSpeed = selected.speed ?? 1;
                  onUpdateClip(selected.id, {
                    speed,
                    length: Math.round(
                      Math.max(
                        MIN_LEN,
                        ((selected.length ?? clipLen(selected)) * oldSpeed) / speed,
                      ),
                    ),
                  });
                }}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-9 tabular-nums text-muted-foreground">{selected.speed ?? 1}x</span>
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
            <button
              onClick={() => onSplitClip(selected.id)}
              disabled={
                time <= selected.start + 0.15 || time >= selected.start + clipLen(selected) - 0.15
              }
              title="Разрезать клип по позиции плейхеда"
              className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-surface-2 disabled:opacity-40"
            >
              <Scissors className="h-3.5 w-3.5" /> Разрезать здесь
            </button>
            <span className="tabular-nums text-muted-foreground">
              {selected.start.toFixed(1)}–{(selected.start + clipLen(selected)).toFixed(1)}с · края
              тянутся, тело перетаскивается
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
