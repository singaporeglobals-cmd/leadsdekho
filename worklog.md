# Leads Dekho CRM - Worklog

## Changes Implemented on 2026-03-05

### 1. Removed "CSV Import" from SOURCES
- **lead-list.tsx**: Already had "CSV Import" removed from SOURCES array
- **lead-detail.tsx**: Removed "CSV Import" from source dropdown, added "Housing.com", "99acres", "MagicBricks"
- **reports-page.tsx**: Removed "CSV Import" from SOURCES constant
- **lead-import.tsx**: Changed source display from `"CSV Import"` to `"—"` for empty sources

### 2. Added Custom Date Filter to Lead Section
- Added `dateFrom` and `dateTo` state variables in lead-list.tsx
- Added date params to the fetch leads useEffect (`if (dateFrom) params.set("dateFrom", dateFrom)`)
- Added `dateFrom` and `dateTo` to dependency array
- Added two date input fields in the filter bar UI next to source filter

### 3. Updated Leads API to Support Date Filtering
- Added `dateFrom` and `dateTo` search params in `/api/leads/route.ts`
- Added where conditions for date range filtering with `gte` and `lte` operators
- `dateTo` is extended to end of day (23:59:59.999)

### 4. Added `leadStatus` Field to Lead Model
- Added `leadStatus String? @default("New")` after `pipelineStatus` in Prisma schema
- Added database indexes: `@@index([pipelineStatus])`, `@@index([source])`, `@@index([currentOwnerId])`, `@@index([projectId])`, `@@index([createdAt])`, `@@index([leadStatus])`
- Ran `prisma db push` and `prisma generate` successfully

### 5. Updated Feedback Dialog to Include Lead Status Dropdown
- Added `leadStatus: ""` to feedbackForm state
- Added Lead Status dropdown (Not Connected, Site Visit Done, Prospect, Not Interested, Site Visit Promised, Booked) after Call Type in feedback dialog
- Updated `handleFeedback` to also update lead's `leadStatus` when selected
- Updated all `setFeedbackForm` calls to include `leadStatus: ""`

### 6. Updated lead-detail.tsx CallLogForm
- Changed `handleLogCall` to save `leadStatus` to the lead's `leadStatus` field (not `pipelineStatus`)
- Was: `body: JSON.stringify({ pipelineStatus: leadStatus })`
- Now: `body: JSON.stringify({ leadStatus })`
- Added Lead Status display in the lead info section (non-editing view)

### 7. Updated Leads API PUT Route for leadStatus
- Added `leadStatus` to destructured body in `/api/leads/[id]/route.ts`
- Added `if (leadStatus !== undefined) updateData.leadStatus = leadStatus`

### 8. Show leadStatus Badge in Lead List and Lead Detail
- Added `leadStatus: string | null` to Lead interface in lead-list.tsx
- Added badge display after pipeline status badge: shows when leadStatus is set and not "New"
- Added Lead Status row in lead-detail.tsx info section

### 9. Added leadStatus Filter in Reports
- Added `leadStatusId` state to ReportsPage component
- Added Lead Status filter dropdown in the unified filter bar
- Updated all three report components (DateWiseReport, SourceWiseReport, ProjectWiseReport) to accept and pass `leadStatusId` prop
- Updated all three report API routes (date-wise, source-wise, project-wise) to accept and filter by `leadStatus` parameter
- Updated `resetFilters` and `hasActiveFilters` to include leadStatusId

### 10. Bulk Select for Project/Source in Lead Import
- Added `SOURCES` constant in lead-import.tsx
- Added `bulkProject` and `bulkSource` state variables
- Added bulk apply controls UI in Step 2 (Review & Edit) with project selector and source selector
- Added `applyBulkProject` and `applyBulkSource` functions

### 11. Performance Optimization
- Added database indexes to Lead model in Prisma schema
- Dashboard API already uses `Promise.all` for parallel queries - no N+1 issues found

### 12. Changed Default Source from "CSV Import" to "Manual"
- Updated `/api/leads/import/confirm/route.ts` to use `"Manual"` as default source instead of `"CSV Import"`

### 13. Deployed to Vercel
- Production deployment successful: https://my-project-7bljfmosx-singaporeglobals-5246s-projects.vercel.app
- Alias: https://my-project-tau-ten-86.vercel.app
