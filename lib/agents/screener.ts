// Path: lib/agents/screener.ts
import { getAlpacaMcpTools, type McpTool } from "@/lib/mcp/client"
import { parseAlpacaToolResult } from "@/lib/mcp/parse-result"
import type { MarketMoversData, OptionChainData } from "@/lib/mcp/alpaca-types"

const FALLBACK_TICKERS = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA"]

function findTool(tools: McpTool[], name: string): McpTool | undefined {
  return tools.find((t) => t.name === name)
}

export async function screenCandidates(): Promise<{
  tickers: string[]
  marketData: string
}> {
  const tools = await getAlpacaMcpTools()
  const moversTool = findTool(tools, "get_market_movers")
  const chainTool = findTool(tools, "get_option_chain")

  const tickers = moversTool
    ? await getMoverTickers(moversTool)
    : FALLBACK_TICKERS

  const chainSummaries = await Promise.all(
    tickers.map(async (ticker) => {
      if (!chainTool) return `${ticker}: no chain tool available`
      try {
        const raw = await chainTool.invoke({ underlying_symbol: ticker })
        const { data } = parseAlpacaToolResult<OptionChainData>(raw)
        return `${ticker}: ${summarizeChain(data)}`
      } catch (err) {
        console.warn(`[screener] get_option_chain failed for ${ticker}:`, err)
        return `${ticker}: chain lookup failed, skip`
      }
    })
  )

  return { tickers, marketData: chainSummaries.join("\n") }
}

async function getMoverTickers(moversTool: McpTool): Promise<string[]> {
  try {
    const raw = await moversTool.invoke({ market_type: "stocks", top: 5 })
    const { data } = parseAlpacaToolResult<MarketMoversData>(raw)
    // const tickers = [...data.gainers, ...data.losers]
    //   .map((m) => m.symbol)
    //   .slice(0, 6)
    const gainers = data.gainers
      .map((m) => m.symbol)
      .slice(0, 3)

    const losers = data.losers
      .map((m) => m.symbol)
      .slice(0, 3)

    const tickers = [...new Set([...gainers, ...losers])]

    console.log("[screener] market movers:", tickers)
    return tickers.length > 0 ? tickers : FALLBACK_TICKERS
  } catch (err) {
    console.warn(
      "[screener] get_market_movers failed, using fallback basket:",
      err
    )
    return FALLBACK_TICKERS
  }
  // return FALLBACK_TICKERS;
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
  )

  return liquid
    .slice(0, 5)
    .map(([symbol, snap]) => {
      const q = snap.latestQuote!
      const iv = (snap.impliedVolatility! * 100).toFixed(1)
      const delta = snap.greeks!.delta.toFixed(3)
      const theta = snap.greeks!.theta.toFixed(3)
      return `${symbol}: bid ${q.bp}/ask ${q.ap}, IV ${iv}%, delta ${delta}, theta ${theta}`
    })
    .join(" | ")
}
