// Path: lib/agents/graph.ts
import { StateGraph, START, END } from "@langchain/langgraph"
import { GraphState, type GraphStateType } from "./state"
import { screenCandidates } from "./screener"
import { premiumSeller } from "./personas/premium-seller"
import { volatilityHunter } from "./personas/volatility-hunter"
import { contrarian } from "./personas/contrarian"
import { runRiskGate } from "./risk-manager"
import type { PersonaProposal } from "./schemas"
import { getAccountState, executeDecision } from "./execution"
import {
  // createSession,
  logPersonaMessages,
  logDecision,
  logEquitySnapshot,
  markSessionStatus,
} from "@/lib/db/queries"

const personas = [premiumSeller, volatilityHunter, contrarian]

function majorityDecision(
  proposals: (PersonaProposal & { persona: string })[]
) {
  const active = proposals.filter((p) => p.ticker !== "NONE")
  if (active.length < 2) return null
  const byTicker = new Map<string, (PersonaProposal & { persona: string })[]>()
  for (const p of active)
    byTicker.set(p.ticker, [...(byTicker.get(p.ticker) ?? []), p])
  const [ticker, group] = [...byTicker.entries()].sort(
    (a, b) => b[1].length - a[1].length
  )[0]
  return group.length >= 2 ? { ticker, group } : null
}

async function screenerNode(): Promise<Partial<GraphStateType>> {
  const { tickers, marketData } = await screenCandidates()
  return { tickersScreened: tickers, marketData }
}

async function committeeNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const proposals = await Promise.all(
    personas.map((propose) =>
      propose({ tickers: state.tickersScreened, marketData: state.marketData })
    )
  )
  return {
    proposals,
    personaMessages: proposals.map((p) => ({
      persona: p.persona,
      content: p.rationale,
      stance: p.stance,
      proposedTicker: p.ticker,
    })),
  }
}

// async function riskGateNode(
//   state: GraphStateType
// ): Promise<Partial<GraphStateType>> {
//   const majority = majorityDecision(state.proposals)
//   if (!majority) {
//     return {
//       riskGate: {
//         verdict: "rejected",
//         reasoning: "No majority consensus this cycle.",
//       },
//       finalTicker: null,
//     }
//   }
//   const verdict = await runRiskGate({
//     proposal: majority.group[0],
//     openPositionsCount: 0,
//     equity: 100000,
//   })
//   return {
//     riskGate: verdict,
//     finalTicker: verdict.verdict === "rejected" ? null : majority.ticker,
//   }
// }

async function riskGateNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const majority = majorityDecision(state.proposals)
  if (!majority) {
    return {
      riskGate: {
        verdict: "rejected",
        reasoning: "No majority consensus this cycle.",
      },
      finalTicker: null,
    }
  }
  const { equity, openPositionsCount } = await getAccountState()
  const verdict = await runRiskGate({
    proposal: majority.group[0],
    openPositionsCount,
    equity,
  })
  return {
    riskGate: verdict,
    finalTicker: verdict.verdict === "rejected" ? null : majority.ticker,
  }
}

async function executionNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const winningProposal =
    state.proposals.find((p) => p.ticker === state.finalTicker) ?? null
  const result = await executeDecision({
    finalTicker: state.finalTicker,
    riskGate: state.riskGate!,
    proposal: winningProposal,
  })

  await logPersonaMessages(state.sessionId, state.personaMessages)
  await logDecision({
    sessionId: state.sessionId,
    ticker: state.finalTicker ?? "NONE",
    action: result.action,
    legs: winningProposal?.proposedLegs,
    riskGate: state.riskGate!,
    alpacaOrderId: result.alpacaOrderId,
  })
  const { equity, buyingPower } = await getAccountState()
  await logEquitySnapshot(state.sessionId, equity, buyingPower)
  await markSessionStatus(
    state.sessionId,
    result.action === "open" ? "executed" : "skipped"
  )

  return {}
}

// Path: lib/agents/graph.ts
export function buildGraph() {
  return new StateGraph(GraphState)
    .addNode("screener", screenerNode)
    .addNode("committee", committeeNode)
    .addNode("riskGate", riskGateNode)
    .addNode("execution", executionNode)
    .addEdge(START, "screener")
    .addEdge("screener", "committee")
    .addEdge("committee", "riskGate")
    .addEdge("riskGate", "execution")
    .addEdge("execution", END)
    .compile();
}
