import { NextResponse } from "next/server"
import { getAlpaca } from "@/lib/alpaca/client"

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const positions = await getAlpaca().trading.positions.getAllOpenPositions()
    const data = positions.map((p) => ({
      symbol: String(p.symbol),
      qty: String(p.qty),
      avgEntryPrice: String(p.avgEntryPrice),
      currentPrice: String(p.currentPrice),
      unrealizedPl: String(p.unrealizedPl),
      unrealizedPlpc: String(p.unrealizedPlpc),
      side: String(p.side),
      assetClass: String(p.assetClass),
    }))
    return NextResponse.json({ positions: data })
  } catch (err) {
    console.error("[api/positions] Failed to fetch positions:", err)
    return NextResponse.json({ positions: [] }, { status: 200 })
  }
}
