// Path: lib/agents/personas/persona-factory.ts
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createFeatherlessModel } from "@/lib/llm/featherless";
import { PersonaProposalSchema, type PersonaProposal } from "@/lib/agents/schemas";
import { createAIMLModel } from "@/lib/llm/aiml-client";

export function createPersona(config: { name: string; model: string; systemPrompt: string }) {
  // const llm = createFeatherlessModel(config.model).withStructuredOutput(PersonaProposalSchema, {
  //   name: "persona_proposal",
  // });

  const llm = createAIMLModel(config.model).withStructuredOutput(PersonaProposalSchema, 
    { name: "persona_proposal" }
  );
    

  return async function propose(context: {
    tickers: string[];
    marketData: string;
  }): Promise<PersonaProposal & { persona: string }> {
    const result = await llm.invoke([
      new SystemMessage(config.systemPrompt),
      new HumanMessage(
        `Candidate tickers: ${context.tickers.join(", ")}\n\nMarket data:\n${context.marketData}\n\nPropose one trade from this basket, or pass with ticker "NONE".`
      ),
    ]);
    return { ...result, persona: config.name };
  };
}