export type Scene = {
  /** JS code that defines: function drawFrame(ctx, t, w, h) {} or const SCENES = [...] */
  js: string;
  /** optional CSS applied to the stage wrapper */
  css: string;
  /** optional HTML overlay markup rendered above the canvas */
  html: string;
};

export type AssetKind = "image" | "video" | "audio";

export type Asset = {
  id: string;
  kind: AssetKind;
  name: string;
  mime: string;
  /** seconds, for audio/video */
  duration?: number;
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
};

export type Project = {
  id: string;
  name: string;
  duration: number; // seconds
  fps: number;
  width: number;
  height: number;
  quality: string; // label e.g. "4K HDR"
  scene: Scene;
  assets: Asset[];
  audio: AudioClip[];
  suggestions: string[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
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
