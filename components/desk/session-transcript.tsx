import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  IconCheck,
  IconX,
  IconAdjustments,
  IconClock,
} from "@tabler/icons-react"

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

interface SessionTranscriptProps {
  messages: SessionMessage[]
  decision: Decision | null
}

const stanceColors: Record<string, string> = {
  bullish: "bg-emerald-500",
  bearish: "bg-red-500",
  neutral: "bg-muted-foreground",
}

const stanceBadgeVariant: Record<string, "default" | "destructive" | "secondary"> = {
  bullish: "default",
  bearish: "destructive",
  neutral: "secondary",
}

const personaIcons: Record<string, string> = {
  "Premium Seller": "PS",
  "Volatility Hunter": "VH",
  "Contrarian": "CT",
  "Risk Manager": "RM",
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

const verdictConfig = {
  approved: { icon: IconCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  rejected: { icon: IconX, color: "text-red-500", bg: "bg-red-500/10" },
  resized: { icon: IconAdjustments, color: "text-amber-500", bg: "bg-amber-500/10" },
}

export function SessionTranscript({ messages, decision }: SessionTranscriptProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-6">
        {messages.map((msg, i) => {
          const initials = personaIcons[msg.persona] || msg.persona.slice(0, 2).toUpperCase()
          return (
            <div key={msg.id} className="relative flex gap-4">
              {/* Timeline node */}
              <div className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                <div
                  className={cn(
                    "size-3 rounded-full ring-4 ring-background",
                    stanceColors[msg.stance] || "bg-muted-foreground"
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-none bg-muted text-[10px] font-bold">
                    {initials}
                  </div>
                  <span className="text-xs font-semibold">{msg.persona}</span>
                  <Badge variant={stanceBadgeVariant[msg.stance]} className="text-[10px]">
                    {msg.stance}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <IconClock className="size-3" />
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {msg.content}
                </p>
                {i < messages.length - 1 && <Separator className="mt-4" />}
              </div>
            </div>
          )
        })}

        {/* Risk Gate Decision */}
        {decision && (
          <>
            <Separator />
            <div className="relative flex gap-4">
              <div className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                <div
                  className={cn(
                    "size-3 rounded-full ring-4 ring-background",
                    verdictConfig[decision.riskGateVerdict].color.replace("text-", "bg-")
                  )}
                />
              </div>

              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold">Risk Gate</CardTitle>
                    <Badge
                      variant={
                        decision.riskGateVerdict === "approved"
                          ? "default"
                          : decision.riskGateVerdict === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="flex items-center gap-1 text-[10px]"
                    >
                      {(() => {
                        const V = verdictConfig[decision.riskGateVerdict].icon
                        return <V className="size-3" />
                      })()}
                      {decision.riskGateVerdict}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted-foreground">Ticker:</span>
                    <span className="font-medium">{decision.ticker}</span>
                    <span className="text-muted-foreground">Action:</span>
                    <span className="font-medium">{decision.action}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {decision.riskGateReasoning}
                  </p>
                  {decision.alpacaOrderId && (
                    <p className="text-[10px] text-muted-foreground">
                      Order ID: {decision.alpacaOrderId}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
