import { createWorker } from "tesseract.js";
import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PdfLine } from "./readPdf";

export async function readOcr(data: Uint8Array): Promise<{ rawText: string; lines: PdfLine[] }> {
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const lines: PdfLine[] = [];
  const pages: string[] = [];
  try {
    const cachePath = path.join(process.cwd(), "storage", "ocr-cache");
    await mkdir(cachePath, { recursive: true });
    const worker = await createWorker(["ind", "eng"], undefined, { cachePath });
    try {
      for (let page = 1; page <= pdf.numPages; page++) {
        const image = await renderPageAsImage(pdf, page, { scale: 2, canvasImport: () => import("@napi-rs/canvas") });
        const result = await worker.recognize(Buffer.from(image));
        const pageLines = result.data.text.split(/\r?\n/).map((text) => text.trim()).filter(Boolean);
        pages.push([`--- page ${page} ---`, ...pageLines].join("\n"));
        pageLines.forEach((text, lineIndex) => lines.push({ page, lineIndex, text, items: [] }));
      }
    } finally {
      await worker.terminate();
    }
  } finally {
    await pdf.loadingTask.destroy();
  }
  return { rawText: pages.join("\n"), lines };
}
