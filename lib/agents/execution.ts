// Path: lib/agents/execution.ts

import { getAlpacaMcpTools } from "@/lib/mcp/client";
import { getAccountSnapshot, getPositionsCount } from "@/lib/alpaca/client";
import { buildOccSymbol } from "@/lib/mcp/occ-symbol";
import { parseAlpacaToolResult } from "@/lib/mcp/parse-result";

import type { PersonaProposal } from "./schemas";
import type { ContractQuote, RiskGateOutcome } from "./state";

interface OrderResultData {
  id?: string;
  status?: string;
  error?: {
    message: string;
    detail?: {
      message?: string;
    };
  };
}

const DRY_RUN = process.env.DRY_RUN !== "false";

export async function getAccountState() {
  const { equity, buyingPower } = await getAccountSnapshot();
  const openPositionsCount = await getPositionsCount();

  return {
    equity,
    buyingPower,
    openPositionsCount,
  };
}

function findContract(
  universe: ContractQuote[],
  ticker: string,
  leg: PersonaProposal["proposedLegs"][number],
): ContractQuote {
  const contract = universe.find(
    (candidate) =>
      candidate.ticker === ticker &&
      candidate.type === leg.type &&
      candidate.strike === leg.strike &&
      candidate.expiration === leg.expiration,
  );

  if (!contract) {
    throw new Error(
      `Contract not found in universe: ${ticker} ${leg.type} ${leg.strike} ${leg.expiration}`,
    );
  }

  return contract;
}

function buildPositionIntent(side: "buy" | "sell") {
  return side === "buy" ? "buy_to_open" : "sell_to_open";
}

