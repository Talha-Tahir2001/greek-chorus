import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sessions, sessionMessages, decisions, equitySnapshots } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")

    if (id) {
      // Detail mode: session + messages + decision
      const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 })
      }

      const messages = await db
        .select()
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, id))
        .orderBy(sessionMessages.createdAt)

      const [decision] = await db
        .select()
        .from(decisions)
        .where(eq(decisions.sessionId, id))
        .limit(1)

      const [snapshot] = await db
        .select()
        .from(equitySnapshots)
        .where(eq(equitySnapshots.sessionId, id))
        .limit(1)

      return NextResponse.json({ session, messages, decision, snapshot })
    }

    // List mode: all sessions with basic info
    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(50)

    // Get latest message for each session
    const sessionsWithMessages = await Promise.all(
      allSessions.map(async (s) => {
        const [latestMsg] = await db
          .select()
          .from(sessionMessages)
          .where(eq(sessionMessages.sessionId, s.id))
          .orderBy(desc(sessionMessages.createdAt))
          .limit(1)

        const [dec] = await db
          .select()
          .from(decisions)
          .where(eq(decisions.sessionId, s.id))
          .limit(1)

        return {
          ...s,
          latestMessage: latestMsg?.content || null,
          riskVerdict: dec?.riskGateVerdict || null,
        }
      })
    )

    // Get equity snapshots for the chart
    const snapshots = await db
      .select()
      .from(equitySnapshots)
      .orderBy(equitySnapshots.createdAt)

    const equitySnapshotsData = snapshots.map((s) => ({
      timestamp: s.createdAt,
      equity: Number(s.equity),
    }))

    return NextResponse.json({ sessions: sessionsWithMessages, equitySnapshots: equitySnapshotsData })
  } catch (err) {
    console.error("[api/sessions] Error:", err)
    return NextResponse.json({ sessions: [], equitySnapshots: [] }, { status: 200 })
  }
}
