/** Style / template gallery shown before the first prompt. */

export type StylePreset = {
  id: string;
  title: string;
  tag: string;
  /** appended to the user prompt */
  prompt: string;
  colors: [string, string, string];
  aspect: "16:9" | "9:16" | "1:1";
  duration: number;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "reels-hook",
    title: "Reels Hook",
    tag: "Вертикаль 9:16",
    prompt:
      "вертикальный reels-ролик 9:16 с крупным хук-заголовком, быстрым кинетическим текстом, счётчиком и жирной типографикой",
    colors: ["#12061f", "#7c3aed", "#f0abfc"],
    aspect: "9:16",
    duration: 15,
  },
  {
    id: "product-ad",
    title: "Product Ad",
    tag: "Реклама",
    prompt:
      "рекламный ролик продукта: логотип, 3 буллета преимуществ, карточка продукта с бликом и финальный CTA",
    colors: ["#04121a", "#0ea5e9", "#e2f5ff"],
    aspect: "16:9",
    duration: 20,
  },
  {
    id: "top5-list",
    title: "Top 5 List",
    tag: "Подборка",
    prompt:
      "подборка «Топ 5» с нумерованными карточками, иконками, счётчиками и плавными переходами между пунктами",
    colors: ["#0b0f1a", "#22c55e", "#d1fae5"],
    aspect: "16:9",
    duration: 30,
  },
  {
    id: "terminal-dev",
    title: "Dev Terminal",
    tag: "Для кода",
    prompt:
      "тёмный технологичный ролик в стиле терминала: печатающийся код, курсор, glow-подсветка, моноширинный шрифт",
    colors: ["#05070a", "#22d3ee", "#94a3b8"],
    aspect: "16:9",
    duration: 20,
  },
  {
    id: "bold-brutal",
    title: "Bold Brutal",
    tag: "Типографика",
    prompt:
      "брутальная типографика: огромные слова во весь кадр, резкие цветные смены фона, ритмичные кат-переходы",
    colors: ["#ffffff", "#111111", "#ff3b30"],
    aspect: "9:16",
    duration: 12,
  },
  {
    id: "soft-gradient",
    title: "Soft Gradient",
    tag: "Минимализм",
    prompt:
      "мягкий минималистичный ролик: пастельный анимированный градиент, тонкий текст, много воздуха, плавные fade",
    colors: ["#fdf2f8", "#c4b5fd", "#a5f3fc"],
    aspect: "16:9",
    duration: 15,
  },
  {
    id: "cinematic",
    title: "Cinematic",
    tag: "Кино",
    prompt:
      "кинематографичный ролик: чёрные полосы, зерно, виньетка, медленные движения камеры, титры засечками",
    colors: ["#0a0a0a", "#b45309", "#fde68a"],
    aspect: "16:9",
    duration: 20,
  },
  {
    id: "stats-report",
    title: "Data Story",
    tag: "Статистика",
    prompt:
      "ролик с цифрами и графиками: растущие бары, счётчики процентов, подписи и аккуратная сетка",
    colors: ["#0b1020", "#6366f1", "#e0e7ff"],
    aspect: "16:9",
    duration: 20,
  },
  {
    id: "photo-slideshow",
    title: "Photo Story",
    tag: "Фото",
    prompt:
      "слайдшоу из прикреплённых фото с эффектом Ken Burns, подписями и плавными кросс-фейдами",
    colors: ["#111014", "#f59e0b", "#fef3c7"],
    aspect: "16:9",
    duration: 18,
  },
  {
    id: "neon-city",
    title: "Neon Night",
    tag: "Атмосфера",
    prompt: "неоновая ночная атмосфера: сетка-перспектива, светящиеся линии, частицы, синт-эстетика 80-х",
    colors: ["#0d0221", "#ff2e97", "#00e5ff"],
    aspect: "16:9",
    duration: 15,
  },
];

/** Static prompt ideas shown before the first generation. */
export const STARTER_HINTS = [
  "Добавь субтитры по центру снизу",
  "Сделай вертикальный формат 9:16",
  "Добавь счётчик и прогресс-бар",
  "Больше контраста и быстрых переходов",
  "Финальный кадр с призывом подписаться",
];
