import type { Asset, AudioClip, ProviderId, Settings } from "./types";
import { FX_DOCS } from "./fx";

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
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
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

const SYSTEM_PROMPT = `Ты — режиссёр и разработчик коротких видео, которые рисуются кодом на Canvas 2D.
Ты возвращаешь ТОЛЬКО JSON-объект без markdown-ограждений и без комментариев вне JSON:
{"name":"короткое имя","duration":число_секунд,"aspect":"16:9"|"9:16"|"1:1","js":"...","css":"...","html":"...","suggestions":["...","...","..."],"notes":"1-2 предложения что сделано"}

=== АРХИТЕКТУРА РОЛИКА (обязательна) ===
Ролик — это раскадровка, а не один бесконечный фон. Всегда строй код так:
  var CONFIG = { ... };                 // все тексты, цвета, тайминги — только здесь
  var SCENES = [ {id:'hook', dur:2.5}, {id:'item1', dur:4}, ... ];
  function drawFrame(ctx, t, w, h) {
    var s = FX.seq(t, SCENES);
    FX.bg(ctx, w, h, CONFIG.palette, 120);        // фон каждый кадр
    if (s.scene.id === 'hook') drawHook(ctx, s, w, h);
    ...
    FX.vignette(ctx, w, h, 0.4);
  }
Каждая сцена: вход (0.3–0.6 с), удержание, выход. Используй FX.env / FX.slide / FX.pop
для анимации входа-выхода и FX.flash на стыках — переходы обязательны, без «телепорта».

=== ЖАНРЫ И ТАЙМИНГ ===
- Reels/Shorts (9:16, 12–20 с): хук в первые 1.5 с, 3–5 быстрых сцен, крупный текст (size ≈ h/12), CTA в конце.
- Реклама (16:9, 15–30 с): логотип/интро → проблема → 3 преимущества → продукт → CTA.
- Подборка «Топ N» (20–40 с): интро → N карточек с номером, названием, описанием и метрикой → аутро.
- Data story: счётчики FX.counter, растущие бары, подписи.
Не делай «просто море 5 секунд» — всегда осмысленный контент со структурой и текстом.

=== ТИПОГРАФИКА И КОМПОЗИЦИЯ ===
- Безопасные поля: не ближе 6% от края (в 9:16 снизу оставляй 16% под интерфейс).
- Не более 7 слов в строке, используй FX.wrap / FX.paragraph, чтобы текст не вылезал.
- Иерархия: заголовок (bold, крупно), подзаголовок (0.45 от заголовка), подпись (0.3).
- Числа и счётчики — моноширинным или tabular-стилем, чтобы не «прыгали».

=== ТЕХНИЧЕСКИЕ ПРАВИЛА ===
- Обязательно function drawFrame(ctx, t, w, h). t в секундах, 0..duration.
- Детерминированно: никакого Date.now(), Math.random() (только FX.rng(seed)), setTimeout, requestAnimationFrame, fetch.
- Никаких внешних ресурсов и шрифтов из сети. Только системные шрифты и FX.
- Заливай фон в начале каждого кадра, сбрасывай ctx.save()/ctx.restore() парами.
- duration должен совпадать с FX.total(SCENES).
- Если просят изменить существующую сцену — верни ПОЛНЫЙ обновлённый код целиком.

=== CONFIG (панель управления пользователя) ===
Все настраиваемые значения выноси в var CONFIG сверху: строки текста, цвета в формате #rrggbb,
числа (позиции, размеры, скорости), булевы флаги. Пользователь редактирует CONFIG в UI,
поэтому имена ключей должны быть понятными: CONFIG.title, CONFIG.accent, CONFIG.logoX и т.п.
Палитру храни как отдельные ключи-цвета (CONFIG.bg1, CONFIG.bg2, CONFIG.accent), а не как вложенный массив.

=== АССЕТЫ ПОЛЬЗОВАТЕЛЯ ===
Прикреплённые фото и видео доступны как ASSETS['имя'] (HTMLImageElement / HTMLVideoElement).
Рисуй их через FX.img(ctx, ASSETS['имя'], x, y, w, h, 'cover', alpha, radius) или FX.kenBurns.
Всегда проверяй наличие: var el = getAsset('имя'); if (el) {...}. Не выдумывай имена, которых нет в списке.
Аудио пользователь ставит на таймлайн сам — в коде звук не трогай, но учитывай тайминг закадрового текста.

=== SUGGESTIONS ===
В поле suggestions верни 3–4 коротких (2–4 слова) осмысленных идеи следующего шага именно для этого ролика,
например «Добавить субтитры», «Ускорить интро», «Сменить палитру на тёплую».

css — стили контейнера (обычно ""). html — HTML-оверлей (обычно "").`;

