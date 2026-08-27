import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Code2, Download, Loader2, Menu, Moon, Settings, Sun } from "lucide-react";
import { Sidebar } from "@/components/flowex/Sidebar";
import { Preview } from "@/components/flowex/Preview";
import { PlaybackBar } from "@/components/flowex/PlaybackBar";
import { Timeline } from "@/components/flowex/Timeline";
import { PromptBar } from "@/components/flowex/PromptBar";
import { SettingsDialog } from "@/components/flowex/SettingsDialog";
import { CodePanel } from "@/components/flowex/CodePanel";
import { StylePicker } from "@/components/flowex/StylePicker";
import { CreationWizard, type WizardDraft } from "@/components/flowex/CreationWizard";
import { Inspector } from "@/components/flowex/Inspector";
import { Library } from "@/components/flowex/Library";
import { useFlowexStore, uid, ASPECTS } from "@/lib/flowex/store";
import { generateScene, generateSuggestions } from "@/lib/flowex/providers";
import { download, exportVideo } from "@/lib/flowex/export";
import { assetUrl, delBlob, forgetUrl, putBlob } from "@/lib/flowex/idb";
import { blobToClip, nextClipStart, processFiles } from "@/lib/flowex/media";
import {
  moveScene as reorderScene,
  parseScenes,
  removeScene,
  sceneTotal,
  setAllDurations,
  splitClip,
  syncTotalConstants,
} from "@/lib/flowex/scenes-edit";
import { STYLE_PRESETS, STARTER_HINTS } from "@/lib/flowex/styles";
import { blankScene } from "@/lib/flowex/scenes";
import type { ConfigMap } from "@/lib/flowex/config";
import type { AudioClip, Project } from "@/lib/flowex/types";

const clampDur = (d: number) => Math.max(1, Math.min(300, d));

