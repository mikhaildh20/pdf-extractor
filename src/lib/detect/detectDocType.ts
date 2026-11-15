export const keywords = {
  bukti_setoran: ["BUKTI SETORAN", "No. Referensi", "Nominal Setoran", "Jenis Simpanan"],
  rekap_mutasi: ["REKAP MUTASI", "Saldo Awal", "Saldo Akhir", "Periode"],
  slip_potongan: ["SLIP POTONGAN", "TOTAL POTONGAN", "NIK", "Periode Gaji"],
} as const;

export type DocType = keyof typeof keywords;

export function detectDocType(text: string): { docType: DocType | null; confidence: number; matchedKeywords: string[] } {
  const lower = text.toLowerCase();
  const candidates = (Object.keys(keywords) as DocType[]).map((docType) => {
    const matchedKeywords = keywords[docType].filter((keyword) => lower.includes(keyword.toLowerCase()));
    return { docType, confidence: matchedKeywords.length / keywords[docType].length, matchedKeywords };
  }).sort((a, b) => b.confidence - a.confidence);
  if (!candidates[0].confidence || candidates[0].confidence === candidates[1].confidence) {
    return { docType: null, confidence: 0, matchedKeywords: [] };
  }
  return candidates[0];
}
