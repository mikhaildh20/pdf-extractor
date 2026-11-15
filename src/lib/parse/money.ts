/**
 * Parse Indonesian rupiah without rounding or accepting ambiguous grouping.
 * Only whole-rupiah values are supported.
 */
export function parseMoney(input: string): number | null {
  const value = input.trim().replace(/^Rp\s*/i, "");
  if (value === "-") return 0;
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,0{1,2})?$/.test(value)) return null;
  const amount = Number(value.split(",")[0].replaceAll(".", ""));
  return Number.isSafeInteger(amount) ? amount : null;
}
