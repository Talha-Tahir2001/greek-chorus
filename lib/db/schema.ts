// Path: lib/db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, numeric, pgEnum } from "drizzle-orm/pg-core";

export const sessionStatusEnum = pgEnum("session_status", ["pending", "executed", "skipped"]);
export const personaStanceEnum = pgEnum("persona_stance", ["bullish", "bearish", "neutral"]);
export const decisionActionEnum = pgEnum("decision_action", ["open", "close", "skip"]);
export const riskVerdictEnum = pgEnum("risk_verdict", ["approved", "rejected", "resized"]);

export const sessions = pgTable("sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    tickersScreened: jsonb("tickers_screened").$type<string[]>().notNull(),
    status: sessionStatusEnum("status").default("pending").notNull(),
});

export const sessionMessages = pgTable("session_messages", {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    persona: text("persona").notNull(),
    content: text("content").notNull(),
    stance: personaStanceEnum("stance"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisions = pgTable("decisions", {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    action: decisionActionEnum("action").notNull(),
    legs: jsonb("legs").$type<Record<string, unknown>[]>(),
    riskGateVerdict: riskVerdictEnum("risk_gate_verdict").notNull(),
    riskGateReasoning: text("risk_gate_reasoning").notNull(),
    alpacaOrderId: text("alpaca_order_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const equitySnapshots = pgTable("equity_snapshots", {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    equity: numeric("equity", { precision: 14, scale: 2 }).notNull(),
    buyingPower: numeric("buying_power", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});