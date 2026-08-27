import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Project, SceneElement } from "@/lib/flowex/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border/50 bg-surface-2/40 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-[var(--accent)]/60";

export function ElementInspector({
  open,
  onClose,
  project,
  selectedId,
  onUpdate,
  onSelect,
  onRemove,
  onBringForward,
  onSendBackward,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<SceneElement>) => void;
  onRemove: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
}) {
  const el = project.elements.find((e) => e.id === selectedId) ?? null;
  const [textDraft, setTextDraft] = useState("");
  const [focusInput, setFocusInput] = useState<string | null>(null);

  useEffect(() => {
    if (el) {
      if (el.kind === "text" && (focusInput !== "text" || textDraft === ""))
        setTextDraft(el.text ?? "");
      setFocusInput(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!open || !el) return null;

  const num = (v: number | undefined, fallback = 1) =>
    typeof v === "number" && isFinite(v) ? v : fallback;
  const set = (patch: Partial<SceneElement>) => onUpdate(el.id, patch);

  return (
    <div className="flex h-full w-[240px] flex-col overflow-y-auto border-l border-border/30 bg-surface/70 px-3 py-3 backdrop-blur-sm scrollbar-thin lg:w-[260px]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Элемент
        </p>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {el.kind === "text" ? (
          <>
            <Row label="Текст">
              <textarea
                value={textDraft}
                onFocus={() => setFocusInput("text")}
                onChange={(e) => {
                  setTextDraft(e.target.value);
                  set({ text: e.target.value });
                }}
                rows={3}
                className={inputCls}
              />
            </Row>
            <Row label="Размер шрифта">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={8}
                  max={120}
                  value={num(el.fontSize, 24)}
                  onChange={(e) => set({ fontSize: Number(e.target.value) })}
                  className="w-full"
                />
                <span className="w-8 text-right text-xs tabular-nums">{num(el.fontSize, 24)}</span>
              </div>
            </Row>
            <Row label="Цвет">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={el.color ?? "#ffffff"}
                  onChange={(e) => set({ color: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-border/50 bg-surface-2"
                />
                <span className="font-mono text-[10px] text-muted-foreground">{el.color}</span>
              </div>
            </Row>
            <Row label="Выравнивание">
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => set({ align: a })}
                    className={`flex-1 rounded-lg border px-2 py-1 text-xs capitalize transition-colors ${
                      (el.align ?? "center") === a
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-border/50 text-muted-foreground hover:bg-surface-2"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Row>
          </>
        ) : null}

        {el.kind === "shape" ? (
          <>
            <Row label="Фигура">
              <div className="flex gap-1">
                {(["rect", "circle", "triangle"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => set({ shape: s })}
                    className={`flex-1 rounded-lg border px-2 py-1 text-xs capitalize transition-colors ${
                      (el.shape ?? "rect") === s
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-border/50 text-muted-foreground hover:bg-surface-2"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Заливка">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={el.fill ?? "#22d3ee"}
                  onChange={(e) => set({ fill: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-border/50 bg-surface-2"
                />
                <span className="font-mono text-[10px] text-muted-foreground">{el.fill}</span>
              </div>
            </Row>
          </>
        ) : null}

        {/* Common */}
        <Row label={`Размер ${(num(el.w) * 100).toFixed(0)}% × ${(num(el.h) * 100).toFixed(0)}%`}>
          <input
            type="range"
            min={5}
            max={100}
            value={Math.round(num(el.w) * 100)}
            onChange={(e) => set({ w: Number(e.target.value) / 100 })}
            className="w-full"
          />
        </Row>
        <Row label={`Поворот ${Math.round(num(el.rotation, 0))}°`}>
          <input
            type="range"
            min={-180}
            max={180}
            value={num(el.rotation, 0)}
            onChange={(e) => set({ rotation: Number(e.target.value) })}
            className="w-full"
          />
        </Row>
        <Row label={`Прозрачность ${Math.round((el.opacity ?? 1) * 100)}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((el.opacity ?? 1) * 100)}
            onChange={(e) => set({ opacity: Number(e.target.value) / 100 })}
            className="w-full"
          />
        </Row>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onBringForward(el.id)}
            className="rounded-lg border border-border/50 px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-2"
          >
            На передний план
          </button>
          <button
            onClick={() => onSendBackward(el.id)}
            className="rounded-lg border border-border/50 px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-2"
          >
            На задний план
          </button>
        </div>

        <button
          onClick={() => onRemove(el.id)}
          className="w-full rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
        >
          Удалить элемент
        </button>
      </div>
    </div>
  );
}
