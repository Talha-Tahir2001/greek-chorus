// Path: lib/mcp/alpaca-types.ts
export interface AlpacaBar {
  c: number
  h: number
  l: number
  o: number
  v: number
  vw: number
  n: number
  t: string
}
export interface AlpacaQuote {
  ap: number
  as: number
  ax: string
  bp: number
  bs: number
  bx: string
  c?: string
  t: string
}
export interface AlpacaTrade {
  p: number
  s: number
  t: string
  x: string
  c?: string
}

export interface OptionGreeks {
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
}

export interface OptionSnapshot {
  dailyBar?: AlpacaBar
  minuteBar?: AlpacaBar
  prevDailyBar?: AlpacaBar
  latestQuote?: AlpacaQuote
  latestTrade?: AlpacaTrade
  greeks?: OptionGreeks
  impliedVolatility?: number
}

export interface OptionChainData {
  snapshots: Record<string, OptionSnapshot>
  next_page_token?: string | null
}

export interface MarketMoversData {
  gainers: { symbol: string; percent_change?: number }[]
  losers: { symbol: string; percent_change?: number }[]
}
