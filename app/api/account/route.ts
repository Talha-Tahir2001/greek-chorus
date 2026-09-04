import { NextResponse } from "next/server"
import { getAlpaca } from "@/lib/alpaca/client"

export async function GET() {
  try {
    const account = await getAlpaca().trading.account.getAccount()
    const positions = await getAlpaca().trading.positions.getAllOpenPositions()
    return NextResponse.json({
      equity: Number(account.equity),
      buyingPower: Number(account.buying_power),
      positionsCount: positions.length,
    })
  } catch (err) {
    console.error("[api/account] Failed to fetch account:", err)
    return NextResponse.json({ equity: 0, buyingPower: 0, positionsCount: 0 }, { status: 200 })
  }
}
