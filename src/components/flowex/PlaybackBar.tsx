import { Pause, Play, RotateCcw, RotateCw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

function fmt(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${r.toFixed(1).padStart(4, "0")}`;
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

  const commit = () => {
    const v = Math.round(Number(draft.replace(",", ".")) * 10) / 10;
    setEditing(false);
    if (Number.isFinite(v) && v >= 1 && v <= 180) onDurationChange(v);
    else setDraft(String(duration));
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onSeek(Math.max(0, time - 5))}
        aria-label="Назад на 5 секунд"
        className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" /> 5с
      </button>

      <button
        onClick={onTogglePlay}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface transition hover:bg-surface-2"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      <button
        onClick={() => onSeek(Math.min(duration, time + 5))}
        aria-label="Вперёд на 5 секунд"
        className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
      >
        5с <RotateCw className="h-3.5 w-3.5" />
      </button>

      <div className="ml-2 flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
        <span className="text-foreground">{fmt(time)}</span>
        <span>/</span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-14 rounded-md border border-border bg-surface px-1.5 py-0.5 text-center outline-none"
            aria-label="Длительность в секундах"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(String(duration));
              setEditing(true);
            }}
            title="Изменить длительность"
            className="rounded-md px-1 py-0.5 hover:bg-surface-2 hover:text-foreground"
          >
            {fmt(duration)}
          </button>
        )}
      </div>

      <button
        onClick={onOpenInspector}
        aria-label="Инспектор сцены"
        className="ml-2 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" /> Инспектор
      </button>
    </div>
  );
}
