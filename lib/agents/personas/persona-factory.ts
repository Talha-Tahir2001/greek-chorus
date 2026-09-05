// Path: lib/agents/personas/persona-factory.ts
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import {
  PersonaProposalSchema,
  type PersonaProposal,
} from "@/lib/agents/schemas"
import { createAIMLModel } from "@/lib/llm/aiml-client"
import type { ContractQuote } from "../state"
export function createPersona(config: {
  name: string
  model: string
  systemPrompt: string
}) {
  const llm = createAIMLModel(config.model).withStructuredOutput(
    PersonaProposalSchema,
    { name: "persona_proposal" }
  )

  return async function propose(context: {
    tickers: string[]
    marketData: string
    contractUniverse: ContractQuote[]
  }): Promise<PersonaProposal & { persona: string }> {
    const result = await llm.invoke([
      new SystemMessage(config.systemPrompt),
      new HumanMessage(
        `Candidate tickers: ${context.tickers.join(", ")}

Market data:
${context.marketData}

IMPORTANT — CONTRACT SELECTION RULE:

You may ONLY propose contracts that appear in the contract universe below.

Do NOT invent:
- expirations
- strikes
- option types
- contract symbols

Every proposed leg MUST exactly match an available contract's:
- expiration
- strike
- type

Contract universe:
${context.contractUniverse
  .map(
    (contract: ContractQuote) =>
      `${contract.symbol} | ${contract.ticker} | ${contract.expiration} | ${contract.type} | strike ${contract.strike} | bid ${contract.bid.toFixed(2)} | ask ${contract.ask.toFixed(2)} | IV ${(contract.impliedVolatility * 100).toFixed(1)}% | delta ${contract.delta.toFixed(3)} | theta ${contract.theta.toFixed(4)}`
  )
  .join("\n")}

Propose one trade from this universe, or pass with ticker "NONE".

If you cannot construct a valid trade entirely from the contracts above, pass with ticker "NONE" and proposedLegs [].`
      ),
    ])
    console.log(
      `[${config.name}] Structured output:`,
      JSON.stringify(result, null, 2)
    )
    return { ...result, persona: config.name }
  }
}
