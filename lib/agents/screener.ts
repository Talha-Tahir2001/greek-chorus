// Path: lib/agents/screener.ts

import { getAlpacaMcpTools, type McpTool } from "@/lib/mcp/client"
import { parseAlpacaToolResult } from "@/lib/mcp/parse-result"
import type {
  MarketMoversData,
  OptionChainData,
  OptionSnapshot,
} from "@/lib/mcp/alpaca-types"
import type { ContractQuote } from "./state"

const FALLBACK_TICKERS = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA"]

const MAX_EXPIRATIONS = 3
const CONTRACTS_PER_EXPIRATION = 8

function findTool(tools: McpTool[], name: string): McpTool | undefined {
  return tools.find((t) => t.name === name)
}

interface ParsedContract extends ContractQuote {
  snapshot: OptionSnapshot
}

export async function screenCandidates(): Promise<{
  tickers: string[]
  marketData: string
  contractUniverse: ContractQuote[]
}> {
  const tools = await getAlpacaMcpTools()

  const moversTool = findTool(tools, "get_market_movers")
  const chainTool = findTool(tools, "get_option_chain")

  if (!chainTool) {
    return {
      tickers: FALLBACK_TICKERS,
      marketData: "No option chain tool available",
      contractUniverse: [],
    }
  }

  const candidateTickers = moversTool
    ? await getMoverTickers(moversTool)
    : FALLBACK_TICKERS

  const validCandidates = await Promise.all(
    candidateTickers.map(async (ticker) => {
      try {
        const raw = await chainTool.invoke({
          underlying_symbol: ticker,
        })

        const { data } = parseAlpacaToolResult<OptionChainData>(raw)

        const universe = buildContractUniverse(data, ticker)

        if (!universe) {
          console.warn(
            `[screener] skipping ${ticker}: no usable future contracts`
          )
          return null
        }

        return {
          ticker,
          contracts: universe.contracts,
          summary: universe.summary,
        }
      } catch (err) {
        console.warn(`[screener] skipping non-optionable mover ${ticker}:`, err)
        return null
      }
    })
  )

  const valid = validCandidates.filter(
    (candidate): candidate is {
      ticker: string
      contracts: ContractQuote[]
      summary: string
    } => candidate !== null
  )

  // If the market movers produced nothing usable, try the fallback
  // basket through the exact same contract-universe pipeline.
  if (valid.length === 0) {
    console.warn(
      "[screener] no valid optionable movers, trying fallback basket"
    )

    const fallbackCandidates = await Promise.all(
      FALLBACK_TICKERS.map(async (ticker) => {
        try {
          const raw = await chainTool.invoke({
            underlying_symbol: ticker,
          })

          const { data } = parseAlpacaToolResult<OptionChainData>(raw)

          const universe = buildContractUniverse(data, ticker)

          if (!universe) {
            console.warn(
              `[screener] fallback ${ticker}: no usable future contracts`
            )
            return null
          }

          return {
            ticker,
            contracts: universe.contracts,
            summary: universe.summary,
          }
        } catch (err) {
          console.warn(
            `[screener] fallback chain lookup failed for ${ticker}:`,
            err
          )
          return null
        }
      })
    )

    const fallbackValid = fallbackCandidates.filter(
      (candidate): candidate is {
        ticker: string
        contracts: ContractQuote[]
        summary: string
      } => candidate !== null
    )

    if (fallbackValid.length === 0) {
      return {
        tickers: FALLBACK_TICKERS,
        marketData: "No usable option contracts found",
        contractUniverse: [],
      }
    }

    const fallbackTickers = fallbackValid.map((candidate) => candidate.ticker)

    const fallbackMarketData = fallbackValid
      .map((candidate) => `${candidate.ticker}:\n${candidate.summary}`)
      .join("\n\n")

    console.log("[screener] usable fallback contracts:", fallbackTickers)

    return {
      tickers: fallbackTickers,
      marketData: fallbackMarketData,
      contractUniverse: [],
    }
  }

  const tickers = valid.map((candidate) => candidate.ticker)

  const marketData = valid
    .map((candidate) => `${candidate.ticker}:\n${candidate.summary}`)
    .join("\n\n")

  console.log("[screener] optionable market movers:", tickers)

  return {
    tickers,
    marketData,
    contractUniverse: valid.flatMap((candidate) => candidate.contracts),
  }
}

