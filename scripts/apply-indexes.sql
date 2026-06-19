-- Performance indexes for LeadsDekho
-- Apply directly to Supabase PostgreSQL to speed up dashboard & lead list queries

-- Lead indexes (some may already exist - CREATE IF NOT EXISTS handles that)
CREATE INDEX IF NOT EXISTS "Lead_currentOwnerId_idx" ON "Lead" ("currentOwnerId");
CREATE INDEX IF NOT EXISTS "Lead_primaryOwnerId_idx" ON "Lead" ("primaryOwnerId");
CREATE INDEX IF NOT EXISTS "Lead_pipelineStatus_idx" ON "Lead" ("pipelineStatus");
CREATE INDEX IF NOT EXISTS "Lead_source_idx" ON "Lead" ("source");
CREATE INDEX IF NOT EXISTS "Lead_projectId_idx" ON "Lead" ("projectId");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead" ("createdAt");
CREATE INDEX IF NOT EXISTS "Lead_leadStatus_idx" ON "Lead" ("leadStatus");
CREATE INDEX IF NOT EXISTS "Lead_currentOwnerId_pipelineStatus_idx" ON "Lead" ("currentOwnerId", "pipelineStatus");
CREATE INDEX IF NOT EXISTS "Lead_updatedAt_idx" ON "Lead" ("updatedAt");

-- CallLog indexes (composite for fast "latest call log per lead")
CREATE INDEX IF NOT EXISTS "CallLog_leadId_createdAt_idx" ON "CallLog" ("leadId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CallLog_userId_createdAt_idx" ON "CallLog" ("userId", "createdAt" DESC);

-- FollowUp indexes (critical for today's follow-ups + pending filters)
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

-- Analyze tables to update query planner stats
ANALYZE "Lead";
ANALYZE "CallLog";
ANALYZE "FollowUp";
ANALYZE "SiteVisit";
ANALYZE "LeadAssignment";
ANALYZE "TimelineEvent";
ANALYZE "User";
ANALYZE "Project";
