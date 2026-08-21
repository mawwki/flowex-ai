import { ArrowUp, ChevronDown, Loader2, Mic, Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import { PROVIDERS, getProvider, modelsFor } from "@/lib/flowex/providers";
import type { Settings } from "@/lib/flowex/types";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["Enhance Lighting", "Cinematic Focus", "Color Correction"];

export function PromptBar({
  settings,
  setSettings,
  onSubmit,
  busy,
}: {
  settings: Settings;
  setSettings: (fn: (s: Settings) => Settings) => void;
  onSubmit: (prompt: string) => void;
  busy: boolean;
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
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.onresult = (e: any) => setValue((v) => `${v} ${e.results[0][0].transcript}`.trim());
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap justify-center gap-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground/85 transition hover:bg-surface-2"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5">
        <input ref={fileRef} type="file" className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Прикрепить файл"
          className="rounded-full p-2 text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(value)}
          placeholder="Describe how you want to change this video..."
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="relative mt-4 flex justify-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Model: {getProvider(settings.provider).label}: {settings.model}
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
