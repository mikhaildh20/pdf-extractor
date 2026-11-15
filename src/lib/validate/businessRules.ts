import type { DocType } from "../detect/detectDocType";

type BusinessResult = { rule: string; ok: boolean; expected: unknown; actual: unknown; message: string };

export function businessRules(type: DocType, data: Record<string, unknown>): BusinessResult[] {
  const results: BusinessResult[] = [];
  const add = (rule: string, ok: boolean, expected: unknown, actual: unknown, message = "") =>
    results.push({ rule, ok, expected, actual, message });
  if (type === "bukti_setoran" || type === "slip_potongan") {
    const member = data.no_anggota;
    add("ANGGOTA_FORMAT", typeof member === "string" && /^AGT-\d{7}$/.test(member), "AGT- followed by 7 digits", member);
  }
  if (type === "bukti_setoran") {
    add("NOMINAL_POSITIVE", typeof data.nominal === "number" && data.nominal > 0, "> 0", data.nominal);
    add("STATUS_BERHASIL", data.status === "BERHASIL", "BERHASIL", data.status);
  } else if (type === "slip_potongan") {
    const rows = data.potongan as { jumlah: number }[];
    const total = rows.reduce((sum, item) => sum + item.jumlah, 0);
    add("TOTAL_MATCHES_SUM", total === data.total_potongan, total, data.total_potongan);
  } else {
    const rows = data.mutasi as { tanggal: string; debit: number; kredit: number; saldo?: number }[];
    let balance = data.saldo_awal as number;
    let failingIndex = -1;
    let expected: number | null = null;
    let actual: number | undefined;
    rows.forEach((row, index) => {
      const next = balance - row.debit + row.kredit;
      if (failingIndex < 0 && (row.saldo === undefined || row.saldo !== next)) {
        failingIndex = index;
        expected = next;
        actual = row.saldo;
      }
      balance = row.saldo ?? next;
    });
    add("ROW_RUNNING_BALANCE", failingIndex < 0, expected, actual ?? null, failingIndex < 0 ? "" : `First failing row index: ${failingIndex}`);
    const sums = { debit: rows.reduce((sum, row) => sum + row.debit, 0), kredit: rows.reduce((sum, row) => sum + row.kredit, 0) };
    const totals = { debit: data.total_debit, kredit: data.total_kredit };
    add("TOTALS_MATCH_ROWS", sums.debit === totals.debit && sums.kredit === totals.kredit, sums, totals);
    const closing = (data.saldo_awal as number) - (data.total_debit as number) + (data.total_kredit as number);
    add("SALDO_RECONCILIATION", closing === data.saldo_akhir_tertulis, closing, data.saldo_akhir_tertulis);
    const start = data.periode_awal as string;
    const end = data.periode_akhir as string;
    const invalid = rows.findIndex((row) => row.tanggal < start || row.tanggal > end);
    add("PERIODE_VALID", start <= end && invalid < 0, `${start} to ${end}`, invalid < 0 ? "all rows in period" : `row ${invalid}`);
  }
  return results;
}
