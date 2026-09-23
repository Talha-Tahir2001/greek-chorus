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
  updateSessionTickers,
} from "@/lib/db/queries"
import { mapWithLimit } from "../utils/concurrency"
import { withTimeout } from "../utils/timeout"
import { validateProposalContracts } from "./contract-validator"
import { calculateTradeRisk } from "./risk-calculator"
// const personas = [premiumSeller, volatilityHunter, contrarian]
const personas = [
  { name: "Premium Seller", propose: premiumSeller },
  { name: "Volatility Hunter", propose: volatilityHunter },
  { name: "Contrarian", propose: contrarian },
]

// function majorityDecision(
//   proposals: (PersonaProposal & { persona: string })[]
// ) {
//   const active = proposals.filter((p) => p.ticker !== "NONE")
//   if (active.length < 2) return null
//   const byTicker = new Map<string, (PersonaProposal & { persona: string })[]>()
//   for (const p of active)
//     byTicker.set(p.ticker, [...(byTicker.get(p.ticker) ?? []), p])
//   const [ticker, group] = [...byTicker.entries()].sort(
//     (a, b) => b[1].length - a[1].length
//   )[0]
//   return group.length >= 2 ? { ticker, group } : null
// }

// function majorityDecision(
//   proposals: (PersonaProposal & { persona: string })[]
// ) {
//   const active = proposals.filter((p) => p.ticker !== "NONE")
//   if (active.length < 2) return null
//   const byTicker = new Map<string, (PersonaProposal & { persona: string })[]>()
//   for (const p of active)
//     byTicker.set(p.ticker, [...(byTicker.get(p.ticker) ?? []), p])
//   const [ticker, group] = [...byTicker.entries()].sort(
//     (a, b) => b[1].length - a[1].length
//   )[0]
//   if (group.length < 2) return null
//   const withLegs = group.find((p) => p.proposedLegs?.length) ?? group[0]
//   return { ticker, group, representative: withLegs }
// }


