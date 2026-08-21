import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/flowex/types";
import { cn } from "@/lib/utils";

type Tab = "js" | "css" | "html";

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
          <h2 className="font-display text-xl">Код сцены — {project.name}</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть редактор"
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2 px-6 pt-4">
          {(["js", "css", "html"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-4 py-2 text-sm uppercase",
                tab === t ? "bg-surface-2" : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          value={draft[tab]}
          onChange={(e) => setDraft({ ...draft, [tab]: e.target.value })}
          spellCheck={false}
          className="m-6 flex-1 resize-none rounded-2xl border border-border bg-surface-2 p-4 font-mono text-[13px] leading-relaxed outline-none"
        />
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2.5 text-sm"
          >
            Отмена
          </button>
          <button
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
