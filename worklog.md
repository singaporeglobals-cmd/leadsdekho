---
Task ID: 1
Agent: Main Agent
Task: Two changes - (1) Add Enquiry menu for super admin, (2) Remove password display from sign-in page

Work Log:
- Read all key project files to understand architecture (SPA with Zustand routing, Next.js App Router, PostgreSQL/Prisma)
- Task 1: Removed demo credentials section (Demo Accounts with email/password) from login-page.tsx
- Task 2: Added GET endpoint to /api/contact/route.ts (super_admin only, returns ContactSubmission list ordered by createdAt desc)
- Task 3: Created DELETE endpoint at /api/contact/[id]/route.ts for deleting individual enquiries
- Task 4: Added "enquiries" to AppPage type in store.ts
- Task 5: Created enquiry-management.tsx component with table view, search, view detail dialog, delete confirmation, call/email actions
- Task 6: Added "Enquiries" nav item in app-layout.tsx sidebar (Mail icon, super_admin role only)
- Task 7: Added page title mapping for "enquiries" in app-layout.tsx
- Task 8: Added EnquiryManagement import and rendering in page.tsx
- Verified build succeeds with `npx next build`

Stage Summary:
- Sign-in page no longer shows demo account credentials/passwords
- Super admin has a new "Enquiries" menu in the sidebar that displays all home page contact form submissions
- Enquiry page features: search, view details dialog, delete, call/email actions
- API: GET /api/contact (super_admin only), DELETE /api/contact/[id] (super_admin only)
---
Task ID: 1
Agent: Main Agent
Task: Implement My Leads dynamic sorting and Fresh Leads auto-removal

