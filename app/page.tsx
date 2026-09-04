import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  IconTrendingUp,
  IconWind,
  IconTrendingDown,
  IconArrowRight,
  IconRosetteDiscountCheck,
} from "@tabler/icons-react"

const personas = [
  {
    name: "Premium Seller",
    icon: IconTrendingUp,
    description: "Sells covered calls and cash-secured puts to harvest time decay on high-IV underlyings.",
    stance: "Income-focused",
  },
  {
    name: "Volatility Hunter",
    icon: IconWind,
    description: "Waits for IV expansion to sell iron condors and strangles on names with elevated rank.",
    stance: "Neutralvol",
  },
  {
    name: "Contrarian",
    icon: IconTrendingDown,
    description: "Mean-reversion trades on overextended names, buying cheap premium when sentiment extreme.",
    stance: "Mean-reversion",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-4 text-xs">
          Alpaca AI Trading Agents Hackathon
        </Badge>
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Options Desk
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          A multi-persona strategy committee. Three AI agents debate options trades in real time,
          a risk manager enforces hard gates, and only approved trades hit the market.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/desk">
            <Button>
              Enter Desk
              <IconArrowRight className="size-4" />
            </Button>
          </Link>
          <Button variant="outline" render={<a href="https://github.com" target="_blank" rel="noopener noreferrer" />}>
            View Source
          </Button>
        </div>
      </section>

      {/* Agent cards */}
      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center font-heading text-lg font-bold">The Committee</h2>
          <p className="mb-8 text-center text-xs text-muted-foreground">
            Each agent embodies a distinct options philosophy. They debate, disagree, and only act by majority vote.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {personas.map((p) => (
              <Card key={p.name}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex size-8 items-center justify-center rounded-none bg-primary/10 text-primary">
                    <p.icon className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs">{p.name}</CardTitle>
                    <Badge variant="outline" className="mt-0.5 text-[10px]">
                      {p.stance}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-center font-heading text-lg font-bold">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Screener", text: "Selects a basket of liquid, high-IV underlyings each cycle." },
              { step: "2", title: "Debate", text: "Three agents argue for or against a candidate ticker in parallel." },
              { step: "3", title: "Majority Vote", text: "Aggregator decides by 2-of-3 consensus — no unanimous requirement." },
              { step: "4", title: "Risk Gate", text: "Hard limits on Greeks, position sizing, and IV rank thresholds." },
              { step: "5", title: "Execution", text: "Approved trades submitted to Alpaca's Options Trading API." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary text-xs font-bold text-primary-foreground">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xs font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center text-[10px] text-muted-foreground">
        <div className="flex items-center justify-center gap-1">
          <IconRosetteDiscountCheck className="size-3" />
          Built for the Alpaca AI Trading Agents Hackathon — Aug 28 – Sep 4, 2026
        </div>
      </footer>
    </div>
  )
}
