# AGENTS.md

Инструкции для ИИ-ассистентов, работающих с этим репозиторием.

## Проект

Flowex — AI-видеоредактор на TanStack Start (React 19, Vite 8, Tailwind 4).
Сцены видео — это JS-код с `drawFrame(ctx, t, w, h)` поверх библиотеки FX,
который генерирует LLM и рендерится в песочнице-iframe.

## Команды

- `bun run dev` — дев-сервер
- `bun run build` — продакшен-сборка
- `bun x tsc --noEmit` — проверка типов (строгий tsconfig: exactOptionalPropertyTypes, noUncheckedIndexedAccess)
- `bun run lint` — eslint (+prettier); `bun run format` — автофикс

## Конвенции

- Форматирование: prettier, printWidth 100, LF-переносы.
- Комментарии в коде не добавлять без необходимости.
- Системный промпт для ИИ живёт в `src/lib/flowex/providers.ts`; правки правил
  генерации видео делаются там.
