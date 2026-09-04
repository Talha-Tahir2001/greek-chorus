"use client"

import { useEffect, useState, useCallback, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { IconMessages, IconArrowRight } from "@tabler/icons-react"

interface Session {
  id: string
  createdAt: string
  tickersScreened: string[]
  status: "pending" | "executed" | "skipped"
  latestMessage?: string
  riskVerdict?: string
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  executed: "default",
  pending: "secondary",
  skipped: "destructive",
}

const verdictVariant: Record<string, "default" | "secondary" | "destructive"> = {
  approved: "default",
  resized: "secondary",
  rejected: "destructive",
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function SessionsListPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions")
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      void fetchData()
    })
  }, [fetchData, startTransition])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[80px] rounded-none" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs">All Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <IconMessages className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              No sessions yet. The agent runs hourly during market hours.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/desk/sessions/${session.id}`}
                  className="flex items-center justify-between gap-3 rounded-none border p-3 text-xs transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {session.tickersScreened?.join(", ") || "Screening..."}
                      </span>
                      <Badge variant={statusVariant[session.status]} className="text-[10px]">
                        {session.status}
                      </Badge>
                      {session.riskVerdict && (
                        <Badge variant={verdictVariant[session.riskVerdict]} className="text-[10px]">
                          {session.riskVerdict}
                        </Badge>
                      )}
                    </div>
                    {session.latestMessage && (
                      <p className="mt-1 truncate text-muted-foreground">
                        {session.latestMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground">
                      {formatTime(session.createdAt)}
                    </span>
                    <IconArrowRight className="size-3 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
