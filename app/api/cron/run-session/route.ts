// Path: app/api/cron/run-session/route.ts
import { after, NextRequest, NextResponse } from "next/server";
import { buildGraph } from "@/lib/agents/graph";
import { createSession } from "@/lib/db/queries";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await createSession([]);
   after(async () => {
    try {
      const graph = buildGraph();
      const result = await graph.invoke({ sessionId: session.id });
      console.log(`[cron] session ${session.id} complete:`, result.finalTicker, result.riskGate);
    } catch (err) {
      console.error(`[cron] session ${session.id} failed:`, err);
    }
  });
  // const graph = buildGraph();
  // const result = await graph.invoke({ sessionId: session.id });
return NextResponse.json({ started: true, sessionId: session.id }, { status: 202 });
  // return NextResponse.json({ sessionId: session.id, finalTicker: result.finalTicker, riskGate: result.riskGate });
}