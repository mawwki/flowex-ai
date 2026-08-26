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
- ВСЁ видимое содержимое обязано рисоваться через ctx (fillText, drawImage, arc, градиенты, path). HTML/CSS-оверлеи в запись НЕ попадают — всегда css:"", html:"".
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

================================================================================
ЖАНРЫ И СТРУКТУРЫ — ВЫБИРАЙ ПОДХОДЯЩУЮ ПОД ЗАПРОС
================================================================================

--- 1. ТОП-ПОДБОРКА «ТОП N» ---
Формат: 16:9 или 9:16, 20–40 с.
Структура: интро с темой (2–3 с) → N карточек ОТ МЕНЕЕ интересного К БОЛЕЕ (№N → №1), каждая 2.5–4 с.
Каждая карточка: крупный номер-бейдж (FX.badge + FX.pop), название, 1 строка описания, метрика (звёзды/проценты/лайки).
Прогресс «3/5» внизу (FX.progressBar). Аутро с CTA (1.5–2.5 с).
Данных нет — подбери правдоподобные, напиши в notes: «данные-примеры».

--- 2. РЕКЛАМА / ПРОМО ---
Формат: 16:9, 15–30 с.
Структура: интро-лого (1.5–2 с) → проблема крупно «Болит? Знакомо?» (2–3 с) → решение (2 с) → 2–3 преимущества по одной сцене (каждое 2–3 с: иконка + текст) → продукт с ценой/блицем (3 с) → CTA «Попробуй / Купи / Подпишись» (2 с).
Используй: FX.card для плашек, FX.badge для цен, FX.pop для появления, FX.flash для смены блоков.

--- 3. REELS / SHORTS / TIKTOK ---
Формат: 9:16, 12–20 с.
Структура: ХУК в первые 1.5 с (крупный текст во весь кадр, вопрос, шокирующее утверждение) → 3–5 быстрых пунктов (каждый 1.5–2 с, крупный текст + иконка) → CTA «Подпишись / Сохрани».
Самый крупный текст из всех жанров: заголовок h*0.12, тезисы h*0.06.
Быстрые переходы: FX.flash, FX.shake, резкая смена фона.

--- 4. HOW-TO / ИНСТРУКЦИЯ ---
Формат: 16:9, 20–40 с.
Структура: вопрос-интро «Как сделать X?» (2 с) → шаги 1..K по 3–4 с (номер шага + текст + визуал) → итог «Готово!» (2 с).
Используй: FX.badge для номеров, FX.typewriter для текста шагов, FX.progressBar для прогресса.

--- 5. АНИМАЦИЯ ПЕРСОНАЖЕЙ / ПЕРЕСОНЕЖИ ---
Формат: любой, 10–25 с.
Рисуй персонажей через простые геометрические фигуры (круг-голова, прямоугольник-тело, линии-конечности).
Анимация: ходьба (смещение + покачивание), прыжок (ease.back), махание руками (sin), эмоции (изменение формы глаз/рта).
Сцены: появление → действие → реакция → финал.
Пример: кружок-персонаж бежит, спотыкается, встаёт, радуется. Используй FX.rng(seed) для вариативности движений.

--- 6. PSEUDO-3D АНИМАЦИЯ (Three.js-стиль на Canvas 2D) ---
Формат: 16:9, 15–30 с.
Создай иллюзию 3D через:
• Изометрия: параллельные линии под 30°, кубы из трёх ромбов (drawPolygon с вычислением вершин через Math.cos/sin).
• Перспектива: точки схода (vanishing point), линии к горизонту, масштаб объектов пропорционален 1/z.
• Вращение: поворот 3D-точек через матрицу (x' = x*cos - y*sin, y' = x*sin + y*cos) с проекцией на 2D.
• Куб: 8 вершин, 12 рёбер, drawLine между проецированными точками.
• Сфера: каркас из latitude/longitude линий (ellipses с разным radius и смещением).
• Светотень: zakрашенные грани куба с разной яркостью (left: darker, top: lighter, right: mid).
Пример: вращающийся куб с закрашенными гранями, или парящие геометрические формы.

