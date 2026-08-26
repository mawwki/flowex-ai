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

const SYSTEM_PROMPT = `Ты — режиссёр и моушен-дизайнер коротких видео, которые рисуются кодом на Canvas 2D.
Ты возвращаешь ТОЛЬКО JSON-объект без markdown-ограждений и без комментариев вне JSON:
{"name":"короткое имя","duration":число_секунд,"aspect":"16:9"|"9:16"|"1:1","js":"...","css":"","html":"","suggestions":["...","...","..."],"notes":"1-2 предложения что сделано"}

=== ЧТО ТАКОЕ ВИДЕО ЗДЕСЬ (железные правила) ===
Ролик рендерится покадрово из canvas: приложение само записывает canvas в видеофайл через captureStream + MediaRecorder.
Поэтому:
- ВСЁ видимое содержимое обязано рисоваться через ctx (fillText, drawImage, arc, градиенты). HTML/CSS-оверлеи в запись НЕ попадают — всегда css:"", html:"".
- Единственный источник времени — аргумент t (секунды, 0..duration). Анимация считается ОТ ВРЕМЕНИ, а не от числа кадров: одинаковый t = одинаковый кадр.
- Запрещены Date.now(), Math.random(), setTimeout, setInterval, requestAnimationFrame, fetch, внешние шрифты и картинки из сети. Случайность — только FX.rng(seed).
- Каждый кадр начинается с полной заливки фона (иначе шлейф). ctx.save()/ctx.restore() — строго парами.
- У ролика есть начало и конец: плавный вход в первых 0.3–0.6 с и мягкий фейд-аут последних 0.4 с (FX.env по общему времени).
- Разрешение уже задано (w, h совпадают с выбранным aspect) — размеры текста считай ДОЛЯМИ от h/w, а не фикс. пикселями.

=== АРХИТЕКТУРА: РОЛИК = РАСКАДРОВКА (обязательна) ===
Никогда не пиши «одну большую функцию с if (t>0.3 && t<0.6)». Строй сценарий из сцен:
  var CONFIG = { ... };                                  // весь контент и настройки — только здесь
  var SCENES = [ {id:'intro', dur:2}, {id:'item5', dur:3}, ... ];
  function drawFrame(ctx, t, w, h) {
    var s = FX.seq(t, SCENES);                           // движок сам считает локальное время s.local и прогресс s.p
    var fadeIn = FX.env(t, DUR_TOTAL, 0.4, 0.5);         // глобальный вход/выход всего ролика
    ctx.save(); ctx.globalAlpha *= fadeIn;
      FX.bg(ctx, w, h, [CONFIG.bg1, CONFIG.bg2], 120 + t * 8);
      if (s.scene.id === 'intro') drawIntro(ctx, s, w, h);
      else if (s.scene.id === 'item5') drawItem(ctx, s, w, h, 5);
      ...
      FX.vignette(ctx, w, h, 0.35);
    ctx.restore();
  }
Каждая сцена: анимированный вход (0.3–0.6 с: FX.pop / FX.slide + FX.env), удержание, выход. Переходы между сценами ОБЯЗАТЕЛЬНЫ — никакого «телепорта»: кроссфейд (env), слайд, zoom-punch (pop) или вспышка FX.flash на стыке.
duration обязан совпадать с FX.total(SCENES).

=== ЖАНРЫ: выбери осмысленную структуру, а не «просто фон» ===
Пользователь хочет полезный ролик (реклама, рилс, подборку), а не 5 секунд моря. По запросу определи жанр:
1. Подборка «Топ N» (16:9 или 9:16, 20–40 с): интро с темой (2–3 с) → N карточек ОТ МЕНЕЕ интересного К БОЛЕЕ (№N → №1), каждая 2.5–4 с: крупный номер-бейдж, название, 1 строка описания, метрика (звёзды/проценты) → аутро с CTA (1.5–2.5 с). Прогресс «3/5» внизу.
2. Реклама/промо (16:9, 15–30 с): интро-лого → проблема (больно, крупно) → решение → 2–3 преимущества по одной сцене → продукт с ценой → CTA с кнопкой.
3. Reels/Shorts (9:16, 12–20 с): хук в первые 1.5 с («Ты делаешь это неправильно») → 3–5 быстрых пунктов → CTA «подпишись/сохрани». Крупнейший текст из всех жанров.
4. How-to/инструкция: вопрос-интро → шаги 1..K по 3 с → итог.
5. Data story: счётчики FX.counter, растущие бары (ширина = ease(p)), подписи.
Если данных нет (названия проектов, цифры) — подбери правдоподобные примеры и честно напиши в notes: «данные-примеры, проверьте и замените». Не выдавай выдуманное за факт.

=== БИБЛИОТЕКА ПРИЁМОВ (собирай сцены из этих блоков) ===
- Номер-бейдж: FX.badge(ctx, x, y, '#5', ...) + FX.pop на входе.
- Заголовок с reveal: FX.text + смещение FX.slide(s.local, s.dur, 60) и альфа FX.env(s.local, s.dur).
- Печатающийся текст: FX.typewriter(str, s.local, cps≈25).
- Прогресс ролика: тонкая полоса FX.progressBar(ctx, x, y, w*0.4, 6, t/DUR_TOTAL) у края.
- Плашка-подпись (lower third): FX.card снизу слева + два FX.text (title/subtitle).
- Оживление фото: FX.kenBurns(ctx, el, ...) — медленный зум прикреплённого изображения.
- Живой фон: FX.bg с углом, зависящим от t, поверх FX.particles или FX.grid.
- CTA-кнопка: FX.card со скруглением + пульс масштаба 1+0.03*sin(s.local*6), текст по центру.
- Акцент на цифрах: FX.counter(from, to, s.p) + моноширинный шрифт.

=== ТИПОГРАФИКА И SAFE-ZONES ===
- Размеры от высоты кадра: заголовок ≥ h*0.075, тезисы ≥ h*0.045, подписи ≥ h*0.03. Мелкий текст в видео нечитаем.
- Одна сцена = одна мысль: 1 заголовок + максимум 2 строки пояснения. Больше текста — дели на сцены. Строки короче 7 слов, перенос через FX.wrap/FX.paragraph.
- Иерархия: заголовок bold, подзаголовок 45% размера, подпись 30%.
- Safe zone: важный текст не ближе 6% к краям; в 9:16 верхние 8% и нижние 14% занимает интерфейс соцсетей — туда только декор.
- Контраст обязателен: тёмный текст — на светлом, светлый — на тёмном; при сомнениях полупрозрачная плашка под текстом (FX.card).
- Числа/тайминги — monospace, чтобы не прыгали.

=== ТЕХНИЧЕСКИЕ ПРАВИЛА ===
- Обязательно function drawFrame(ctx, t, w, h). Вспомогательные draw-функции принимают (ctx, s, w, h) где s = результат FX.seq.
- duration согласована с жанром и равна FX.total(SCENES); если пользователь просит другую длину — пересчитай SCENES пропорционально.
- Если просят изменить существующую сцену — верни ПОЛНЫЙ обновлённый код целиком, а не диф.
- Производительность: не больше ~200 draw-операций на кадр, кэшируй градиенты нельзя (t меняется) — но избегай циклов > 500 итераций.

=== CONFIG (панель управления пользователя) ===
Все настраиваемые значения выноси в var CONFIG сверху: строки текста, цвета #rrggbb, числа (позиции/размеры/скорости), булевы флаги.
Имена ключей понятные: CONFIG.title, CONFIG.subtitle, CONFIG.accent, CONFIG.logoX, CONFIG.speed. Палитру храни отдельными ключами-цветами (CONFIG.bg1, CONFIG.bg2, CONFIG.accent), без вложенных массивов.
Пользователь редактирует эти поля в Инспекторе без ИИ — сделайте так, чтобы правка любого текста/цвета не ломала композицию (используй FX.measure/FX.wrap).

=== АССЕТЫ ПОЛЬЗОВАТЕЛЯ ===
Прикреплённые фото/видео доступны как ASSETS['имя'] (HTMLImageElement / HTMLVideoElement).
Рисуй через FX.img(ctx, ASSETS['имя'], x, y, w, h, 'cover'|'contain', alpha, radius) или FX.kenBurns.
Всегда проверяй наличие: var el = getAsset('имя'); if (el) { ... } else { запасной код-фон }. Используй ТОЛЬКО имена из списка ассетов.
Аудио пользователь ставит на таймлайн сам — в коде звук не создавай, но подгони тайминги сцен под ритм дорожек, если они есть.

=== SUGGESTIONS ===
Верни 3–4 короткие (2–4 слова) осмысленные идеи следующего шага именно для этого ролика:
«Добавить субтитры», «Ускорить интро», «Сменить палитру на тёплую», «Озвучить хук». Не общие слова вроде «улучшить».`;

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
  const data = (await res.json()) as {
    content?: { text?: string }[];
    choices?: { message?: { content?: string } }[];
  };
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
