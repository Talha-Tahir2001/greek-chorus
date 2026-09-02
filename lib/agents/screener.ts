// Path: lib/agents/screener.ts
import { getAlpacaMcpTools, type McpTool } from "@/lib/mcp/client";
import { parseAlpacaToolResult } from "@/lib/mcp/parse-result";
import type { MarketMoversData, OptionChainData } from "@/lib/mcp/alpaca-types";

function findTool(tools: McpTool[], name: string): McpTool | undefined {
  return tools.find((t) => t.name === name);
}

export async function screenCandidates(): Promise<{ tickers: string[]; marketData: string }> {
  const tools = await getAlpacaMcpTools();
  const moversTool = findTool(tools, "get_market_movers");
  const chainTool = findTool(tools, "get_option_chain");

  const tickers = moversTool ? await getMoverTickers(moversTool) : ["SPY", "QQQ", "AAPL"];

  const chainSummaries = await Promise.all(
    tickers.map(async (ticker) => {
      if (!chainTool) return `${ticker}: no chain tool available`;
      const raw = await chainTool.invoke({ underlying_symbol: ticker });
      const { data } = parseAlpacaToolResult<OptionChainData>(raw);
      return `${ticker}: ${summarizeChain(data)}`;
    })
  );

  return { tickers, marketData: chainSummaries.join("\n") };
}

async function getMoverTickers(moversTool: McpTool): Promise<string[]> {
  const raw = await moversTool.invoke({});
  const { data } = parseAlpacaToolResult<MarketMoversData>(raw);
  return [...data.gainers, ...data.losers].map((m) => m.symbol).slice(0, 6);
}

// function summarizeChain(data: OptionChainData): string {
//   return Object.entries(data.snapshots)
//     .slice(0, 5)
//     .map(([symbol, snap]) => {
//       const price = snap.latestQuote ? `bid ${snap.latestQuote.bp}/ask ${snap.latestQuote.ap}` : "no quote";
//       const iv = snap.impliedVolatility !== undefined ? `IV ${(snap.impliedVolatility * 100).toFixed(1)}%` : "IV n/a";
//       return `${symbol}: ${price}, ${iv}`;
//     })
//     .join(" | ");
// }


function summarizeChain(data: OptionChainData): string {
  const liquid = Object.entries(data.snapshots).filter(
    ([, snap]) => snap.greeks !== undefined && (snap.latestQuote?.bp ?? 0) > 0
  );

  return liquid
    .slice(0, 5)
    .map(([symbol, snap]) => {
      const q = snap.latestQuote!;
      const iv = (snap.impliedVolatility! * 100).toFixed(1);
      const delta = snap.greeks!.delta.toFixed(3);
      const theta = snap.greeks!.theta.toFixed(3);
      return `${symbol}: bid ${q.bp}/ask ${q.ap}, IV ${iv}%, delta ${delta}, theta ${theta}`;
    })
    .join(" | ");
}