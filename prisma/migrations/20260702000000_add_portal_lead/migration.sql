-- CreateTable: PortalLead
CREATE TABLE "PortalLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Manual',
    "budget" TEXT,
    "notes" TEXT,
    "projectName" TEXT,
    "portalRef" TEXT,
    "rawPayload" JSONB,
    "assignedTo" TEXT,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalLead_status_createdAt_idx" ON "PortalLead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PortalLead_phone_idx" ON "PortalLead"("phone");

-- CreateIndex
CREATE INDEX "PortalLead_source_idx" ON "PortalLead"("source");
