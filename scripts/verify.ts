import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extractDocument } from "../src/lib/extract/pipeline";

function mismatches(expected: unknown, actual: unknown, path = ""): string[] {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) return [path];
    return expected.flatMap((item, index) => mismatches(item, actual[index], `${path}[${index}]`));
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) return [path];
    return Object.entries(expected).flatMap(([key, value]) =>
      ["saldo_akhir_seharusnya", "catatan_validasi", "catatan"].includes(key)
        ? []
        : mismatches(value, (actual as Record<string, unknown>)[key], path ? `${path}.${key}` : key)
    );
  }
  return Object.is(expected, actual) ? [] : [path];
}

async function main() {
  const files = (await readdir("samples")).filter((name) => name.toLowerCase().endsWith(".pdf")).sort();
  let failed = files.length === 0;
  const results = [];
  for (const filename of files) {
    const data = await readFile(`samples/${filename}`);
    const expected = JSON.parse(await readFile(`samples/expected/${filename.replace(/\.pdf$/i, ".expected.json")}`, "utf8"));
    const result = await extractDocument({ id: filename, filename, sizeBytes: data.length, sha256: createHash("sha256").update(data).digest("hex"), source: "sample" }, data);
    const prefix = filename.slice(0, 2);
    const expectedStatus = prefix === "03" || prefix === "05" ? "NEED_REVIEW" : "AUTO_VALID";
    const differences = mismatches(expected, result.extraction.fields);
    const reconciliation = result.validation.business.find((rule) => rule.rule === "SALDO_RECONCILIATION");
    const scanOk = prefix !== "05" || (result.detection.isScan && result.detection.textChars === 0 && result.extraction.method === "ocr" && result.warnings.some((warning) => warning.includes("OCR")));
    const balanceOk = prefix !== "03" || (reconciliation?.ok === false && reconciliation.expected === 11485000 && reconciliation.actual === 11585000);
    const pass = result.status === expectedStatus && differences.length === 0 && scanOk && balanceOk;
    failed ||= !pass;
    results.push({ file: filename, detected: result.detection.docType ?? "-", status: result.status, expected: expectedStatus, mismatches: differences.join(", ") || "-", result: pass ? "PASS" : "FAIL" });
    if (prefix === "03") console.log("Sample 03 SALDO_RECONCILIATION:", JSON.stringify(reconciliation));
  }
  console.table(results);
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
