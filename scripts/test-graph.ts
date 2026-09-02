// Path: scripts/test-graph.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { buildGraph } from "@/lib/agents/graph";

async function main() {
  const graph = buildGraph();
  const result = await graph.invoke({ sessionId: "test-session-local" });
  console.log("\nFinal ticker:", result.finalTicker);
  console.log("Risk gate:", result.riskGate);
  console.log("\nPersona messages:");
  result.personaMessages.forEach((m: { persona: string; content: string; stance: string }) =>
    console.log(`  [${m.persona} — ${m.stance}] ${m.content}`)
  );
}

main().catch((err) => {
  console.error("Graph test failed:", err);
  process.exit(1);
});