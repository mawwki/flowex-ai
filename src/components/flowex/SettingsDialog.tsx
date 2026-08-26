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
  { label: "720p", w: 1280, h: 720 },
  { label: "1080p", w: 1920, h: 1080 },
  { label: "4K HDR", w: 2560, h: 1440 },
  { label: "Vertical 9:16", w: 720, h: 1280 },
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
          <h2 className="font-display text-xl">Настройки</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть настройки"
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          {(
            [
              ["providers", "Провайдеры и модели"],
              ["style", "Стили"],
              ["project", "Проект"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                tab === id ? "bg-surface-2 text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {tab === "providers" ? (
            <div className="space-y-5">
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
                      "rounded-xl border px-3 py-2.5 text-sm transition",
                      settings.provider === p.id
                        ? "border-transparent bg-surface-2 ring-1 ring-ring"
                        : "border-border hover:bg-surface-2",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">API-ключ ({provider.keyHint})</span>
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
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                {provider.keyUrl ? (
                  <a
                    href={provider.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Получить ключ <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </label>

              {settings.provider === "custom" ? (
                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Base URL</span>
                  <input
                    value={settings.customBaseUrl}
                    onChange={(e) => setSettings((s) => ({ ...s, customBaseUrl: e.target.value }))}
                    placeholder="https://my-gateway/v1"
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none"
                  />
                </label>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Модель</span>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none"
                >
                  {modelsFor(settings, settings.provider).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2">
                <input
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="Добавить свою модель"
                  className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none"
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
                  className="rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Добавить
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ключи хранятся только в вашем браузере (localStorage) и отправляются напрямую
                провайдеру.
              </p>
            </div>
          ) : null}

          {tab === "style" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Тема</p>
                <div className="flex gap-2">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSettings((s) => ({ ...s, theme: t }))}
                      className={cn(
                        "rounded-xl border px-4 py-2.5 text-sm",
                        settings.theme === t
                          ? "border-transparent bg-surface-2 ring-1 ring-ring"
                          : "border-border",
                      )}
                    >
                      {t === "dark" ? "Тёмная" : "Светлая"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Акцентный цвет</p>
                <div className="flex flex-wrap gap-3">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSettings((s) => ({ ...s, accent: a.id }))}
                      aria-label={a.label}
                      className={cn(
                        "h-10 w-10 rounded-full ring-offset-2 ring-offset-surface",
                        settings.accent === a.id && "ring-2 ring-ring",
                      )}
                      style={{ background: a.value }}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <span className="text-sm">Автовоспроизведение при открытии проекта</span>
                <input
                  type="checkbox"
                  checked={settings.autoPlay}
                  onChange={(e) => setSettings((s) => ({ ...s, autoPlay: e.target.checked }))}
                  className="h-5 w-5 accent-[var(--accent)]"
                />
              </label>
            </div>
          ) : null}

          {tab === "project" && project ? (
            <div className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Название</span>
                <input
                  value={project.name}
                  onChange={(e) => onProjectChange({ name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">
                    Длительность: {project.duration} с
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
                  <span className="text-sm text-muted-foreground">FPS: {project.fps}</span>
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
                <p className="text-sm text-muted-foreground">Разрешение</p>
                <div className="flex flex-wrap gap-2">
                  {RESOLUTIONS.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => onProjectChange({ width: r.w, height: r.h, quality: r.label })}
                      className={cn(
                        "rounded-xl border px-4 py-2.5 text-sm",
                        project.quality === r.label
                          ? "border-transparent bg-surface-2 ring-1 ring-ring"
                          : "border-border",
                      )}
                    >
                      {r.label}
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