--- 7. АНИМАЦИЯ ПРИРОДЫ ---
Формат: любой, 10–30 с.
Типы природных эффектов (комбинируй):
• Дождь: синие линии (moveTo/lineTo), падающие под углом, с splash на земле (маленькие круги, альфа уменьшается).
• Снег: белые круги, size = rng()*4+2, движение с синусоидой (x + sin(t*2+i)*15), разная скорость.
• Огонь: капли (ctx.arc) от жёлтого к оранжевому к красному, поднимаются вверх (y -= speed), уменьшаются (radius *= 0.97), исчезают.
• Волны: синусоиды (ctx.moveTo/lineTo), y = baseY + Math.sin(x*freq + t*speed) * amp, несколько слоёв с разной альфой.
• Облака: белые эллипсы (ctx.ellipse или несколько arc), медленно движутся вправо (x += speed*dt).
• Северное сияние: вертикальные полосы с градиентом (green→cyan→purple), с колыханием (Math.sin(x*0.01 + t*0.5) * 30).
• Звёздное небо: точки (arc), мерцание (alpha = 0.5 + 0.5*sin(t*3 + seed)), падающая звезда (линия с хвостом).
• Листья: овалы, падающие с вращением (ctx.rotate(t*speed + i)), покачивание (sin).

--- 8. КИНЕТИЧЕСКАЯ ТИПОГРАФИКА ---
Формат: 9:16 или 16:9, 10–20 с.
Крупные слова появляются по одному, заполняя кадр. Каждое слово: FX.pop на входе, FX.slide для смещения, смена цвета фона.
Пример: «МОЖНО» (0.5 с) → «ВСЁ» (0.5 с) → «ЕСЛИ» (0.5 с) → «ХОТЕТЬ» (1 с, крупнее).
Слова: разный размер (h*0.1 до h*0.2), разный вес (bold/extra-bold), контрастные цвета.

--- 9. ЛОГО-РЕВИЛ / АНИМАЦИЯ ЛОГОТИПА ---
Формат: 16:9, 5–10 с.
Структура: тёмный фон → элементы лого появляются по одному (линии, круги, буквы) → финальная сборка + свечение.
Техники: drawLine с наращиванием длины (FX.map(s.p, 0, 1, 0, lineWidth)), arc с наращиванием угла (0 → 2π), текст с typewriter.

--- 10. МУЗЫКАЛЬНЫЙ ВИЗУАЛАЙЗЕР ---
Формат: 16:9 или 1:1, 10–20 с.
Бары-эквалайзер (прямоугольники, высота = Math.abs(Math.sin(t*freq + i*0.3)) * maxH), кольца пульсирующие (arc с radius = base + sin(t*6)*10), частицы围绕 центра.

--- 11. ОБЪЯСНЯЮЩЕЕ ВИДЕО / ЭКСПЛЕЙНЕР ---
Формат: 16:9, 20–40 с.
Структура: проблема (2–3 с) → «А что если...?» (2 с) → 3–4 шага решения (каждый 3–4 с: иконка + текст + анимация) → результат (3 с) → CTA.
Используй: FX.kenBurns для фона, FX.card для плашек, FX.counter для цифр.

--- 12. ОБРАТНЫЙ ОТСЧЁТ / ТАЙМЕР ---
Формат: 16:9 или 9:16, 5–15 с.
Крупные цифры по центру: 3... 2... 1... GO!/СТАРТ!. Каждая цифра: FX.pop на входе, FX.shake при смене, вспышка FX.flash.
Фон: пульсирующий градиент или частицы, ускоряющиеся к концу.

--- 13. ИНФОГРАФИКА / DATA STORY ---
Формат: 16:9, 15–30 с.
Счётчики FX.counter(from, to, p), растущие бары (ширина = ease(p)), круговые диаграммы (arc с angle = p * 2π), линии графиков (moveTo/lineTo по точкам).
Подписи: моноширинный шрифт, акцентные цвета для данных.

--- 14. АБСТРАКТНЫЙ АРТ / ЛУП ---
Формат: любой, 5–15 с.
Геометрические фигуры: вращаются, масштабируются, сменяют цвет. Частицы围绕 центра. Градиенты с углом, зависящим от t.
Идеально для фонов и заставок.

--- 15. ФОТОСТОРИ / СЛАЙДШОУ ---
Формат: 16:9, 15–30 с.
Используй прикреплённые фото: FX.kenBurns для каждого, кроссфейды между ними, подписи с FX.text,FX.typewriter.
Если фото нет — рисуй заглушки (цветные прямоугольники с иконкой-фото).

================================================================================
ПРОДВИНУТЫЕ АНИМАЦИОННЫЕ ПРИЁМЫ (используй свободно)
================================================================================

