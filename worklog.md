# Worklog

## Task 2: Update App Name and Color Theme (Agent: main)

### Summary
Replaced all occurrences of "CRM Pro" with "Leads Dekho" and migrated the emerald/teal color scheme to a gold + steel theme across the entire project.

### Name Changes
- `src/app/layout.tsx`: Title changed from "CRM Pro - Real Estate CRM" to "Leads Dekho - Real Estate CRM"
- `src/components/landing-page.tsx`: All "CRM Pro" references replaced with "Leads Dekho" (nav, CTA, footer)
- `src/components/login-page.tsx`: "Welcome to CRM Pro" → "Welcome to Leads Dekho"
- `src/components/app-layout.tsx`: Sidebar logo text "CRM Pro" → "Leads Dekho"

### Color Theme Changes
- **globals.css**: Added brand color CSS variables
- **tailwind.config.ts**: Added `brand` and `steel` color definitions
- All components updated from emerald/teal to brand/steel theme

### Bug Fixes
1. **site-visit-module.tsx**: Fixed `fetchVisits()` call
2. **API leads/[id]/route.ts**: Verified full lead with all relations

## Task 1: Four Feature Implementation (Agent: main)

### Summary
Implemented 4 features: Dark/Light Mode Toggle, Admin is NOT Primary Owner fix, Lead List Redesign (flat layout), and Lead-Property linking.

### Feature 1: Dark & Light Mode Toggle
- Theme Provider with next-themes
- Toggle buttons in sidebar and header
- Semantic class migration across all components

### Feature 2: Admin is NOT Primary Owner
- When admin assigns a lead, primaryOwner updates to the assignee

### Feature 3: Redesign Lead List - Flat Line-by-Line Layout
- Flat list layout with inline feedback and assign

### Feature 4: Link Property List with Lead Properties
- LeadProperty model, API routes, lead detail UI

## Task 3: Eight Feature Changes (Agent: main)

### Summary
Implemented 8 feature changes requested by user.

### Fix #1: Property names in project section when creating new lead
- Added Property dropdown to create lead dialog
- Fetches properties from /api/properties
- Shows properties filtered by selected project
- Automatically links selected property to lead on creation

### Fix #2: Telecaller/Sales assign dropdown showing nothing
- Updated /api/users GET to allow non-admin users (returns limited info for assign)
- Updated lead-list.tsx to fetch users for all roles
- Inline assign dropdown now visible for all roles

### Fix #3: Feedback with follow-up date + drop lead option
- Added "Schedule Follow-up Date" datetime picker to Quick Feedback dialog
- Added "Drop this lead (mark as Lost)" checkbox to Quick Feedback dialog
- Added same options to Log Call dialog in lead-detail
- On submit: if follow-up date set, creates FollowUp record; if drop lead checked, sets status to Lost

### Fix #4: Dashboard pending follow-ups for telecaller and sales
- Updated /api/dashboard to return pendingFollowUps count and pendingFollowUpsList
- TelecallingDashboard: Added "Pending Follow-ups" card with red border
- SalesDashboard: Added "Pending Follow-ups" card with red border
- AdminDashboard: Added "Pending Follow-ups" card
- Shows list of pending follow-ups with scheduled date badges

### Fix #5: Fresh lead option for telecaller & sales accounts
- Added "Fresh Leads" button (with sparkles icon) in lead list filter bar
- Only visible for telecaller and sales roles
- Toggles statusFilter between "all" and "New"

### Fix #6: Import lead option ONLY in admin account
- Added roles: ["admin"] to Import Leads nav item in app-layout.tsx sidebar
- Removed Import button from lead-list.tsx for non-admin users
- Updated /api/leads/import to return 403 for non-admin

### Fix #7: Import lead format with property mapping
- New CSV format: date, lead_source, lead_name, number, project_name
- 4-step import wizard: Upload → Map Properties → Confirm → Done
- Step 2 shows project names from CSV with dropdown to match to listed properties
- Auto-matches project names to properties by name similarity
- Step 3 shows mapping summary and assign-to dropdown
- On confirm, creates leads with project links and property links based on mapping

### Fix #8: Bulk lead select + assign option for admin panel
- Added checkboxes to lead rows (admin only)
- Select all checkbox in header row
- "Assign (N)" button appears when leads selected
- Bulk assign dialog with user selection
- Assigns all selected leads to chosen user

### Files Modified
- src/components/lead-list.tsx (major rewrite - fixes 1,2,3,5,6,8)
- src/components/lead-import.tsx (complete rewrite - fix 7)
- src/components/dashboard.tsx (fix 4)
- src/components/lead-detail.tsx (fix 3)
- src/components/app-layout.tsx (fix 6)
- src/app/api/dashboard/route.ts (fix 4)
- src/app/api/users/route.ts (fix 2)
- src/app/api/leads/import/route.ts (fix 7)
- src/app/api/leads/import/confirm/route.ts (fix 7)
- src/app/api/properties/route.ts (fix 1)

### Build Verification
- Build passes with zero errors and zero warnings

---
Task ID: 4
Agent: main
Task: Fix ASSIGN option, add QUICK FEEDBACK/FOLLOW UP buttons for telecaller/sales, update import feature

Work Log:
- Fixed assign API to allow primary owners to reassign leads (not just current owners)
- Added visible Feedback and Follow Up buttons directly on lead rows for all roles
- Added Assign button visible on lead rows when user is admin, current owner, or primary owner
- Updated lead-list.tsx: new canAssign() function, openFeedbackDialog(), openAssignDialog() helpers
- Fixed users fetch for non-admin: now includes all active users (not just non-admin) for assign dropdown
- Updated assign API: now allows currentOwner, primaryOwner, or admin to assign
- Updated import API to support XLS/XLSX files using xlsx library
- Added MAIL ID (email) column to import format
- Added duplicate detection: checks existing leads by phone number, highlights duplicates in RED
- Added duplicate handling: skip duplicates checkbox, visual red highlighting in import table
- Made project name editable per lead row in import (not auto-mapped from file)
- Import now has 5 steps: Upload → Review & Edit → Map Properties → Confirm → Done
- Added xlsx dependency for XLS/XLSX file parsing
- Removed unused imports (X, CheckSquare from lead-list.tsx)

Stage Summary:
- Build passes successfully
- All 3 user requests implemented:
  1. ASSIGN option fixed - now works for admin, current owner, and primary owner
  2. QUICK FEEDBACK & FOLLOW UP buttons now visible on lead rows for telecaller/sales + ASSIGN if they are primary owner
  3. IMPORT LEAD supports XLS and CSV formats with columns: DATE(DD.MM.YY), LEAD SOURCE, NAME, NUMBER, MAIL ID, PROJECT NAME
     - Project name is editable per lead (not auto-mapped from file)
     - Duplicate leads are highlighted in RED
     - Skip duplicates option during import