async function getMoverTickers(moversTool: McpTool): Promise<string[]> {
  try {
    const raw = await moversTool.invoke({
      market_type: "stocks",
      top: 5,
    })

    const { data } = parseAlpacaToolResult<MarketMoversData>(raw)

    const gainers = data.gainers.map((m) => m.symbol).slice(0, 3)

    const losers = data.losers.map((m) => m.symbol).slice(0, 3)

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
}

/**
 * Build a compact but real contract universe from Alpaca's
 * option chain.
 *
 * We:
 * 1. Parse expiration / type / strike from the OCC symbol.
 * 2. Remove expired contracts.
 * 3. Remove contracts without usable quotes/Greeks/IV.
 * 4. Keep the nearest few expirations.
 * 5. Select contracts across useful delta ranges.
 */

function buildContractUniverse(
  data: OptionChainData,
  ticker: string
): {
  contracts: ContractQuote[]
  summary: string
} | null {
  const today = new Date().toISOString().slice(0, 10)

  const contracts: ParsedContract[] = []

  for (const [symbol, snapshot] of Object.entries(data.snapshots)) {
    const parsed = parseOccSymbol(symbol)

    if (!parsed) continue

    if (parsed.expiration < today) continue

    const quote = snapshot.latestQuote
    const greeks = snapshot.greeks
    const iv = snapshot.impliedVolatility

    if (!quote || !greeks || iv === undefined) {
      continue
    }

    if (quote.bp <= 0 || quote.ap <= 0) {
      continue
    }

    if (quote.ap < quote.bp) {
      continue
    }

    contracts.push({
      symbol,
      ticker,
      snapshot,
      expiration: parsed.expiration,
      type: parsed.type,
      strike: parsed.strike,
      bid: quote.bp,
      ask: quote.ap,
      impliedVolatility: iv,
      delta: greeks.delta,
      gamma: greeks.gamma,
      theta: greeks.theta,
      vega: greeks.vega,
    })
  }

  if (contracts.length === 0) {
    return null
  }

  const expirations = [
    ...new Set(contracts.map((contract) => contract.expiration)),
  ]
    .sort()
    .slice(0, MAX_EXPIRATIONS)

  const selected: ParsedContract[] = []

  for (const expiration of expirations) {
    const expirationContracts = contracts.filter(
      (contract) => contract.expiration === expiration
    )

    const calls = expirationContracts.filter(
      (contract) => contract.type === "call"
    )

    const puts = expirationContracts.filter(
      (contract) => contract.type === "put"
    )

    selected.push(
      ...selectByDelta(calls, Math.floor(CONTRACTS_PER_EXPIRATION / 2))
    )

    selected.push(
      ...selectByDelta(puts, Math.floor(CONTRACTS_PER_EXPIRATION / 2))
    )
  }

  if (selected.length === 0) {
    return null
  }

  const summary = selected
    .sort((a, b) => {
      if (a.expiration !== b.expiration) {
        return a.expiration.localeCompare(b.expiration)
      }

      if (a.type !== b.type) {
        return a.type === "put" ? -1 : 1
      }

      return a.strike - b.strike
    })
    .map(formatContract)
    .join("\n")

  return {
    contracts: selected,
    summary,
  }
}

/**
 * Select contracts closest to useful delta buckets.
 *
 * We deliberately don't just take the first N contracts
 * returned by Alpaca because chain ordering is not a trading
 * strategy.
 */
function selectByDelta(
  contracts: ParsedContract[],
  count: number
): ParsedContract[] {
  const targets = [0.2, 0.35, 0.5, 0.65]

  const selected: ParsedContract[] = []

  for (const target of targets) {
    if (selected.length >= count) {
      break
    }

    const candidate = contracts
      .filter((contract) => !selected.includes(contract))
      .sort((a, b) => {
        const deltaA = Math.abs(Math.abs(a.snapshot.greeks!.delta) - target)

        const deltaB = Math.abs(Math.abs(b.snapshot.greeks!.delta) - target)

        return deltaA - deltaB
      })[0]

    if (candidate) {
      selected.push(candidate)
    }
  }

  return selected
}

function formatContract(contract: ParsedContract): string {
  const quote = contract.snapshot.latestQuote!
  const greeks = contract.snapshot.greeks!
  const iv = contract.snapshot.impliedVolatility!

  return [
    `  ${contract.expiration}`,
    `    ${contract.type.toUpperCase()} ${contract.strike}`,
    `      symbol=${contract.symbol}`,
    `      bid=${quote.bp.toFixed(2)}`,
    `      ask=${quote.ap.toFixed(2)}`,
    `      IV=${(iv * 100).toFixed(1)}%`,
    `      delta=${greeks.delta.toFixed(3)}`,
    `      gamma=${greeks.gamma.toFixed(4)}`,
    `      theta=${greeks.theta.toFixed(4)}`,
    `      vega=${greeks.vega.toFixed(4)}`,
  ].join("\n")
}

/**
 * Parse an OCC option symbol from the right-hand side.
 *
 * Example:
 * AAPL260904C00375000
 *
 * -> underlying: AAPL
 * -> expiration: 2026-09-04
 * -> type: call
 * -> strike: 375
 */
function parseOccSymbol(symbol: string): {
  underlying: string
  expiration: string
  type: "call" | "put"
  strike: number
} | null {
  const match = symbol.match(/^(.+?)(\d{6})([CP])(\d{8})$/)

  if (!match) {
    return null
  }

  const [, underlying, dateCode, typeCode, strikeCode] = match

  const year = `20${dateCode.slice(0, 2)}`
  const month = dateCode.slice(2, 4)
  const day = dateCode.slice(4, 6)

  const expiration = `${year}-${month}-${day}`

  const strike = Number.parseInt(strikeCode, 10) / 1000

  return {
    underlying,
    expiration,
    type: typeCode === "C" ? "call" : "put",
    strike,
  }
}
