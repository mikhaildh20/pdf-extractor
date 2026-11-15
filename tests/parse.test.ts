import { describe, expect, it } from "vitest";
import { parseMoney } from "../src/lib/parse/money";
import { parseDate, parseMonth, parsePeriode } from "../src/lib/parse/date";

describe("financial document parsers", () => {
  it("parses only unambiguous whole rupiah", () => {
    expect(parseMoney("Rp 1.500.000")).toBe(1500000);
    expect(parseMoney("Rp 15.000")).toBe(15000);
    expect(parseMoney("-")).toBe(0);
    expect(parseMoney("Rp 1.23")).toBeNull();
    expect(parseMoney("Rp 1.000,50")).toBeNull();
    expect(parseMoney("9007199254740992")).toBeNull();
  });
  it("checks calendar dates", () => {
    expect(parseDate("29/02/2024")).toBe("2024-02-29");
    expect(parseDate("29/02/2026")).toBeNull();
    expect(parseDate("2026-11-05")).toBeNull();
  });
  it("parses Indonesian months", () => {
    expect(parseMonth("Oktober 2026")).toBe("2026-10");
    expect(parseMonth("October 2026")).toBeNull();
  });
  it("parses both period endpoints", () => {
    expect(parsePeriode("01/11/2026 - 30/11/2026")).toEqual({ awal: "2026-11-01", akhir: "2026-11-30" });
    expect(parsePeriode("01/11/2026 - 31/11/2026")).toBeNull();
  });
});
