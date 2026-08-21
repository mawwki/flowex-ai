import type { ProviderId, Settings } from "./types";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  baseUrl: string;
  models: string[];
  keyHint: string;
  keyUrl?: string;
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "z-ai/glm-5.2:free",
      "deepseek/deepseek-chat-v3.1:free",
      "qwen/qwen3-coder:free",
      "google/gemini-2.5-flash",
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-5-mini",
    ],
    keyHint: "sk-or-...",
    keyUrl: "https://openrouter.ai/keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"],
    keyHint: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
    ],
    keyHint: "AIza...",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    models: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "codestral-latest",
    ],
    keyHint: "...",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-haiku-4-5"],
    keyHint: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "qwen/qwen3-32b", "moonshotai/kimi-k2-instruct"],
    keyHint: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyHint: "sk-...",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "ollama",
    label: "Ollama (локально)",
    baseUrl: "http://localhost:11434/v1",
    models: ["qwen2.5-coder:7b", "llama3.1:8b", "deepseek-coder-v2"],
    keyHint: "не требуется",
  },
  {
    id: "custom",
    label: "Свой (OpenAI-совместимый)",
    baseUrl: "",
    models: ["custom-model"],
    keyHint: "любой ключ",
  },
];

export function getProvider(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]!;
}

export function modelsFor(settings: Settings, id: ProviderId): string[] {
  const extra = settings.customModels[id] ?? [];
  return [...getProvider(id).models, ...extra];
}

const SYSTEM_PROMPT = `Ты — генератор анимационных видео на чистом коде (HTML/CSS/JS Canvas 2D).
Тебе дают описание сцены. Ты возвращаешь ТОЛЬКО JSON-объект без markdown-ограждений:
{"name":"короткое имя проекта","duration":число_секунд,"js":"...","css":"...","html":"..."}

Правила для js:
- Обязательно определи функцию: function drawFrame(ctx, t, w, h) { ... }
  где t — время в секундах от 0 до duration, w/h — размеры канваса.
- Функция должна быть детерминированной: один и тот же t всегда даёт один и тот же кадр.
  Нельзя использовать Date.now(), Math.random() без сида, requestAnimationFrame, setTimeout.
- Всегда заливай фон в начале кадра.
- Можно определять вспомогательные функции и константы вне drawFrame.
- Никаких внешних ресурсов, картинок и шрифтов из сети. Только Canvas 2D API и системные шрифты.
- Делай красивую, плавную, кинематографичную анимацию: градиенты, частицы, easing, типографика.

css — стили для контейнера сцены (может быть пустым). html — HTML-оверлей над канвасом (может быть пустым).
Если пользователь просит изменить существующую сцену — верни ПОЛНЫЙ обновлённый код, а не патч.`;

export type GenResult = {
  name?: string;
  duration?: number;
  js: string;
  css: string;
  html: string;
};

function extractJson(text: string): GenResult {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1]!.trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  const parsed = JSON.parse(s) as GenResult;
  if (!parsed.js || !/function\s+drawFrame/.test(parsed.js)) {
    throw new Error("Модель не вернула функцию drawFrame");
  }
  return { ...parsed, css: parsed.css ?? "", html: parsed.html ?? "" };
}

export async function generateScene(opts: {
  settings: Settings;
  prompt: string;
  currentJs?: string;
  duration: number;
}): Promise<GenResult> {
  const { settings, prompt, currentJs, duration } = opts;
  const provider = getProvider(settings.provider);
  const baseUrl =
    settings.provider === "custom" ? settings.customBaseUrl.replace(/\/$/, "") : provider.baseUrl;
  const key = settings.apiKeys[settings.provider]?.trim();

  if (!baseUrl) throw new Error("Не указан Base URL провайдера");
  if (!key && settings.provider !== "ollama") {
    throw new Error(`Добавьте API-ключ для ${provider.label} в настройках`);
  }

  const userContent = currentJs
    ? `Текущий код сцены:\n\n${currentJs}\n\nДлительность: ${duration} сек.\nЗапрос пользователя: ${prompt}`
    : `Длительность: ${duration} сек.\nЗапрос пользователя: ${prompt}`;

  const isAnthropic = settings.provider === "anthropic";
  const url = isAnthropic ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isAnthropic) {
    headers["x-api-key"] = key!;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  } else if (key) {
    headers["Authorization"] = `Bearer ${key}`;
  }

  const body = isAnthropic
    ? {
        model: settings.model,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }
    : {
        model: settings.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      };

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${provider.label} ${res.status}: ${txt.slice(0, 300) || res.statusText}`);
  }
  const data = (await res.json()) as any;
  const text: string = isAnthropic
    ? (data.content?.[0]?.text ?? "")
    : (data.choices?.[0]?.message?.content ?? "");
  if (!text) throw new Error("Пустой ответ модели");
  return extractJson(text);
}
