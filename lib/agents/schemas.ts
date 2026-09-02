// Path: lib/agents/schemas.ts
import { z } from "zod"

export const PersonaProposalSchema = z.object({
  stance: z.enum(["bullish", "bearish", "neutral"]),
  ticker: z.string().describe("Underlying ticker, or 'NONE' if passing"),
  rationale: z.string().describe("2-3 sentences explaining the reasoning"),
  proposedLegs: z
    .array(
      z.object({
        side: z.enum(["buy", "sell"]),
        type: z.enum(["call", "put"]),
        strike: z.number(),
        expiration: z.string().describe("YYYY-MM-DD"),
      })
    )
    .optional(),
})
export type PersonaProposal = z.infer<typeof PersonaProposalSchema>

export const RiskGateSchema = z.object({
  verdict: z.enum(["approved", "rejected", "resized"]),
  reasoning: z.string(),
  finalLegs: z
    .array(
      z.object({
        side: z.enum(["buy", "sell"]),
        type: z.enum(["call", "put"]),
        strike: z.number(),
        expiration: z.string(),
        contracts: z.number(),
      })
    )
    .optional(),
})
export type RiskGateResult = z.infer<typeof RiskGateSchema>
