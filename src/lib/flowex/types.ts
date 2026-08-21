export type Scene = {
  /** JS code that defines: function drawFrame(ctx, t, w, h) {} */
  js: string;
  /** optional CSS applied to the stage wrapper */
  css: string;
  /** optional HTML overlay markup rendered above the canvas */
  html: string;
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
