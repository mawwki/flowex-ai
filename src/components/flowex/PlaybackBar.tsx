import { Pause, Play, RotateCcw, RotateCw, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function fmt(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

function parseDur(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (/^\d{1,2}:\d{1,2}(\.\d)?$/.test(t)) {
    const [m, s] = t.split(":").map(Number);
    return Math.round((m! + s! / 60) * 10) / 10;
  }
  const v = Number(t);
  return Number.isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : null;
}

export function PlaybackBar({
  playing,
  onTogglePlay,
  time,
  duration,
  onSeek,
  onDurationChange,
  onOpenInspector,
}: {
  playing: boolean;
  onTogglePlay: () => void;
  time: number;
  duration: number;
  onSeek: (t: number) => void;
  onDurationChange: (d: number) => void;
  onOpenInspector: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(duration));

  useEffect(() => {
    if (!editing) setDraft(fmt(duration));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const commit = () => {
    const v = parseDur(draft);
    setEditing(false);
    if (v && v >= 1 && v <= 300) onDurationChange(v);
    else setDraft(fmt(duration));
  };

  const pct = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3" role="group" aria-label="Управление воспроизведением">
      {/* Previous 5s */}
      <button
        onClick={() => onSeek(Math.max(0, time - 5))}
        aria-label="Назад на 5 секунд"
        title="−5 с (Shift+←)"
        className="rounded-full p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Play/Pause — prominent */}
      <button
        onClick={onTogglePlay}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
        title={playing ? "Пауза (Space)" : "Воспроизвести (Space)"}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition-all duration-150",
          playing
            ? "bg-foreground text-background shadow-lg shadow-foreground/20 hover:scale-105"
            : "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 hover:scale-105",
        )}
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </button>

      {/* Next 5s */}
      <button
        onClick={() => onSeek(Math.min(duration, time + 5))}
        aria-label="Вперёд на 5 секунд"
        title="+5 с (Shift+→)"
        className="rounded-full p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
      >
        <RotateCw className="h-4 w-4" />
      </button>

      {/* Time display */}
      <div className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
        <span className="text-foreground font-medium">{fmt(time)}</span>
        <span>/</span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-16 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-center tabular-nums outline-none focus:ring-1 focus:ring-ring"
            aria-label="Длительность в секундах"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(fmt(duration));
              setEditing(true);
            }}
            title="Изменить длительность ролика"
            className="rounded-md px-1.5 py-0.5 underline decoration-dotted decoration-border underline-offset-4 transition hover:bg-surface-2 hover:text-foreground"
          >
            {fmt(duration)}
          </button>
        )}
      </div>

      {/* Mini progress scrubber */}
      <div className="mx-2 hidden flex-1 sm:block">
        <div
          className="relative h-1.5 w-full cursor-pointer rounded-full bg-track"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onSeek(Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration)));
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-sm ring-2 ring-background"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>

      {/* Inspector */}
      <button
        onClick={onOpenInspector}
        aria-label="Инспектор сцены"
        title="Инспектор CONFIG — цвета, тексты, параметры"
        className="rounded-full p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
