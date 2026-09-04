import { NextResponse } from "next/server"
import { getAlpaca } from "@/lib/alpaca/client"

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const positions: any[] = await getAlpaca().trading.positions.getAllOpenPositions()
    const data = positions.map((p) => ({
      symbol: String(p.symbol),
      qty: String(p.qty),
      avgEntryPrice: String(p.avg_entry_price),
      currentPrice: String(p.current_price),
      unrealizedPl: String(p.unrealized_pl),
      unrealizedPlpc: String(p.unrealized_plpc),
      side: String(p.side),
      assetClass: String(p.asset_class),
    }))
    return NextResponse.json({ positions: data })
  } catch (err) {
    console.error("[api/positions] Failed to fetch positions:", err)
    return NextResponse.json({ positions: [] }, { status: 200 })
  }
}
