import type { Project } from "./types";
import { FX_RUNTIME } from "./fx";
import { overrideSnippet } from "./config";
import { getBlob } from "./idb";

function pickMime(withAudio: boolean): string {
  const candidates = withAudio
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    : [
        "video/mp4;codecs=avc1.42E01E",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

type Draw = (c: CanvasRenderingContext2D, t: number, w: number, h: number) => void;

async function loadAssets(project: Project) {
  const map: Record<string, HTMLImageElement | HTMLVideoElement> = {};
  await Promise.all(
    project.assets
      .filter((a) => a.kind !== "audio")
      .map(async (a) => {
        const blob = await getBlob(a.id).catch(() => undefined);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
          if (a.kind === "video") {
            const v = document.createElement("video");
            v.muted = true;
            v.playsInline = true;
            v.loop = true;
            v.onloadeddata = () => {
              map[a.name] = v;
              resolve();
            };
            v.onerror = () => resolve();
            v.src = url;
          } else {
            const img = new Image();
            img.onload = () => {
              map[a.name] = img;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          }
        });
      }),
  );
  return map;
}

/** Renders the scene in real time into a canvas + mixes audio clips, recording to a file. */
export async function exportVideo(
  project: Project,
  onProgress: (p: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  const assets = await loadAssets(project);

  let drawFrame: Draw | null = null;

  drawFrame = new Function(
    "ASSETS",
    "getAsset",
    `${FX_RUNTIME}
     ${project.scene.js}
     ${overrideSnippet(project.config)}
     return typeof drawFrame==='function'?drawFrame:null;`,
  )(assets, (n: string) => assets[n] ?? null) as Draw | null;
  if (!drawFrame) throw new Error("В коде сцены нет функции drawFrame");

  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");

  const clips = project.audio.filter((c) => !c.muted);
  let audioCtx: AudioContext | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  const scheduled: { buffer: AudioBuffer; start: number; volume: number }[] = [];

  if (clips.length) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) throw new Error("Web Audio API недоступна");
    audioCtx = new AC();
    dest = audioCtx.createMediaStreamDestination();
    for (const clip of clips) {
      const blob = await getBlob(clip.assetId).catch(() => undefined);
      if (!blob) continue;
      try {
        const buffer = await audioCtx.decodeAudioData(await blob.arrayBuffer());
        scheduled.push({ buffer, start: clip.start, volume: clip.volume });
      } catch {
        /* skip undecodable clip */
      }
    }
    if (!scheduled.length) {
      audioCtx.close();
      audioCtx = null;
      dest = null;
    }
  }

  const fps = project.fps || 30;
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  const out = new MediaStream([track, ...(dest ? dest.stream.getAudioTracks() : [])]);
  const mime = pickMime(!!dest);
  const rec = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];

  const result = new Promise<{ blob: Blob; ext: string }>((resolve, reject) => {
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onerror = () => reject(new Error("Ошибка записи"));
    rec.onstop = () => {
      audioCtx?.close().catch(() => {});
      resolve({
        blob: new Blob(chunks, { type: mime }),
        ext: mime.startsWith("video/mp4") ? "mp4" : "webm",
      });
    };
  });

  for (const v of Object.values(assets)) {
    if (v instanceof HTMLVideoElement) v.play().catch(() => {});
  }

  rec.start();

  if (audioCtx && dest) {
    const base = audioCtx.currentTime + 0.1;
    for (const s of scheduled) {
      const src = audioCtx.createBufferSource();
      src.buffer = s.buffer;
      const gain = audioCtx.createGain();
      gain.gain.value = s.volume;
      src.connect(gain).connect(dest);
      src.start(base + Math.max(0, s.start));
    }
  }

  const duration = project.duration;
  const started = performance.now();
  await new Promise<void>((resolve, reject) => {
    const step = () => {
      const t = (performance.now() - started) / 1000;
      if (t >= duration) {
        try {
          drawFrame!(ctx, duration, canvas.width, canvas.height);
          track.requestFrame();
        } catch {
          /* ignore last-frame error */
        }
        onProgress(1);
        resolve();
        return;
      }
      try {
        drawFrame!(ctx, t, canvas.width, canvas.height);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      track.requestFrame();
      onProgress(t / duration);
      setTimeout(step, 1000 / fps);
    };
    step();
  }).catch((e) => {
    rec.stop();
    throw e;
  });

  setTimeout(() => rec.stop(), 200);
  for (const v of Object.values(assets)) {
    if (v instanceof HTMLVideoElement) v.pause();
  }
  return result;
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
