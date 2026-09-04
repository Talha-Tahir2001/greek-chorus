import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface MetricCardProps {
  title: string
  value: string
  change?: number
  icon?: ReactNode
  className?: string
}

export function MetricCard({ title, value, change, icon, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="font-heading text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p
            className={cn(
              "mt-1 text-xs",
              change >= 0 ? "text-emerald-500" : "text-red-500"
            )}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </p>
        )}
      </CardContent>
    </Card>
  )
}
