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
import { mapWithLimit } from "../utils/concurrency"
import { withTimeout } from "../utils/timeout"

// const personas = [premiumSeller, volatilityHunter, contrarian]
const personas = [
  { name: "Premium Seller", propose: premiumSeller },
  { name: "Volatility Hunter", propose: volatilityHunter },
  { name: "Contrarian", propose: contrarian },
]

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
  console.log("[graph] screener: start")
  const { tickers, marketData } = await withTimeout(
    screenCandidates(),
    60_000,
    "screener"
  )
  console.log("[graph] screener: done", tickers)
  return { tickersScreened: tickers, marketData }
}

// async function committeeNode(
//   state: GraphStateType
// ): Promise<Partial<GraphStateType>> {
//   const proposals = await Promise.all(
//     personas.map((propose) =>
//       propose({ tickers: state.tickersScreened, marketData: state.marketData })
//     )
//   )
//   return {
//     proposals,
//     personaMessages: proposals.map((p) => ({
//       persona: p.persona,
//       content: p.rationale,
//       stance: p.stance,
//       proposedTicker: p.ticker,
//     })),
//   }
// }

// async function committeeNode(
//   state: GraphStateType
// ): Promise<Partial<GraphStateType>> {
//   const proposals: (PersonaProposal & { persona: string })[] = []
//   for (const propose of personas) {
//     const result = await propose({
//       tickers: state.tickersScreened,
//       marketData: state.marketData,
//     })
//     proposals.push(result)
//   }
//   return {
//     proposals,
//     personaMessages: proposals.map((p) => ({
//       persona: p.persona,
//       content: p.rationale,
//       stance: p.stance,
//       proposedTicker: p.ticker,
//     })),
//   }
// }

// async function committeeNode(
//   state: GraphStateType
// ): Promise<Partial<GraphStateType>> {
//   console.log("[graph] committee: start")
//   const proposals = await withTimeout(
//     mapWithLimit(personas, 2, (propose) =>
//       propose({ tickers: state.tickersScreened, marketData: state.marketData })
//     ),
//     90_000,
//     "committee"
//   )
//   console.log(
//     "[graph] committee: done",
//     proposals.map((p) => p.persona)
//   )
//   return {
//     proposals,
//     personaMessages: proposals.map((p) => ({
//       persona: p.persona,
//       content: p.rationale,
//       stance: p.stance,
//       proposedTicker: p.ticker,
//     })),
//   }
// }

//----------------------------------------
// async function committeeNode(
//   state: GraphStateType
// ): Promise<Partial<GraphStateType>> {
//   console.log("[graph] committee: start")

//   const proposals = await mapWithLimit(personas, 1, async (propose) => {
//     const started = Date.now()

//     try {
//       const proposal = await withTimeout(
//         propose({
//           tickers: state.tickersScreened,
//           marketData: state.marketData,
//         }),
//         240_000,
//         `persona ${propose.name ?? "unknown"}`
//       )

//       console.log(
//         `[graph] persona ${proposal.persona}: done ${Date.now() - started}ms`
//       )

//       return proposal
//     } catch (error) {
//       console.error(
//         `[graph] persona ${propose.name ?? "unknown"} failed:`,
//         error
//       )

//       return null
//     }
//   })

//   const successfulProposals = proposals.filter(
//     (p): p is NonNullable<typeof p> => p !== null
//   )

//   console.log(
//     "[graph] committee: done",
//     successfulProposals.map((p) => p.persona)
//   )

//   return {
//     proposals: successfulProposals,
//     personaMessages: successfulProposals.map((p) => ({
//       persona: p.persona,
//       content: p.rationale,
//       stance: p.stance,
//       proposedTicker: p.ticker,
//     })),
//   }
// }
//--------------------------------------

