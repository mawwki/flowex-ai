import { RotateCcw, X } from "lucide-react";
import { useMemo } from "react";
import type { Project } from "@/lib/flowex/types";
import { isColor, readConfig, type ConfigMap } from "@/lib/flowex/config";

function Field({
  k,
  value,
  onChange,
}: {
  k: string;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}) {
  const label = k.split(".").slice(-1)[0]!;
  const inputCls =
    "w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30";

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-2/30 px-3 py-3 transition-colors hover:bg-surface-2/50">
        <span className="truncate text-sm font-medium">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
            value ? "bg-[var(--accent)]" : "bg-track",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              value ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <label className="block space-y-1.5">
        <span className="block truncate text-xs font-medium text-muted-foreground">{label}</span>
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputCls}
        />
      </label>
    );
  }

  return (
    <label className="block space-y-1.5">
      <span className="block truncate text-xs font-medium text-muted-foreground">{k}</span>
      {isColor(value) ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value.slice(0, 7)}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Цвет ${label}`}
            className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border border-border bg-transparent p-0.5 transition-shadow hover:shadow-md hover:shadow-black/10"
          />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} font-mono text-xs`}
          />
        </div>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
    </label>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Inspector({
  open,
  onClose,
  project,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  onChange: (config: ConfigMap) => void;
}) {
  const defaults = useMemo(() => readConfig(project.scene.js), [project.scene.js]);

  if (!open) return null;

  const overrides = project.config ?? {};
  const keys = Array.from(new Set([...Object.keys(defaults), ...Object.keys(overrides)]));
  const groups = new Map<
    string,
    { key: string; value: string | number | boolean; overridden: boolean }[]
  >();
  for (const key of keys) {
    const group = key.includes(".") ? key.split(".")[0]! : "Основное";
    const overridden = key in overrides;
    const value = overridden ? overrides[key]! : defaults[key];
    if (value === undefined) continue;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push({ key, value, overridden });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="panel flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Инспектор сцены</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ручной контроль: цвета, тексты и параметры из var CONFIG
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть инспектор"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {groups.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-2xl bg-surface-2 p-4">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">В коде сцены нет var CONFIG</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Попросите ИИ добавить настраиваемые поля
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {[...groups.entries()].map(([group, fields]) => (
                <section key={group}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border/50" />
                    <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                      {group}
                    </p>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {fields.map((f) => (
                      <div key={f.key} className="relative">
                        <Field
                          k={f.key}
                          value={f.value}
                          onChange={(v) => onChange({ ...overrides, [f.key]: v })}
                        />
                        {f.overridden ? (
                          <button
                            title="Сбросить к значению из кода"
                            onClick={() => {
                              const next = { ...overrides };
                              delete next[f.key];
                              onChange(next);
                            }}
                            className="absolute -top-1.5 -right-1.5 rounded-full bg-surface-2 p-1 text-muted-foreground ring-1 ring-border transition-colors hover:bg-surface hover:text-foreground"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            onClick={() => onChange({})}
            disabled={!Object.keys(overrides).length}
            className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
          >
            Сбросить всё
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white shadow-md shadow-[var(--accent)]/25 transition-all hover:shadow-lg hover:shadow-[var(--accent)]/30"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
