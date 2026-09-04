// // Path: lib/alpaca/client.ts
// import { Alpaca } from "@alpacahq/alpaca-trade-api/rest";
// import dotenv from "dotenv";
// dotenv.config({ path: ".env" });

// // Trading API — account state and order submission. /rest subpath keeps the
// // WebSocket/msgpack deps out of the serverless bundle since we don't stream.
// export const alpaca = new Alpaca({
//     keyId: process.env.ALPACA_API_KEY_ID!,
//     secret: process.env.ALPACA_API_SECRET_KEY!,
//     paper: process.env.ALPACA_PAPER !== "false",
// });

// export async function getAccountSnapshot() {
//     const account = await alpaca.trading.account.getAccount();
//     // console.log("Account:", account);
//     // const positions = await alpaca.trading.positions.getAllOpenPositions();
//     // console.log("Positions:", positions);
//     return {
//         equity: Number(account.equity),
//         buyingPower: Number(account.buying_power),
//     };
// }

// lib/alpaca/client.ts

// import { Alpaca } from "@alpacahq/alpaca-trade-api/rest";
// import dotenv from "dotenv";

// dotenv.config({ path: ".env" });

// let alpaca: Alpaca | null = null;

// function getAlpacaClient(): Alpaca {
//   if (alpaca) {
//     return alpaca;
//   }

//   const keyId = process.env.ALPACA_API_KEY_ID;
//   const secret = process.env.ALPACA_API_SECRET_KEY;

//   if (!keyId || !secret) {
//     throw new Error(
//       "Missing ALPACA_API_KEY_ID or ALPACA_API_SECRET_KEY"
//     );
//   }

//   alpaca = new Alpaca({
//     keyId,
//     secret,
//     paper: process.env.ALPACA_PAPER !== "false",
//   });

//   return alpaca;
// }

// export async function getAccountSnapshot() {
//   const client = getAlpacaClient();

//   const account = await client.trading.account.getAccount();

//   return {
//     equity: Number(account.equity),
//     buyingPower: Number(account.buying_power),
//   };
// }


// Path: lib/alpaca/client.ts
import { Alpaca } from "@alpacahq/alpaca-trade-api/rest";

let cachedAlpaca: InstanceType<typeof Alpaca> | null = null;

function getAlpaca() {
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
  return { equity: Number(account.equity), buyingPower: Number(account.buying_power) };
}

export async function getPositionsCount() {
  const positions = await getAlpaca().trading.positions.getAllOpenPositions();
  return positions.length;
}