// Path: app/api/cron/run-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildGraph } from "@/lib/agents/graph";
import { createSession } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await createSession([]);
  const graph = buildGraph();
  const result = await graph.invoke({ sessionId: session.id });

  return NextResponse.json({ sessionId: session.id, finalTicker: result.finalTicker, riskGate: result.riskGate });
}