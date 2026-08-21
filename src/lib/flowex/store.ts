import { useCallback, useEffect, useState } from "react";
import type { Project, Settings } from "./types";
import { blankScene, citySkyline, mountainSunset, oceanWaves } from "./scenes";

const P_KEY = "flowex.projects.v1";
const S_KEY = "flowex.settings.v1";
const A_KEY = "flowex.active.v1";

export const uid = () => Math.random().toString(36).slice(2, 10);

function makeProject(
  name: string,
  duration: number,
  quality: string,
  scene: Project["scene"],
): Project {
  return {
    id: uid(),
    name,
    duration,
    fps: 30,
    width: 1280,
    height: 720,
    quality,
    scene,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
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

export const newProject = () => makeProject("Untitled", 8, "1080p", blankScene);

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
      list = raw ? (JSON.parse(raw) as Project[]) : [];
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
    deleteProject,
    duplicateProject,
  };
}
