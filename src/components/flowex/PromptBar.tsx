import {
  ArrowUp,
  ChevronDown,
  FileImage,
  FileVideo,
  Loader2,
  Mic,
  Music,
  Paperclip,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
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
  const fileRef = useRef<HTMLInputElement>(null);
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
    ) : (
      <Music className="h-3.5 w-3.5" />
    );

  return (
    <div className="mx-auto w-full max-w-3xl">
      {above}

      {suggestions.length ? (
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {assets.length ? (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {assets.map((a) => (
            <span
              key={a.id}
              title={`${a.fileName}${a.duration ? ` · ${a.duration.toFixed(1)}с` : ""}`}
              className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-2.5 pr-1 text-xs text-muted-foreground"
            >
              {kindIcon(a)}
              {a.name}
              <button
                onClick={() => onRemoveAsset(a.id)}
                aria-label={`Убрать ${a.name}`}
                className="rounded-full p-0.5 hover:bg-surface hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "mt-4 flex items-center gap-2 rounded-3xl border border-border bg-surface px-3 py-2",
          assets.length && "rounded-t-sm",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*"
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
          title="Прикрепить фото / видео / звук"
          className="rounded-full p-2 text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(value)}
          placeholder={
            assets.length
              ? "Куда вставить эти файлы и что с ними сделать?"
              : "Опишите видео или что изменить…"
          }
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={dictate}
          aria-label="Голосовой ввод"
          className={cn(
            "rounded-full p-2 hover:text-foreground",
            listening ? "text-playhead" : "text-muted-foreground",
          )}
        >
          <Mic className="h-5 w-5" />
        </button>
        <button
          onClick={() => send(value)}
          disabled={busy}
          aria-label="Отправить"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </div>

      <div className="relative mt-4 flex justify-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Модель: {getProvider(settings.provider).label}: {settings.model}
          <ChevronDown className="h-4 w-4" />
        </button>

        {open ? (
          <div className="absolute bottom-9 z-30 max-h-80 w-[min(560px,92vw)] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-[var(--shadow-panel)]">
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
                      "block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2",
                      settings.provider === p.id && settings.model === m && "bg-surface-2",
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
