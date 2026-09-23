import { Alpaca } from "@alpacahq/alpaca-trade-api/rest";

let cachedAlpaca: InstanceType<typeof Alpaca> | null = null;

export function getAlpaca() {
  if (cachedAlpaca) return cachedAlpaca;

  cachedAlpaca = new Alpaca({
    keyId: process.env.ALPACA_API_KEY!,
    secret: process.env.ALPACA_SECRET_KEY!,
    paper: process.env.ALPACA_PAPER !== "false",
  });

  return cachedAlpaca;
}

export async function getAccountSnapshot() {
  const account = await getAlpaca().trading.account.getAccount();

  return {
    equity: Number(account.equity),
    buyingPower: Number(account.buyingPower),
  };
}

export async function getPositionsCount() {
  const positions =
    await getAlpaca().trading.positions.getAllOpenPositions();

  return positions.length;
}

export interface OpenPosition {
  symbol: string;
  qty: number;
  side: string;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlPercent: number;
}

export async function getOpenPositions(): Promise<OpenPosition[]> {
  const positions =
    await getAlpaca().trading.positions.getAllOpenPositions();

  return positions.map((p) => ({
    symbol: p.symbol,
    qty: Number(p.qty),
    side: p.side,
    avgEntryPrice: Number(p.avgEntryPrice),
    currentPrice: Number(p.currentPrice),
    marketValue: Number(p.marketValue),
    unrealizedPl: Number(p.unrealizedPl),
    unrealizedPlPercent: Number(p.unrealizedPlpc) * 100,
  }));
}

/**
 * Minimal normalized order information used by Greek Chorus.
 */
export interface AlpacaOrder {
  id: string;
  clientOrderId?: string;
  symbol?: string;
  qty: number;
  filledQty: number;
  side?: string;
  type: string;
  orderClass?: string;
  status: string;
  filledAvgPrice?: number | null;
  limitPrice?: number | null;
  positionIntent?: string;
  legs?: unknown[] | null;
}

/**
 * Fetch an Alpaca order by ID.
 *
 * `nested=true` is important for MLeg orders because it allows
 * Alpaca to return the individual legs as part of the response.
 */
export async function getOrder(
  orderId: string,
): Promise<AlpacaOrder> {
  const order = await getAlpaca().trading.orders.getOrderByOrderID({
    orderId: orderId,
    nested: true
  });

  return {
    id: order.id as string,
    clientOrderId: order.clientOrderId as string,
    symbol: order.symbol as string,
    qty: Number(order.qty),
    filledQty: Number(order.filledQty),
    side: order.side as string,
    type: order.type,
    orderClass: order.orderClass,
    status: order.status as string,
    filledAvgPrice:
      order.filledAvgPrice == null
        ? null
        : Number(order.filledAvgPrice),
    limitPrice:
      order.limitPrice == null
        ? null
        : Number(order.limitPrice),
    positionIntent: order.positionIntent,
    legs: order.legs ?? null,
  };
}

/**
 * Fetch one specific open position.
 *
 * Useful after an order is submitted to determine whether
 * it actually resulted in a position.
 */
export async function getOpenPosition(
  symbol: string,
): Promise<OpenPosition | null> {
  try {
    const position =
      await getAlpaca().trading.positions.getOpenPosition({ symbolOrAssetId: symbol });

    return {
      symbol: position.symbol,
      qty: Number(position.qty),
      side: position.side,
      avgEntryPrice: Number(position.avgEntryPrice),
      currentPrice: Number(position.currentPrice),
      marketValue: Number(position.marketValue),
      unrealizedPl: Number(position.unrealizedPl),
      unrealizedPlPercent:
        Number(position.unrealizedPlpc) * 100,
    };
  } catch {
    return null;
  }
}