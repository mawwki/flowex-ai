import { ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { PROVIDERS, getProvider, modelsFor } from "@/lib/flowex/providers";
import type { Project, Settings } from "@/lib/flowex/types";
import { cn } from "@/lib/utils";

const ACCENTS: { id: string; label: string; value: string }[] = [
  { id: "violet", label: "Violet", value: "oklch(0.72 0.15 300)" },
  { id: "amber", label: "Amber", value: "oklch(0.78 0.15 70)" },
  { id: "emerald", label: "Emerald", value: "oklch(0.75 0.14 160)" },
  { id: "sky", label: "Sky", value: "oklch(0.75 0.13 240)" },
  { id: "rose", label: "Rose", value: "oklch(0.72 0.16 15)" },
];

const RESOLUTIONS = [
  { label: "720p", w: 1280, h: 720, desc: "HD" },
  { label: "1080p", w: 1920, h: 1080, desc: "Full HD" },
  { label: "4K HDR", w: 2560, h: 1440, desc: "Quad HD" },
  { label: "9:16", w: 720, h: 1280, desc: "Вертик." },
];

type Tab = "providers" | "style" | "project";

export function SettingsDialog({
  open,
  onClose,
  settings,
  setSettings,
  project,
  onProjectChange,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  setSettings: (fn: (s: Settings) => Settings) => void;
  project: Project | null;
  onProjectChange: (patch: Partial<Project>) => void;
}) {
  const [tab, setTab] = useState<Tab>("providers");
  const [newModel, setNewModel] = useState("");
  if (!open) return null;
  const provider = getProvider(settings.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="panel flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-xl font-semibold">Настройки</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть настройки"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {(
            [
              ["providers", "Провайдеры"],
              ["style", "Стиль"],
              ["project", "Проект"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                tab === id
                  ? "bg-surface-2 text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-surface-2/50 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {tab === "providers" ? (
            <div className="space-y-5">
              {/* Provider grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        provider: p.id,
                        model: modelsFor(s, p.id)[0] ?? s.model,
                      }))
                    }
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                      settings.provider === p.id
                        ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-foreground shadow-sm"
                        : "border-border/60 hover:border-border hover:bg-surface-2/50",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* API key */}
              <label className="block space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  API-ключ ({provider.keyHint})
                </span>
                <input
                  type="password"
                  value={settings.apiKeys[settings.provider] ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      apiKeys: { ...s.apiKeys, [s.provider]: e.target.value },
                    }))
                  }
                  placeholder={provider.keyHint}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
                />
                {provider.keyUrl ? (
                  <a
                    href={provider.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Получить ключ <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </label>

              {/* Custom base URL */}
              {settings.provider === "custom" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Base URL</span>
                  <input
                    value={settings.customBaseUrl}
                    onChange={(e) => setSettings((s) => ({ ...s, customBaseUrl: e.target.value }))}
                    placeholder="https://my-gateway/v1"
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
                  />
                </label>
              ) : null}

              {/* Model select */}
              <label className="block space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Модель</span>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]/50"
                >
                  {modelsFor(settings, settings.provider).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              {/* Add custom model */}
              <div className="flex gap-2">
                <input
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="Добавить свою модель"
                  className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
                />
                <button
                  onClick={() => {
                    const m = newModel.trim();
                    if (!m) return;
                    setSettings((s) => ({
                      ...s,
                      model: m,
                      customModels: {
                        ...s.customModels,
                        [s.provider]: [...(s.customModels[s.provider] ?? []), m],
                      },
                    }));
                    setNewModel("");
                  }}
                  className="rounded-xl bg-[var(--accent)] px-5 text-sm font-medium text-white shadow-sm shadow-[var(--accent)]/25 transition-all hover:shadow-md hover:shadow-[var(--accent)]/30"
                >
                  Добавить
                </button>
              </div>
              <p className="text-xs text-muted-foreground/60">
                Ключи хранятся только в вашем браузере (localStorage) и отправляются напрямую
                провайдеру.
              </p>
            </div>
          ) : null}

          {tab === "style" ? (
            <div className="space-y-6">
              {/* Theme */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Тема</p>
                <div className="flex gap-2">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSettings((s) => ({ ...s, theme: t }))}
                      className={cn(
                        "rounded-xl border px-5 py-2.5 text-sm font-medium transition-all",
                        settings.theme === t
                          ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-foreground shadow-sm"
                          : "border-border/60 text-muted-foreground hover:border-border hover:bg-surface-2/50",
                      )}
                    >
                      {t === "dark" ? "Тёмная" : "Светлая"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent colors */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Акцентный цвет</p>
                <div className="flex flex-wrap gap-3">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSettings((s) => ({ ...s, accent: a.id }))}
                      aria-label={a.label}
                      className={cn(
                        "relative h-10 w-10 rounded-full transition-all",
                        settings.accent === a.id
                          ? "ring-2 ring-ring ring-offset-2 ring-offset-surface scale-110"
                          : "ring-1 ring-border/50 hover:ring-border hover:scale-105",
                      )}
                      style={{ background: a.value }}
                    >
                      {settings.accent === a.id ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/20">
                          <svg
                            className="h-4 w-4 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-play */}
              <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-2/30 px-4 py-3 transition-colors hover:bg-surface-2/50">
                <span className="text-sm font-medium">Автовоспроизведение</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.autoPlay}
                  onClick={() => setSettings((s) => ({ ...s, autoPlay: !s.autoPlay }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                    settings.autoPlay ? "bg-[var(--accent)]" : "bg-track",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      settings.autoPlay ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </label>
            </div>
          ) : null}

          {tab === "project" && project ? (
            <div className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Название</span>
                <input
                  value={project.name}
                  onChange={(e) => onProjectChange({ name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Длительность: <span className="tabular-nums">{project.duration}</span> с
                  </span>
                  <input
                    type="range"
                    min={2}
                    max={60}
                    value={project.duration}
                    onChange={(e) => onProjectChange({ duration: Number(e.target.value) })}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    FPS: <span className="tabular-nums">{project.fps}</span>
                  </span>
                  <input
                    type="range"
                    min={12}
                    max={60}
                    step={6}
                    value={project.fps}
                    onChange={(e) => onProjectChange({ fps: Number(e.target.value) })}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Разрешение</p>
                <div className="grid grid-cols-2 gap-2">
                  {RESOLUTIONS.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => onProjectChange({ width: r.w, height: r.h, quality: r.label })}
                      className={cn(
                        "flex flex-col items-center rounded-xl border px-4 py-3 text-sm transition-all",
                        project.quality === r.label
                          ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 shadow-sm"
                          : "border-border/60 hover:border-border hover:bg-surface-2/50",
                      )}
                    >
                      <span className="font-medium">{r.label}</span>
                      <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
