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
- **globals.css**: Added brand color CSS variables (`--color-brand`, `--color-brand-dark`, `--color-brand-light`, `--color-brand-muted`, `--color-steel`, `--color-steel-dark`, `--color-steel-light`)
- **tailwind.config.ts**: Added `brand` and `steel` color definitions to `theme.extend.colors`
- **landing-page.tsx**: Gradient `from-emerald-50 via-white to-teal-50` → `from-brand-light via-white to-steel-light`, all emerald buttons/badges → brand equivalents, CTA section `bg-emerald-600` → `bg-brand`, `text-emerald-100` → `text-brand-dark`
- **login-page.tsx**: Gradient updated, icon `bg-emerald-600` → `bg-brand`, submit button colors updated
- **app-layout.tsx**: Sidebar logo `bg-emerald-600` → `bg-brand`, active nav `bg-emerald-600` → `bg-brand`, admin role badge `bg-emerald-900 text-emerald-300` → `bg-steel-dark text-steel-light`, avatar fallback `bg-emerald-600` → `bg-brand`
- **dashboard.tsx**: All `border-l-emerald-*` → `border-l-brand`, `bg-emerald-50` → `bg-brand-light`, `text-emerald-600` → `text-brand` (kept Won status `bg-emerald-500` as status indicator)
- **lead-list.tsx**: All `bg-emerald-600 hover:bg-emerald-700` buttons → `bg-brand hover:bg-brand-dark`
- **lead-detail.tsx**: Button colors updated, `ring-emerald-500` → `ring-brand`, `text-emerald-600` icon → `text-brand`
- **property-management.tsx**: Button colors updated, card header gradient `from-emerald-100 to-teal-50` → `from-brand-muted to-steel-light`
- **reports-page.tsx**: COLORS array `#10b981` → `#dfb338`, bar chart fill `#10b981` → `#dfb338`
- **user-management.tsx**: Button colors updated, admin role badge `bg-emerald-100 text-emerald-700` → `bg-brand-muted text-brand-dark`
- **site-visit-module.tsx**: Button colors updated
- **lead-import.tsx**: Button colors updated
- **page.tsx**: Loading spinner `border-emerald-600` → `border-brand`

### Bug Fixes
1. **site-visit-module.tsx**: Fixed `fetchVisits()` call that didn't exist. Added `refresh` state counter, included it in useEffect dependency array, and replaced `fetchVisits()` with `setRefresh(r => r + 1)`.
2. **API leads/[id]/route.ts**: Verified the API route returns the full lead with all relations (primaryOwner, currentOwner, project, callLogs, followUps, siteVisits, assignments, timeline) - already correct.

### Preserved
- Won/Lost status colors (`bg-emerald-500`, `bg-red-500`) kept as functional status indicators
- Pipeline status badge colors in statusColors objects kept unchanged
- Available status in property-management (`bg-emerald-100 text-emerald-700`) kept as status indicator
- Won border color in lead-list (`border-l-emerald-500`) kept as pipeline stage color

### Verification
- Lint passed with no errors
- Dev server compiling successfully

## Task 1: Four Feature Implementation (Agent: main)

### Summary
Implemented 4 features: Dark/Light Mode Toggle, Admin is NOT Primary Owner fix, Lead List Redesign (flat layout), and Lead-Property linking.

### Feature 1: Dark & Light Mode Toggle

**Theme Provider**: Already set up in `providers.tsx` with `next-themes` using `attribute="class"`.

**Dark mode CSS**: Updated `.dark` section in `globals.css` with proper dark mode color variables (oklch values for background, card, popover, muted, border, input, etc.).

**Theme Toggle Buttons**:
- `app-layout.tsx`: Added Sun/Moon toggle in sidebar (before Sign Out button in user section)
- `app-layout.tsx`: Added Sun/Moon icon button in top header bar (for mobile access when sidebar collapsed)
- Both import `useTheme` from `next-themes` and `Sun`/`Moon` from `lucide-react`
- Toggle switches between "light" and "dark" themes

