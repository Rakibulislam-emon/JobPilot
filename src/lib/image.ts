/** Client-side image helpers. Imported only from "use client" components. */

export async function prepareImage(file: File): Promise<{ dataUrl: string; file: File }> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(bitmapUrl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const maxBytes = 750 * 1024;
    let width = Math.min(1400, img.width);
    while (width > 0) {
      const height = Math.round((img.height / img.width) * width);
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      for (const quality of [0.72, 0.6, 0.5, 0.4]) {
        let blob = await canvasToBlob(canvas, "image/webp", quality);
        if (blob.type !== "image/webp") {
          blob = await canvasToBlob(canvas, "image/jpeg", quality);
        }
        if (blob.size <= maxBytes) {
          const dataUrl = await blobToDataUrl(blob);
          const extension = blob.type === "image/webp" ? "webp" : "jpg";
          return {
            dataUrl,
            file: new File([blob], `screenshot.${extension}`, { type: blob.type }),
          };
        }
      }
      if (width <= 720) break;
      width = Math.max(720, Math.floor(width * 0.8));
    }

    throw new Error("This image is too large to upload. Try a smaller screenshot.");
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress that image"))),
      mime,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read the compressed image"));
    reader.onerror = () => reject(new Error("Could not read the compressed image"));
    reader.readAsDataURL(blob);
  });
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
