import {
  ArrowUp,
  Box,
  ChevronDown,
  Film,
  FileImage,
  FileVideo,
  Layers,
  Lightbulb,
  Loader2,
  Mic,
  Music,
  Paperclip,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PROVIDERS, getProvider, modelsFor } from "@/lib/flowex/providers";
import type { Asset, Settings } from "@/lib/flowex/types";
import { cn } from "@/lib/utils";

export function PromptBar({
  settings,
  setSettings,
  onSubmit,
  busy,
  suggestions,
  assets,
  onAttach,
  onRemoveAsset,
  above,
}: {
  settings: Settings;
  setSettings: (fn: (s: Settings) => Settings) => void;
  onSubmit: (prompt: string) => void;
  busy: boolean;
  suggestions: string[];
  assets: Asset[];
  onAttach: (files: FileList | null) => void;
  onRemoveAsset: (id: string) => void;
  above?: React.ReactNode;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [value]);

  useEffect(() => {
    if (value) setSuggestionsOpen(false);
  }, [value]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setValue("");
    onSubmit(t);
  };

  const dictate = () => {
    type SREvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
    type SRInstance = {
      lang: string;
      onresult: ((e: SREvent) => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const w = window as unknown as {
      SpeechRecognition?: new () => SRInstance;
      webkitSpeechRecognition?: new () => SRInstance;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "ru-RU";
    rec.onresult = (e: SREvent) =>
      setValue((v) => `${v} ${e.results[0]?.[0]?.transcript ?? ""}`.trim());
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const kindIcon = (a: Asset) =>
    a.kind === "image" ? (
      <FileImage className="h-3.5 w-3.5" />
    ) : a.kind === "video" ? (
      <FileVideo className="h-3.5 w-3.5" />
    ) : a.kind === "model" ? (
      <Box className="h-3.5 w-3.5" />
    ) : a.kind === "texture" ? (
      <Layers className="h-3.5 w-3.5" />
    ) : a.kind === "animation" ? (
      <Film className="h-3.5 w-3.5" />
    ) : (
      <Music className="h-3.5 w-3.5" />
    );

  return (
    <div className="mx-auto w-full max-w-3xl">
      {above}

      {suggestions.length ? (
        <div className="mb-2">
          <button
            onClick={() => setSuggestionsOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            <Lightbulb className="h-3 w-3" />
            <span>{suggestionsOpen ? "Скрыть идеи" : "Показать идеи"}</span>
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", suggestionsOpen && "rotate-180")}
            />
          </button>
          {suggestionsOpen ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  className="rounded-full border border-border/40 bg-surface-2/30 px-3 py-1 text-[11px] text-muted-foreground/70 transition-all hover:border-border/60 hover:bg-surface-2/60 hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {assets.length ? (
        <div className="mb-2 flex flex-wrap justify-center gap-1.5">
          {assets.map((a) => (
            <span
              key={a.id}
              title={`${a.fileName}${a.duration ? ` · ${a.duration.toFixed(1)}с` : ""}`}
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-surface-2/60 py-1 pl-2.5 pr-1 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-border"
            >
              {kindIcon(a)}
              <span className="max-w-[100px] truncate">{a.name}</span>
              <button
                onClick={() => onRemoveAsset(a.id)}
                aria-label={`Убрать ${a.name}`}
                className="rounded-full p-0.5 transition hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-end gap-2 rounded-3xl border border-border/70 bg-surface/80 px-3 py-2 backdrop-blur-sm transition-all focus-within:border-[var(--accent)]/50 focus-within:shadow-lg focus-within:shadow-[var(--accent)]/5",
          assets.length && "rounded-t-sm",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*,.glb,.gltf,.dds,.ktx,.ktx2,.hdr,.exr,.anim,.bvh,.fbx,.dae,.tga,.bmp,.tiff"
          multiple
          className="hidden"
          onChange={(e) => {
            onAttach(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Прикрепить фото, видео или звук"
          title="Прикрепить фото / видео / звук (или перетащите файлы в окно)"
          className="mb-1.5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(value);
            }
          }}
          placeholder={
            assets.length
              ? "Куда вставить эти файлы и что с ними сделать?"
              : "Опишите видео или что изменить…"
          }
          className="max-h-44 min-h-[42px] min-w-0 flex-1 resize-none self-center bg-transparent py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
        />
        <button
          onClick={dictate}
          aria-label="Голосовой ввод"
          title="Голосовой ввод"
          className={cn(
            "mb-1.5 rounded-full p-2 transition-colors hover:bg-surface-2 hover:text-foreground",
            listening ? "text-playhead pulse-soft" : "text-muted-foreground",
          )}
        >
          <Mic className="h-5 w-5" />
        </button>
        <button
          onClick={() => send(value)}
          disabled={busy}
          aria-label="Отправить"
          title="Отправить (Enter)"
          className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/25 transition-all hover:scale-105 hover:shadow-lg hover:shadow-[var(--accent)]/30 disabled:opacity-50 disabled:hover:scale-100"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </div>

      <p className="mt-2 hidden justify-center gap-4 text-[11px] text-muted-foreground/70 sm:flex">
        <span>
          <kbd className="rounded border border-border/60 bg-surface-2/50 px-1.5 py-0.5 font-sans text-[10px]">
            Enter
          </kbd>{" "}
          отправить
        </span>
        <span>
          <kbd className="rounded border border-border/60 bg-surface-2/50 px-1.5 py-0.5 font-sans text-[10px]">
            Shift+Enter
          </kbd>{" "}
          новая строка
        </span>
        <span>
          <kbd className="rounded border border-border/60 bg-surface-2/50 px-1.5 py-0.5 font-sans text-[10px]">
            Space
          </kbd>{" "}
          пауза / плей
        </span>
      </p>

      <div className="relative mt-3 flex justify-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="opacity-60">Модель:</span>{" "}
          <span className="font-medium">{getProvider(settings.provider).label}</span>
          <span className="opacity-40">·</span>
          <span className="max-w-[180px] truncate">{settings.model}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>

        {open ? (
          <div className="absolute bottom-9 z-30 max-h-80 w-[min(560px,92vw)] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-[var(--shadow-panel)] backdrop-blur-xl">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="py-1">
                <p className="px-3 py-1 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  {p.label}
                </p>
                {modelsFor(settings, p.id).map((m) => (
                  <button
                    key={p.id + m}
                    onClick={() => {
                      setSettings((s) => ({ ...s, provider: p.id, model: m }));
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2",
                      settings.provider === p.id &&
                        settings.model === m &&
                        "bg-surface-2 font-medium",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
