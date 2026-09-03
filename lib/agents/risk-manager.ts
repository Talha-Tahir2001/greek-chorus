// Path: lib/agents/risk-manager.ts
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
// import { createFeatherlessModel } from "@/lib/llm/featherless";
import { RiskGateSchema, type RiskGateResult, type PersonaProposal } from "@/lib/agents/schemas";
import { createAIMLModel } from "../llm/aiml-client";

const MAX_CONCURRENT_POSITIONS = 5;
const MAX_POSITION_PCT_OF_EQUITY = 0.05;

// const llm = createFeatherlessModel("Qwen/Qwen2.5-72B-Instruct", 0.1).withStructuredOutput(
//   RiskGateSchema,
//   { name: "risk_gate_result" }
// );

const llm = createAIMLModel("alibaba/qwen3.6-27b", 0.1).withStructuredOutput(
  RiskGateSchema,
  { name: "risk_gate_result" }
);

export async function runRiskGate(params: {
  proposal: PersonaProposal & { persona: string };
  openPositionsCount: number;
  equity: number;
}): Promise<RiskGateResult> {
  if (params.openPositionsCount >= MAX_CONCURRENT_POSITIONS) {
    return { verdict: "rejected", reasoning: `Max concurrent positions (${MAX_CONCURRENT_POSITIONS}) already open.` };
  }
  return llm.invoke([
    new SystemMessage(
      `You are the Risk Manager. Hard rules: no single position exceeds ${MAX_POSITION_PCT_OF_EQUITY * 100}% of equity at risk; reject undefined-risk structures outright; resize rather than reject when only sizing is the issue. Be strict, 1-2 sentence reasoning.`
    ),
    new HumanMessage(
      `Proposal from ${params.proposal.persona}:\n${JSON.stringify(params.proposal, null, 2)}\n\nEquity: $${params.equity}\nOpen positions: ${params.openPositionsCount}`
    ),
  ]);
}