function majorityDecision(
  proposals: (PersonaProposal & { persona: string })[],
) {
  const active = proposals.filter((p) => p.ticker !== "NONE");

  if (active.length < 2) {
    return null;
  }

  /**
   * Build a deterministic key representing the proposed trade.
   *
   * Examples:
   *
   * BUY  PAAI 2.5 PUT
   *   -> buy:put:2.5:2027-02-19
   *
   * SELL PAAI 2.5 PUT
   *   -> sell:put:2.5:2027-02-19
   *
   * A two-leg spread gets both legs represented in the key.
   */
  const buildTradeKey = (proposal: PersonaProposal) => {
    const legs = [...proposal.proposedLegs]
      .sort(
        (a, b) =>
          a.type.localeCompare(b.type) ||
          a.strike - b.strike ||
          a.expiration.localeCompare(b.expiration) ||
          a.side.localeCompare(b.side),
      )
      .map(
        (leg) =>
          `${leg.side}:${leg.type}:${leg.strike}:${leg.expiration}`,
      )
      .join("|");

    return `${proposal.ticker}|${legs}`;
  };

  const byTrade = new Map<
    string,
    (PersonaProposal & { persona: string })[]
  >();

  for (const proposal of active) {
    const key = buildTradeKey(proposal);

    byTrade.set(key, [
      ...(byTrade.get(key) ?? []),
      proposal,
    ]);
  }

  const sortedGroups = [...byTrade.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  if (sortedGroups.length === 0) {
    return null;
  }

  const [tradeKey, group] = sortedGroups[0];

  // No actual consensus.
  if (group.length < 2) {
    return null;
  }

  const representative =
    group.find((p) => p.proposedLegs.length > 0) ?? group[0];

  return {
    tradeKey,
    ticker: representative.ticker,
    group,
    representative,
  };
}

async function screenerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[graph] screener: start")
  const { tickers, marketData, contractUniverse } = await withTimeout(
    screenCandidates(),
    60_000,
    "screener"
  )
  if (state.sessionId) {
    try {
      await updateSessionTickers(state.sessionId, tickers);
    } catch (err) {
      console.warn("[graph] failed to update session tickers in DB:", err);
    }
  }
  console.log("[graph] screener: done", tickers)
  return {
    tickersScreened: tickers,
    marketData: marketData,
    contractUniverse: contractUniverse,
  }
}
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
            contractUniverse: state.contractUniverse,
          }),
          75_000,
          `persona ${name}`
        )

        const validation = validateProposalContracts(
          proposal,
          state.contractUniverse
        )
        if (!validation.valid) {
          console.warn(
            `[${name}] invalid contract proposal:`,
            validation.reason
          )

          return {
            ...proposal,
            ticker: "NONE",
            proposedLegs: [],
            rationale:
              `${proposal.rationale} ` +
              `Proposal rejected because: ${validation.reason}`,
          }
        }

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

  const personaMessages = successfulProposals.map((p) => ({
    persona: p.persona,
    content: p.rationale,
    stance: p.stance,
    proposedTicker: p.ticker,
  }))

  if (personaMessages.length > 0 && state.sessionId) {
    try {
      await withTimeout(
        logPersonaMessages(state.sessionId, personaMessages),
        10_000,
        "log persona messages"
      )
    } catch (err) {
      console.warn("[graph] failed to log persona messages:", err)
    }
  }

  return {
    proposals: successfulProposals,
    personaMessages,
  }
}

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
      selectedProposal: null,
      tradeRisk: null,
    }
  }

  const proposal = majority.representative

  // Get current account state before calculating the risk limit.
  const { equity, openPositionsCount } = await withTimeout(
    getAccountState(),
    15_000,
    "risk-gate account state"
  )

  // Deterministic risk calculation.
  const tradeRisk = calculateTradeRisk(proposal, state.contractUniverse)

  const maxRisk = equity * 0.05

  console.log("[graph] deterministic risk:", {
    ticker: majority.ticker,
    maxLoss: tradeRisk.maxLoss,
    maxProfit: tradeRisk.maxProfit,
    netPremium: tradeRisk.netPremium,
    definedRisk: tradeRisk.definedRisk,
    maxAllowedRisk: maxRisk,
    equity,
  })

  // Hard risk limit. The LLM cannot override this.
  if (tradeRisk.maxLoss > maxRisk) {
    console.warn("[graph] deterministic risk rejected:", {
      maxLoss: tradeRisk.maxLoss,
      maxAllowedRisk: maxRisk,
    })

    return {
      finalTicker: null,
      selectedProposal: proposal,
      tradeRisk,
      riskGate: {
        verdict: "rejected",
        reasoning:
          `Trade rejected by deterministic risk control: ` +
          `maximum loss is $${tradeRisk.maxLoss.toFixed(2)}, ` +
          `which exceeds 5% of account equity ` +
          `($${maxRisk.toFixed(2)}).`,
      },
    }
  }

  // LLM risk assessment happens only after deterministic checks pass.
  const verdict = await withTimeout(
    runRiskGate({
      proposal,
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
    selectedProposal: proposal,
    tradeRisk,
  }
}

async function executionNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("[graph] execution: start")

  const isApproved = state.riskGate?.verdict === "approved"
  let result: { action: "submitted" | "skipped" | "rejected" | "dry_run"; alpacaOrderId?: string } = { action: "skipped" }

  if (isApproved && state.finalTicker) {
    result = await withTimeout(
      executeDecision({
        finalTicker: state.finalTicker,
        riskGate: state.riskGate!,
        proposal: state.selectedProposal,
        contractUniverse: state.contractUniverse,
      }),
      45_000,
      "execution"
    )
    console.log("[graph] execution: order done", {
      action: result.action,
      alpacaOrderId: result.alpacaOrderId,
    })
  } else {
    console.log("[execution] skipped — risk gate did not approve trade")
  }

  const majority = majorityDecision(state.proposals)
  const winningProposal =
    state.selectedProposal ??
    (state.finalTicker
      ? state.proposals.find((p) => p.ticker === state.finalTicker)
      : majority?.representative) ??
    null

  if (state.riskGate && state.sessionId) {
    try {
      await withTimeout(
        logDecision({
          sessionId: state.sessionId,
          ticker: state.finalTicker ?? winningProposal?.ticker ?? "NONE",
          action: result.action === "submitted" ? "open" : "skip",
          legs: winningProposal?.proposedLegs,
          riskGate: state.riskGate,
          alpacaOrderId: result.alpacaOrderId,
        }),
        10_000,
        "log decision"
      )
    } catch (err) {
      console.warn("[graph] failed to log decision:", err)
    }
  }

  try {
    const { equity, buyingPower } = await withTimeout(
      getAccountState(),
      15_000,
      "execution account state"
    )

    if (state.sessionId) {
      await withTimeout(
        logEquitySnapshot(state.sessionId, equity, buyingPower),
        10_000,
        "log equity snapshot"
      )
    }
  } catch (err) {
    console.warn("[graph] failed to capture equity snapshot:", err)
  }

  if (state.sessionId) {
    try {
      await withTimeout(
        markSessionStatus(
          state.sessionId,
          result.action === "submitted" ? "executed" : "skipped"
        ),
        10_000,
        "mark session status"
      )
    } catch (err) {
      console.warn("[graph] failed to mark session status:", err)
    }
  }

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