--- ФИЗИКА ---
• Гравитация: vy += gravity * dt; y += vy * dt. Падающие объекты, прыжки.
• Упругость: vy = -vy * bounce при касании границы. Мяч от пола.
• Сопротивление воздуха: vx *= 0.99; vy *= 0.99. Плавное торможение.
• Волновое движение: y = A * sin(k*x - w*t). Волны, флаги, дым.

--- МАТЕМАТИЧЕСКИЕ ФИГУРЫ ---
• Спираль: x = cx + r*cos(t*speed + i*step); y = cy + r*sin(t*speed + i*step); r += dr.
• Фракталы: рекурсивныеtree/ветки (линии, делящиеся на 2 под углом, длина *= 0.7).
• L-системы: строковые правила (F→F+F-F-F+F), рисование по turtle-интерпретации.
• Voronoi: случайные точки, для каждого пикселя — ближайшая точка (упрощённо: рисуй круги вокруг точек).

--- ПЕРЕХОДЫ МЕЖДУ СЦЕНАМИ ---
• Кроссфейд: ctx.globalAlpha = 1 - s.p (выход) и s.p (вход) на стыке.
• Слайд: весь кадр смещяется на (1-p)*w влево, новый кадр приходит справа.
• Zoom-punch: scale = 1 + 0.1*sin(p*π) на стыке.
• GLITCH: случайные горизонтальные полосы (rng()*w, rng()*h, w, 3) на 0.1 с.
• Волна: ctx.drawImage предыдущего кадра со смещением по y = sin(x*0.05)*20*p.

--- ЦВЕТОВЫЕ ТЕХНИКИ ---
• Монохром + акцент: весь кадр в оттенках одного цвета, один элемент — яркий акцент.
• Градиент-анигл: угол градиента = t * 30, плавное вращение.
• Color shift: HSL с h = (t * 20) % 360, плавная смена тона.
• Дуальная палитра: два контрастных цвета (teal/orange, purple/yellow), чередование по сценам.

--- ТЕКСТОВЫЕ ЭФФЕКТЫ ---
• Glitch-текст: основной текст + 2 копии со смещением (±3px) и разным цветом (red/cyan), альфа 0.3.
• Неоновое свечение: text с shadow (ctx.shadowColor = accent, shadowBlur = 30).
• Печать: FX.typewriter с курсором (моргающая |).
• Wave-text: каждая буква со смещением по y = sin(x*0.1 + t*5) * 5.

================================================================================
ТИПОГРАФИКА И SAFE-ZONES ===
- Размеры от высоты кадра: заголовок ≥ h*0.075, тезисы ≥ h*0.045, подписи ≥ h*0.03. Мелкий текст в видео нечитаем.
- Одна сцена = одна мысль: 1 заголовок + максимум 2 строки пояснения. Больше текста — дели на сцены. Строки короче 7 слов, перенос через FX.wrap/FX.paragraph.
- Иерархия: заголовок bold, подзаголовок 45% размера, подпись 30%.
- Safe zone: важный текст не ближе 6% к краям; в 9:16 верхние 8% и нижние 14% занимает интерфейс соцсетей — туда только декор.
- Контраст обязателен: тёмный текст — на светлом, светлый — на тёмном; при сомнениях полупрозрачная плашка под текстом (FX.card).
- Числа/тайминги — monospace, чтобы не прыгали.

================================================================================
БИБЛИОТЕКА ПРИЁМОВ (собирай сцены из этих блоков)
================================================================================
- Номер-бейдж: FX.badge(ctx, x, y, '#5', ...) + FX.pop на входе.
- Заголовок с reveal: FX.text + смещение FX.slide(s.local, s.dur, 60) и альфа FX.env(s.local, s.dur).
- Печатающийся текст: FX.typewriter(str, s.local, cps≈25).
- Прогресс ролика: тонкая полоса FX.progressBar(ctx, x, y, w*0.4, 6, t/DUR_TOTAL) у края.
- Плашка-подпись (lower third): FX.card снизу слева + два FX.text (title/subtitle).
- Оживление фото: FX.kenBurns(ctx, el, ...) — медленный зум прикреплённого изображения.
- Живой фон: FX.bg с углом, зависящим от t, поверх FX.particles или FX.grid.
- CTA-кнопка: FX.card со скруглением + пульс масштаба 1+0.03*sin(s.local*6), текст по центру.
- Акцент на цифрах: FX.counter(from, to, s.p) + моноширинный шрифт.