export function App() {
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
    createProjectWith,
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
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const sceneErrorRef = useRef("");
  const timeRef = useRef(0);
  timeRef.current = time;
  const durationRef = useRef(1);
  durationRef.current = active?.duration ?? 1;
  const assetsRef = useRef(active?.assets ?? []);
  assetsRef.current = active?.assets ?? [];
  const assetIdsKey = (active?.assets ?? []).map((a) => a.id).join(",");

  useEffect(() => {
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
    sceneErrorRef.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        assetsRef.current.map(async (a) => [a.id, await assetUrl(a.id)] as const),
      );
      if (cancelled) return;
      setAssetUrls(Object.fromEntries(entries.filter((e): e is [string, string] => !!e[1])));
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [assetIdsKey, activeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el?.isContentEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
        return;
      }
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const next = timeRef.current + (e.code === "ArrowRight" ? step : -step);
        setPlaying(false);
        setTime(Math.max(0, Math.min(durationRef.current, next)));
        setSeekToken((x) => x + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const seek = useCallback((t: number) => {
    setPlaying(false);
    setTime(t);
    setSeekToken((x) => x + 1);
  }, []);

  const refreshSuggestions = useCallback(
    (projectId: string, js: string, prompt: string) => {
      generateSuggestions({ settings, js, prompt })
        .then((list) => {
          if (list.length) updateProject(projectId, { suggestions: list });
        })
        .catch(() => {});
    },
    [settings, updateProject],
  );

  const handlePrompt = async (prompt: string, target?: Project) => {
    const project = target ?? active;
    if (!project) return;
    setBusy(true);
    const id = toast.loading("ИИ пишет код сцены…");
    try {
      const preset = STYLE_PRESETS.find((s) => s.id === project.styleId);
      const fullPrompt = preset
        ? `${prompt}\n\n[Выбранный стиль: ${preset.title}] ${preset.prompt}`
        : prompt;
      const res = await generateScene({
        settings,
        prompt: fullPrompt,
        currentJs: project.scene.js,
        duration: project.duration,
        aspect: project.aspect,
        assets: project.assets,
        audio: project.audio,
      });
      const patch: Parameters<typeof updateProject>[1] = {
        scene: { js: res.js, css: res.css, html: res.html },
        config: {},
        suggestions: res.suggestions?.length ? res.suggestions.slice(0, 4) : project.suggestions,
      };
      if (res.duration && res.duration >= 1) patch.duration = clampDur(res.duration);
      if (res.aspect && ASPECTS[res.aspect] && res.aspect !== project.aspect) {
        patch.aspect = res.aspect;
        patch.width = ASPECTS[res.aspect]!.w;
        patch.height = ASPECTS[res.aspect]!.h;
      }
      if (project.name === "Untitled" && res.name) patch.name = res.name;
      const dur = patch.duration ?? project.duration;
      setTime(0);
      setSeekToken((x) => x + 1);
      updateProject(project.id, {
        ...patch,
        messages: [
          ...project.messages,
          { id: uid(), role: "user", content: prompt, at: Date.now() },
          {
            id: uid(),
            role: "assistant",
            content: res.notes || "Сцена обновлена",
            at: Date.now(),
          },
        ],
      });
      toast.success("Сцена обновлена", {
        id,
        description: `${dur.toFixed(0)} с · ${res.notes ? res.notes.slice(0, 90) : ""}`.trim(),
      });
      if (!res.suggestions?.length && res.js) {
        refreshSuggestions(project.id, res.js, prompt);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сгенерировать сцену", { id });
    } finally {
      setBusy(false);
    }
  };

  const handleAttach = async (files: FileList | null) => {
    if (!active || !files?.length) return;
    const id = toast.loading(`Прикрепляю файлы (${files.length})…`);
    try {
      const result = await processFiles(Array.from(files), {
        takenNames: active.assets.map((a) => a.name),
        startAt: nextClipStart(active.audio, active.assets, active.duration),
        projectDuration: active.duration,
      });
      updateProject(active.id, {
        assets: [...active.assets, ...result.assets],
        audio: [...active.audio, ...result.clips],
      });
      if (result.assets.length) {
        toast.success(
          `Прикреплено: ${result.assets.map((a) => a.name).join(", ")}. Скажите ИИ, куда их вставить.`,
          { id },
        );
      } else {
        toast.error("Не удалось прикрепить файлы", { id });
      }
      if (result.failed.length) {
        toast.warning(`Пропущены неподдерживаемые файлы: ${result.failed.join(", ")}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки файлов", { id });
    }
  };

  const removeAsset = (assetId: string) => {
    if (!active) return;
    delBlob(assetId).catch(() => {});
    forgetUrl(assetId);
    setAssetUrls(({ [assetId]: _drop, ...rest }) => rest);
    updateProject(active.id, {
      assets: active.assets.filter((a) => a.id !== assetId),
      audio: active.audio.filter((c) => c.assetId !== assetId),
    });
  };

  const addVoice = async (blob: Blob, startAt: number) => {
    if (!active) return;
    try {
      const names = active.assets.map((a) => a.name);
      let name = "voice";
      let i = 2;
      while (names.includes(name)) name = `voice-${i++}`;
      const { asset, clip } = await blobToClip(blob, name, startAt, active.duration);
      updateProject(active.id, {
        assets: [...active.assets, asset],
        audio: [...active.audio, clip],
      });
      toast.success(`Озвучка добавлена с ${clip.start.toFixed(1)}с`);
    } catch {
      toast.error("Не удалось сохранить запись");
    }
  };

  const updateClip = (clipId: string, patch: Partial<AudioClip>) => {
    if (!active) return;
    updateProject(active.id, {
      audio: active.audio.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
    });
  };

  const removeClip = (clipId: string) => {
    if (!active) return;
    updateProject(active.id, { audio: active.audio.filter((c) => c.id !== clipId) });
  };

  const toggleMuteAll = () => {
    if (!active) return;
    const anyUnmuted = active.audio.some((c) => !c.muted);
    updateProject(active.id, {
      audio: active.audio.map((c) => ({ ...c, muted: anyUnmuted })),
    });
  };

  const applySceneEdit = (newJs: string | null) => {
    if (!active || !newJs) return;
    const parsed = parseScenes(newJs);
    const total = parsed ? sceneTotal(parsed) : active.duration;
    const clamped = clampDur(total);
    updateProject(active.id, {
      scene: { ...active.scene, js: syncTotalConstants(newJs, clamped) },
      duration: clamped,
    });
    seek(Math.min(time, clamped));
  };

  const setSceneDurations = (durs: number[]) => {
    if (!active) return;
    applySceneEdit(setAllDurations(active.scene.js, durs));
  };

  const moveSceneAt = (index: number, dir: -1 | 1) => {
    if (!active) return;
    applySceneEdit(reorderScene(active.scene.js, index, dir));
  };

  const deleteSceneAt = (index: number) => {
    if (!active) return;
    applySceneEdit(removeScene(active.scene.js, index));
  };

  const splitClipAt = (clipId: string) => {
    if (!active) return;
    const clip = active.audio.find((c) => c.id === clipId);
    if (!clip) return;
    const parts = splitClip(clip, time);
    if (!parts) {
      toast.warning("Плейхед должен быть внутри клипа");
      return;
    }
    updateProject(active.id, {
      audio: active.audio.flatMap((c) => (c.id === clipId ? [parts.left, parts.right] : [c])),
    });
    toast.success("Клип разрезан");
  };

  const handleDurationChange = (d: number) => {
    if (!active) return;
    updateProject(active.id, { duration: d });
    seek(Math.min(time, d));
  };

  const selectStyle = (styleId: string | undefined) => {
    if (!active) return;
    const preset = STYLE_PRESETS.find((s) => s.id === styleId);
    if (!preset) {
      updateProject(active.id, { styleId: undefined });
      return;
    }
    const size = ASPECTS[preset.aspect]!;
    updateProject(active.id, {
      styleId: preset.id,
      aspect: preset.aspect,
      width: size.w,
      height: size.h,
      duration: preset.duration,
    });
    seek(0);
  };

  const handleExport = async () => {
    if (!active) return;
    setPlaying(false);
    setExporting(0);
    try {
      const { blob, ext } = await exportVideo(active, (p) => setExporting(p));
      download(blob, `${active.name.replace(/\s+/g, "-").toLowerCase()}.${ext}`);
      toast.success(
        active.audio.length ? "Видео со звуком готово к скачиванию" : "Видео готово к скачиванию",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка экспорта");
    } finally {
      setExporting(null);
    }
  };

  const onSceneError = useCallback((message: string) => {
    if (sceneErrorRef.current === message) return;
    sceneErrorRef.current = message;
    toast.error("Ошибка в коде сцены", { description: message.slice(0, 140) });
  }, []);

  const handleWizardCreate = async (draft: WizardDraft) => {
    setWizardOpen(false);
    // 1. Generate the prompt from the draft
    const preset = STYLE_PRESETS.find((s) => s.id === draft.styleId);
    const promptParts: string[] = [];
    if (preset) {
      promptParts.push(`Стиль: ${preset.title} — ${preset.prompt}`);
    } else if (draft.fromScratch) {
      promptParts.push("Свободный стиль — рисуй всё кодом, без шаблона.");
    }
    if (draft.title.trim()) promptParts.push(`Заголовок ролика: ${draft.title.trim()}`);
    if (draft.description.trim()) promptParts.push(`Идея: ${draft.description.trim()}`);
    if (draft.points.trim()) {
      const list = draft.points
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
      if (list.length) promptParts.push(`Ключевые пункты (покажи по очереди): ${list.join(" | ")}`);
    }
    if (draft.prompt.trim()) promptParts.push(`Дополнительно: ${draft.prompt.trim()}`);
    const finalPrompt = promptParts.join("\n");

    // 2. Attach files first (so assets exist for generation)
    let assets: Project["assets"] = [];
    let audio: Project["audio"] = [];
    if (draft.files.length) {
      const id = toast.loading(`Прикрепляю файлы (${draft.files.length})…`);
      try {
        const result = await processFiles(draft.files, {
          takenNames: [],
          startAt: 0,
          projectDuration: draft.duration || 15,
        });
        assets = result.assets;
        audio = result.clips;
        if (result.failed.length) toast.warning(`Пропущены: ${result.failed.join(", ")}`);
      } catch {
        toast.error("Не удалось прикрепить файлы");
      } finally {
        toast.dismiss(id);
      }
    }

    // 3. Create the project with assets
    const project = createProjectWith({
      name: draft.title.trim() || preset?.title || "Untitled",
      aspect: draft.aspect,
      duration: draft.duration,
      ...(draft.styleId ? { styleId: draft.styleId } : {}),
      assets,
      audio,
    });

    // 4. Kick off scene generation against the freshly-created project
    if (finalPrompt.trim()) {
      await handlePrompt(finalPrompt, project);
    }
  };

  if (!hydrated || !active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        </div>
      </div>
    );
  }

  const isNewBlank =
    active.messages.length === 0 && active.scene.js.trim() === blankScene.js.trim();
  const hints = active.suggestions.length
    ? active.suggestions
    : active.messages.length === 0
      ? STARTER_HINTS
      : [];

  const sidebarProps = {
    projects,
    activeId,
    onSelect: setActiveId,
    onCreate: () => setWizardOpen(true),
    onDelete: deleteProject,
    onDuplicate: duplicateProject,
    onRename: (id: string, name: string) => updateProject(id, { name }),
    onOpenProjects: () => setSettingsOpen(true),
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Toaster position="top-center" theme="dark" richColors />

      {/* Sidebar */}
      <div className="hidden h-screen lg:block">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile sidebar overlay */}
      {navOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full w-[300px] max-w-[85vw] bg-sidebar">
            <Sidebar {...sidebarProps} onClose={() => setNavOpen(false)} />
          </div>
          <button
            aria-label="Закрыть меню"
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
          />
        </div>
      ) : null}

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border/30 px-4 py-3 sm:px-8">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Меню проектов"
            className="rounded-full p-2 transition-colors hover:bg-surface-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate font-display text-lg font-semibold lg:hidden">{active.name}</h1>
          <span className="ml-2 hidden rounded-full border border-border/60 bg-surface-2/30 px-3 py-1 text-xs tabular-nums text-muted-foreground sm:inline">
            {active.width}×{active.height} · {active.fps} fps ·{" "}
            {active.duration.toFixed(active.duration % 1 ? 1 : 0)}с
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={handleExport}
              disabled={exporting !== null}
              className="flex items-center gap-2 rounded-full border border-border/60 bg-surface-2/30 px-4 py-2 text-sm font-medium transition-all hover:bg-surface-2 disabled:opacity-50"
            >
              {exporting !== null ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="tabular-nums">{Math.round(exporting * 100)}%</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Экспорт
                </>
              )}
            </button>
            <button
              onClick={() => setCodeOpen(true)}
              aria-label="Редактор кода"
              title="Код сцены"
              className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <Code2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Настройки"
              className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={() =>
                setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))
              }
              aria-label="Сменить тему"
              className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {settings.theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>
            <div className="ml-1 h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-[var(--accent)] to-surface-2 ring-1 ring-border/50" />
          </div>
        </header>

        {/* Editor area */}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 pb-10 sm:px-8">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <Preview
                project={active}
                playing={playing}
                time={time}
                seekToken={seekToken}
                onTime={setTime}
                assetUrls={assetUrls}
                onError={onSceneError}
                onTogglePlay={() => setPlaying((p) => !p)}
              />
            </div>
            <div className="hidden h-[300px] w-[200px] flex-shrink-0 overflow-hidden rounded-2xl border border-border/30 bg-surface/60 backdrop-blur-sm sm:block">
              <Library
                assets={active.assets}
                assetUrls={assetUrls}
                onRemove={removeAsset}
                onAttach={handleAttach}
              />
            </div>
          </div>

          <PlaybackBar
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
            time={time}
            duration={active.duration}
            onSeek={seek}
            onDurationChange={handleDurationChange}
            onOpenInspector={() => setInspectorOpen(true)}
          />

          <Timeline
            project={active}
            time={time}
            onSeek={seek}
            onUpdateClip={updateClip}
            onRemoveClip={removeClip}
            onToggleMuteAll={toggleMuteAll}
            onAddAudioFiles={handleAttach}
            onAddVoice={addVoice}
            onSplitClip={splitClipAt}
            onSetSceneDurations={setSceneDurations}
            onMoveScene={moveSceneAt}
            onDeleteScene={deleteSceneAt}
          />

          <div className="mt-auto pt-4">
            <PromptBar
              settings={settings}
              setSettings={setSettings}
              onSubmit={handlePrompt}
              busy={busy}
              suggestions={hints}
              assets={active.assets}
              onAttach={handleAttach}
              onRemoveAsset={removeAsset}
              above={
                isNewBlank ? (
                  <StylePicker selectedId={active.styleId} onSelect={selectStyle} />
                ) : undefined
              }
            />
          </div>
        </div>
      </main>

      {/* Export progress overlay */}
      {exporting !== null ? (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-4 px-5 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
              <div className="flex-1">
                <p className="text-sm font-medium">Экспорт видео…</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {Math.round(exporting * 100)}% — это может занять несколько минут
                </p>
              </div>
            </div>
            <div className="h-1 bg-track">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${exporting * 100}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Dialogs */}
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
      <Inspector
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        project={active}
        onChange={(config: ConfigMap) => updateProject(active.id, { config })}
      />
      <CreationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        settings={settings}
        onCreate={handleWizardCreate}
      />
    </div>
  );
}
