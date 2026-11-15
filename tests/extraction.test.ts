import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractDocument } from "../src/lib/extract/pipeline";
import { ruleBasedExtract } from "../src/lib/extract/ruleBased/extractor";

describe("financial extraction", () => {
  it("preserves the incorrect printed closing balance and flags it", async () => {
    const filename = "03_rekap_mutasi_simpanan_SALDO_SALAH.pdf";
    const data = await readFile(`samples/${filename}`);
    const result = await extractDocument({ id: "test", filename, sizeBytes: data.length, sha256: "", source: "sample" }, data);
    expect(result.status).toBe("NEED_REVIEW");
    expect(result.extraction.fields.saldo_akhir_tertulis).toBe(11585000);
    expect(result.validation.business.find((rule) => rule.rule === "SALDO_RECONCILIATION")).toMatchObject({
      ok: false, expected: 11485000, actual: 11585000,
    });
  });
  it("reports ambiguous monetary values and duplicate fields", () => {
    const lines = ["Nominal Setoran : Rp 1.23", "Status : BERHASIL", "Status : GAGAL"].map((text, lineIndex) =>
      ({ text, page: 1, lineIndex, items: [] }));
    const result = ruleBasedExtract("bukti_setoran", lines);
    expect(result.fields.nominal).toBeUndefined();
    expect(result.warnings).toHaveLength(2);
    expect(result.fieldTrace[0].ok).toBe(false);
  });
  it("returns a FAILED envelope for a corrupt PDF without invented fields", async () => {
    const data = new TextEncoder().encode("%PDF-invalid");
    const result = await extractDocument({ id: "bad", filename: "bad.pdf", sizeBytes: data.length, sha256: "", source: "upload" }, data);
    expect(result.status).toBe("FAILED");
    expect(result.extraction.fields).toEqual({});
    expect(result.validation.schema.ok).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
