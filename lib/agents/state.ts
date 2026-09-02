// Path: lib/agents/state.ts
import { Annotation } from "@langchain/langgraph"
import type { PersonaProposal } from "./schemas"

export interface PersonaMessage {
  persona: string
  content: string
  stance: string
  proposedTicker: string
}
export interface RiskGateOutcome {
  verdict: string
  reasoning: string
}

export const GraphState = Annotation.Root({
  sessionId: Annotation<string>,
  tickersScreened: Annotation<string[]>({
    reducer: (_, n) => n,
    default: () => [],
  }),
  marketData: Annotation<string>({ reducer: (_, n) => n, default: () => "" }),
  proposals: Annotation<(PersonaProposal & { persona: string })[]>({
    reducer: (_, n) => n,
    default: () => [],
  }),
  personaMessages: Annotation<PersonaMessage[]>({
    reducer: (c, n) => c.concat(n),
    default: () => [],
  }),
  riskGate: Annotation<RiskGateOutcome | null>({
    reducer: (_, n) => n,
    default: () => null,
  }),
  finalTicker: Annotation<string | null>({
    reducer: (_, n) => n,
    default: () => null,
  }),
})

export type GraphStateType = typeof GraphState.State
