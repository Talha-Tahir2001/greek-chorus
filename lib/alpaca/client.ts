// Path: lib/alpaca/client.ts
import { Alpaca } from "@alpacahq/alpaca-trade-api/rest";

let cachedAlpaca: InstanceType<typeof Alpaca> | null = null;

function getAlpaca() {
  if (cachedAlpaca) return cachedAlpaca;
  cachedAlpaca = new Alpaca({
    keyId: process.env.ALPACA_API_KEY_ID!,
    secret: process.env.ALPACA_API_SECRET_KEY!,
    paper: process.env.ALPACA_PAPER !== "false",
  });
  return cachedAlpaca;
}

export async function getAccountSnapshot() {
  const account = await getAlpaca().trading.account.getAccount();
  return { equity: Number(account.equity), buyingPower: Number(account.buying_power) };
}

export async function getPositionsCount() {
  const positions = await getAlpaca().trading.positions.getAllOpenPositions();
  return positions.length;
}