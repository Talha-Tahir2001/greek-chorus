// Path: lib/mcp/occ-symbol.ts
export interface ParsedOccSymbol {
  underlying: string;
  expiration: string; // YYYY-MM-DD
  optionType: "call" | "put";
  strike: number;
}

export function parseOccSymbol(symbol: string, underlying: string): ParsedOccSymbol | null {
  if (!symbol.startsWith(underlying)) return null;
  const rest = symbol.slice(underlying.length); // YYMMDD + C/P + 8-digit strike = 15 chars
  if (rest.length !== 15) return null;
  const dateRaw = rest.slice(0, 6);
  const typeChar = rest[6];
  const strikeRaw = rest.slice(7, 15);
  if (typeChar !== "C" && typeChar !== "P") return null;
  return {
    underlying,
    expiration: `20${dateRaw.slice(0, 2)}-${dateRaw.slice(2, 4)}-${dateRaw.slice(4, 6)}`,
    optionType: typeChar === "C" ? "call" : "put",
    strike: parseInt(strikeRaw, 10) / 1000,
  };
}

export function buildOccSymbol(
  underlying: string,
  expiration: string, // YYYY-MM-DD
  optionType: "call" | "put",
  strike: number
): string {
  const [y, m, d] = expiration.split("-");
  const dateCode = `${y.slice(2)}${m}${d}`;
  const typeChar = optionType === "call" ? "C" : "P";
  const strikeCode = String(Math.round(strike * 1000)).padStart(8, "0");
  return `${underlying}${dateCode}${typeChar}${strikeCode}`;
}