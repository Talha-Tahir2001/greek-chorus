import type { PersonaProposal } from "./schemas"
import type { ContractQuote } from "./state"

export interface TradeRisk {
  maxLoss: number
  maxProfit: number | null
  netPremium: number
  definedRisk: boolean
  description: string
}

function getContract(
  universe: ContractQuote[],
  ticker: string,
  type: "call" | "put",
  strike: number,
  expiration: string
) {
  return universe.find(
    (c) =>
      c.ticker === ticker &&
      c.type === type &&
      c.strike === strike &&
      c.expiration === expiration
  )
}

export function calculateTradeRisk(
  proposal: PersonaProposal,
  universe: ContractQuote[]
): TradeRisk {
  const { ticker, proposedLegs } = proposal

  if (proposal.ticker === "NONE" || proposedLegs.length === 0) {
    return {
      maxLoss: 0,
      maxProfit: 0,
      netPremium: 0,
      definedRisk: true,
      description: "No trade proposed.",
    }
  }

  const contracts = proposedLegs.map((leg) => {
    const contract = getContract(
      universe,
      ticker,
      leg.type,
      leg.strike,
      leg.expiration
    )

    if (!contract) {
      throw new Error(
        `Missing contract for ${ticker} ${leg.type} ${leg.strike} ${leg.expiration}`
      )
    }

    return { leg, contract }
  })

  // Single long option
  if (contracts.length === 1 && contracts[0].leg.side === "buy") {
    const { contract } = contracts[0]
    const debit = contract.ask * 100

    return {
      maxLoss: debit,
      maxProfit: null,
      netPremium: -debit,
      definedRisk: true,
      description: `Long ${contract.type} option.`,
    }
  }

  // Single short put = cash-secured put
  if (
    contracts.length === 1 &&
    contracts[0].leg.side === "sell" &&
    contracts[0].leg.type === "put"
  ) {
    const { contract } = contracts[0]

    const credit = contract.bid * 100
    if (credit <= 0) {
      throw new Error(
        `Credit spread does not have a positive executable credit: ${credit.toFixed(2)}`
      )
    }
    const maxLoss = contract.strike * 100 - credit

    return {
      maxLoss,
      maxProfit: credit,
      netPremium: credit,
      definedRisk: false,
      description: "Cash-secured short put.",
    }
  }

  // Two-leg vertical spread
  if (contracts.length === 2) {
    const [a, b] = contracts

    if (a.leg.type !== b.leg.type) {
      throw new Error("Two-leg spread must use the same option type.")
    }

    if (a.leg.expiration !== b.leg.expiration) {
      throw new Error("Spread legs must have the same expiration.")
    }

    const longPosition = contracts.find(({ leg }) => leg.side === "buy")

    const shortPosition = contracts.find(({ leg }) => leg.side === "sell")

    if (!longPosition || !shortPosition) {
      throw new Error("Two-leg spread requires one buy and one sell leg.")
    }

    const longLeg = longPosition.contract
    const shortLeg = shortPosition.contract

    const width = Math.abs(longLeg.strike - shortLeg.strike) * 100

    // Credit spread
    if (shortPosition.leg.side === "sell" && longPosition.leg.side === "buy") {
      const credit = shortLeg.bid - longLeg.ask
      const creditDollars = credit * 100

      return {
        maxLoss: Math.max(0, width - creditDollars),
        maxProfit: Math.max(0, creditDollars),
        netPremium: creditDollars,
        definedRisk: true,
        description: "Vertical credit spread.",
      }
    }

    // Debit spread
    const debit = longLeg.ask - shortLeg.bid
    if (debit <= 0) {
      throw new Error(
        `Debit spread does not have a positive executable debit: ${debit.toFixed(2)}`
      )
    }
    const debitDollars = Math.max(0, debit * 100)

    return {
      maxLoss: debitDollars,
      maxProfit: Math.max(0, width - debitDollars),
      netPremium: -debitDollars,
      definedRisk: true,
      description: "Vertical debit spread.",
    }
  }

  throw new Error(`Unsupported strategy with ${contracts.length} legs.`)
}
