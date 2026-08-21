import type { Project } from "./types";

function pickMime(): string {
  const candidates = [
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

/** Renders the scene frame-by-frame into an offscreen canvas and records it to a file. */
export function exportVideo(
  project: Project,
  onProgress: (p: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  return new Promise((resolve, reject) => {
    type Draw = (c: CanvasRenderingContext2D, t: number, w: number, h: number) => void;
    let drawFrame: Draw | null = null;
    try {
      // eslint-disable-next-line no-new-func
      drawFrame = new Function(
        `${project.scene.js}; return typeof drawFrame==='function'?drawFrame:null;`,
      )() as Draw | null;
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    if (!drawFrame) {
      reject(new Error("В коде сцены нет функции drawFrame"));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas недоступен"));
      return;
    }

    const fps = project.fps || 30;
    const total = Math.max(1, Math.round(project.duration * fps));
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    const mime = pickMime();
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onerror = () => reject(new Error("Ошибка записи"));
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      resolve({ blob, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" });
    };
    rec.start();

    let i = 0;
    const step = () => {
      if (i >= total) {
        setTimeout(() => rec.stop(), 120);
        return;
      }
      try {
        (drawFrame as Draw)(ctx, i / fps, canvas.width, canvas.height);
      } catch (e) {
        rec.stop();
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      track.requestFrame();
      i++;
      onProgress(i / total);
      setTimeout(step, 1000 / 60);
    };
    step();
  });
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
