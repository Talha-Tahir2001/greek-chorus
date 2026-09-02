// Path: lib/mcp/parse-result.ts
interface McpTextContent {
  type: "text";
  text: string;
}

function isTextContent(value: unknown): value is McpTextContent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as { type: unknown }).type === "text" &&
    "text" in value &&
    typeof (value as { text: unknown }).text === "string"
  );
}

export interface AlpacaToolPayload<T> {
  security?: { trust: string; risk: string; instructions: string };
  data: T;
}

export function parseAlpacaToolResult<T>(raw: unknown): AlpacaToolPayload<T> {
  const block = Array.isArray(raw) ? raw[0] : raw;
  if (!isTextContent(block)) {
    throw new Error("Unexpected MCP tool result shape: no text content block found");
  }
  const parsed = JSON.parse(block.text) as {
    _alpaca_mcp_security?: { trust: string; risk: string; instructions: string };
    data: T;
  };
  return { security: parsed._alpaca_mcp_security, data: parsed.data };
}