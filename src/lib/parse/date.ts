export function parseDate(input: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  date.setUTCHours(0, 0, 0, 0);
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
}

const months = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];

export function parseMonth(input: string): string | null {
  const match = /^([a-z]+)\s+(\d{4})$/i.exec(input.trim());
  if (!match) return null;
  const month = months.indexOf(match[1].toLowerCase());
  return month < 0 ? null : `${match[2]}-${String(month + 1).padStart(2, "0")}`;
}

export function parsePeriode(input: string): { awal: string; akhir: string } | null {
  const match = /^(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})$/.exec(input.trim());
  if (!match) return null;
  const awal = parseDate(match[1]);
  const akhir = parseDate(match[2]);
  return awal && akhir ? { awal, akhir } : null;
}
