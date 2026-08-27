import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileImage,
  Film,
  Frame,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { STYLE_CATEGORIES, STYLE_PRESETS, categoryLabel } from "@/lib/flowex/styles";
import type { Project, Settings } from "@/lib/flowex/types";
import { cn } from "@/lib/utils";

export type WizardDraft = {
  styleId: string | undefined;
  fromScratch: boolean;
  prompt: string;
  title: string;
  description: string;
  points: string;
  files: File[];
  aspect: "16:9" | "9:16" | "1:1";
  duration: number;
};

type Step = "style" | "content" | "review";

export function CreationWizard({
  open,
  onClose,
  settings,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  /** body: final assembled user prompt; project created by parent */
  onCreate: (draft: WizardDraft) => Promise<void> | void;
}) {
  const [step, setStep] = useState<Step>("style");
  const [category, setCategory] = useState<string>("all");
  const [draft, setDraft] = useState<WizardDraft>({
    styleId: undefined,
    fromScratch: false,
    prompt: "",
    title: "",
    description: "",
    points: "",
    files: [],
    aspect: "16:9",
    duration: 15,
  });
  const [busyStep, setBusyStep] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep("style");
      setCategory("all");
      setDraft({
        styleId: undefined,
        fromScratch: false,
        prompt: "",
        title: "",
        description: "",
        points: "",
        files: [],
        aspect: "16:9",
        duration: 15,
      });
    }
  }, [open]);

  const presets = useMemo(() => {
    if (category === "all") return STYLE_PRESETS;
    return STYLE_PRESETS.filter((p) => p.category === category);
  }, [category]);

  const selectedPreset = STYLE_PRESETS.find((p) => p.id === draft.styleId) ?? undefined;

  const applyPreset = (id: string | undefined) => {
    const preset = STYLE_PRESETS.find((p) => p.id === id);
    setDraft((d) => ({
      ...d,
      styleId: id,
      fromScratch: !preset,
      aspect: preset?.aspect ?? d.aspect,
      duration: preset?.duration ?? d.duration,
    }));
  };

  const buildPrompt = (): string => {
    const parts: string[] = [];
    if (selectedPreset) parts.push(`Стиль: ${selectedPreset.title} — ${selectedPreset.prompt}`);
    else if (draft.fromScratch) parts.push("Свободный стиль — рисуй всё кодом, без шаблона.");
    if (draft.title.trim()) parts.push(`Заголовок ролика: ${draft.title.trim()}`);
    if (draft.description.trim()) parts.push(`Идея/описание: ${draft.description.trim()}`);
    if (draft.points.trim()) {
      const list = draft.points
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
      if (list.length) parts.push(`Ключевые пункты (покажи по очереди): ${list.join(" | ")}`);
    }
    if (draft.prompt.trim()) parts.push(`Дополнительно по запросу: ${draft.prompt.trim()}`);
    return parts.join("\n");
  };

  const canNext = (): boolean => {
    if (step === "style") return true;
    if (step === "content") {
      if (draft.fromScratch && !draft.description.trim() && !draft.title.trim()) return false;
      if (!selectedPreset && !draft.fromScratch) return true;
      return true;
    }
    return true;
  };

  const removeFile = (i: number) =>
    setDraft((d) => ({ ...d, files: d.files.filter((_, idx) => idx !== i) }));

  const handleCreate = async () => {
    setBusyStep(true);
    try {
      await onCreate(draft);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось создать видео");
    } finally {
      setBusyStep(false);
    }
  };

  if (!open) return null;

  const stepNum = step === "style" ? 1 : step === "content" ? 2 : 3;
  const stepLabel = step === "style" ? "Стиль" : step === "content" ? "Контент" : "Готово";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/40 px-6 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
            <Wand2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">New Video</h2>
            <p className="text-xs text-muted-foreground">
              Шаг {stepNum}/3 · {stepLabel}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Steps */}
            <div className="flex items-center gap-1">
              {(["style", "content", "review"] as Step[]).map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    step === s
                      ? "w-6 bg-[var(--accent)]"
                      : i < stepNum - 1
                        ? "w-3 bg-[var(--accent)]/40"
                        : "w-3 bg-surface-2",
                  )}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="ml-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "style" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCategory("all");
                    applyPreset(undefined);
                    setDraft((d) => ({ ...d, fromScratch: false, styleId: undefined }));
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    category === "all" && !draft.fromScratch
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-border/50 text-muted-foreground hover:bg-surface-2",
                  )}
                >
                  Все
                </button>
                {STYLE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      category === c
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-border/50 text-muted-foreground hover:bg-surface-2",
                    )}
                  >
                    {categoryLabel(c)}
                  </button>
                ))}
              </div>

              {/* From scratch option */}
              <button
                onClick={() => {
                  setCategory("all");
                  setDraft((d) => ({
                    ...d,
                    fromScratch: true,
                    styleId: undefined,
                    aspect: "16:9",
                    duration: 15,
                  }));
                }}
                className={cn(
                  "w-full rounded-2xl border border-dashed p-4 text-left transition-all",
                  draft.fromScratch
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-lg shadow-[var(--accent)]/10"
                    : "border-border/50 hover:border-border hover:bg-surface-2/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Начать с нуля</p>
                    <p className="text-xs text-muted-foreground">
                      Опишите видео свободно — ИИ сам придумает дизайн, шрифты и анимации
                    </p>
                  </div>
                  {draft.fromScratch ? (
                    <Check className="ml-auto h-4 w-4 text-[var(--accent)]" />
                  ) : null}
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border text-left transition-all",
                      draft.styleId === p.id && !draft.fromScratch
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-lg shadow-[var(--accent)]/10"
                        : "border-border/60 hover:border-border hover:shadow-md",
                    )}
                  >
                    <div
                      className="relative h-24 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]} 55%, ${p.colors[2]})`,
                      }}
                    >
                      <span
                        className="absolute left-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full shadow-lg"
                        style={{ background: p.colors[2], opacity: 0.85 }}
                      />
                      <span
                        className="absolute right-2 top-2 h-8 w-12 rounded-md shadow-md"
                        style={{ background: p.colors[1], opacity: 0.5 }}
                      />
                      <span className="absolute bottom-1.5 left-2 text-[10px] font-bold drop-shadow-sm text-black/60">
                        Aa
                      </span>
                      {draft.styleId === p.id && !draft.fromScratch ? (
                        <span className="absolute right-1.5 bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                    </div>
                    <div className="bg-surface px-2.5 py-2">
                      <p className="truncate text-xs font-medium">{p.title}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{p.tag}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : step === "content" ? (
            <div className="space-y-5">
              {/* Content template hint */}
              {selectedPreset ? (
                <div className="rounded-xl border border-border/40 bg-surface-2/40 p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Подсказка для стиля:</span>{" "}
                  {selectedPreset.contentHint}
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Заголовок ролика
                </label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Например: Топ-5 способов сэкономить"
                  className="w-full rounded-xl border border-border/50 bg-surface-2/40 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Идея / описание
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  rows={3}
                  placeholder="Коротко опишите видео, настроение, что показать…"
                  className="w-full resize-none rounded-xl border border-border/50 bg-surface-2/40 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Ключевые пункты (каждый на новой строке)
                </label>
                <textarea
                  value={draft.points}
                  onChange={(e) => setDraft((d) => ({ ...d, points: e.target.value }))}
                  rows={4}
                  placeholder={"Первый пункт\nВторой пункт\nТретий пункт"}
                  className="w-full resize-none rounded-xl border border-border/50 bg-surface-2/40 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Файлы (изображения, видео)
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length)
                      setDraft((d) => ({
                        ...d,
                        files: [...d.files, ...Array.from(e.target.files!)],
                      }));
                    e.target.value = "";
                  }}
                />
                {draft.files.length ? (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {draft.files.map((f, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 rounded-full border border-border/40 bg-surface-2/50 px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        {f.type.startsWith("image") ? (
                          <FileImage className="h-3 w-3" />
                        ) : (
                          <Film className="h-3 w-3" />
                        )}
                        <span className="max-w-[120px] truncate">{f.name}</span>
                        <button
                          onClick={() => removeFile(i)}
                          className="rounded-full p-0.5 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-surface-2/40"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Добавить файлы
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Дополнительные пожелания
                </label>
                <textarea
                  value={draft.prompt}
                  onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
                  rows={2}
                  placeholder="Цвета, шрифты, стиль анимации, что-то ещё…"
                  className="w-full resize-none rounded-xl border border-border/50 bg-surface-2/40 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/60"
                />
              </div>
            </div>
          ) : (
            /* Review step */
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/40 bg-surface-2/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-medium">Предпросмотр запроса к ИИ</span>
                  <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs leading-relaxed text-foreground/90">
                  {buildPrompt()}
                </pre>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/40 bg-surface-2/30 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Формат кадра</p>
                  <div className="flex gap-1.5">
                    {(["16:9", "9:16", "1:1"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setDraft((d) => ({ ...d, aspect: a }))}
                        className={cn(
                          "flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                          draft.aspect === a
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                            : "border-border/50 text-muted-foreground hover:bg-surface-2",
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface-2/30 p-3">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Длительность · {draft.duration}с
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={draft.duration}
                    onChange={(e) => setDraft((d) => ({ ...d, duration: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>5с</span>
                    <span>60с</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/40 bg-surface-2/30 p-3 text-center">
                  <Frame className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{draft.aspect}</p>
                  <p className="text-[10px] text-muted-foreground">Формат</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface-2/30 p-3 text-center">
                  <Clock3 className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{draft.duration}с</p>
                  <p className="text-[10px] text-muted-foreground">Длительность</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface-2/30 p-3 text-center">
                  <Wand2 className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {draft.fromScratch ? "С нуля" : (selectedPreset?.title ?? "—")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Стиль</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <button
            onClick={() =>
              step === "content"
                ? setStep("style")
                : step === "review"
                  ? setStep("content")
                  : onClose()
            }
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === "style" ? "Отмена" : "Назад"}
          </button>

          {step !== "review" ? (
            <button
              onClick={() => setStep(step === "style" ? "content" : "review")}
              disabled={!canNext()}
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:opacity-90 disabled:opacity-40"
            >
              Далее
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={busyStep}
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:opacity-90 disabled:opacity-60"
            >
              {busyStep ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {busyStep ? "Создаю видео…" : "Создать видео"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
