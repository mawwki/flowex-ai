export type Scene = {
  /** JS code that defines: function drawFrame(ctx, t, w, h) {} plus optional CONFIG / SCENES */
  js: string;
  /** optional CSS applied to the stage wrapper */
  css: string;
  /** optional HTML overlay markup rendered above the canvas */
  html: string;
};

export type AssetKind = "image" | "video" | "audio" | "model" | "texture" | "animation";

export type Asset = {
  id: string;
  kind: AssetKind;
  /** short slug the scene code uses: ASSETS.logo */
  name: string;
  fileName: string;
  mime: string;
  /** seconds, for audio/video */
  duration?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  addedAt: number;
};

export type AudioClip = {
  id: string;
  assetId: string;
  name: string;
  /** start time on the timeline, seconds */
  start: number;
  volume: number;
  muted: boolean;
  /** voiceover recorded in the app */
  voice?: boolean | undefined;
  /** seconds skipped from the beginning of the source file */
  offset?: number | undefined;
  /** clip length on the timeline; defaults to the whole source */
  length?: number | undefined;
  /** playback speed multiplier */
  speed?: number | undefined;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
};

export type ListElementKind = "text" | "image" | "shape";

export type SceneElement = {
  id: string;
  kind: ListElementKind;
  /** positional layout in canvas units (0..1 relative) */
  x: number; // relative center x (0..1)
  y: number; // relative center y (0..1)
  w: number; // relative width (0..1)
  h: number; // relative height (0..1)
  rotation: number; // degrees
  z: number; // stacking order
  /** text */
  text?: string;
  fontSize?: number; // px in canvas units
  color?: string;
  fontFamily?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  /** image */
  assetId?: string;
  objectFit?: "cover" | "contain";
  /** shape */
  shape?: "rect" | "circle" | "triangle";
  fill?: string;
  radius?: number; // border radius (0..1)
  opacity?: number;
  visible?: boolean;
  lock?: boolean;
};

export type Project = {
  id: string;
  name: string;
  duration: number; // seconds
  fps: number;
  width: number;
  height: number;
  quality: string; // label e.g. "4K HDR"
  /** aspect preset id: "16:9" | "9:16" | "1:1" */
  aspect: string;
  scene: Scene;
  /** user overrides applied over the scene CONFIG */
  config: Record<string, string | number | boolean>;
  /** user-managed overlay elements (drag & drop / inspector) */
  elements: SceneElement[];
  assets: Asset[];
  audio: AudioClip[];
  /** AI-authored follow-up ideas shown above the prompt bar */
  suggestions: string[];
  styleId?: string | undefined;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export type ProviderId =
  | "openrouter"
  | "openai"
  | "gemini"
  | "mistral"
  | "anthropic"
  | "groq"
  | "deepseek"
  | "ollama"
  | "custom";

export type Settings = {
  provider: ProviderId;
  model: string;
  apiKeys: Partial<Record<ProviderId, string>>;
  customBaseUrl: string;
  customModels: Partial<Record<ProviderId, string[]>>;
  theme: "dark" | "light";
  accent: string;
  autoPlay: boolean;
};
