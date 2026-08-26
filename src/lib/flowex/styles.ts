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
    prompt:
      "неоновая ночная атмосфера: сетка-перспектива, светящиеся линии, частицы, синт-эстетика 80-х",
    colors: ["#0d0221", "#ff2e97", "#00e5ff"],
    aspect: "16:9",
    duration: 15,
  },
  {
    id: "pseudo3d",
    title: "3D Geometry",
    tag: "3D Анимация",
    prompt:
      "вращающиеся 3D-геометрические фигуры: куб с закрашенными гранями, сфера-каркас, парящие полиэдры с проекцией и светотенью",
    colors: ["#0a0a1a", "#8b5cf6", "#06b6d4"],
    aspect: "16:9",
    duration: 15,
  },
  {
    id: "nature-rain",
    title: "Nature: Rain",
    tag: "Природа",
    prompt:
      "атмосферная дождевая сцена: капли дождя, грозовые тучи, молнии, лужи с рябью, градиентное небо от тёмного к серому",
    colors: ["#0c1222", "#334155", "#94a3b8"],
    aspect: "16:9",
    duration: 12,
  },
  {
    id: "nature-fire",
    title: "Nature: Fire",
    tag: "Природа",
    prompt:
      "ANNEL огонь и лава: языки пламени, искры, раскалённые частицы, вулканический градиент от красного к чёрному",
    colors: ["#1a0505", "#dc2626", "#f97316"],
    aspect: "16:9",
    duration: 12,
  },
  {
    id: "nature-aurora",
    title: "Nature: Aurora",
    tag: "Природа",
    prompt:
      "северное сияние: волнистые полосы зелёного/бирюзового/фиолетового свечения на звёздном небе, медленное колыхание",
    colors: ["#020617", "#10b981", "#8b5cf6"],
    aspect: "16:9",
    duration: 15,
  },
  {
    id: "character-walk",
    title: "Character Walk",
    tag: "Персонаж",
    prompt:
      "анимация персонажа-фигуры: кружок-голова, тело-прямоугольник, линии-конечности, ходьба с покачиванием, эмоции",
    colors: ["#f0f9ff", "#3b82f6", "#1e293b"],
    aspect: "16:9",
    duration: 12,
  },
  {
    id: "kinetic-text",
    title: "Kinetic Type",
    tag: "Кинетика",
    prompt:
      "кинетическая типографика: крупные слова по одному, заполняющие кадр, с pop-появлением и резкими сменами фона",
    colors: ["#000000", "#ffffff", "#ef4444"],
    aspect: "9:16",
    duration: 10,
  },
  {
    id: "logo-reveal",
    title: "Logo Reveal",
    tag: "Лого",
    prompt:
      "анимация появления логотипа: элементы собираются по одному (линии, круги, буквы), финальное свечение и тень",
    colors: ["#0f172a", "#3b82f6", "#f8fafc"],
    aspect: "16:9",
    duration: 8,
  },
  {
    id: "countdown",
    title: "Countdown",
    tag: "Обратный отсчёт",
    prompt:
      "обратный отсчёт 3...2...1...GO! с крупными цифрами, pop-эффектом, shake при смене, вспышкой и пульсирующим фоном",
    colors: ["#0a0a0a", "#ef4444", "#fbbf24"],
    aspect: "16:9",
    duration: 8,
  },
  {
    id: "snow-scene",
    title: "Winter Snow",
    tag: "Природа",
    prompt:
      "зимняя снежная сцена: мягкие снежинки, заснеженные деревья-силуэты, тёплый свет в окнах, медленное падение снега",
    colors: ["#0f172a", "#bfdbfe", "#f1f5f9"],
    aspect: "16:9",
    duration: 12,
  },
  {
    id: "wave-ocean",
    title: "Ocean Waves",
    tag: "Природа",
    prompt:
      "морские волны: многослойные синусоиды с разной альфой, пена на гребнях, горизонт, облака, солнечный блик на воде",
    colors: ["#0c4a6e", "#0ea5e9", "#e0f2fe"],
    aspect: "16:9",
    duration: 12,
  },
];

/** Static prompt ideas shown before the first generation. */
export const STARTER_HINTS = [
  "Добавь субтитры по центру снизу",
  "Сделай вертикальный формат 9:16",
  "Добавь счётчик и прогресс-бар",
  "Больше контраста и быстрых переходов",
  "Финальный кадр с призывом подписаться",
  "Добавь 3D-вращающийся куб",
  "Сделай анимацию дождя на фоне",
  "Анимируй персонажа-фигуру",
  "Добавь кинетическую типографику",
  "Сделай обратный отсчёт с вспышками",
];