**Semantic Class Migration** (replacing hardcoded colors):
- `app-layout.tsx`: `bg-gray-50` → `bg-background`, `bg-white border-gray-200` → `bg-background border-border`, `text-gray-900` → `text-foreground`, `text-gray-600` → `text-foreground`
- `landing-page.tsx`: `bg-gradient-to-br from-brand-light via-white to-steel-light` → `from-brand-light via-background to-steel-light`, `text-gray-900` → `text-foreground`, `text-gray-500` → `text-muted-foreground`, `border-gray-200 bg-white/80` → `border-border bg-card/80`, `bg-white` → `bg-card`, `bg-gray-50` → `bg-muted`
- `login-page.tsx`: `border-gray-200` → `border-border`, `text-gray-900` → `text-foreground`, `text-gray-500` → `text-muted-foreground`, `hover:bg-gray-50` → `hover:bg-muted`, `border-gray-200` → `border-border`
- `dashboard.tsx`: All 3 dashboards updated: `bg-gray-200` → `bg-muted`, `text-gray-500` → `text-muted-foreground`, `text-gray-900` → `text-foreground`, `text-gray-700` → `text-foreground`, `text-gray-600` → `text-muted-foreground`, `border-gray-100` → `border-border`, `hover:bg-gray-50` → `hover:bg-muted`, `bg-amber-50` → `bg-amber-50 dark:bg-amber-950`, etc.
- `lead-detail.tsx`: Same semantic migration for all text, background, and border colors. Added `dark:` variants for status badges and colored backgrounds.
- `lead-list.tsx`: Complete rewrite (see Feature 3), all using semantic classes
- `page.tsx`: Loading spinner `bg-gray-50` → `bg-background`, `text-gray-500` → `text-muted-foreground`

**Important**: Sidebar remains dark (`bg-gray-900`) in both light and dark modes. Only main content area changes with theme.

### Feature 2: Admin is NOT Primary Owner

**File**: `src/app/api/leads/[id]/assign/route.ts`

**Change**: When a lead is assigned from admin to someone:
- The `currentOwner` changes to the new person (already working)
- Now also checks: if `primaryOwner.role === "admin"`, also updates `primaryOwnerId` to the new assignee
- Added `include: { primaryOwner: { select: { id: true, name: true, role: true } } }` to the initial lead query to check role
- Used dynamic `updateData` object to conditionally include `primaryOwnerId` update

### Feature 3: Redesign Lead List - Flat Line-by-Line Layout

**File**: `src/components/lead-list.tsx` - Complete rewrite

**New Design**:
- Flat list layout instead of card-based grid
- Each lead is a single row with `border-b border-border` separators
- Wrapped in a `rounded-lg border border-border` container
- Header row visible on md+ screens

**Each Lead Row**:
- **Row 1 (main info)**: Status dot (colored) | Name (bold) | Status Badge | Phone | Email
- **Row 2 (details)**: Source | Project | Budget | Owner name | Last feedback (truncated)
- **Inline Actions at right**:
  - Quick Feedback: text input + Send button (inline, no dialog)
  - Quick Assign: Select dropdown + Send button (admin only, inline)
  - View button (eye icon)
  - Dropdown menu (...) with: View Details, Quick Feedback (dialog), Assign Lead (dialog), Delete Lead

**State Management**:
- `inlineFeedback`: Record<string, string> for per-lead feedback input values
- `inlineAssign`: Record<string, string> for per-lead assign select values
- `submittingFeedback` / `submittingAssign`: Record<string, boolean> for loading states

**Preserved**:
- "Add Lead" remains a dialog
- Quick Feedback dialog still available from dropdown menu
- Assign dialog still available from dropdown menu
- Delete confirmation dialog preserved

### Feature 4: Link Property List with Lead Properties

**Schema Change** (`prisma/schema.prisma`):
- Added `LeadProperty` model with `id`, `leadId`, `propertyId`, `createdAt`
- `@@unique([leadId, propertyId])` constraint
- Added `leadProperties LeadProperty[]` to `Lead` model
- Added `leadProperties LeadProperty[]` to `Property` model
- Ran `npx prisma db push` successfully

**API Route** (`src/app/api/leads/[id]/properties/route.ts`):
- GET: Returns all properties linked to a lead (with property details)
- POST: Links a property to a lead (body: `{ propertyId }`), checks for duplicates, creates timeline event
- DELETE: Unlinks a property from a lead (body: `{ propertyId }`), creates timeline event

**Lead Detail API** (`src/app/api/leads/[id]/route.ts`):
- Updated GET to include `leadProperties` with nested property details (id, name, type, status, price, location, size)

**Lead Detail UI** (`src/components/lead-detail.tsx`):
- Added `LeadProperty` interface
- Added "Properties" card section with:
  - Count of linked properties in header
  - List of linked properties showing name, type badge, status badge, location, price, size
  - Remove button (trash icon) to unlink a property
  - "Add Property" button opens dialog with select dropdown of available properties
  - Properties already linked are filtered out from the add dropdown
- Added timeline events for PropertyLinked and PropertyUnlinked

### Verification
- Lint passed with no errors
- Prisma db push successful
- Dev server compiling successfully
