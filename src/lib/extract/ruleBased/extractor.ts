import type { DocType } from "../../detect/detectDocType";
import type { PdfLine } from "../../pdf/readPdf";
import { parseDate, parseMonth, parsePeriode } from "../../parse/date";
import { parseMoney } from "../../parse/money";
import type { FieldTrace } from "../types";
import { profiles } from "./profiles";

export function ruleBasedExtract(type: DocType, lines: PdfLine[]) {
  const fields: Record<string, unknown> = {};
  const fieldTrace: FieldTrace[] = [];
  const warnings: string[] = [];
  function add(field: string, value: unknown, line: PdfLine) {
    const ok = value !== null && value !== undefined && value !== "";
    fieldTrace.push({ field, rawMatch: line.text, page: line.page, lineIndex: line.lineIndex, parsedValue: value, ok });
    if (!ok) warnings.push(`Could not parse ${field} at page ${line.page}, line ${line.lineIndex}.`);
    if (field in fields) {
      warnings.push(`Duplicate ${field} at page ${line.page}, line ${line.lineIndex}.`);
      return;
    }
    if (ok) fields[field] = value;
  }
  for (const line of lines) {
    const colon = line.text.indexOf(":");
    if (colon < 0) continue;
    const label = line.text.slice(0, colon).trim();
    const raw = line.text.slice(colon + 1).trim();
    for (const rule of profiles[type]) {
      if (!rule.labels.some((pattern) => pattern.test(label))) continue;
      const value = rule.type === "money" ? parseMoney(raw) : rule.type === "date" ? parseDate(raw) : rule.type === "month" ? parseMonth(raw) : raw;
      add(rule.key, value, line);
    }
    if (type === "rekap_mutasi" && /^Periode$/i.test(label)) {
      const period = parsePeriode(raw);
      add("periode_awal", period?.awal ?? null, line);
      add("periode_akhir", period?.akhir ?? null, line);
    }
  }
  const money = "(?:Rp\\s*[\\d.,]+|-)";
  if (type === "rekap_mutasi") {
    const rows: Record<string, unknown>[] = [];
    const rowPattern = new RegExp(`^(\\d{2}/\\d{2}/\\d{4})\\s+(\\S+)\\s+(.+?)\\s+(${money})\\s+(${money})\\s+(${money})$`, "i");
    const startPattern = new RegExp(`^Saldo Awal\\s+(${money})$`, "i");
    const endPattern = new RegExp(`^Saldo Akhir\\s+(${money})\\s+(${money})\\s+(${money})$`, "i");
    for (const line of lines) {
      const start = startPattern.exec(line.text);
      const end = endPattern.exec(line.text);
      const row = rowPattern.exec(line.text);
      if (start) add("saldo_awal", parseMoney(start[1]), line);
      else if (end) {
        add("total_debit", parseMoney(end[1]), line);
        add("total_kredit", parseMoney(end[2]), line);
        add("saldo_akhir_tertulis", parseMoney(end[3]), line);
      } else if (row) {
        const parsed = { tanggal: parseDate(row[1]), no_ref: row[2], keterangan: row[3], debit: parseMoney(row[4]), kredit: parseMoney(row[5]), saldo: parseMoney(row[6]) };
        const ok = Object.values(parsed).every((value) => value !== null);
        const index = rows.length;
        for (const [key, value] of Object.entries(parsed)) {
          fieldTrace.push({ field: `mutasi[${index}].${key}`, rawMatch: line.text, page: line.page, lineIndex: line.lineIndex, parsedValue: value, ok: value !== null });
        }
        if (!ok) warnings.push(`Could not parse mutation row at page ${line.page}, line ${line.lineIndex}.`);
        rows.push(parsed);
      } else if (/^\d{2}\/\d{2}\/\d{4}\b/.test(line.text) || /^Saldo (?:Awal|Akhir)\b/i.test(line.text)) {
        warnings.push(`Unrecognized mutation line at page ${line.page}, line ${line.lineIndex}.`);
      }
    }
    fields.mutasi = rows;
  }
  if (type === "slip_potongan") {
    const rows: Record<string, unknown>[] = [];
    const rowPattern = new RegExp(`^\\d+\\s+(.+?)\\s+(Rp\\s*[\\d.,]+)$`, "i");
    const totalPattern = new RegExp(`^TOTAL POTONGAN\\s+(${money})$`, "i");
    for (const line of lines) {
      const row = rowPattern.exec(line.text);
      const total = totalPattern.exec(line.text);
      if (total) add("total_potongan", parseMoney(total[1]), line);
      else if (row) {
        const amount = parseMoney(row[2]);
        const index = rows.length;
        rows.push({ komponen: row[1], jumlah: amount });
        for (const [key, value] of Object.entries(rows[index])) {
          fieldTrace.push({ field: `potongan[${index}].${key}`, rawMatch: line.text, page: line.page, lineIndex: line.lineIndex, parsedValue: value, ok: value !== null });
        }
        if (amount === null) warnings.push(`Could not parse deduction row at page ${line.page}, line ${line.lineIndex}.`);
      } else if (/^\d+\s/.test(line.text) || /^TOTAL POTONGAN\b/i.test(line.text)) {
        warnings.push(`Unrecognized deduction line at page ${line.page}, line ${line.lineIndex}.`);
      }
    }
    fields.potongan = rows;
  }
  return { fields, fieldTrace, warnings };
}
