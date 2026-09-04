"use client"

import { useEffect, useState, useCallback, useTransition } from "react"
import { MetricCard } from "@/components/desk/metric-card"
import { EquityChart } from "@/components/desk/equity-chart"
import { SessionFeed } from "@/components/desk/session-feed"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IconCash,
  IconWallet,
  IconBriefcase,
  IconCalendarEvent,
} from "@tabler/icons-react"

interface AccountData {
  equity: number
  buyingPower: number
  positionsCount: number
}

interface Session {
  id: string
  createdAt: string
  tickersScreened: string[]
  status: "pending" | "executed" | "skipped"
  latestMessage?: string
  riskVerdict?: string
}

interface EquitySnapshot {
  timestamp: string
  equity: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

export default function DeskPage() {
  const [account, setAccount] = useState<AccountData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [equityData, setEquityData] = useState<EquitySnapshot[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [accountRes, sessionsRes] = await Promise.all([
        fetch("/api/account"),
        fetch("/api/sessions"),
      ])
      const accountData = await accountRes.json()
      const sessionsData = await sessionsRes.json()
      setAccount(accountData)
      setSessions(sessionsData.sessions || [])
      setEquityData(sessionsData.equitySnapshots || [])
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      void fetchData()
    })
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData, startTransition])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-none" />
          ))}
        </div>
        <Skeleton className="h-[340px] rounded-none" />
        <Skeleton className="h-[200px] rounded-none" />
      </div>
    )
  }

  const equityChange =
    equityData.length >= 2
      ? ((equityData[equityData.length - 1].equity - equityData[0].equity) /
          equityData[0].equity) *
        100
      : undefined

  const todaySessions = sessions.filter((s) => {
    const d = new Date(s.createdAt)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Equity"
          value={account ? formatCurrency(account.equity) : "$100,000"}
          change={equityChange}
          icon={<IconCash className="size-4" />}
        />
        <MetricCard
          title="Buying Power"
          value={account ? formatCurrency(account.buyingPower) : "--"}
          icon={<IconWallet className="size-4" />}
        />
        <MetricCard
          title="Open Positions"
          value={account ? `${account.positionsCount}` : "0"}
          icon={<IconBriefcase className="size-4" />}
        />
        <MetricCard
          title="Sessions Today"
          value={`${todaySessions.length}`}
          icon={<IconCalendarEvent className="size-4" />}
        />
      </div>

      <EquityChart data={equityData} />

      <SessionFeed sessions={sessions.slice(0, 10)} />
    </div>
  )
}
