// Path: lib/db/queries.ts
import { db } from "./index";
import { sessions, sessionMessages, decisions, equitySnapshots } from "./schema";
import type { PersonaMessage, RiskGateOutcome } from "@/lib/agents/state";

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

import { eq } from "drizzle-orm";