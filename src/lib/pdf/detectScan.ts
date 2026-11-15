export const SCAN_TEXT_THRESHOLD = 30;

export function detectScan(textChars: number) {
  return { textChars, isScan: textChars < SCAN_TEXT_THRESHOLD };
}
