import { detectDocType, type DocType } from "../detect/detectDocType";
import { readPdf } from "../pdf/readPdf";
import { detectScan } from "../pdf/detectScan";
import { schemas } from "../schemas";
import { businessRules } from "../validate/businessRules";
import { ruleBasedExtract } from "./ruleBased/extractor";

export type DocumentRecord = {
  id: string; filename: string; sizeBytes: number; sha256: string; source: "sample" | "upload";
  lastStatus?: string;
};

export function failedExtraction(document: DocumentRecord, durationMs: number) {
  return {
    document: { id: document.id, filename: document.filename, sizeBytes: document.sizeBytes, sha256: document.sha256, pages: 0, source: document.source },
    detection: { isScan: false, textChars: 0, docType: null, confidence: 0, matchedKeywords: [] as string[] },
    extraction: { method: "rule-based" as const, durationMs, fields: {} as Record<string, unknown>, fieldTrace: [] as import("./types").FieldTrace[] },
    validation: { schema: { ok: false, errors: ["Extraction failed; validation was not performed."] }, business: [] as ReturnType<typeof businessRules> },
    status: "FAILED",
    warnings: ["Could not read or extract the PDF. It may be invalid or encrypted."],
    rawText: "",
  };
}

export async function extractDocument(document: DocumentRecord, data: Uint8Array, override?: DocType) {
  const started = performance.now();
  try {
  const pdf = await readPdf(data);
  const scan = detectScan(pdf.textChars);
  const detected = detectDocType(pdf.rawText);
  const docType = override ?? detected.docType;
  const base = {
    document: { id: document.id, filename: document.filename, sizeBytes: document.sizeBytes, sha256: document.sha256, pages: pdf.pages, source: document.source },
    detection: { ...scan, ...detected, docType },
    extraction: { method: "rule-based" as const, durationMs: 0, fields: {} as Record<string, unknown>, fieldTrace: [] as import("./types").FieldTrace[] },
    validation: { schema: { ok: false, errors: [] as string[] }, business: [] as ReturnType<typeof businessRules> },
    status: "NEEDS_OCR",
    warnings: [] as string[],
    rawText: pdf.rawText,
  };
  if (!scan.isScan && !docType) base.status = "UNKNOWN_TYPE";
  if (!scan.isScan && docType) {
    const result = ruleBasedExtract(docType, pdf.lines);
    base.extraction.fields = result.fields;
    base.extraction.fieldTrace = result.fieldTrace;
    base.warnings = result.warnings;
    const schema = schemas[docType].safeParse(result.fields);
    base.validation.schema = schema.success
      ? { ok: true, errors: [] }
      : { ok: false, errors: schema.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
    if (schema.success) base.validation.business = businessRules(docType, result.fields);
    base.status = schema.success && base.validation.business.every((rule) => rule.ok) && !base.warnings.length ? "AUTO_VALID" : "NEED_REVIEW";
  }
  base.extraction.durationMs = Math.round(performance.now() - started);
  return base;
  } catch {
    return failedExtraction(document, Math.round(performance.now() - started));
  }
}
