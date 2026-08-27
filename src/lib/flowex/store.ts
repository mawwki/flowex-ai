import { useCallback, useEffect, useState } from "react";
import type { Project, Settings } from "./types";
import { blankScene, citySkyline, mountainSunset, oceanWaves } from "./scenes";
import { STYLE_PRESETS as STYLE_PRESETS2 } from "./styles";

const P_KEY = "flowex.projects.v1";
const S_KEY = "flowex.settings.v1";
const A_KEY = "flowex.active.v1";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const ASPECTS: Record<string, { w: number; h: number; label: string }> = {
  "16:9": { w: 1280, h: 720, label: "16:9 — YouTube" },
  "9:16": { w: 720, h: 1280, label: "9:16 — Reels / Shorts" },
  "1:1": { w: 1024, h: 1024, label: "1:1 — квадрат" },
};

function makeProject(
  name: string,
  duration: number,
  quality: string,
  scene: Project["scene"],
  aspect: keyof typeof ASPECTS | string = "16:9",
): Project {
  const size = ASPECTS[aspect] ?? ASPECTS["16:9"]!;
  return {
    id: uid(),
    name,
    duration,
    fps: 30,
    width: size.w,
    height: size.h,
    quality,
    aspect,
    scene,
    config: {},
    assets: [],
    audio: [],
    suggestions: [],
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Fills in fields missing from projects saved by older versions. */
function normalize(p: Partial<Project>): Project {
  const aspect = p.aspect ?? "16:9";
  const size = ASPECTS[aspect] ?? ASPECTS["16:9"]!;
  const duration = p.duration ?? 8;
  const assets = p.assets ?? [];
  const audio = (p.audio ?? []).map((c) => {
    const src = assets.find((x) => x.id === c.assetId);
    const sourceLen = Math.max(0.3, src?.duration && src.duration > 0 ? src.duration : duration);
    const offset = c.offset ?? 0;
    return {
      id: c.id,
      assetId: c.assetId,
      name: c.name,
      start: c.start ?? 0,
      volume: c.volume ?? 1,
      muted: !!c.muted,
      voice: c.voice,
      offset,
      speed: c.speed && c.speed > 0 ? c.speed : 1,
      length:
        c.length && c.length > 0
          ? c.length
          : Math.max(0.3, Math.min(sourceLen - offset, Math.max(0.3, duration - (c.start ?? 0)))),
    };
  });
  return {
    id: p.id ?? uid(),
    name: p.name ?? "Untitled",
    duration,
    fps: p.fps ?? 30,
    width: p.width ?? size.w,
    height: p.height ?? size.h,
    quality: p.quality ?? "1080p",
    aspect,
    scene: p.scene ?? blankScene,
    config: p.config ?? {},
    assets,
    audio,
    suggestions: p.suggestions ?? [],
    styleId: p.styleId,
    messages: p.messages ?? [],
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: p.updatedAt ?? Date.now(),
  };
}

export function defaultProjects(): Project[] {
  return [
    makeProject("Mountain Sunset", 15, "4K HDR", mountainSunset),
    makeProject("City Skyline", 30, "1080p", citySkyline),
    makeProject("Ocean Waves", 10, "4K RAW", oceanWaves),
  ];
}

export const defaultSettings: Settings = {
  provider: "openrouter",
  model: "z-ai/glm-5.2:free",
  apiKeys: {},
  customBaseUrl: "",
  customModels: {},
  theme: "dark",
  accent: "violet",
  autoPlay: false,
};

export const newProject = () => makeProject("Untitled", 15, "1080p", blankScene);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...(fallback as object), ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useFlowexStore() {
  const [hydrated, setHydrated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    let list: Project[] = [];
    try {
      const raw = localStorage.getItem(P_KEY);
      list = raw ? (JSON.parse(raw) as Project[]).map(normalize) : [];
    } catch {
      list = [];
    }
    if (!list.length) list = defaultProjects();
    const stored = localStorage.getItem(A_KEY);
    setProjects(list);
    setActiveId(stored && list.some((p) => p.id === stored) ? stored : list[0]!.id);
    setSettings(read<Settings>(S_KEY, defaultSettings));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(P_KEY, JSON.stringify(projects));
  }, [projects, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(S_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);
  useEffect(() => {
    if (hydrated && activeId) localStorage.setItem(A_KEY, activeId);
  }, [activeId, hydrated]);

  const active = projects.find((p) => p.id === activeId) ?? null;

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
    );
  }, []);

  const createProject = useCallback(() => {
    const p = newProject();
    setProjects((prev) => [p, ...prev]);
    setActiveId(p.id);
    return p;
  }, []);

  /** Creates a project with an explicit style preset / aspect / duration. */
  const createProjectWith = useCallback(
    (opts: {
      name?: string;
      aspect?: string;
      duration?: number;
      styleId?: string;
      assets?: Project["assets"];
      audio?: Project["audio"];
    }) => {
      const preset = opts.styleId ? STYLE_PRESETS2.find((s) => s.id === opts.styleId) : undefined;
      const aspect = (opts.aspect ?? preset?.aspect ?? "16:9") as keyof typeof ASPECTS | string;
      const size = ASPECTS[aspect] ?? ASPECTS["16:9"]!;
      const duration = opts.duration ?? preset?.duration ?? 15;
      const p: Project = {
        id: uid(),
        name: opts.name?.trim() || (preset ? preset.title : "Untitled"),
        duration,
        fps: 30,
        width: size.w,
        height: size.h,
        quality: "1080p",
        aspect,
        scene: blankScene,
        config: {},
        assets: opts.assets ?? [],
        audio: opts.audio ?? [],
        suggestions: [],
        styleId: opts.styleId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setProjects((prev) => [p, ...prev]);
      setActiveId(p.id);
      return p;
    },
    [],
  );

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const list = next.length ? next : defaultProjects();
      setActiveId((cur) => (cur === id ? list[0]!.id : cur));
      return list;
    });
  }, []);

  const duplicateProject = useCallback((id: string) => {
    setProjects((prev) => {
      const src = prev.find((p) => p.id === id);
      if (!src) return prev;
      const copy: Project = {
        ...src,
        id: uid(),
        name: `${src.name} copy`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setActiveId(copy.id);
      return [copy, ...prev];
    });
  }, []);

  return {
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
  };
}
