"use client"

import { useEffect, useState, useCallback, useTransition } from "react"
import { PositionsTable } from "@/components/desk/positions-table"
import { Skeleton } from "@/components/ui/skeleton"

interface Position {
  symbol: string
  qty: string
  avgEntryPrice: string
  currentPrice: string
  unrealizedPl: string
  unrealizedPlpc: string
  side: string
}

export default function DeskPositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/positions")
      const data = await res.json()
      setPositions(data.positions || [])
    } catch (err) {
      console.error("Failed to fetch positions:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      void fetchPositions()
    })
    const interval = setInterval(fetchPositions, 60_000)
    return () => clearInterval(interval)
  }, [fetchPositions, startTransition])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[120px] rounded-none" />
        <Skeleton className="h-[300px] rounded-none" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PositionsTable positions={positions} />
    </div>
  )
}
