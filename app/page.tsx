// Path: app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconTrendingUp,
  IconWind,
  IconTrendingDown,
  IconArrowRight,
  IconRosetteDiscountCheck,
} from "@tabler/icons-react";

const personas = [
  {
    name: "Premium Seller",
    icon: IconTrendingUp,
    description: "Sells covered calls and cash-secured puts to harvest time decay on high-IV underlyings.",
    stance: "Income-focused",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    name: "Volatility Hunter",
    icon: IconWind,
    description: "Waits for IV expansion to sell iron condors and strangles on names with elevated rank.",
    stance: "Neutral Vol",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    name: "Contrarian",
    icon: IconTrendingDown,
    description: "Mean-reversion trades on overextended names, buying cheap premium when sentiment extreme.",
    stance: "Mean-reversion",
    bg: "bg-lime-50 dark:bg-lime-950/20",
    color: "text-lime-600 dark:text-lime-400",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Hero Section - Clean version */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Badge variant="outline" className="mb-4 border-border/50 text-[10px] uppercase tracking-[0.2em]">
          Alpaca AI Trading Agents Hackathon
        </Badge>
        <h1 className="text-4xl font-heading font-semibold tracking-tight sm:text-5xl">
          GREEK CHORUS
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Three AI personas debate every trade — a premium seller, a volatility hunter, a
          contrarian — before a risk manager decides what actually reaches the market.
        </p>
                
        <div className="mt-8 w-full max-w-lg border border-border p-4 text-left font-mono text-xs leading-relaxed text-muted-foreground">
          <p><span className="text-foreground">PREMIUM SELLER —</span> High IV, defined-risk credit spread on the table.</p>
          <p className="mt-2"><span className="text-foreground">VOLATILITY HUNTER —</span> Agreed. Premium&apos;s rich here.</p>
          <p className="mt-2"><span className="text-foreground">CONTRARIAN —</span> Disagree. Recent run looks overextended.</p>
          <p className="mt-2"><span className="text-foreground">RISK MANAGER —</span> Approved. Sized to 5% of equity.</p>
        </div>

        <div className="mt-8 flex gap-3">
          <Button>
            <Link href="/desk" className="flex items-center">
              Enter the Desk
              <IconArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button variant="outline">
            <a href="https://github.com/Talha-Tahir2001/greek-chorus" target="_blank" rel="noopener noreferrer">
              View Source
            </a>
          </Button>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center font-semibold tracking-tight font-heading">The Committee</h2>
          <p className="mb-8 text-center text-xs text-muted-foreground">
            Each agent embodies a distinct options philosophy. They debate, disagree, and only act by majority vote.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {personas.map((p) => (
              <Card key={p.name} className="border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className={`flex size-9 items-center justify-center rounded-full ${p.bg} ${p.color}`}>
                    <p.icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold font-heading">{p.name}</CardTitle>
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

      <section className="px-6 py-16">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-6 text-center font-heading font-semibold tracking-tight">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Screener", text: "Selects a basket of liquid, high-IV underlyings each cycle." },
              { step: "2", title: "Debate", text: "Three agents argue for or against a candidate ticker in parallel." },
              { step: "3", title: "Majority Vote", text: "Aggregator decides by 2-of-3 consensus — no unanimous requirement." },
              { step: "4", title: "Risk Gate", text: "Hard limits on Greeks, position sizing, and IV rank thresholds." },
              { step: "5", title: "Execution", text: "Approved trades submitted to Alpaca's Options Trading API." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/50 text-xs text-primary font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold font-heading">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

  
      <footer className="border-t px-6 py-6 text-center text-[10px] text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <IconRosetteDiscountCheck className="size-3" />
          Built for the Alpaca AI Trading Agents Hackathon — Aug 28 – Sep 4, 2026
        </div>
      </footer>
    </div>
  );
}