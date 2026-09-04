import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Position {
  symbol: string
  qty: string
  avgEntryPrice: string
  currentPrice: string
  unrealizedPl: string
  unrealizedPlpc: string
  side: string
}

interface PositionsTableProps {
  positions: Position[]
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value))
}

function formatPct(value: string) {
  const pct = Number(value) * 100
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
}

export function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs">Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No open positions.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Avg Entry</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="text-right">P&L %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((pos) => {
                const pl = Number(pos.unrealizedPl)
                const plpc = Number(pos.unrealizedPlpc) * 100
                return (
                  <TableRow key={pos.symbol}>
                    <TableCell className="font-medium">{pos.symbol}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-xs",
                          pos.side === "long" ? "text-emerald-500" : "text-red-500"
                        )}
                      >
                        {pos.side}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{pos.qty}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(pos.avgEntryPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(pos.currentPrice)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        pl >= 0 ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {formatCurrency(pos.unrealizedPl)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        plpc >= 0 ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {formatPct(pos.unrealizedPlpc)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
