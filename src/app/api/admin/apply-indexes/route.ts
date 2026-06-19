import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/admin/apply-indexes
// One-time use: applies performance indexes to the database.
// Restricted to admin only. Can be deleted after use.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "super_admin" && user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const indexes = [
    `CREATE INDEX IF NOT EXISTS "Lead_currentOwnerId_idx" ON "Lead" ("currentOwnerId")`,
    `CREATE INDEX IF NOT EXISTS "Lead_primaryOwnerId_idx" ON "Lead" ("primaryOwnerId")`,
    `CREATE INDEX IF NOT EXISTS "Lead_pipelineStatus_idx" ON "Lead" ("pipelineStatus")`,
    `CREATE INDEX IF NOT EXISTS "Lead_source_idx" ON "Lead" ("source")`,
    `CREATE INDEX IF NOT EXISTS "Lead_projectId_idx" ON "Lead" ("projectId")`,
    `CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead" ("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "Lead_leadStatus_idx" ON "Lead" ("leadStatus")`,
    `CREATE INDEX IF NOT EXISTS "Lead_currentOwnerId_pipelineStatus_idx" ON "Lead" ("currentOwnerId", "pipelineStatus")`,
    `CREATE INDEX IF NOT EXISTS "Lead_updatedAt_idx" ON "Lead" ("updatedAt")`,
    `CREATE INDEX IF NOT EXISTS "CallLog_leadId_createdAt_idx" ON "CallLog" ("leadId", "createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS "CallLog_userId_createdAt_idx" ON "CallLog" ("userId", "createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS "FollowUp_leadId_scheduledAt_idx" ON "FollowUp" ("leadId", "scheduledAt")`,
    `CREATE INDEX IF NOT EXISTS "FollowUp_userId_completed_scheduledAt_idx" ON "FollowUp" ("userId", "completed", "scheduledAt")`,
    `CREATE INDEX IF NOT EXISTS "FollowUp_completed_scheduledAt_idx" ON "FollowUp" ("completed", "scheduledAt")`,
    `CREATE INDEX IF NOT EXISTS "FollowUp_scheduledAt_idx" ON "FollowUp" ("scheduledAt")`,
    `CREATE INDEX IF NOT EXISTS "SiteVisit_userId_status_scheduledAt_idx" ON "SiteVisit" ("userId", "status", "scheduledAt")`,
    `CREATE INDEX IF NOT EXISTS "SiteVisit_leadId_idx" ON "SiteVisit" ("leadId")`,
    `CREATE INDEX IF NOT EXISTS "LeadAssignment_leadId_idx" ON "LeadAssignment" ("leadId")`,
    `CREATE INDEX IF NOT EXISTS "LeadAssignment_toUserId_idx" ON "LeadAssignment" ("toUserId")`,
    `CREATE INDEX IF NOT EXISTS "TimelineEvent_leadId_createdAt_idx" ON "TimelineEvent" ("leadId", "createdAt" DESC)`,
  ];

  const results: Array<{ sql: string; status: string; error?: string }> = [];
  for (const sql of indexes) {
    try {
      await db.$executeRawUnsafe(sql);
      results.push({ sql, status: "ok" });
    } catch (err: any) {
      results.push({ sql, status: "error", error: err.message });
    }
  }

  // Update query planner statistics
  try {
    await db.$executeRawUnsafe(`ANALYZE "Lead"`);
    await db.$executeRawUnsafe(`ANALYZE "CallLog"`);
    await db.$executeRawUnsafe(`ANALYZE "FollowUp"`);
    await db.$executeRawUnsafe(`ANALYZE "SiteVisit"`);
    await db.$executeRawUnsafe(`ANALYZE "LeadAssignment"`);
    await db.$executeRawUnsafe(`ANALYZE "TimelineEvent"`);
    await db.$executeRawUnsafe(`ANALYZE "User"`);
    await db.$executeRawUnsafe(`ANALYZE "Project"`);
  } catch (err: any) {
    // ignore analyze errors
  }

  return NextResponse.json({
    applied: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "error").length,
    details: results,
  });
}