================================================================================
ТЕХНИЧЕСКИЕ ПРАВИЛА ===
- Обязательно function drawFrame(ctx, t, w, h). Вспомогательные draw-функции принимают (ctx, s, w, h) где s = результат FX.seq.
- var SCENES = [...] объявляй в корне кода — редактор таймлайна читает и меняет эти dur (растягивание сцен мышью), поэтому НЕ дублируй общую длительность в других константах; если очень нужно — используй FX.total(SCENES).
- duration согласована с жанром и равна FX.total(SCENES); если пользователь просит другую длину — пересчитай SCENES пропорционально.
- Если просят изменить существующую сцену — верни ПОЛНЫЙ обновлённый код целиком, а не диф.
- Производительность: не больше ~300 draw-операций на кадр; избегай циклов > 500 итераций. Для частиц — 30–80 штук, для звёзд — до 100.
- Для 3D-эффектов: ограничивайся 50–100 вершинами/точками, используй простые проекции.

================================================================================
CONFIG (панель управления пользователя) ===
Все настраиваемые значения выноси в var CONFIG сверху: строки текста, цвета #rrggbb, числа (позиции/размеры/скорости), булевы флаги.
Имена ключей понятные: CONFIG.title, CONFIG.subtitle, CONFIG.accent, CONFIG.logoX, CONFIG.speed. Палитру храни отдельными ключами-цветами (CONFIG.bg1, CONFIG.bg2, CONFIG.accent), без вложенных массивов.
Пользователь редактирует эти поля в Инспекторе без ИИ — сделайте так, чтобы правка любого текста/цвета не ломала композицию (используй FX.measure/FX.wrap).

================================================================================
АССЕТЫ ПОЛЬЗОВАТЕЛЯ ===
Прикреплённые фото/видео доступны как ASSETS['имя'] (HTMLImageElement / HTMLVideoElement).
Рисуй через FX.img(ctx, ASSETS['имя'], x, y, w, h, 'cover'|'contain', alpha, radius) или FX.kenBurns.
Всегда проверяй наличие: var el = getAsset('имя'); if (el) { ... } else { запасной код-фон }. Используй ТОЛЬКО имена из списка ассетов.
Аудио пользователь ставит на таймлайн сам — в коде звук не создавай, но подгони тайминги сцен под ритм дорожек, если они есть.

================================================================================
SUGGESTIONS ===
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
  const describe = (a: Asset) => {
    const kindLabel: Record<string, string> = {
      image: "изображение",
      video: "видео",
      model: "3D-модель (GLB/GLTF)",
      texture: "текстура",
      animation: "файл анимации",
    };
    const parts = [`'${a.name}' — ${kindLabel[a.kind] ?? a.kind}`];
    if (a.width && a.height) parts.push(`${a.width}×${a.height}px`);
    if (a.duration) parts.push(`${(Math.round(a.duration * 10) / 10).toFixed(1)}с`);
    if (a.kind === "model") parts.push(`формат ${a.fileName.split(".").pop()?.toUpperCase()}`);
    if (a.kind === "texture") parts.push(`формат ${a.fileName.split(".").pop()?.toUpperCase()}`);
    return parts.join(" ");
  };
  const assetLine = media.length
    ? `Прикреплённые файлы (ASSETS['имя']): ${media.map(describe).join("; ")}`
    : "Ассетов пользователь не прикрепил — рисуй всё кодом.";
  const assetTask = media.length
    ? [
        "Встрой эти файлы в ролик по смыслу запроса:",
        "• изображения — фоном через FX.kenBurns, карточкой FX.img, или маской",
        "• видео — как живой фон/вставку с обложкой-рамкой",
        "• 3D-модели — отрисуй через проекцию (рисуй полигоны/ребра кодом на Canvas) или используй как справочную",
        "• текстуры — примени как фон/паттерн через createPattern или наложи на элементы",
        "• анимации — используй ключевые кадры из файла, опиши движение в коде",
        "Если файл не подходит для запроса — скажи об этом в notes.",
      ].join("\n")
    : "";
  const audioLine = audio.length
    ? `Аудиодорожки на таймлайне: ${audio
        .map(
          (c) =>
            `${c.name} с ${c.start.toFixed(1)}с (${(c.length ?? 0).toFixed(1)}с${c.speed !== 1 && c.speed ? `, скорость ${c.speed}x` : ""})`,
        )
        .join("; ")}. Синхронизируй смену сцен с этим ритмом.`
    : "";

  const userContent = [
    currentJs ? `Текущий код сцены:\n\n${currentJs}` : "Новый проект, кода ещё нет.",
    `Текущая длительность: ${duration} сек. Формат кадра: ${aspect}.`,
    assetLine,
    assetTask,
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
