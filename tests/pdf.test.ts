import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { readPdf } from "../src/lib/pdf/readPdf";
import { detectScan } from "../src/lib/pdf/detectScan";
import { detectDocType } from "../src/lib/detect/detectDocType";

describe("sample PDF reading", () => {
  it("detects the scanned sample without inventing text", async () => {
    const pdf = await readPdf(await readFile("samples/05_bukti_setoran_SCAN.pdf"));
    expect(detectScan(pdf.textChars)).toEqual({ isScan: true, textChars: 0 });
    expect(pdf.lines).toEqual([]);
  });
  it("reads positioned lines and detects the receipt", async () => {
    const pdf = await readPdf(await readFile("samples/01_bukti_setoran_simpanan.pdf"));
    expect(pdf.rawText).toContain("--- page 1 ---");
    expect(pdf.lines[0].items[0].x).toEqual(expect.any(Number));
    expect(detectDocType(pdf.rawText).docType).toBe("bukti_setoran");
  });
});
