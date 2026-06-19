// Apply performance indexes to Supabase database using pg package (IPv4 compatible)
import { Pool } from "pg";
import * as fs from "fs";

const DATABASE_URL = "postgresql://postgres.aekynzkqtmmypxbbgdjn:%23Leadsdekho2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

const SQL = `
-- Lead indexes
CREATE INDEX IF NOT EXISTS "Lead_currentOwnerId_idx" ON "Lead" ("currentOwnerId");
CREATE INDEX IF NOT EXISTS "Lead_primaryOwnerId_idx" ON "Lead" ("primaryOwnerId");
CREATE INDEX IF NOT EXISTS "Lead_pipelineStatus_idx" ON "Lead" ("pipelineStatus");
CREATE INDEX IF NOT EXISTS "Lead_source_idx" ON "Lead" ("source");
CREATE INDEX IF NOT EXISTS "Lead_projectId_idx" ON "Lead" ("projectId");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead" ("createdAt");
CREATE INDEX IF NOT EXISTS "Lead_leadStatus_idx" ON "Lead" ("leadStatus");
CREATE INDEX IF NOT EXISTS "Lead_currentOwnerId_pipelineStatus_idx" ON "Lead" ("currentOwnerId", "pipelineStatus");
CREATE INDEX IF NOT EXISTS "Lead_updatedAt_idx" ON "Lead" ("updatedAt");

-- CallLog indexes
CREATE INDEX IF NOT EXISTS "CallLog_leadId_createdAt_idx" ON "CallLog" ("leadId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CallLog_userId_createdAt_idx" ON "CallLog" ("userId", "createdAt" DESC);

-- FollowUp indexes
CREATE INDEX IF NOT EXISTS "FollowUp_leadId_scheduledAt_idx" ON "FollowUp" ("leadId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "FollowUp_userId_completed_scheduledAt_idx" ON "FollowUp" ("userId", "completed", "scheduledAt");
CREATE INDEX IF NOT EXISTS "FollowUp_completed_scheduledAt_idx" ON "FollowUp" ("completed", "scheduledAt");
CREATE INDEX IF NOT EXISTS "FollowUp_scheduledAt_idx" ON "FollowUp" ("scheduledAt");

-- SiteVisit indexes
CREATE INDEX IF NOT EXISTS "SiteVisit_userId_status_scheduledAt_idx" ON "SiteVisit" ("userId", "status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_leadId_idx" ON "SiteVisit" ("leadId");

-- LeadAssignment indexes
CREATE INDEX IF NOT EXISTS "LeadAssignment_leadId_idx" ON "LeadAssignment" ("leadId");
CREATE INDEX IF NOT EXISTS "LeadAssignment_toUserId_idx" ON "LeadAssignment" ("toUserId");

-- TimelineEvent indexes
CREATE INDEX IF NOT EXISTS "TimelineEvent_leadId_createdAt_idx" ON "TimelineEvent" ("leadId", "createdAt" DESC);

-- Analyze tables
ANALYZE "Lead";
ANALYZE "CallLog";
ANALYZE "FollowUp";
ANALYZE "SiteVisit";
ANALYZE "LeadAssignment";
ANALYZE "TimelineEvent";
ANALYZE "User";
ANALYZE "Project";
`;

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    ssl: false,
  });

  console.log("Connecting to Supabase database...");
  const client = await pool.connect();
  try {
    console.log("Connected. Executing index creation script...");
    await client.query(SQL);
    console.log("SUCCESS: All indexes created and tables analyzed.");

    // Verify indexes exist
    const result = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE '%_idx'
      ORDER BY tablename, indexname;
    `);
    console.log(`\nCurrent indexes on public schema (${result.rows.length} total):`);
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.tablename}.${row.indexname}`);
    });
  } catch (err: any) {
    console.error("ERROR:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
