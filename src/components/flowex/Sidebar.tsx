import { Folder, Plus, Trash2, Copy, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Project } from "@/lib/flowex/types";
import { renderThumb } from "@/lib/flowex/stage";
import { cn } from "@/lib/utils";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Thumb({ project }: { project: Project }) {
  const src = useMemo(() => renderThumb(project, project.duration * 0.35, 96), [project]);
  return (
    <div className="h-9 w-14 shrink-0 overflow-hidden rounded-md bg-surface-2 ring-1 ring-border">
      {src ? (
        <img src={src} alt={`Превью ${project.name}`} className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

export function Sidebar({
  projects,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
  onRename,
  onOpenProjects,
  onClose,
}: {
  projects: Project[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onOpenProjects: () => void;
  onClose?: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar lg:w-[300px] lg:shrink-0">
      <div className="flex items-center gap-2 px-6 pt-6 pb-4">
        <svg viewBox="0 0 40 40" className="h-8 w-8 text-foreground" aria-hidden>
          <path d="M6 8h26l-6 8H12z" fill="currentColor" opacity="0.9" />
          <path d="M10 20h18l-6 8H4z" fill="currentColor" opacity="0.55" />
          <path d="M20 14l10 6-10 6z" fill="currentColor" />
        </svg>
        <span className="font-display text-3xl tracking-[0.08em] lowercase">flowex</span>
        {onClose ? (
          <button
            onClick={onClose}
            aria-label="Закрыть меню"
            className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="px-5">
        <button
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-[15px] font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-5 w-5" /> New Video
        </button>
      </div>

      <p className="px-6 pt-7 pb-3 text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        Video album
      </p>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {projects.map((p) => {
          const active = p.id === activeId;
          return (
            <div
              key={p.id}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                active ? "bg-surface-2 ring-1 ring-border" : "hover:bg-sidebar-accent",
              )}
            >
              <button
                onClick={() => onSelect(p.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Thumb project={p} />
                <span className="min-w-0">
                  {editing === p.id ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => {
                        onRename(p.id, draft.trim() || p.name);
                        setEditing(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="w-full rounded bg-surface px-1 text-[15px] outline-none"
                    />
                  ) : (
                    <span className="block truncate text-[15px]">{p.name}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {fmt(p.duration)} • {p.quality}
                  </span>
                </span>
              </button>
              <span className="pointer-events-none absolute right-2 flex shrink-0 gap-0.5 rounded-xl bg-surface-2/95 p-0.5 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                <button
                  aria-label="Переименовать"
                  onClick={() => {
                    setEditing(p.id);
                    setDraft(p.name);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label="Дублировать"
                  onClick={() => onDuplicate(p.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label="Удалить"
                  onClick={() => onDelete(p.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onOpenProjects}
        className="flex items-center gap-3 border-t border-border px-6 py-5 text-[15px] text-foreground/90 hover:bg-sidebar-accent"
      >
        <Folder className="h-5 w-5" /> Projects
      </button>
    </aside>
  );
}
