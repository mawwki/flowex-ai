import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Code2, Download, Loader2, Menu, Moon, Settings, Sun } from "lucide-react";
import { Sidebar } from "@/components/flowex/Sidebar";
import { Preview } from "@/components/flowex/Preview";
import { Timeline } from "@/components/flowex/Timeline";
import { PromptBar } from "@/components/flowex/PromptBar";
import { SettingsDialog } from "@/components/flowex/SettingsDialog";
import { CodePanel } from "@/components/flowex/CodePanel";
import { useFlowexStore } from "@/lib/flowex/store";
import { generateScene } from "@/lib/flowex/providers";
import { download, exportVideo } from "@/lib/flowex/export";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowex — AI видеоредактор на коде" },
      {
        name: "description",
        content:
          "Flowex создаёт видео кодом: опишите сцену, ИИ напишет HTML/CSS/JS анимацию, отредактируйте и скачайте ролик.",
      },
      { property: "og:title", content: "Flowex — AI видеоредактор на коде" },
      {
        property: "og:description",
        content: "Генерация и редактирование видео с помощью ИИ и Canvas-кода прямо в браузере.",
      },
    ],
  }),
  component: FlowexApp,
});

function FlowexApp() {
  const store = useFlowexStore();
  const {
    hydrated,
    projects,
    active,
    activeId,
    setActiveId,
    settings,
    setSettings,
    updateProject,
    createProject,
    deleteProject,
    duplicateProject,
  } = store;

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [seekToken, setSeekToken] = useState(0);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("light", settings.theme === "light");
    const map: Record<string, string> = {
      violet: "oklch(0.72 0.15 300)",
      amber: "oklch(0.78 0.15 70)",
      emerald: "oklch(0.75 0.14 160)",
      sky: "oklch(0.75 0.13 240)",
      rose: "oklch(0.72 0.16 15)",
    };
    document.documentElement.style.setProperty("--accent", map[settings.accent] ?? map["violet"]!);
    document.documentElement.style.setProperty("--ring", map[settings.accent] ?? map["violet"]!);
  }, [settings.theme, settings.accent]);

  useEffect(() => {
    setTime(0);
    setSeekToken((t) => t + 1);
    setPlaying(settings.autoPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const seek = useCallback((t: number) => {
    setPlaying(false);
    setTime(t);
    setSeekToken((x) => x + 1);
  }, []);

  const handlePrompt = async (prompt: string) => {
    if (!active) return;
    setBusy(true);
    const id = toast.loading("ИИ пишет код сцены…");
    try {
      const res = await generateScene({
        settings,
        prompt,
        currentJs: active.scene.js,
        duration: active.duration,
      });
      updateProject(active.id, {
        scene: { js: res.js, css: res.css, html: res.html },
        duration: res.duration && res.duration > 1 ? Math.min(60, res.duration) : active.duration,
        name: active.name === "Untitled" && res.name ? res.name : active.name,
        messages: [
          ...active.messages,
          { id: crypto.randomUUID(), role: "user", content: prompt, at: Date.now() },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Сцена обновлена",
            at: Date.now(),
          },
        ],
      });
      setTime(0);
      setSeekToken((x) => x + 1);
      toast.success("Сцена обновлена", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сгенерировать сцену", { id });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    if (!active) return;
    setPlaying(false);
    setExporting(0);
    try {
      const { blob, ext } = await exportVideo(active, (p) => setExporting(p));
      download(blob, `${active.name.replace(/\s+/g, "-").toLowerCase()}.${ext}`);
      toast.success("Видео готово к скачиванию");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка экспорта");
    } finally {
      setExporting(null);
    }
  };

  if (!hydrated || !active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden h-screen lg:block">
        <Sidebar
          projects={projects}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={createProject}
          onDelete={deleteProject}
          onDuplicate={duplicateProject}
          onRename={(id, name) => updateProject(id, { name })}
          onOpenProjects={() => setSettingsOpen(true)}
        />
      </div>

      {navOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full w-[300px] max-w-[85vw] bg-sidebar">
            <Sidebar
              projects={projects}
              activeId={activeId}
              onSelect={(id) => {
                setActiveId(id);
                setNavOpen(false);
              }}
              onCreate={() => {
                createProject();
                setNavOpen(false);
              }}
              onDelete={deleteProject}
              onDuplicate={duplicateProject}
              onRename={(id, name) => updateProject(id, { name })}
              onOpenProjects={() => {
                setSettingsOpen(true);
                setNavOpen(false);
              }}
              onClose={() => setNavOpen(false)}
            />
          </div>
          <button
            aria-label="Закрыть меню"
            className="flex-1 bg-black/60"
            onClick={() => setNavOpen(false)}
          />
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 py-4 sm:px-8">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Меню проектов"
            className="rounded-full p-2 hover:bg-surface-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate font-display text-lg lg:hidden">{active.name}</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={handleExport}
              disabled={exporting !== null}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-60"
            >
              {exporting !== null ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {Math.round(exporting * 100)}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Скачать
                </>
              )}
            </button>
            <button
              onClick={() => setCodeOpen(true)}
              aria-label="Редактор кода"
              className="rounded-full p-2.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              <Code2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Настройки"
              className="rounded-full p-2.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={() =>
                setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))
              }
              aria-label="Сменить тему"
              className="rounded-full p-2.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              {settings.theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>
            <span className="ml-1 h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-[var(--accent)] to-surface-2 ring-1 ring-border" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 px-4 pb-10 sm:px-8">
          <Preview
            project={active}
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
            time={time}
            seekToken={seekToken}
            onTime={setTime}
          />
          <Timeline project={active} time={time} onSeek={seek} />
          <div className="mt-auto pt-6">
            <PromptBar
              settings={settings}
              setSettings={setSettings}
              onSubmit={handlePrompt}
              busy={busy}
            />
          </div>
        </div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
        project={active}
        onProjectChange={(patch) => updateProject(active.id, patch)}
      />
      <CodePanel
        open={codeOpen}
        onClose={() => setCodeOpen(false)}
        project={active}
        onApply={(scene) => updateProject(active.id, { scene })}
      />
    </div>
  );
}
