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
    "w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
        <span className="truncate text-sm">{label}</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--accent)]"
        />
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <label className="block space-y-1">
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
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
    <label className="block space-y-1">
      <span className="block truncate text-xs text-muted-foreground">{k}</span>
      {isColor(value) ? (
        <span className="flex items-center gap-2">
          <input
            type="color"
            value={value.slice(0, 7)}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Цвет ${label}`}
            className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
          />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} font-mono text-xs`}
          />
        </span>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
    </label>
  );
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
            <h2 className="font-display text-lg">Инспектор сцены</h2>
            <p className="text-xs text-muted-foreground">
              Ручной контроль: цвета, тексты и параметры из var CONFIG
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть инспектор"
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {groups.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              В коде сцены нет var CONFIG — попросите ИИ добавить настраиваемые поля или
              отредактируйте код вручную.
            </p>
          ) : (
            <div className="space-y-6">
              {[...groups.entries()].map(([group, fields]) => (
                <section key={group} className="space-y-2">
                  <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                    {group}
                  </p>
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
                            className="absolute -top-1.5 -right-1.5 rounded-full bg-surface-2 p-1 text-muted-foreground ring-1 ring-border hover:text-foreground"
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
            className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            Сбросить всё
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
