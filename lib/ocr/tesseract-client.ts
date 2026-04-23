/**
 * Lazy-loaded Tesseract.js wrapper. Runs entirely in the browser (WASM).
 *
 * We keep one worker per language combo so repeated captures don't re-init
 * the 20+ MB Czech language data. Worker lives until the tab is closed.
 */

import type { OcrProgress } from "./types";

// Type is intentionally loose — tesseract.js's types churn between majors and
// we don't want to block a build over a minor shape change.
type TesseractWorker = {
  recognize: (image: File | Blob | HTMLCanvasElement | string) => Promise<{
    data: { text: string; confidence: number };
  }>;
  terminate: () => Promise<void>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

export async function getWorker(
  onProgress?: (p: OcrProgress) => void,
): Promise<TesseractWorker> {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    onProgress?.({ stage: "loading", message: "Načítám OCR engine…" });
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker(["ces", "eng"], 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status && typeof m.progress === "number") {
          onProgress?.({
            stage: m.status === "recognizing text" ? "recognizing" : "loading",
            progress: m.progress,
            message: m.status,
          });
        }
      },
    });
    return worker as unknown as TesseractWorker;
  })();

  try {
    return await workerPromise;
  } catch (err) {
    workerPromise = null;
    throw err;
  }
}

/**
 * Shrink the image before feeding Tesseract. Phone photos are often 4000+ px
 * wide — overkill for receipt OCR and very slow. Cap at 1600 px.
 */
export async function shrinkImage(file: File, maxSide = 1600): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, w, h);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.85,
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export async function recognize(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<{ text: string; confidence: number }> {
  const worker = await getWorker(onProgress);
  const shrunk = await shrinkImage(file);
  onProgress?.({ stage: "recognizing", progress: 0, message: "Rozpoznávám…" });
  const { data } = await worker.recognize(shrunk);
  return { text: data.text, confidence: (data.confidence ?? 0) / 100 };
}
