---
Task ID: 1
Agent: Main Agent
Task: Add custom date selection, project-wise, and source-wise filter options to Reports section

Work Log:
- Updated all 3 API routes (date-wise, source-wise, project-wise) to accept `project` and `source` query params for filtering
- Completely rewrote reports-page.tsx with a unified filter bar approach:
  - Added shared filter state (fromDate, toDate, projectId, sourceId) at the top-level ReportsPage component
  - All 3 report tabs (Date-wise, Source-wise, Project-wise) now receive filter props and pass them to API calls
  - Removed duplicate date pickers from each individual tab component
- Added quick date preset buttons: Today, Last 7 Days, Last 30 Days, This Month, Last Month, Last 3 Months
- Added custom From/To date pickers in the unified filter bar
- Added Project dropdown filter (fetches projects from /api/projects)
- Added Source dropdown filter (10 sources: Manual, Website, Referral, etc.)
- Added Reset button to clear all filters
- Added active filter indicator badges showing current selections
- Filter bar is styled with a gold/brand border accent to stand out
- Build verified: `npx next build` succeeds with no errors

Stage Summary:
- Reports section now has a single unified filter bar at the top
- Custom date range selection with quick presets
- Project-wise filter dropdown
- Source-wise filter dropdown
- All filters apply across all 3 report tabs simultaneously
- API endpoints updated to support project and source filtering