export async function executeDecision(params: {
  finalTicker: string | null;
  riskGate: RiskGateOutcome;
  proposal: (PersonaProposal & { persona: string }) | null;
  contractUniverse: ContractQuote[];
}): Promise<{
  action: "open" | "skip" | "rejected" | "dry_run";
  alpacaOrderId?: string;
}> {
  const legs = params.proposal?.proposedLegs;

  if (
    !params.finalTicker ||
    params.riskGate.verdict === "rejected" ||
    !legs?.length
  ) {
    return { action: "skip" };
  }

  const ticker = params.finalTicker;

  /*
   * Resolve every proposal leg against the exact contract universe
   * produced by the screener. This prevents the LLM from inventing
   * an OCC contract that we never screened.
   */
  const resolvedLegs = legs.map((leg) => {
    const contract = findContract(
      params.contractUniverse,
      ticker,
      leg,
    );

    return {
      leg,
      contract,
      symbol: buildOccSymbol(
        ticker,
        contract.expiration,
        contract.type,
        contract.strike,
      ),
    };
  });

  /*
   * ---------------------------------------------------------------
   * SINGLE-LEG ORDER
   * ---------------------------------------------------------------
   *
   * Keep the existing behavior for a single option.
   */
  if (resolvedLegs.length === 1) {
    const [{ leg, symbol }] = resolvedLegs;

    if (DRY_RUN) {
      console.log(
        `[DRY_RUN] Would place single-leg order: ${symbol} ${leg.side} qty=1`,
      );

      return { action: "dry_run" };
    }

    const tools = await getAlpacaMcpTools();

    const orderTool = tools.find(
      (tool) => tool.name === "place_option_order",
    );

    if (!orderTool) {
      throw new Error("place_option_order tool not found");
    }

    const raw = await orderTool.invoke({
      symbol,
      qty: "1",
      side: leg.side,
      type: "market",
      time_in_force: "day",
      position_intent: buildPositionIntent(leg.side),
    });

    const { data } = parseAlpacaToolResult<OrderResultData>(raw);

    if (data.error) {
      const message =
        data.error.detail?.message ?? data.error.message;

      console.warn(`[execution] Order rejected: ${message}`);
      console.warn(
        "[execution] Order rejected:",
        JSON.stringify(data, null, 2),
      );

      return { action: "rejected" };
    }

    console.log("[execution] Single-leg order submitted:", {
      id: data.id,
      status: data.status,
      symbol,
      side: leg.side,
    });

    return {
      action: "open",
      alpacaOrderId: data.id,
    };
  }

  /*
   * ---------------------------------------------------------------
   * MULTI-LEG ORDER
   * ---------------------------------------------------------------
   *
   * Current supported strategy:
   *   - exactly two legs
   *   - same expiration
   *   - same option type
   *   - one buy leg
   *   - one sell leg
   *
   * This covers vertical debit/credit spreads.
   */
  if (resolvedLegs.length !== 2) {
    console.warn(
      `[execution] Unsupported ${resolvedLegs.length}-leg strategy on ${ticker}`,
    );

    return { action: "skip" };
  }

  const [first, second] = resolvedLegs;

  if (first.leg.type !== second.leg.type) {
    console.warn(
      "[execution] Multi-leg order rejected: legs must use the same option type.",
    );

    return { action: "rejected" };
  }

  if (first.leg.expiration !== second.leg.expiration) {
    console.warn(
      "[execution] Multi-leg order rejected: legs must use the same expiration.",
    );

    return { action: "rejected" };
  }

  const longLeg =
    first.leg.side === "buy"
      ? first
      : second.leg.side === "buy"
        ? second
        : null;

  const shortLeg =
    first.leg.side === "sell"
      ? first
      : second.leg.side === "sell"
        ? second
        : null;

  if (!longLeg || !shortLeg) {
    console.warn(
      "[execution] Multi-leg order rejected: expected exactly one buy and one sell leg.",
    );

    return { action: "rejected" };
  }

  /*
   * Conservative executable pricing:
   *
   * Credit spread:
   *   short bid - long ask
   *
   * Debit spread:
   *   long ask - short bid
   *
   * Alpaca MLeg notation:
   *   positive limit_price = debit
   *   negative limit_price = credit
   */
  const netPremium =
    shortLeg.contract.bid - longLeg.contract.ask;

  if (Math.abs(netPremium) < 0.01) {
    console.warn(
      `[execution] Spread has no meaningful executable price: ${netPremium.toFixed(4)}`,
    );

    return { action: "rejected" };
  }

  let limitPrice: number;
  let strategy: "credit_spread" | "debit_spread";

  if (netPremium > 0) {
    // We receive a net credit.
    strategy = "credit_spread";
    limitPrice = -netPremium;
  } else {
    // We pay a net debit.
    strategy = "debit_spread";
    limitPrice = Math.abs(netPremium);
  }

  limitPrice = Number(limitPrice.toFixed(2));

  console.log("[execution] Spread pricing:", {
    longSymbol: longLeg.symbol,
    longAsk: longLeg.contract.ask,
    shortSymbol: shortLeg.symbol,
    shortBid: shortLeg.contract.bid,
    netPremium,
    strategy,
    limitPrice,
  });

  const alpacaLegs = resolvedLegs.map(
    ({ leg, symbol }) => ({
      symbol,
      ratio_qty: "1",
      side: leg.side,
      position_intent: buildPositionIntent(leg.side),
    }),
  );

  console.log("[execution] Prepared MLeg order:", {
    ticker,
    strategy,
    limitPrice,
    legs: alpacaLegs,
  });

  if (DRY_RUN) {
    console.log(
      `[DRY_RUN] Would place ${strategy} MLeg order:`,
      JSON.stringify(
        {
          order_class: "mleg",
          qty: "1",
          type: "limit",
          limit_price: limitPrice.toFixed(2),
          time_in_force: "day",
          legs: alpacaLegs,
        },
        null,
        2,
      ),
    );

    return { action: "dry_run" };
  }

  const tools = await getAlpacaMcpTools();

  const orderTool = tools.find(
    (tool) => tool.name === "place_option_order",
  );

  if (!orderTool) {
    throw new Error("place_option_order tool not found");
  }

  /*
   * IMPORTANT:
   * For MLeg orders, Alpaca does NOT want a top-level symbol
   * or side. The strategy is represented entirely by `legs`.
   */
  const raw = await orderTool.invoke({
    qty: "1",
    type: "limit",
    limit_price: limitPrice.toFixed(2),
    time_in_force: "day",
    order_class: "mleg",
    legs: alpacaLegs,
  });

  const { data } = parseAlpacaToolResult<OrderResultData>(raw);

  if (data.error) {
    const message =
      data.error.detail?.message ?? data.error.message;

    console.warn(`[execution] MLeg order rejected: ${message}`);
    console.warn(
      "[execution] MLeg rejection payload:",
      JSON.stringify(data, null, 2),
    );

    return { action: "rejected" };
  }

  console.log("[execution] MLeg order submitted:", {
    id: data.id,
    status: data.status,
    ticker,
    strategy,
    limitPrice,
    legs: alpacaLegs,
  });

  return {
    action: "open",
    alpacaOrderId: data.id,
  };
}