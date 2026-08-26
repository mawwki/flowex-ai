import type { Asset, AudioClip } from "./types";
import { putBlob, mediaDuration } from "./idb";
import { uid } from "./store";

export function assetKind(file: File): Asset["kind"] | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus"].includes(ext)) return "audio";
  return null;
}

function baseName(file: { name: string }): string {
  const raw = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const trimmed = raw.replace(/^-+|-+$/g, "").slice(0, 24);
  return trimmed || "media";
}

export function uniqueName(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/** First free slot on the audio track so new clips never overlap. */
export function nextClipStart(
  audio: AudioClip[],
  assets: Asset[],
  projectDuration: number,
): number {
  let t = 0;
  for (const c of audio) {
    const a = assets.find((x) => x.id === c.assetId);
    const len = Math.min(a?.duration ?? projectDuration, projectDuration);
    t = Math.max(t, c.start + len);
  }
  return Math.max(0, Math.min(t, Math.max(0, projectDuration - 1)));
}

export type UploadResult = { assets: Asset[]; clips: AudioClip[]; failed: string[] };

/** Stores files in IndexedDB and builds timeline-ready assets/clips. */
export async function processFiles(
  files: File[],
  opts: { takenNames: Iterable<string>; startAt: number; projectDuration: number },
): Promise<UploadResult> {
  const result: UploadResult = { assets: [], clips: [], failed: [] };
  const names = new Set(opts.takenNames);
  let cursor = opts.startAt;

  for (const file of files) {
    const kind = assetKind(file);
    if (!kind) {
      result.failed.push(file.name);
      continue;
    }
    const id = uid();
    await putBlob(id, file).catch(() => undefined);
    const url = URL.createObjectURL(file);
    const duration =
      kind === "audio" || kind === "video" ? await mediaDuration(url, kind) : undefined;
    URL.revokeObjectURL(url);

    const name = uniqueName(baseName(file), names);
    names.add(name);
    const asset: Asset = {
      id,
      kind,
      name,
      fileName: file.name,
      mime: file.type || "application/octet-stream",
      duration,
      addedAt: Date.now(),
    };
    result.assets.push(asset);

    if (kind === "audio") {
      const len = Math.min(duration && duration > 0 ? duration : 5, opts.projectDuration);
      result.clips.push({
        id: uid(),
        assetId: id,
        name,
        start: Math.min(cursor, Math.max(0, opts.projectDuration - len)),
        volume: 1,
        muted: false,
      });
      cursor += len;
    }
  }
  return result;
}

/** Turns a recorded blob (voiceover) into an asset + clip pair. */
export async function blobToClip(
  blob: Blob,
  name: string,
  startAt: number,
  projectDuration: number,
): Promise<{ asset: Asset; clip: AudioClip }> {
  const id = uid();
  await putBlob(id, blob).catch(() => undefined);
  const url = URL.createObjectURL(blob);
  const duration = await mediaDuration(url, "audio");
  URL.revokeObjectURL(url);
  const asset: Asset = {
    id,
    kind: "audio",
    name,
    fileName: `${name}.webm`,
    mime: blob.type || "audio/webm",
    duration,
    addedAt: Date.now(),
  };
  const clip: AudioClip = {
    id: uid(),
    assetId: id,
    name,
    start: Math.max(0, Math.min(startAt, Math.max(0, projectDuration - 1))),
    volume: 1,
    muted: false,
    voice: true,
  };
  return { asset, clip };
}

function pickAudioMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export type VoiceSession = {
  stop: () => Promise<Blob>;
  cancel: () => void;
};

/** Opens the microphone and records until stop() is called. */
export async function startVoiceRecording(): Promise<VoiceSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickAudioMime();
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(250);
  const cleanup = () => stream.getTracks().forEach((t) => t.stop());
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          cleanup();
          resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        };
        rec.stop();
      }),
    cancel: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      cleanup();
    },
  };
}
