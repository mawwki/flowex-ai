import { Check, ChevronLeft, ChevronRight, Clock3, Frame } from "lucide-react";
import { useRef } from "react";
import { STYLE_PRESETS, type StylePreset } from "@/lib/flowex/styles";
import { cn } from "@/lib/utils";

function StyleCard({
  preset,
  selected,
  onSelect,
}: {
  preset: StylePreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-[180px] shrink-0 snap-start overflow-hidden rounded-2xl border text-left transition-all duration-200",
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-lg shadow-[var(--accent)]/10 scale-[1.02]"
          : "border-border/60 hover:border-border hover:ring-1 hover:ring-border/50 hover:shadow-md hover:shadow-black/10 hover:scale-[1.01]",
      )}
    >
      <div
        className="relative h-20 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]} 55%, ${preset.colors[2]})`,
        }}
      >
        {/* Decorative elements */}
        <span
          className="absolute left-3 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full shadow-lg"
          style={{ background: preset.colors[2], opacity: 0.85 }}
        />
        <span
          className="absolute right-3 top-3 h-10 w-16 rounded-lg shadow-md"
          style={{ background: preset.colors[1], opacity: 0.5 }}
        />
        <span
          className="absolute bottom-2 left-3 text-[11px] font-bold drop-shadow-sm"
          style={{ color: preset.colors[0] }}
        >
          Aa
        </span>
        {/* Glassmorphism overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {selected ? (
          <span className="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="bg-surface px-3 py-2.5">
        <p className="truncate text-sm font-medium">{preset.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{preset.tag}</p>
        <p className="mt-1.5 flex items-center gap-2.5 text-[10px] tabular-nums text-muted-foreground">
          <span className="flex items-center gap-1">
            <Frame className="h-3 w-3" />
            {preset.aspect}
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {preset.duration}с
          </span>
        </p>
      </div>
    </button>
  );
}

export function StylePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * 400, behavior: "smooth" });

  return (
    <div className="rounded-2xl border border-border/60 bg-surface-2/30 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          Стиль ролика — листайте и кликните, стиль добавится к запросу
        </p>
        <div className="flex gap-0.5">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Листать стили влево"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Листать стили вправо"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STYLE_PRESETS.map((p) => (
          <StyleCard
            key={p.id}
            preset={p}
            selected={selectedId === p.id}
            onSelect={() => onSelect(selectedId === p.id ? undefined : p.id)}
          />
        ))}
      </div>
    </div>
  );
}
