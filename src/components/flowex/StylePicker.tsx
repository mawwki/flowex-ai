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
        "w-[176px] shrink-0 snap-start overflow-hidden rounded-2xl border text-left transition",
        selected
          ? "border-transparent ring-2 ring-[var(--accent)]"
          : "border-border hover:border-transparent hover:ring-1 hover:ring-border",
      )}
    >
      <div
        className="relative h-20"
        style={{
          background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]} 55%, ${preset.colors[2]})`,
        }}
      >
        <span
          className="absolute left-3 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
          style={{ background: preset.colors[2], opacity: 0.85 }}
        />
        <span
          className="absolute right-3 top-3 h-10 w-16 rounded-lg"
          style={{ background: preset.colors[1], opacity: 0.5 }}
        />
        <span
          className="absolute bottom-2 left-3 text-[11px] font-semibold"
          style={{ color: preset.colors[0] }}
        >
          Aa
        </span>
        {selected ? (
          <span className="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="bg-surface px-3 py-2.5">
        <p className="truncate text-sm font-medium">{preset.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{preset.tag}</p>
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
    <div className="rounded-2xl border border-border bg-surface-2/40 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          Стиль ролика — листайте вправо и кликните, он добавится к запросу
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Листать стили влево"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Листать стили вправо"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
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
