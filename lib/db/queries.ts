// Path: lib/db/queries.ts
import { db } from "./index";
import { sessions, sessionMessages, decisions, equitySnapshots } from "./schema";
import type { PersonaMessage, RiskGateOutcome } from "@/lib/agents/state";
import { desc, eq } from "drizzle-orm";

export async function createSession(tickersScreened: string[]) {
  const [row] = await db.insert(sessions).values({ tickersScreened, status: "pending" }).returning();
  return row;
}

export async function logPersonaMessages(sessionId: string, messages: PersonaMessage[]) {
  if (messages.length === 0) return;
  await db.insert(sessionMessages).values(
    messages.map((m) => ({ sessionId, persona: m.persona, content: m.content, stance: m.stance as "bullish" | "bearish" | "neutral" }))
  );
}

export async function logDecision(params: {
  sessionId: string;
  ticker: string;
  action: "open" | "close" | "skip";
  legs?: Record<string, unknown>[];
  riskGate: RiskGateOutcome;
  alpacaOrderId?: string;
}) {
  await db.insert(decisions).values({
    sessionId: params.sessionId,
    ticker: params.ticker,
    action: params.action,
    legs: params.legs,
    riskGateVerdict: params.riskGate.verdict as "approved" | "rejected" | "resized",
    riskGateReasoning: params.riskGate.reasoning,
    alpacaOrderId: params.alpacaOrderId,
  });
}

export async function logEquitySnapshot(sessionId: string, equity: number, buyingPower: number) {
  await db.insert(equitySnapshots).values({ sessionId, equity: equity.toString(), buyingPower: buyingPower.toString() });
}

export async function markSessionStatus(sessionId: string, status: "executed" | "skipped") {
  await db.update(sessions).set({ status }).where(eq(sessions.id, sessionId));
}

export async function getSessionDetail(sessionId: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) return null;
  const messages = await db
    .select()
    .from(sessionMessages)
    .where(eq(sessionMessages.sessionId, sessionId))
    .orderBy(sessionMessages.createdAt);
  const [decision] = await db
    .select()
    .from(decisions)
    .where(eq(decisions.sessionId, sessionId))
    .orderBy(desc(decisions.createdAt))
    .limit(1);
  return { session, messages, decision };
}

export async function listSessions(limit = 30) {
  return db.select().from(sessions).orderBy(desc(sessions.createdAt)).limit(limit);
}

export async function updateSessionTickers(sessionId: string, tickersScreened: string[]) {
  await db.update(sessions).set({ tickersScreened }).where(eq(sessions.id, sessionId));
}
