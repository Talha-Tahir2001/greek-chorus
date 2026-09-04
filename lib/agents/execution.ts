// Path: lib/agents/execution.ts
import { getAlpacaMcpTools } from "@/lib/mcp/client";
import { getAccountSnapshot, getPositionsCount } from "@/lib/alpaca/client";
import { buildOccSymbol } from "@/lib/mcp/occ-symbol";
import { parseAlpacaToolResult } from "@/lib/mcp/parse-result";
import type { PersonaProposal } from "./schemas";
import type { RiskGateOutcome } from "./state";

interface OrderResultData {
  id?: string;
  error?: { message: string; detail?: { message?: string } };
}

const DRY_RUN = process.env.DRY_RUN !== "false";

export async function getAccountState() {
  const { equity, buyingPower } = await getAccountSnapshot();
  const openPositionsCount = await getPositionsCount();
  return { equity, buyingPower, openPositionsCount };
}

// export async function executeDecision(params: {
//   finalTicker: string | null;
//   riskGate: RiskGateOutcome;
//   proposal: (PersonaProposal & { persona: string }) | null;
// }): Promise<{ action: "open" | "skip"; alpacaOrderId?: string }> {
//   const legs = params.proposal?.proposedLegs;
//   if (!params.finalTicker || params.riskGate.verdict === "rejected" || !legs?.length) {
//     return { action: "skip" };
//   }
//   if (legs.length > 1) {
//     console.log(`[execution] ${legs.length}-leg proposal on ${params.finalTicker} — executing leg 1 only (multi-leg not supported this build).`);
//   }

//   const leg = legs[0];
//   const symbol = buildOccSymbol(params.finalTicker, leg.expiration, leg.type, leg.strike);

//   if (DRY_RUN) {
//     console.log(`[DRY_RUN] Would place order: ${symbol} ${leg.side} qty=1`);
//     return { action: "skip" };
//   }

//   const tools = await getAlpacaMcpTools();
//   const orderTool = tools.find((t) => t.name === "place_option_order");
//   if (!orderTool) throw new Error("place_option_order tool not found");

//   const raw = await orderTool.invoke({
//     symbol,
//     qty: "1",
//     side: leg.side,
//     type: "market",
//     time_in_force: "day",
//     position_intent: leg.side === "buy" ? "buy_to_open" : "sell_to_open",
//   });

//   // return { action: "open", alpacaOrderId: JSON.stringify(raw).slice(0, 100) };
//   const { data } = parseAlpacaToolResult<OrderResultData>(raw);
//   if (data.error) {
//     console.warn(`[execution] Order rejected: ${data.error.detail?.message ?? data.error.message}`);
//     return { action: "skip" };
//   }

//   return { action: "open", alpacaOrderId: data.id ?? "unknown" };
// }

export async function executeDecision(params: {
  finalTicker: string | null;
  riskGate: RiskGateOutcome;
  proposal: (PersonaProposal & { persona: string }) | null;
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

  // Don't turn a defined-risk multi-leg strategy
  // into a naked single-leg position.
  if (legs.length > 1) {
    console.warn(
      `[execution] ${legs.length}-leg proposal on ${params.finalTicker} — multi-leg execution not supported.`
    );

    return { action: "rejected" };
  }

  const leg = legs[0];

  const symbol = buildOccSymbol(
    params.finalTicker,
    leg.expiration,
    leg.type,
    leg.strike
  );

  if (DRY_RUN) {
    console.log(
      `[DRY_RUN] Would place order: ${symbol} ${leg.side} qty=1`
    );

    return { action: "dry_run" };
  }

  const tools = await getAlpacaMcpTools();

  const orderTool = tools.find(
    (t) => t.name === "place_option_order"
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
    position_intent:
      leg.side === "buy"
        ? "buy_to_open"
        : "sell_to_open",
  });

  const { data } = parseAlpacaToolResult<OrderResultData>(raw);

  if (data.error) {
    const message =
      data.error.detail?.message ?? data.error.message;

    console.warn(`[execution] Order rejected: ${message}`);

    return { action: "rejected" };
  }

  return {
    action: "open",
    alpacaOrderId: data.id ?? "unknown",
  };
}