import { Pause, Play, RotateCcw, RotateCw, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

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

  const ghost =
    "rounded-full p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground";

  return (
    <div
      className="flex items-center justify-center gap-1"
      role="group"
      aria-label="Управление воспроизведением"
    >
      <button
        onClick={() => onSeek(Math.max(0, time - 5))}
        aria-label="Назад на 5 секунд"
        title="−5 с"
        className={ghost}
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <button
        onClick={onTogglePlay}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
        className="mx-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-transparent transition hover:border-transparent hover:bg-surface-2"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      <button
        onClick={() => onSeek(Math.min(duration, time + 5))}
        aria-label="Вперёд на 5 секунд"
        title="+5 с"
        className={ghost}
      >
        <RotateCw className="h-4 w-4" />
      </button>

      <div className="ml-3 flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
        <span className="text-foreground">{fmt(time)}</span>
        <span>/</span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-16 rounded-md border border-border bg-surface px-1.5 py-0.5 text-center outline-none"
            aria-label="Длительность в секундах"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(fmt(duration));
              setEditing(true);
            }}
            title="Изменить длительность ролика"
            className="rounded-md px-1 py-0.5 underline decoration-dotted decoration-border underline-offset-4 hover:bg-surface-2 hover:text-foreground"
          >
            {fmt(duration)}
          </button>
        )}
      </div>

      <button
        onClick={onOpenInspector}
        aria-label="Инспектор сцены"
        title="Инспектор CONFIG — цвета, тексты, параметры"
        className={`${ghost} ml-2`}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