export type GenResult = {
  name?: string;
  duration?: number;
  aspect?: string;
  js: string;
  css: string;
  html: string;
  suggestions?: string[];
  notes?: string;
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

type ChatOpts = { settings: Settings; system: string; user: string; maxTokens?: number };

async function chat({ settings, system, user, maxTokens = 8000 }: ChatOpts): Promise<string> {
  const provider = getProvider(settings.provider);
  const baseUrl =
    settings.provider === "custom" ? settings.customBaseUrl.replace(/\/$/, "") : provider.baseUrl;
  const key = settings.apiKeys[settings.provider]?.trim();

  if (!baseUrl) throw new Error("Не указан Base URL провайдера");
  if (!key && settings.provider !== "ollama") {
    throw new Error(`Добавьте API-ключ для ${provider.label} в настройках`);
  }

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
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }
    : {
        model: settings.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
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
  return text;
}

export async function generateScene(opts: {
  settings: Settings;
  prompt: string;
  currentJs?: string;
  duration: number;
  aspect: string;
  assets?: Asset[];
  audio?: AudioClip[];
}): Promise<GenResult> {
  const { settings, prompt, currentJs, duration, aspect, assets = [], audio = [] } = opts;

  const media = assets.filter((a) => a.kind !== "audio");
  const assetLine = media.length
    ? `Доступные ассеты (ASSETS['имя']): ${media
        .map((a) => `'${a.name}' — ${a.kind}, файл ${a.fileName}`)
        .join("; ")}`
    : "Ассетов пользователь не прикрепил — рисуй всё кодом.";
  const audioLine = audio.length
    ? `Аудиодорожки на таймлайне: ${audio
        .map((c) => `${c.name} с ${c.start.toFixed(1)}с`)
        .join("; ")}. Синхронизируй смену сцен с этим ритмом.`
    : "";

  const userContent = [
    currentJs ? `Текущий код сцены:\n\n${currentJs}` : "Новый проект, кода ещё нет.",
    `Текущая длительность: ${duration} сек. Формат кадра: ${aspect}.`,
    assetLine,
    audioLine,
    `Запрос пользователя: ${prompt}`,
    "Если для запроса нужна другая длительность — верни новое значение duration и согласованный SCENES.",
  ]
    .filter(Boolean)
    .join("\n");

  return extractJson(
    await chat({ settings, system: `${SYSTEM_PROMPT}\n\n${FX_DOCS}`, user: userContent }),
  );
}

/** Asks the model for short follow-up prompt ideas for the current scene. */
export async function generateSuggestions(opts: {
  settings: Settings;
  js: string;
  prompt?: string;
}): Promise<string[]> {
  const text = await chat({
    settings: opts.settings,
    system:
      "Ты помощник видеоредактора. Верни ТОЛЬКО JSON-массив из 4 строк — коротких (2–4 слова) идей следующего улучшения ролика на русском. Без пояснений.",
    user: `Код текущего ролика:\n${opts.js.slice(0, 4000)}\n\nПоследний запрос: ${opts.prompt ?? "—"}`,
    maxTokens: 300,
  });
  try {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    const arr = JSON.parse(text.slice(start, end + 1)) as unknown[];
    return arr.filter((x): x is string => typeof x === "string").slice(0, 4);
  } catch {
    return [];
  }
}

