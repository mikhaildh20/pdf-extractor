import { getDocumentProxy } from "unpdf";

export type PdfItem = { x: number; y: number; str: string };
export type PdfLine = { page: number; lineIndex: number; text: string; items: PdfItem[] };
export type PdfContent = { pages: number; rawText: string; lines: PdfLine[]; textChars: number };

export async function readPdf(data: Uint8Array): Promise<PdfContent> {
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const lines: PdfLine[] = [];
  let textChars = 0;
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const groups: { y: number; items: PdfItem[] }[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        textChars += item.str.length;
        const positioned = { x: item.transform[4], y: item.transform[5], str: item.str.trim() };
        const group = groups.find((candidate) => Math.abs(candidate.y - positioned.y) <= 2);
        if (group) group.items.push(positioned);
        else groups.push({ y: positioned.y, items: [positioned] });
      }
      groups.sort((a, b) => b.y - a.y);
      groups.forEach((group, lineIndex) => {
        group.items.sort((a, b) => a.x - b.x);
        lines.push({ page: pageNumber, lineIndex, items: group.items, text: group.items.map((item) => item.str).join(" ") });
      });
    }
    const rawText = Array.from({ length: pdf.numPages }, (_, index) =>
      [`--- page ${index + 1} ---`, ...lines.filter((line) => line.page === index + 1).map((line) => line.text)].join("\n")
    ).join("\n");
    return { pages: pdf.numPages, rawText, lines, textChars };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
