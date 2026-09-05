import type { PersonaProposal } from "./schemas"
import type { ContractQuote } from "./state"

export function validateProposalContracts(
  proposal: PersonaProposal,
  universe: ContractQuote[]
): {
  valid: boolean
  reason?: string
} {
  if (proposal.ticker === "NONE") {
    if (proposal.proposedLegs.length > 0) {
      return {
        valid: false,
        reason: "NONE proposal cannot contain option legs",
      }
    }

    return { valid: true }
  }

  if (proposal.proposedLegs.length === 0) {
    return {
      valid: false,
      reason: "Non-NONE proposal must contain at least one leg",
    }
  }

  const tickerContracts = universe.filter(
    (contract) =>
      contract.ticker === proposal.ticker
  )

  if (tickerContracts.length === 0) {
    return {
      valid: false,
      reason: `No contracts available for ${proposal.ticker}`,
    }
  }

  for (const leg of proposal.proposedLegs) {
    const match = tickerContracts.find(
      (contract) =>
        contract.expiration === leg.expiration &&
        contract.type === leg.type &&
        contract.strike === leg.strike
    )

    if (!match) {
      return {
        valid: false,
        reason:
          `Invalid contract: ${proposal.ticker} ` +
          `${leg.type} ${leg.strike} ` +
          `${leg.expiration} does not exist in the screened universe`,
      }
    }
  }

  return { valid: true }
}