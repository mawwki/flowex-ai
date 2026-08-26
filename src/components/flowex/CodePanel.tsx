import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/flowex/types";
import { cn } from "@/lib/utils";

type Tab = "js" | "css" | "html";

const TAB_LABELS: Record<Tab, string> = {
  js: "JavaScript",
  css: "CSS",
  html: "HTML",
};

export function CodePanel({
  open,
  onClose,
  project,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  onApply: (scene: Project["scene"]) => void;
}) {
  const [tab, setTab] = useState<Tab>("js");
  const [draft, setDraft] = useState<Project["scene"]>({ js: "", css: "", html: "" });

  useEffect(() => {
    if (project) setDraft(project.scene);
  }, [project?.id, project?.scene, open]);

  if (!open || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="panel flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Код сцены</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть редактор"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {(["js", "css", "html"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                tab === t
                  ? "bg-surface-2 text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-surface-2/50 hover:text-foreground",
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Code editor */}
        <div className="mx-6 mt-4 flex-1 overflow-hidden rounded-2xl border border-border bg-surface-2/50">
          <textarea
            value={draft[tab]}
            onChange={(e) => setDraft({ ...draft, [tab]: e.target.value })}
            spellCheck={false}
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            placeholder={`Введите ${TAB_LABELS[tab]} код...`}
          />
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground/60">
            {draft[tab].length} символов · {draft[tab].split("\n").length} строк
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-full border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                onApply(draft);
                onClose();
              }}
              className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-[var(--accent)]/25 transition-all hover:shadow-lg hover:shadow-[var(--accent)]/30"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
