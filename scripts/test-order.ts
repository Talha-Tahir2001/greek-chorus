// Path: scripts/test-order.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { getAlpacaMcpTools } from "@/lib/mcp/client";
import { parseAlpacaToolResult } from "@/lib/mcp/parse-result";
import type { OptionChainData } from "@/lib/mcp/alpaca-types";

// Two-phase safety: run once with no flag to see what it WOULD do, run again
// with --confirm only once that looks right. Never place-and-see.
const CONFIRMED = process.argv.includes("--confirm");
const TEST_UNDERLYING = "SPY"; // liquid, cheap contracts available, low risk even on a real fill

async function main() {
  const tools = await getAlpacaMcpTools();
  const chainTool = tools.find((t) => t.name === "get_option_chain");
  const orderTool = tools.find((t) => t.name === "place_option_order");
  if (!chainTool || !orderTool) throw new Error("Required MCP tools not found");

  const raw = await chainTool.invoke({ underlying_symbol: TEST_UNDERLYING });
  const { data } = parseAlpacaToolResult<OptionChainData>(raw);

  // Pick the cheapest liquid call — minimizes capital tied up for a pure
  // wiring test, even though it's paper money either way.
  const liquidCalls = Object.entries(data.snapshots)
    .filter(([symbol, snap]) => symbol.includes("C") && (snap.latestQuote?.bp ?? 0) > 0)
    .sort((a, b) => a[1].latestQuote!.bp - b[1].latestQuote!.bp);

  if (liquidCalls.length === 0) {
    throw new Error(`No liquid calls found for ${TEST_UNDERLYING} right now — try again during market hours.`);
  }

  const [symbol, snap] = liquidCalls[0];
  const estCost = snap.latestQuote!.ap * 100;
  console.log(`Selected ${symbol}`);
  console.log(`  bid ${snap.latestQuote!.bp} / ask ${snap.latestQuote!.ap}  (~$${estCost.toFixed(2)} for 1 contract)`);

  if (!CONFIRMED) {
    console.log("\nDry pass only — nothing was placed. Rerun with --confirm to actually submit this order.");
    return;
  }

  console.log("\nSubmitting real order to your paper account...");
  const orderResult = await orderTool.invoke({
    symbol,
    qty: "1",
    side: "buy",
    type: "market",
    time_in_force: "day",
    position_intent: "buy_to_open",
  });
  console.log("\nOrder response:\n", JSON.stringify(orderResult, null, 2));
  console.log("\nCheck it landed: run this again with get_all_positions, or check the Alpaca paper dashboard directly.");
}

main().catch((err) => {
  console.error("Test order failed:", err);
  process.exit(1);
});