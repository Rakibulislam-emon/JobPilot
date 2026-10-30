/** Client-side image helpers. Imported only from "use client" components. */

export async function fileToDataUrl(
  file: File,
  maxWidth = 1400,
  quality = 0.72
): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(bitmapUrl);
    const scale = Math.min(1, maxWidth / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, w, h);

    const webp = canvas.toDataURL("image/webp", quality);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

/** Offline OCR fallback. Downloads ~10MB of language data on first use. */
export async function ocrDataUrl(
  dataUrl: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng+ben", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  try {
    const { data } = await worker.recognize(dataUrl);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}
