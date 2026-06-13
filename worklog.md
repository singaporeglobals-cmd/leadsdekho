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
