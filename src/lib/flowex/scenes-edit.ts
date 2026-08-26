import type { AudioClip } from "./types";

/**
 * Text-level editing of the AI-generated scene code. The system prompt requires
 * scenes to live in a top-level `var SCENES = [{id:'..',dur:N}, ...]`, which
 * makes the array safely rewritable without re-running the generator.
 */

export type ParsedScene = { id: string; dur: number };

const BLOCK_RE = /((?:var|let|const)\s+SCENES\s*=\s*\[)([\s\S]*?)(\])/;
const ITEM_RE = /\{[^{}]*\}/g;

const round2 = (v: number) => Math.round(v * 100) / 100;

export function parseScenes(js: string): ParsedScene[] | null {
  const m = BLOCK_RE.exec(js);
  if (!m) return null;
  const items = [...m[2]!.matchAll(ITEM_RE)];
  const out = items.map((o) => {
    const id = /(?:^|[{,\s])(?:id|key|name)\s*:\s*['"]([^'"]*)['"]/.exec(o[0]);
    const dur = /(?:^|[{,\s])dur(?:ation)?\s*:\s*([\d.]+)/.exec(o[0]);
    return {
      id: id?.[1] ?? "",
      dur: dur ? parseFloat(dur[1]!) : 3,
    };
  });
  return out.length ? out : null;
}

function serialize(items: ParsedScene[]): string {
  return items
    .map((s, i) => `{id:'${s.id || `scene${i + 1}`}',dur:${round2(Math.max(0.3, s.dur))}}`)
    .join(", ");
}

/** Applies a transform to the SCENES array and returns the updated full js (or null). */
function mutate(js: string, fn: (items: ParsedScene[]) => ParsedScene[] | null): string | null {
  const m = BLOCK_RE.exec(js);
  if (!m) return null;
  const parsed = parseScenes(js);
  if (!parsed) return null;
  const next = fn(parsed.map((s) => ({ ...s })));
  if (!next) return null;
  const replaced =
    js.slice(0, m.index) + m[1] + serialize(next) + m[3]! + js.slice(m.index + m[0].length);
  return syncTotalConstants(replaced, sceneTotal(next));
}

export function setSceneDuration(js: string, index: number, dur: number): string | null {
  return mutate(js, (items) => {
    if (!items[index]) return null;
    items[index]!.dur = round2(dur);
    return items;
  });
}

export function moveScene(js: string, index: number, dir: -1 | 1): string | null {
  return mutate(js, (items) => {
    const j = index + dir;
    if (!items[index] || !items[j]) return null;
    [items[index], items[j]] = [items[j]!, items[index]!];
    return items;
  });
}

export function removeScene(js: string, index: number): string | null {
  return mutate(js, (items) => {
    if (items.length <= 1 || !items[index]) return null;
    items.splice(index, 1);
    return items;
  });
}

/** Replaces all durations at once (boundary dragging on the timeline). */
export function setAllDurations(js: string, durs: number[]): string | null {
  return mutate(js, (items) => {
    if (items.length !== durs.length) return null;
    return items.map((s, i) => ({ ...s, dur: round2(durs[i]!) }));
  });
}

/** Best-effort update of hardcoded total-duration constants after retiming. */
export function syncTotalConstants(js: string, total: number): string {
  return js.replace(
    /((?:var|let|const)\s+(?:DUR(?:ATION)?_?TOTAL|TOTAL_DUR)\s*=\s*)[\d.]+/g,
    (_all, prefix: string) => `${prefix}${round2(total)}`,
  );
}

export const sceneTotal = (items: ParsedScene[]): number =>
  round2(items.reduce((sum, s) => sum + s.dur, 0));

/** Splits an audio clip at an absolute timeline position. */
export function splitClip(
  clip: AudioClip,
  at: number,
): { left: AudioClip; right: AudioClip } | null {
  const speed = clip.speed ?? 1;
  const len = clip.length ?? 0;
  const cut = at - clip.start;
  if (cut <= 0.15 || cut >= len - 0.15) return null;
  return {
    left: { ...clip, length: round2(cut) },
    right: {
      ...clip,
      id: `${clip.id}-b${Math.random().toString(36).slice(2, 6)}`,
      start: round2(at),
      offset: round2((clip.offset ?? 0) + cut * speed),
      length: round2(len - cut),
    },
  };
}
