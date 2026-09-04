"use client"

import { useEffect, useState, useCallback, useTransition } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { SessionTranscript } from "@/components/desk/session-transcript"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react"

interface SessionMessage {
  id: string
  persona: string
  content: string
  stance: "bullish" | "bearish" | "neutral"
  createdAt: string
}

interface Decision {
  id: string
  ticker: string
  action: "open" | "close" | "skip"
  riskGateVerdict: "approved" | "rejected" | "resized"
  riskGateReasoning: string
  alpacaOrderId: string | null
  legs: Record<string, unknown>[] | null
}

interface Session {
  id: string
  createdAt: string
  tickersScreened: string[]
  status: string
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  executed: "default",
  pending: "secondary",
  skipped: "destructive",
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function SessionDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [decision, setDecision] = useState<Decision | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions?id=${id}`)
      const data = await res.json()
      setSession(data.session)
      setMessages(data.messages || [])
      setDecision(data.decision || null)
    } catch (err) {
      console.error("Failed to fetch session:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      void fetchData()
    })
  }, [fetchData, startTransition])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px] rounded-none" />
        <Skeleton className="h-[400px] rounded-none" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">Session not found.</p>
        <Link href="/desk">
          <Button variant="outline" size="sm">
            <IconArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/desk"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <IconArrowLeft className="size-3" />
            Dashboard
          </Link>
          <h2 className="font-heading text-lg font-bold">
            Session — {session.tickersScreened?.join(", ") || "Screening..."}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(session.createdAt)}</span>
            <Badge variant={statusVariant[session.status]} className="text-[10px]">
              {session.status}
            </Badge>
          </div>
        </div>
        {decision?.alpacaOrderId && (
          <Button variant="outline" size="sm" render={<a href={`https://app.alpaca.markets/paper-dashboard/overview`} target="_blank" rel="noopener noreferrer" />}>
            <IconExternalLink className="size-4" />
            View in Alpaca
          </Button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Debate Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No messages recorded for this session.
              </div>
            ) : (
              <SessionTranscript messages={messages} decision={decision} />
            )}
          </CardContent>
        </Card>

        {/* Sidebar summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs">Screened Basket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {session.tickersScreened?.map((ticker) => (
                  <Badge key={ticker} variant="outline" className="text-[10px]">
                    {ticker}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {decision && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs">Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticker</span>
                  <span className="font-medium">{decision.ticker}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Action</span>
                  <span className="font-medium">{decision.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Verdict</span>
                  <Badge
                    variant={
                      decision.riskGateVerdict === "approved"
                        ? "default"
                        : decision.riskGateVerdict === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {decision.riskGateVerdict}
                  </Badge>
                </div>
                {decision.legs && decision.legs.length > 0 && (
                  <div className="pt-2">
                    <span className="text-muted-foreground">Legs</span>
                    <pre className="mt-1 overflow-auto rounded-none bg-muted p-2 text-[10px]">
                      {JSON.stringify(decision.legs, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
