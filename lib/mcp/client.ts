// Path: lib/mcp/client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadMcpTools } from "@langchain/mcp-adapters";

export interface McpTool {
  name: string;
  schema?: unknown;
  invoke: (input: Record<string, unknown>) => Promise<unknown>;
}

let cachedClient: Client | null = null;

async function getMcpClient(): Promise<Client> {
  if (cachedClient) return cachedClient;
  const url = process.env.ALPACA_MCP_URL;
  if (!url) throw new Error("ALPACA_MCP_URL is not set");
  const client = new Client({ name: "greek-chorus", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  cachedClient = client;
  return client;
}

export async function getAlpacaMcpTools(): Promise<McpTool[]> {
  const client = await getMcpClient();
  return (await loadMcpTools("alpaca", client)) as McpTool[];
}