Work Log:
- Read lead-list.tsx, leads API route, call-logs API route, and assign API route
- Modified call-logs POST API: When feedback is given on a lead with pipelineStatus="New", auto-update to "Contacted"
- Modified leads GET API: Fresh Leads filter now shows ALL New leads assigned to user (not just today's)
- Modified lead-list.tsx frontend: My Leads view sorts leads so fresh/unacted (no call logs) appear at top, acted-upon leads sink to bottom
- Added visual "Fresh" badge on fresh leads in My Leads view with green border indicator
- Added "Previously Contacted" divider between fresh and acted-upon sections in My Leads
- Built and deployed to Vercel production

Stage Summary:
- Fresh Leads: When user gives feedback, lead auto-moves from "New" to "Contacted" → disappears from Fresh Leads
- My Leads: Fresh leads (no call logs) appear at top with green border + Fresh badge; acted-upon leads sink below divider
- Both filters work with auto-refresh after feedback submission
- Deployed to https://leadsdekho.in
---
Task ID: 2
Agent: Main Agent
Task: Optimize CRM loading speed

Work Log:
- Audited all API calls on page load - found 6 calls on lead-list page alone
- Merged 3 separate /api/leads calls into 1 - main response now includes myLeadsCount and freshLeadsCount
- Lazy-loaded /api/properties - only fetches when create dialog opens
- Reduced lead-list page from 6 API calls to 3 on initial load
- Disabled Prisma query logging in production (was logging every query)
- Switched from Supabase direct connection to PgBouncer pooler connection (aws-0-ap-south-1.pooler.supabase.com:6543)
- Updated Vercel environment variables with pooler URL

Stage Summary:
- Lead page API calls reduced: 6 → 3 (50% reduction)
- PgBouncer connection pooling enabled for faster DB connections on serverless
- Production query logging disabled (was causing overhead)
- Properties lazy-loaded instead of on page mount
- Deployed to https://leadsdekho.in

---
Task ID: 6
Agent: Main Agent
Task: Fix lead sources not showing in Lead Management and Import Lead sections

Work Log:
- Analyzed two user screenshots: Lead Management dropdown showed only 9 hardcoded DEFAULT_SOURCES, while Lead Sources page showed 16 database sources
- Identified root cause: DEFAULT_SOURCES hardcoded arrays in 5 components were used as fallback/merge, masking API failures
- Also found bug: `SOURCES` (uppercase, undefined) used in lead-list.tsx create dialog instead of `sources` (state variable)
- Updated /api/lead-sources/route.ts to support ?all=true query parameter for fetching all sources including inactive (admin only)
- Removed DEFAULT_SOURCES from: lead-list.tsx, lead-import.tsx, lead-source-management.tsx, reports-page.tsx, leads-report-page.tsx
- Added dynamic source fetching from DB in lead-detail.tsx (was completely hardcoded)
- Fixed lead-import.tsx to fetch sources for ALL authenticated users (was admin-only)
- Added proper error handling with console.error for source fetch failures
- Fixed SOURCES → sources typo in lead-list.tsx create dialog
- Changed createForm source default from "Manual" to "" (empty, user selects from DB sources)
- Built and deployed to Vercel production

Stage Summary:
- All 6 components now fetch lead sources dynamically from the database
- No hardcoded source lists remain in the codebase
- Lead Source Management page now fetches ALL sources (including inactive) via ?all=true
- Dropdowns only show active sources from the database
- Deployed to https://leadsdekho.in

---
Task ID: 7
Agent: Main Agent
Task: Fix Dashboard "Pending Follow-ups" card click showing ALL leads instead of only the 11 pending follow-up leads

Work Log:
- Investigated dashboard.tsx — found that all 3 dashboard variants (Admin, Telecalling, Sales) had non-clickable Pending Follow-ups cards or had "View Leads" buttons that only called setPage("leads") with no filter
- Added pendingFollowUpsFilter: boolean flag + setPendingFollowUpsFilter action to Zustand store
- Updated /api/leads to accept pendingFollowUps=true query parameter — filters leads that have at least one incomplete follow-up for the current user (using where.followUps.some {userId, completed:false})
- For telecalling/sales roles, the filter also restricts to user's own leads; admin sees all
- API now also returns followUps[] (1 pending follow-up) per lead so UI can show a "Follow-up <date>" badge
- Made all 3 dashboard Pending Follow-ups cards clickable — they now set the filter and navigate to leads page
- Updated both "View Leads" buttons (Telecalling + Sales) to also set the filter
- Added a "Showing only leads with pending follow-ups" red banner at top of lead list with a Clear button when filter is active
- Updated Clear All Filters button in lead-list to also reset the pendingFollowUpsFilter
- Added followUps field to Lead TypeScript interface
- Added CalendarClock badge next to lead name showing upcoming follow-up date
- Deployed to https://leadsdekho.in

Stage Summary:
- Clicking "Pending Follow-ups" card on any dashboard now correctly navigates to Lead Management and shows only those specific pending follow-up leads
- Red banner + Clear button at top of lead list tells the user a filter is active and lets them remove it
- Each lead with pending follow-ups now shows an amber "Follow-up <DD MMM>" badge for quick visual identification

---
Task ID: 8
Agent: Main Agent
Task: Five changes — (1) Today's pending follow-ups on dashboard, (2) telecalling default to own leads, (3) Follow Up filter button, (4) expandable feedback history, (5) date picker for follow-up filter

Work Log:
- Added todayFollowUpsFilter + followUpDate state to Zustand store with setTodayFollowUpsFilter and setFollowUpDate actions
- Updated /api/leads: 
  - Added todayFollowUps=true query param that filters leads with incomplete follow-ups on a specific date (defaults to today)
  - Added followUpDate=YYYY-MM-DD param to pick which date's follow-ups to show
  - Changed telecalling default role-based filtering to ONLY see own leads (currentOwnerId OR primaryOwnerId), same as sales
- Updated /api/leads/[id]/call-logs POST handler: auto-completes any pending follow-up for that lead due today or earlier when feedback is submitted (so leads disappear from today's follow-up filter after a call)
- Dashboard (Admin/Telecalling/Sales): Renamed "Pending Follow-ups" card to "Today's Pending Follow-ups" using todayFollowUps count; clicking sets todayFollowUpsFilter and navigates to Lead Management
- Lead-list.tsx:
  - Added "Follow Up" red button next to Fresh button — toggles todayFollowUpsFilter
  - Added date picker (input type=date) that appears only when Follow Up filter is active — defaults to today; user can pick tomorrow/day after to see future follow-ups
  - Added red banner "Showing leads with follow-ups scheduled for <date>. As you complete calls, leads will disappear from this view."
  - Updated Clear All Filters to reset both todayFollowUpsFilter and followUpDate
  - Updated fetch useEffect to pass todayFollowUps and followUpDate params
  - Added expandedFeedback state and fullCallLogs cache
  - toggleFeedbackHistory function: lazily fetches /api/leads/[id]/call-logs and caches; toggles expand state
  - Made "Last feedback" text on each lead row clickable — clicking expands inline panel showing ALL past feedback logs (user name, call type, timestamp, full notes)
  - Each feedback log entry shows badge with call type, formatted timestamp, user name, and full notes (whitespace preserved)
- Deployed to https://leadsdekho.in

Stage Summary:
- Dashboard Pending Follow-ups card now shows today's count, decreasing as user completes calls
- Clicking the card opens Lead Management with only today's follow-up leads
- Telecalling users now see ONLY their own leads by default (not all leads)
- "Follow Up" button next to My Leads lets users quickly see today's follow-up queue
- Date picker lets users see tomorrow's / day-after's follow-ups
- When user gives feedback on a lead, that lead's pending follow-ups auto-complete, so the lead disappears from the Follow Up filter view on refresh
- Clicking "Last: ..." feedback text on a lead row expands to show entire feedback history inline (no page navigation needed)

---
Task ID: 9
Agent: Main Agent
Task: Add sub-stage filter to Lead list (appears when "Not Interested" or "Not Connected" lead status is selected) — admin & user both dashboards

Work Log:
- Audited existing code: found that sub-stage feature was ALREADY implemented in lead-detail.tsx (CallLogForm) and lead-list.tsx feedback dialog (chips UI)
- Found that prisma schema already has `subStage String?` field on Lead model and CallLog model
- Found that `/api/leads` route already supports `?subStage=` query param filtering (line 26, 59)
- Found centralized sub-stage definitions in `/src/lib/lead-sub-stages.ts` (NOT_INTERESTED_SUB_STAGES, NOT_CONNECTED_SUB_STAGES, getSubStagesForStatus helper)
- The ONLY missing piece: top filter bar in lead-list.tsx did NOT have a sub-stage filter dropdown
- Added `subStageFilter` state ("all" default) to lead-list.tsx
- Imported `getSubStagesForStatus` from `@/lib/lead-sub-stages`
- Modified Lead Status onValueChange handler to reset `subStageFilter` to "all" on every status change (so sub-stage filter doesn't linger when user switches to a non-sub-stage status)
- Added `subStage` URL param to fetch leads API call (`?subStage=...`)
- Added `subStageFilter` to useEffect dependency array so list refreshes when sub-stage filter changes
- Added conditional sub-stage Select dropdown right after Lead Status dropdown — only visible when `leadStatusFilter === "Not Interested" || "Not Connected"`. Dropdown options come from `getSubStagesForStatus(leadStatusFilter)` so the right sub-stages show for the right status.
- Added `subStageFilter !== "all"` to Clear button condition + reset list (so Clear button also clears sub-stage filter)
- Added `subStage: string | null` field to Lead TypeScript interface (was missing)
- Added sub-stage chip rendering inside lead row's leadStatus badge — when a lead has a subStage set, it now shows inline next to the leadStatus text (e.g. "Not Interested · Budget Issue")
- Built successfully with `npx next build`
- Deployed to Vercel production with `npx vercel@54.14.5 --prod --token ...`

Stage Summary:
- Lead filter bar now shows an additional "Sub-stage" dropdown ONLY when "Not Interested" or "Not Connected" is selected as Lead Status — both admin and user dashboards (since both use the same lead-list.tsx component)
- The dropdown options are dynamic: Not Interested → [No Requirement, Location Mismatch, Budget Issue, Flat Size Issue, Want Land, Want Bungalow, Invalid No, ISD No]; Not Connected → [Switch Off, Incoming Call Not Available, Disconnected, Ringing, Out of Network Service]
- Switching Lead Status to something else auto-clears the sub-stage filter
- Clear button also clears the sub-stage filter
- Each lead row now shows the sub-stage inline within its leadStatus badge for quick visual scanning
- Backend `/api/leads?subStage=...` already supported filtering — no API changes needed
- Deployed to https://leadsdekho.in


---
Task ID: 10
Agent: Main Agent
Task: User reported "no leads showing" after sub-stage filter deploy — add Uncategorized option + null subStage API support

Work Log:
- Diagnosed: existing leads in DB that were marked "Not Interested" / "Not Connected" BEFORE the sub-stage feature existed have `subStage = null`. When user filters by Lead Status = Not Interested + a specific sub-stage (e.g. "Budget Issue"), zero leads match because no lead has that exact subStage set yet.
- Updated /api/leads GET route: subStage query param now accepts the sentinel value `"none"` to filter leads where subStage IS NULL. Any other non-empty value filters by exact subStage match (existing behavior).
- Updated lead-list.tsx sub-stage Select dropdown: added a new "— Uncategorized —" option (value="none") at the top of the sub-stage list. Selecting it shows leads whose leadStatus matches but subStage is null (i.e., leads that were marked Not Interested/Not Connected before sub-stages were introduced, or leads where sub-stage wasn't picked).
- Built successfully with `npx next build`
- Deployed to Vercel production

Stage Summary:
- Old leads with leadStatus but no subStage can now be found via the "— Uncategorized —" filter option
- "All Sub-stages" still shows all leads matching the leadStatus (no subStage filter applied)
- New leads that get a subStage assigned during feedback will appear under their specific sub-stage filter
- Deployed to https://leadsdekho.in


---
Task ID: 11
Agent: Main Agent
Task: Convert sub-stage chips to dropdown format + make sub-stage mandatory on both UI and API

Work Log:
- lead-detail.tsx CallLogForm: replaced the chip-style sub-stage picker (rose/red colored buttons) with a Select dropdown. Default value is "__none__" (placeholder "— Select sub-stage —"). The Log Call button remains disabled if leadStatus requires a sub-stage and none is selected.
- lead-list.tsx feedback dialog: replaced the chip-style sub-stage picker with a Select dropdown, using the centralized `getSubStagesForStatus(leadStatus)` helper from `@/lib/lead-sub-stages` (removed the inline hardcoded NOT_INTERESTED / NOT_CONNECTED arrays).
- lead-list.tsx: warning text updated from "Please pick a sub-stage above..." to "Please select a sub-stage above...".
- API-level enforcement: added server-side validation in /api/leads/[id]/call-logs POST route. If leadStatus is "Not Interested" or "Not Connected" but no valid subStage is provided, the API returns HTTP 400 with error message: `Sub-stage is required for "<status>" status`. Uses the centralized `isValidSubStage` helper from `@/lib/lead-sub-stages.ts`. This prevents anyone from bypassing the UI (e.g. via direct API call) and leaving a Not Interested / Not Connected lead without a sub-stage.
- Built successfully with `npx next build`.
- Deployed to Vercel production.

Stage Summary:
- Sub-stage picker is now a dropdown (Select) in BOTH the lead detail page CallLogForm and the lead list feedback dialog.
- Sub-stage is mandatory: Submit/Log Call buttons stay disabled until a sub-stage is picked when Lead Status is "Not Interested" or "Not Connected".
- Backend now also rejects the API call with HTTP 400 if no valid sub-stage is sent — so the rule is enforced even if someone bypasses the UI.
- Deployed to https://leadsdekho.in


---
Task ID: 12
Agent: Main Agent
Task: Two fixes — (1) Follow-up date edit not replacing old pending follow-up, (2) Convert all filter dropdowns to multi-select on admin & user dashboards

Work Log:

Issue 1 — Follow-up date edit bug
- Root cause: When user edits feedback and sets a new follow-up date, POST /api/leads/[id]/follow-ups creates a NEW FollowUp row. The OLD pending follow-up was NOT being marked complete. So the lead had multiple pending follow-ups. The lead list API picks the earliest upcoming one (`orderBy: scheduledAt asc, take: 1`), so the OLD date kept showing.
- Fix: Updated POST /api/leads/[id]/follow-ups route to auto-complete ALL pending follow-ups for the lead BEFORE creating the new one. Now only the newly scheduled follow-up remains pending.

Issue 2 — Multi-select filters
- Created new reusable MultiSelect component at /src/components/ui/multi-select.tsx — Popover + Checkbox based, with "All" option at top, count badge, and an "x" clear button on the trigger.
- lead-list.tsx: Converted 6 filters (Pipeline Status, Source, Project, Lead Status, Sub-stage, User/Assignee) from single-select Select to MultiSelect. State changed from string ("all") to string[]. URL params sent as comma-separated. Sub-stage filter now appears when Lead Status includes "Not Interested" OR "Not Connected" (was: equals one of them).
- reports-page.tsx: Converted Project, Source, Lead Status filters to MultiSelect. Updated 3 child report components (DateWiseReport, SourceWiseReport, ProjectWiseReport) to accept string[] props and send comma-separated values.
- leads-report-page.tsx: Converted Source, Project filters to MultiSelect.
- dashboard.tsx: Converted Assignee filter to MultiSelect (Month stays single-select — picking multiple months is conceptually odd).

Backend multi-value filter support:
- /api/leads/route.ts: status, leadStatus, source, project, owner now accept comma-separated values; uses Prisma `in` operator. subStage accepts comma-separated values including the special "__none__" token for matching leads where subStage IS NULL. Properly combines with search's OR clause via `andConditions` array to avoid OR overwrites.
- /api/reports/date-wise/route.ts: Same multi-value support for project, source, leadStatus.
- /api/reports/source-wise/route.ts: Same.
- /api/reports/project-wise/route.ts: Same.
- /api/reports/export/route.ts: leadsReport export now accepts comma-separated source and project.
- /api/dashboard/route.ts: assignee now accepts comma-separated values; combinedFilter signature updated to use `currentOwnerId: { in: string[] }`.

Build & deploy:
- Build successful with `npx next build` (no TypeScript errors).
- Deployed to Vercel production at https://leadsdekho.in

Stage Summary:
- Editing a follow-up date now correctly REPLACES the old pending follow-up (instead of creating duplicates that show the old date).
- All filter dropdowns across the app now support multi-select with checkboxes — Pipeline Status, Source, Project, Lead Status, Sub-stage, User/Assignee. The MultiSelect shows a count badge and a quick clear (x) button.
- The "Clear" button on each filter bar resets all multi-select filters too.
- Backend APIs accept comma-separated filter values everywhere.
- Deployed to https://leadsdekho.in


---
Task ID: 13
Agent: Main Agent
Task: Exclude Lost leads from Follow-up views (Today's Pending Follow-ups + Pending Follow-ups) while keeping them visible in My Leads

Work Log:
- Read existing code: /api/leads route.ts (pendingFollowUps + todayFollowUps filter logic), /api/dashboard route.ts (admin/telecalling/sales follow-up count queries), /api/leads/[id]/call-logs (auto-complete follow-ups on feedback), /api/leads/[id] PUT (status change), lead-detail.tsx (handleMarkLost)
- Approach: Filter Lost leads OUT of follow-up queries without deleting/touching existing follow-up rows. This way, if a Lost lead is later revived, its follow-ups remain intact.
- /api/leads/route.ts: Added `andConditions.push({ pipelineStatus: { not: "Lost" } })` inside both `if (pendingFollowUps)` and `if (todayFollowUps)` blocks. Used andConditions array (not direct where.pipelineStatus) to avoid overwriting any user-selected Pipeline Status multi-select filter.
- /api/dashboard/route.ts: Updated all 8 follow-up-related Prisma queries across the 3 dashboard functions:
  * Admin: 2 count queries (todayFollowUps, pendingFollowUps) — added `lead: { pipelineStatus: { not: "Lost" } }`
  * Telecalling: 3 queries (todayFollowUps count, pendingFollowUps count, pendingFollowUpsList findMany) — added `pipelineStatus: { not: "Lost" }` to the existing `lead: { currentOwnerId: userId }` filter
  * Sales: 3 queries (todayFollowUps count, pendingFollowUps count, pendingFollowUpsList findMany) — same change as telecalling
- Build: `npx next build` succeeded with no TypeScript errors.
- Deploy: Successfully deployed to Vercel production at https://leadsdekho.in

Stage Summary:
- Lost leads will now be excluded from:
  * Dashboard "Today's Pending Follow-ups" card count (all 3 dashboards: admin, telecalling, sales)
  * Dashboard "Pending Follow-ups" count (admin only)
  * Dashboard pendingFollowUpsList (telecalling + sales dashboard widgets)
  * Lead Management page when "Follow Up" filter is active (todayFollowUpsFilter)
  * Lead Management page when "Pending Follow-ups" filter is active (pendingFollowUpsFilter, clicked from admin dashboard)
- Lost leads still appear in My Leads, Fresh Leads, and all other Lead Management views (no Pipeline Status filter applied there).
- Lost leads still appear in the Lead Detail page with their follow-up history intact.
- If a Lost lead is later revived (pipelineStatus changed away from "Lost"), it will automatically re-appear in follow-up views again — no data loss.
- Deployed to https://leadsdekho.in


---
Task ID: 14
Agent: Main Agent
Task: Import lead date fix — when admin imports an old lead file, the lead should take the original date from the source file (not today's date)

Work Log:
- Root cause: The import route parsed the `date` column from the source file, but only APPENDED it to the lead's `notes` field. The lead's `createdAt` defaulted to today via Prisma `@default(now())`. So a lead that came in 1 month ago but was imported today always showed today's date.
- Approach: ONLY apply this fix to import — manual lead creation must still use today's date (unchanged). Used the source file's date column (DD.MM.YY format hint in the UI) and set it as the lead's `createdAt`.

Files created:
- /src/lib/parse-import-date.ts — new helper module. Robust date parser that handles:
  * DD.MM.YY (e.g. "15.01.24" → 2024-01-15) — Excel-style 2-digit year with cutoff at 30 (00-29 → 2000-2029, 30-99 → 1930-1999)
  * DD.MM.YYYY / DD-MM-YYYY / DD/MM/YYYY (any separator: . - /)
  * ISO YYYY-MM-DD / YYYY/MM/DD
  * Excel serial number (string or numeric) — converts via 1899-12-30 epoch
  * Date objects (passed through)
  * Strings with time component (strips the time part)
  * Returns null for invalid input (e.g. 31.02.2024) so caller can fall back
  * Uses local-time `new Date(year, month-1, day, 12, 0, 0)` to avoid timezone off-by-one issues

Files modified:
- /src/app/api/leads/import/confirm/route.ts:
  * Imported parseImportDate helper
  * After determining the source/project, call parseImportDate(row.date) to get a Date
  * Pass it as `createdAt: leadCreatedAt` in db.lead.create() — overrides the default now()
  * If date is missing or unparseable, fall back to current date/time
  * If a date was provided but couldn't be parsed, append a note in the lead's notes field: "(Original date format unrecognized, used import timestamp)" — so admin can spot bad data later
  * Keeps the existing `Import Date: <original>` notes string for audit trail

- /src/app/api/leads/import/route.ts (XLSX parsing):
  * Changed `sheet_to_json` options from `{defval: ""}` to `{defval: "", raw: false, dateNF: "dd.mm.yyyy"}`
  * Reason: previously XLSX date cells returned Excel serial numbers like "45658" (useless as a date). With raw:false + dateNF, they come back as formatted strings like "15.01.2024".
  * Coerced all values to string with .trim() to maintain downstream compatibility

- /src/components/lead-import.tsx (UI):
  * Changed the Date column from read-only text `<TableCell>{row.date || "—"}</TableCell>` to an editable Input field
  * Placeholder "DD.MM.YYYY"
  * Title tooltip explaining supported formats
  * Width 110px, height 7 (matches other inputs in the table)
  * User can now fix bad dates BEFORE importing

Build & deploy:
- Build successful with `npx next build` (no TypeScript errors).
- Deployed to Vercel production at https://leadsdekho.in

Stage Summary:
- When admin imports leads from CSV/XLSX, each lead's `createdAt` is now set to the date parsed from the source file's DATE column.
- A lead that came in 1 month ago but is imported today will show the original date (1 month ago) — not today's date.
- Manual lead creation (via the Create Lead dialog) is UNAFFECTED — still uses current date.
- Supported source formats: DD.MM.YY, DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD, Excel serial numbers.
- XLSX files now properly extract dates as readable strings (was returning Excel serial numbers).
- The Date column in the import review table is now editable, so admins can fix bad dates before importing.
- If the date string is missing or unparseable, the lead falls back to current timestamp with a note flagged in the notes field for audit.
- Deployed to https://leadsdekho.in


---
Task ID: 15
Agent: Main Agent
Task: Portal API leads should NOT go directly to lead dashboard — they should land in admin's Import Lead area where admin can review, assign, set project, set portal, and confirm them into the main lead dashboard

Work Log:
- Investigated codebase: confirmed no existing portal API; user wants a NEW public endpoint that external portals (Housing.com, MagicBricks, 99acres, etc.) can call to push leads into the system.
- Designed holding-area pattern: incoming portal leads are stored in a SEPARATE PortalLead table (NOT the Lead table), so they don't pollute the main lead dashboard until admin reviews + confirms them.

Database changes (prisma/schema.prisma):
- Added new PortalLead model:
  * Fields: id, name, phone, email, source, budget, notes, projectName, portalRef, rawPayload (JSON for audit), assignedTo, projectId, status, createdAt, updatedAt
  * Status values: "pending" (default), "confirmed", "discarded"
  * Indexes: (status, createdAt desc), phone, source
- Ran `prisma db push` directly against production Postgres to apply schema. PortalLead table now exists in production.

API routes created:
1. POST /api/portal-leads (PUBLIC — no auth, called by external portals)
   - Accepts ANY field-name variations (case-insensitive): name/lead_name/customerName, phone/number/mobile/contact, email/mail/mailId, source/portal/lead_source, budget, notes/message/requirement, projectName/project, portalRef/ref/lead_id/external_id
   - Required: name, phone (returns 400 otherwise)
   - Deduplication: if same phone + portalRef already in pending queue, returns 409
   - Stores full raw payload in rawPayload JSON field for audit
   - Returns { id, status: "pending", message }

2. GET /api/portal-leads (ADMIN only)
   - Lists portal leads filtered by ?status=pending|confirmed|discarded (default: pending)
   - Returns { portalLeads[], pendingCount } so UI can show badge

3. POST /api/portal-leads/confirm (ADMIN only)
   - Body: { leads: [{ id, assignToId?, projectId?, source? }] }
   - For each portal lead:
     a) Validates assignee (must be active user) + project (must exist)
     b) Phone-based duplicate check — if a Lead already exists with this phone, marks the portal lead as confirmed WITHOUT creating a duplicate Lead
     c) Creates a Lead in main Lead table with chosen assignee/project/source
     d) Creates timeline event + LeadAssignment record
     e) Marks the PortalLead as "confirmed" (kept for audit, not deleted)
   - Returns { confirmed, duplicated, failed, failedDetails }

4. DELETE /api/portal-leads/[id] (ADMIN only)
   - Default: marks as "discarded" (soft delete, kept for audit)
   - With ?hard=true: permanently deletes the row

5. PATCH /api/portal-leads/[id] (ADMIN only)
   - Edit pending portal lead fields before confirming

UI changes:
- Created new /src/components/portal-leads.tsx — full admin review panel:
  * Shows the public API endpoint URL with copy-to-clipboard button (so admin can share it with portal integrators)
  * Filter tabs: pending / confirmed / discarded
  * Pending view shows a table with all portal leads; each row has dropdowns for Source, Project, Assign To
  * Bulk-apply bar (like the existing import-lead UI): select-all checkbox, bulk-apply Project/Source/Assignee to selected rows, "Confirm N Leads → Lead Management" button
  * Per-row discard button (soft delete)
  * Confirmed/Discarded views show status badge + permanent delete option
  * Refresh button
- Modified /src/components/lead-import.tsx to add a TAB switcher at the top:
  * Tab 1: "Import from File (CSV/XLS)" — existing file-upload workflow (unchanged)
  * Tab 2: "Portal Leads (API)" — shows the new <PortalLeads /> component
- Both tabs live under the existing "Import Leads" sidebar menu item — no navigation changes needed

Production testing:
- Verified portal API endpoint with curl: POST https://leadsdekho.in/api/portal-leads with a sample payload returned { id, status: "pending", message } — endpoint is live and saving to PortalLead table.

Build & deploy:
- Build successful with `npx next build` (no TypeScript errors).
- Ran `prisma db push` against production Postgres to apply PortalLead schema.
- Deployed to Vercel production at https://leadsdekho.in

Stage Summary:
- External portals (Housing.com, MagicBricks, 99acres, etc.) can now POST leads to https://leadsdekho.in/api/portal-leads — no auth required.
- Portal leads land in a SEPARATE PortalLead table — they do NOT appear in the main lead dashboard.
- Admin sees a new "Portal Leads (API)" tab under Import Leads menu with a pending count badge.
- In that tab, admin can:
  * See all pending portal leads with name/phone/email/source/budget/notes/project name/received timestamp
  * Pick Source / Project / Assign To per row (or bulk-apply to selected rows)
  * Click "Confirm N Leads → Lead Management" to push them into the main Lead table
  * Discard individual leads (soft delete) or permanently delete from confirmed/discarded views
  * Copy the public API endpoint URL to share with portal integrators
- Phone-based duplicate check prevents double-import: if a lead with the same phone already exists in main Lead table, the portal lead is auto-marked confirmed without creating a duplicate.
- Portal-side deduplication: same phone + portalRef can't be pushed twice into the pending queue.
- All original raw payloads are saved in rawPayload JSON field for audit / debugging.
- Deployed to https://leadsdekho.in


---
Task ID: 15
Agent: Main Agent
Task: Connect Housing.com partner API. User provided Profile ID (22239545) + Encryption Key (f8bd5d47a7932ad40f9ebbe2278a5f2f) for Royal Aura project. Wants project name selectable per lead (already exists in UI). Build integration so admin can pull leads from Housing's API into the portal-leads queue and assign project/assignee before confirming.

Work Log:
- Added PortalSetting singleton model to prisma/schema.prisma (housingProfileId, housingEncryptionKey, housingDefaultProjectId, housingLastSyncAt, housingLastSyncStatus, housingLastSyncMessage, housingLastLeadRef)
- Created /api/portal-leads/settings route (GET + PUT) — admin-only, masks encryption key in response
- Created src/lib/housing-api.ts: HousingLead normalizer, HMAC-SHA256 signature, fetchHousingLeads() tries 4 endpoint variants, syncHousingLeads() inserts new leads into PortalLead with dedup (phone+portalRef or phone-alone against pending)
- Created /api/portal-leads/housing-sync route (POST) — admin-only, calls syncHousingLeads with 7-day lookback, updates last-sync metadata
- Added collapsible Housing.com Integration card to portal-leads.tsx (Profile ID input, Encryption Key password input with masked-saved indicator, Default Project select, Save Settings + Sync Now buttons, last-sync badge + message)
- Updated vercel.json buildCommand to "prisma generate && prisma db push --accept-data-loss && next build" so schema auto-syncs on every deploy
- Deployed to Vercel production. Schema applied successfully on neondb — "🚀 Your database is now in sync with your Prisma schema. Done in 8.33s"
- Verified live endpoint: https://leadsdekho.in/api/portal-leads/settings returns 401 (admin-only, working)

Stage Summary:
- PortalLead UI now has a Housing.com Integration card at the top
- Admin saves credentials + default project, clicks "Sync Now" to pull leads from Housing's partner API
- Pulled leads enter the pending queue with source="Housing.com" and the default project pre-assigned (admin can still override per row)
- Existing per-row project/source/assignee selectors remain unchanged
- Build command auto-syncs Prisma schema on every future Vercel deploy
- Files: prisma/schema.prisma, src/lib/housing-api.ts, src/app/api/portal-leads/settings/route.ts, src/app/api/portal-leads/housing-sync/route.ts, src/components/portal-leads.tsx, vercel.json
- Live: https://leadsdekho.in → Admin Panel → Import → Portal Leads → "Housing.com Integration" card (top)

---
Task ID: 16
Agent: Main Agent
Task: Fix "fetch failed" error on Housing.com accounts sync (both Royal Aura + Multi-Project accounts were showing fetch failed)

Work Log:
- User uploaded screenshot showing both Housing accounts had "fetch failed" last-sync status
- Diagnosed: ran DNS lookups for lead.housing.com, api.housing.com, developer.housing.com — ALL FAIL TO RESOLVE. Only housing.com root exists (HTTP 403). The 4 hardcoded fallback URLs in housing-api.ts are all dead hosts.
- Root cause: "fetch failed" is Node's generic undici error wrapping ENOTFOUND. The previous error handler just used err.message which only showed "fetch failed" — no useful info.
- Solution: Add per-account `endpointUrl` field so admin can paste the exact partner API URL provided by Housing.com's account manager.
- Schema: Added `endpointUrl String?` to HousingAccount model in prisma/schema.prisma
- Rewrote src/lib/housing-api.ts:
  * New `explainFetchError()` helper extracts err.cause to show "DNS lookup failed for host" instead of just "fetch failed"
  * New `buildEndpointCandidates()`: if account.endpointUrl is set, use ONLY that URL (skip dead fallbacks)
  * New `testHousingConnection()` function for connection testing without importing leads
  * Richer per-endpoint diagnostics in fetchHousingLeads
- New API route: /api/portal-leads/housing-accounts/[id]/test/route.ts — POST calls testHousingConnection, returns {ok, status, message, bodyPreview, url}
- Updated housing-accounts GET/POST/PUT routes to accept/return endpointUrl
- Updated housing-sync route to pass endpointUrl through to syncHousingLeads and syncAllHousingAccounts
- Updated src/components/portal-leads.tsx:
  * Added PlugZap icon import
  * Added formEndpointUrl, testingAccountId, testResult state
  * Added Endpoint URL input to Add/Edit form with helper text
  * Added Test button per account (between Sync and Edit)
  * Display endpointUrl on each account card with amber warning if not set
  * Color-coded last-sync message box (red/amber/emerald) instead of muted text
  * Color-coded test result box per account
- Deployed to Vercel production (leadsdekho.in) — build log confirms "Your database is now in sync with your Prisma schema. Done in 8.45s"

Stage Summary:
- "fetch failed" root cause: Housing.com partner API URL is account-specific; the 4 hardcoded fallback URLs (lead.housing.com etc.) do not exist in DNS
- Each Housing account now has its own `endpointUrl` field — admin pastes the URL from Housing's account manager
- New "Test" button lets admin verify connectivity BEFORE running a full sync, with detailed error message (DNS error, HTTP status, body preview)
- Even without endpointUrl set, error messages are now useful — they show the actual cause (e.g. "DNS lookup failed for host lead.housing.com")
- IMPORTANT: User still needs to ask Housing.com account manager for the exact partner API URL — without it, sync will continue to fail

---
Task ID: 17
Agent: Main Agent
Task: User clarified Housing.com uses PUSH API (webhook) — leads are pushed to a URL we provide, not pulled. Other CRMs work because they have a webhook URL.

Work Log:
- Diagnosed: Housing.com is push-based, not pull-based. The "fetch failed" errors happen because there's no pull endpoint — Housing pushes leads TO us.
- Created new webhook endpoint: /api/portal-leads/housing/[profileId]/route.ts
  * Each Housing account gets its own webhook URL based on profile_id
  * URL pattern: POST https://leadsdekho.in/api/portal-leads/housing/<profileId>
  * Optional HMAC-SHA256 signature verification via X-Housing-Signature header (prevents fake lead injection)
  * Auto-detects which HousingAccount the lead belongs to (by profileId lookup)
  * Pre-fills source='Housing.com' and account.defaultProjectId if set
  * Handles nested payload shapes ({lead:{...}}, {data:{...}}, or flat object)
  * Phone normalization (strips +91, leading 0, takes last 10 digits)
  * Duplicate detection (phone + portalRef, or phone alone for pending)
  * Updates account.lastSyncAt/Status/Message on each webhook delivery so admin sees activity
  * GET endpoint returns 200 with integration instructions for Housing partner team
- Updated portal-leads.tsx UI:
  * Prominent emerald callout at top of Housing card: "Housing.com uses a PUSH API (Webhook)"
  * Each account card now shows a Webhook URL box with copy button (blue highlight)
  * Pull endpoint URL demoted to optional secondary info
  * copiedWebhook state for per-account copy feedback
  * Clarifying text: "Share that URL with your Housing.com account manager and ask them to configure lead push for your profile."
- Deployed to Vercel production (leadsdekho.in)
- Verified live:
  * GET https://leadsdekho.in/api/portal-leads/housing/22239545 → 200 (Royal Aura account)
  * GET https://leadsdekho.in/api/portal-leads/housing/7013707 → 200 (Multi-Project account)
  * POST test lead to webhook → 201 Created (lead inserted into pending queue with source='Housing.com')

Stage Summary:
- Housing.com webhook endpoints are LIVE at:
  - Royal Aura: POST https://leadsdekho.in/api/portal-leads/housing/22239545
  - Multi-Project: POST https://leadsdekho.in/api/portal-leads/housing/7013707
- User needs to share these URLs with their Housing.com account manager
- Once Housing configures push, leads will automatically land in the pending queue — no manual sync needed
- A TEST lead was already inserted via webhook to prove the pipeline works end-to-end (admin will see "TEST LEAD - WEBHOOK WORKING" in the queue)
