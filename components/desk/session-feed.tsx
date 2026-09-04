import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconArrowRight } from "@tabler/icons-react"

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
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

interface SessionFeedProps {
  sessions: Session[]
}

export function SessionFeed({ sessions }: SessionFeedProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs">Recent Sessions</CardTitle>
        <Link
          href="/desk/sessions"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View all <IconArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No sessions yet. The agent runs hourly during market hours.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/desk/sessions/${session.id}`}
                className="flex items-center justify-between rounded-none border p-3 text-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
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
                    <p className="truncate text-muted-foreground">{session.latestMessage}</p>
                  )}
                </div>
                <span className="shrink-0 text-muted-foreground">{formatTime(session.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
