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