async function committeeNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("[graph] committee: start")

  const proposals = await withTimeout(
    mapWithLimit(personas, 1, async ({ name, propose }) => {
      const started = Date.now()

      try {
        const proposal = await withTimeout(
          propose({
            tickers: state.tickersScreened,
            marketData: state.marketData,
          }),
          75_000,
          `persona ${name}`
        )

        console.log(`[graph] persona ${name}: done ${Date.now() - started}ms`)

        return proposal
      } catch (error) {
        console.error(
          `[graph] persona ${name} failed after ${Date.now() - started}ms:`,
          error
        )

        return null
      }
    }),
    240_000,
    "committee"
  )

  const successfulProposals = proposals.filter(
    (p): p is NonNullable<typeof p> => p !== null
  )

  console.log(
    "[graph] committee: done",
    successfulProposals.map((p) => p.persona)
  )

  return {
    proposals: successfulProposals,
    personaMessages: successfulProposals.map((p) => ({
      persona: p.persona,
      content: p.rationale,
      stance: p.stance,
      proposedTicker: p.ticker,
    })),
  }
}

// async function committeeNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
//   console.log("[graph] committee: start");
//   const proposals: (PersonaProposal & { persona: string })[] = [];

//   for (const propose of personas) {
//     try {
//       const result = await withTimeout(
//         propose({ tickers: state.tickersScreened, marketData: state.marketData }),
//         30_000,
//         "persona"
//       );
//       proposals.push(result);
//       console.log(`[graph] committee: ${result.persona} done — ${result.ticker}`);
//     } catch (err) {
//       console.warn("[graph] committee: a persona failed/timed out, skipping it:", err);
//     }
//   }

//   console.log("[graph] committee: done, proposals:", proposals.length);
//   return {
//     proposals,
//     personaMessages: proposals.map((p) => ({ persona: p.persona, content: p.rationale, stance: p.stance, proposedTicker: p.ticker })),
//   };
// }

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
  console.log("[graph] risk gate: start")
  const majority = majorityDecision(state.proposals)
  if (!majority) {
    console.log("[graph] risk gate: no majority")
    return {
      riskGate: {
        verdict: "rejected",
        reasoning: "No majority consensus this cycle.",
      },
      finalTicker: null,
    }
  }
  const { equity, openPositionsCount } = await withTimeout(
    getAccountState(),
    15_000,
    "risk-gate account state"
  )

  const verdict = await withTimeout(
    runRiskGate({
      proposal: majority.group[0],
      openPositionsCount,
      equity,
    }),
    60_000,
    "risk-gate LLM"
  )

  console.log("[graph] risk gate: done", {
    verdict: verdict.verdict,
    ticker: majority.ticker,
  })

  return {
    riskGate: verdict,
    finalTicker: verdict.verdict === "rejected" ? null : majority.ticker,
  }
}

async function executionNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("[graph] execution: start")
  const winningProposal =
    state.proposals.find((p) => p.ticker === state.finalTicker) ?? null
  const result = await withTimeout(
    executeDecision({
      finalTicker: state.finalTicker,
      riskGate: state.riskGate!,
      proposal: winningProposal,
    }),
    45_000,
    "execution"
  )
  console.log("[graph] execution: order done", {
    action: result.action,
    alpacaOrderId: result.alpacaOrderId,
  })

  await withTimeout(
    logPersonaMessages(state.sessionId, state.personaMessages),
    10_000,
    "log persona messages"
  )

  await withTimeout(
    logDecision({
      sessionId: state.sessionId,
      ticker: state.finalTicker ?? "NONE",
      action: result.action === "open" ? "open" : "skip",
      legs: winningProposal?.proposedLegs,
      riskGate: state.riskGate!,
      alpacaOrderId: result.alpacaOrderId,
    }),
    10_000,
    "log decision"
  )
  const { equity, buyingPower } = await withTimeout(
    getAccountState(),
    15_000,
    "execution account state"
  )

  await withTimeout(
    logEquitySnapshot(state.sessionId, equity, buyingPower),
    10_000,
    "log equity snapshot"
  )

  await withTimeout(
    markSessionStatus(
      state.sessionId,
      result.action === "open" ? "executed" : "skipped"
    ),
    10_000,
    "mark session status"
  )

  console.log("[graph] execution: done")

  return {}
}

export function buildGraph() {
  return new StateGraph(GraphState)
    .addNode("screener", screenerNode)
    .addNode("committee", committeeNode)
    .addNode("risk_gate", riskGateNode)
    .addNode("execution", executionNode)
    .addEdge(START, "screener")
    .addEdge("screener", "committee")
    .addEdge("committee", "risk_gate")
    .addEdge("risk_gate", "execution")
    .addEdge("execution", END)
    .compile()
}
