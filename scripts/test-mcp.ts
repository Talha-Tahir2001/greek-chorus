// // Path: scripts/test-mcp.ts
// import dotenv from "dotenv";
// dotenv.config({ path: ".env" });

// import { getAlpacaMcpTools } from "@/lib/mcp/client";

// async function main() {
//   const tools = await getAlpacaMcpTools();
//   console.log(`Connected — ${tools.length} tools available:`);
//   tools.forEach((t) => console.log(`  - ${t.name}`));

//   const chainTool = tools.find((t) => t.name === "get_option_chain");
//   if (chainTool) {
//     const result = await chainTool.invoke({ underlying_symbol: "AAPL" });
//     console.log("\nSample get_option_chain(AAPL) result:\n", JSON.stringify(result, null, 2).slice(0, 1000));
//   }
// }

// main().catch((err) => {
//   console.error("MCP test failed:", err);
//   process.exit(1);
// });

// Path: scripts/test-mcp.ts
import dotenv from "dotenv"
dotenv.config({ path: ".env" })

import { getAlpacaMcpTools } from "@/lib/mcp/client"
import { parseAlpacaToolResult } from "@/lib/mcp/parse-result"
import type { OptionChainData } from "@/lib/mcp/alpaca-types"

async function main() {
  const tools = await getAlpacaMcpTools()
  console.log(`Connected — ${tools.length} tools available.`)

  const chainTool = tools.find((t) => t.name === "get_option_chain")
  if (chainTool) {
    const raw = await chainTool.invoke({ underlying_symbol: "AAPL" })
    const { data } = parseAlpacaToolResult<OptionChainData>(raw)
    const [symbol, firstSnapshot] = Object.entries(data.snapshots)[0]
    console.log(
      `\nFull snapshot for ${symbol}:\n`,
      JSON.stringify(firstSnapshot, null, 2)
    )
  }
  const snapshotTool = tools.find((t) => t.name === "get_option_snapshot")
  if (snapshotTool) {
    // const raw = await snapshotTool.invoke({ symbol: "AAPL260902P00255000" });
    console.log(
      "\nRaw get_option_snapshot result:\n",
      JSON.stringify(snapshotTool.schema, null, 2)
    )
  }
  const orderTool = tools.find((t) => t.name === "place_option_order")
  if (orderTool) {
    console.log(
      "\nRaw place_option_order result:\n",
      JSON.stringify(orderTool.schema, null, 2)
    )
  }
  const moversTool = tools.find((t) => t.name === "get_market_movers")
  if (moversTool) {
    // const raw = await moversTool.invoke({})
    console.log(
      "\nRaw get_market_movers result:\n",
      JSON.stringify(moversTool.schema, null, 2)
    )
  }
}

main().catch((err) => {
  console.error("MCP test failed:", err)
  process.exit(1)
})
