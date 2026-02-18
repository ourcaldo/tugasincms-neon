# CMS Dashboard UI Revamp — Implementation Plan

> **Goal**: Transform the CMS dashboard into a clean, modern, and consistent UI  
> **Inspired by**: Shopeers, Minecloud, Constructor X dashboard designs  
> **Approach**: Not copying — adapting their design principles to our CMS context  
> **Total items**: 28 tasks across 5 phases

---

## Design Principles (from reference analysis)

1. **Consistent layout shell** — sidebar + top header bar with breadcrumbs, search, theme toggle, user avatar
2. **One container width** — all content inside the same max-width, no per-page variance
3. **Clean typography hierarchy** — one heading style per level, no variance
4. **Card-based sections** — subtle shadows/borders, consistent padding and spacing
5. **Unified feedback** — one loading pattern, one toast system, one delete confirmation
6. **Stat dashboard home** — overview page with key metrics, not a blind redirect to `/posts`

---

## Phase 1: Layout Shell & Foundation (7 items)

### 1.1 — Revamp Dashboard Header Bar
**File**: `components/layout/dashboard-layout.tsx`  
**Current**: Static "Content Management System" text + SidebarTrigger only  
**Target**: Full top bar with:
- Left: `SidebarTrigger` + dynamic breadcrumb (using shadcn `Breadcrumb`)
- Right: Global search (Command+K trigger), theme toggle (Sun/Moon), notification bell placeholder, user avatar dropdown (Clerk `UserButton`)
- Border bottom, subtle `bg-background` sticky top

**Changes**:
- Import and use `Breadcrumb`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator` from `components/ui/breadcrumb`
- Create `components/layout/dashboard-header.tsx` — client component that reads `usePathname()` to build breadcrumbs dynamically
- Add theme toggle using existing `ThemeProvider` (Sun/Moon icon button)
- Add Clerk `UserButton` component in top-right
- Remove the hardcoded `<h1>Content Management System</h1>`

### 1.2 — Revamp Sidebar Design
**File**: `components/layout/app-sidebar.tsx`  
**Current**: Basic sidebar with group labels, flat menu items, footer with avatar+logout  
**Target** (inspired by Shopeers/Constructor X):
- **Header**: App logo/name "TugasCMS" with a small icon — keep but refine spacing
- **Navigation groups**: Keep current groups but add individual icons to ALL menu items (not just some)
- **Active state**: Ensure proper highlight using `isActive` with starts-with logic for all nested routes (e.g., `/posts/edit/123` highlights "All Posts")
- **Collapsible groups**: Use `Collapsible` + `SidebarMenuSub` for nested items in "Settings" group
- **Footer**: Remove the custom avatar block — user is now in the top-right header; replace footer with a subtle `Separator` + "TugasCMS v1.0" or nothing
- **Remove raw `fetch()`**: Use `apiClient` for custom post types fetch
- **Polish**: Clean icon assignments: FileText(posts), File(pages), FolderKanban(categories), Tags(tags), Briefcase(jobs), etc.

### 1.3 — Standardize Page Container
**File**: `components/layout/dashboard-layout.tsx` + ALL page wrappers  
**Current**: Chaos — `max-w-2xl`, `max-w-4xl`, `max-w-6xl`, `max-w-7xl`, `container mx-auto`, and nothing at all  
**Target**: ONE container in the layout:
```tsx
<div className="flex-1 overflow-auto">
  <DashboardHeader />
  <div className="mx-auto max-w-7xl px-6 py-6">
    {children}
  </div>
</div>
```
Then **remove** all per-page/per-component containers:
- Remove `max-w-6xl mx-auto` from categories-list, tags-list, job-categories-list, job-tags-list, employment-types-list, experience-levels-list, education-levels-list
- Remove `max-w-4xl mx-auto` from post-editor, page-editor, api-tokens
- Remove `max-w-2xl mx-auto` from profile-settings
- Remove `container mx-auto py-6` from page wrappers (education-levels, employment-types, experience-levels, job-categories, job-tags, job-posts/new, job-posts/edit/[id])
- Remove `max-w-7xl mx-auto` from pages/page.tsx, job-posts/page.tsx

### 1.4 — Create Shared `PageHeader` Component
**File**: NEW `components/layout/page-header.tsx`  
**Current**: Every page hand-rolls its own `<h1>` with different classes  
**Target**: Reusable component:
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;  // slot for buttons
}
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```
Then replace all hand-rolled headers in:  
`posts-list`, `pages-list`, `job-posts-list`, `categories-list`, `tags-list`, `job-categories-list`, `job-tags-list`, `employment-types-list`, `experience-levels-list`, `education-levels-list`, `post-editor`, `page-editor`, `job-post-editor`, `profile-settings`, `api-tokens`, `custom-post-types-settings`, `advertisements/page.tsx`, `seo/page.tsx`, `settings/page.tsx`

### 1.5 — Create Shared `LoadingState` Component
**File**: NEW `components/ui/loading-state.tsx`  
**Current**: 5 different loading patterns (nothing, Loader2 spinner, text, animate-pulse skeleton, custom CSS spinner)  
**Target**: One reusable component:
```tsx
interface LoadingStateProps {
  message?: string;
  className?: string;
}
export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-3", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
```
Replace ALL loading patterns in every component.

### 1.6 — Create Shared `EmptyState` Component
**File**: NEW `components/ui/empty-state.tsx`  
**Current**: Every component hand-rolls empty state with different icons, text, CTA presence  
**Target**: Reusable:
```tsx
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```
With consistent layout: centered icon (in muted circle) + title + description + optional CTA button.

### 1.7 — Unify Toast System
**Files**: `app/(dashboard)/settings/advertisements/page.tsx`, `app/(dashboard)/settings/seo/page.tsx`  
**Current**: These 2 files use `useToast()` from `@/hooks/use-toast`; all other files use `toast` from `sonner`  
**Target**: Convert both files to use `toast` from `sonner`:
- `toast.success("Settings saved")` instead of `toast({ title: "Success", description: "..." })`
- `toast.error("Failed to save")` instead of `toast({ variant: "destructive", ... })`
- Remove `import { useToast } from '@/hooks/use-toast'`
- Optionally delete `hooks/use-toast.ts` if no longer used anywhere

---

## Phase 2: List Pages Consistency (8 items)

### 2.1 — Align `pages-list` to Standard Pattern
**File**: `components/pages/pages-list.tsx` (402 lines)  
**Current**: Structurally different from every other list  
**Target**: Refactor to match `posts-list` pattern:
- **Layout**: `space-y-6` wrapper (not single Card)
- **Filter section**: Separate Card with grid layout `grid-cols-1 md:grid-cols-4 gap-4`
- **Search icon**: `left-3 top-1/2 -translate-y-1/2` + `pl-10` (match others)
- **Add "Clear Filters" button**
- **Pagination**: Full page numbers with ellipsis (match posts-list)
- **Bulk action bar**: Add `p-4 bg-muted rounded-lg gap-4` background
- **Empty state**: Add FileText icon + CTA button
- **Tooltips**: Wrap action buttons in Tooltip

### 2.2 — Fix Status Badge Variants
**File**: `components/pages/pages-list.tsx`  
**Current**: `draft=outline`, `scheduled=secondary` (swapped vs posts-list)  
**Target**: Standardize across ALL lists:
- `draft` → `secondary`
- `published` → `default`
- `scheduled` → `outline`

### 2.3 — Replace `confirm()` with `ConfirmDeleteDialog`
**Files**: 
- `components/job-posts/job-posts-list.tsx` — delete action still uses `confirm()`
- `app/(dashboard)/settings/advertisements/page.tsx` — reset action uses `confirm()`

**Target**: Both should use `ConfirmDeleteDialog` (or a similar confirm modal for the reset action).

### 2.4 — Standardize Table/Column Dimensions
**Files**: ALL list components  
**Target**: Consistent dimensions:
- Checkbox column: `w-10` everywhere
- Actions column: `w-16` everywhere
- Action dropdown trigger: `variant="ghost" size="sm"` everywhere (not `size="icon"`)

### 2.5 — Standardize Bulk Action Bar
**Files**: `pages-list.tsx`  
**Target**: All bulk action bars should use:
```tsx
<div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
  <span className="text-sm">{count} selected</span>
  <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
  <Button variant="ghost" size="sm">Clear Selection</Button>
</div>
```
- Use `Trash2` icon (not `Trash`) everywhere
- Use `gap-4` (not `gap-2`)
- Include "Clear Selection" button

### 2.6 — Add Loading States to Lists Missing Them
**Files**: `posts-list.tsx`, `job-posts-list.tsx`  
**Current**: No loading indicator at all — table just appears empty while fetching  
**Target**: Show `<LoadingState />` component while `loading === true`.

### 2.7 — Add Search/Filter to Settings Lists
**Files**: `categories-list.tsx`, `tags-list.tsx`, `job-categories-list.tsx`, `job-tags-list.tsx`, `employment-types-list.tsx`, `experience-levels-list.tsx`, `education-levels-list.tsx`  
**Current**: No search or filter — lists just dump everything  
**Target**: Add a simple search Input above the table (at minimum) to filter by name. Use a debounced client-side filter since these lists are typically small.

### 2.8 — Standardize "Select All" Logic
**Files**: `categories-list.tsx` (selects ALL data), `tags-list.tsx` (selects current page)  
**Target**: All lists should select current page only, with a visible banner "All X items on this page selected. Select all Y items?" pattern.

---

## Phase 3: Editor Pages Polish (4 items)

### 3.1 — Standardize Editor Headers & Action Buttons
**Files**: `post-editor.tsx`, `page-editor.tsx`, `job-post-editor.tsx`  
**Target**: All editors should use `<PageHeader>` with consistent action buttons:
```tsx
<PageHeader
  title={postId ? "Edit Post" : "Create New Post"}
  actions={
    <>
      <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-2" />Preview</Button>
      <Button variant="outline" size="sm"><Save className="w-4 h-4 mr-2" />Save Draft</Button>
      <Button size="sm"><Send className="w-4 h-4 mr-2" />Publish</Button>
    </>
  }
/>
```

### 3.2 — Replace Raw `fetch()` in Post/Page Editors
**Files**: `post-editor.tsx`, `page-editor.tsx`  
**Current**: Both use raw `fetch('/api/categories')` and `fetch('/api/tags')` 
**Target**: Replace with `apiClient.get<T>()` from `useApiClient()` (already done in job-post-editor).

### 3.3 — Align Page Editor SEO Section with Post Editor
**File**: `page-editor.tsx`  
**Current**: SEO section is flat fields without Tabs; doesn't span 2 columns  
**Target**: Match post-editor's SEO card pattern (Tabs with Fields + Preview, `lg:col-span-2`).

### 3.4 — Remove Hardcoded Colors in SEO Preview
**File**: `post-editor.tsx`  
**Current**: `text-blue-600`, `text-green-700` in SEO preview  
**Target**: Use theme tokens: `text-primary`, `text-muted-foreground`.

---

## Phase 4: Settings Pages Consistency (4 items)

### 4.1 — Standardize Settings Pages Layout
**Files**: `custom-post-types-settings.tsx`, `advertisements/page.tsx`, `seo/page.tsx`  
**Current**: No max-width constraint — stretches full width when dashboard container is added  
**Target**: All settings pages should use a max-width that looks good within the 7xl container. Content settings (ads, SEO) can use full width. Profile uses narrower. Apply consistently:
- Profile: `max-w-2xl` (narrow form)
- Custom Post Types: full width (card grid)
- Advertisements: full width (long forms)
- SEO: full width (long forms)
- API Tokens: full width (table)

### 4.2 — Fix Custom Post Types Heading
**File**: `custom-post-types-settings.tsx`  
**Current**: `<h3 className="text-lg font-medium">` — wrong heading level and size  
**Target**: Use `<PageHeader title="Custom Post Types" description="..." />`

### 4.3 — Standardize Settings Page Action Buttons
**Files**: `advertisements/page.tsx`, `seo/page.tsx`  
**Current**: Action buttons at bottom of page (inconsistent position vs editors at top)  
**Target**: Keep bottom position for settings pages (it's a valid pattern for long forms), but standardize:
```tsx
<div className="flex items-center justify-end gap-3 pt-4 border-t">
  <Button variant="outline">Reset to Defaults</Button>
  <Button>Save Settings</Button>
</div>
```
With consistent border-top separator and right-alignment.

### 4.4 — Settings Hub Page Polish
**File**: `app/(dashboard)/settings/page.tsx`  
**Current**: Card grid with icon boxes  
**Target**: Polish to match overall design:
- Use `<PageHeader>` for title
- Add API Tokens link (currently missing from hub)
- Add SEO Settings link (currently missing from hub — only accessible via sidebar if it exists)
- Consider a cleaner grid with larger click areas

---

## Phase 5: Dashboard Home & Final Polish (5 items)

### 5.1 — Create Dashboard Overview Page
**File**: NEW `app/(dashboard)/dashboard/page.tsx` + `components/dashboard/dashboard-overview.tsx`  
**Current**: Root `/` redirects to `/posts` — no overview  
**Target** (inspired by Shopeers dashboard):
- **Stat cards row**: 4 cards showing key metrics
  - Total Posts (count)
  - Total Pages (count)
  - Total Job Posts (count)
  - Published vs Draft ratio
- **Recent activity**: Latest 5 posts/pages edited (simple table or card list)
- **Quick actions**: "Create New Post", "Create New Page", "Create Job Post" buttons
- Fetch data from existing API endpoints (`/api/posts?limit=5`, etc.)

Update `app/page.tsx` to redirect to `/dashboard` instead of `/posts`.  
Add "Dashboard" as first sidebar menu item.

### 5.2 — Add Command Palette (Cmd+K Search)
**File**: NEW `components/layout/command-palette.tsx`  
**Current**: No global search  
**Target**: Use shadcn `Command` component (already installed) as a modal triggered by Cmd+K:
- Search across: Posts, Pages, Job Posts, Settings pages
- Quick navigation to any page
- Triggered from keyboard shortcut OR search button in header

### 5.3 — Sidebar Active State Fix
**File**: `components/layout/app-sidebar.tsx`  
**Current**: `isActive` only checks exact match or `/posts` starts-with  
**Target**: Generalize to `pathname?.startsWith(item.href)` for all items, with exact match for root paths.

### 5.4 — Mobile Responsive Polish
**Files**: Various list components  
**Current**: `pages-list` uses fixed `w-[180px]`/`w-[200px]` selects that overflow on mobile  
**Target**:
- All search/filter layouts should stack properly on mobile
- Remove fixed widths on filter selects
- Table should have horizontal scroll on mobile (`overflow-x-auto`)
- Test bulk action bar on small screens

### 5.5 — Final Build Verification
- Run `npx next build` to verify zero errors
- Verify all pages render correctly
- Check dark mode renders correctly with new components

---

## Summary

| Phase | Items | Focus |
|-------|-------|-------|
| **Phase 1** | 7 | Layout shell, shared components, foundation |
| **Phase 2** | 8 | List page consistency |
| **Phase 3** | 4 | Editor pages |
| **Phase 4** | 4 | Settings pages |
| **Phase 5** | 5 | Dashboard home, command palette, polish |
| **Total** | **28** | |

### Priority Order
Phases 1-2 should be done first — they address the most visible inconsistencies and set the foundation. Phase 3-4 are refinements. Phase 5 adds new features.

### Design Tokens (Reference)
Based on the Dribbble inspiration, the design direction is:
- **Headings**: `text-2xl font-semibold tracking-tight` (clean, not oversized)
- **Descriptions**: `text-sm text-muted-foreground mt-1`
- **Card spacing**: `space-y-6` between cards, `space-y-4` inside cards
- **Border radius**: Using existing `--radius: 0.625rem` (10px)
- **Colors**: Lean on existing theme tokens, avoid hardcoded colors
- **Loading**: Consistent `Loader2` spinner with muted text
- **Empty states**: Centered icon (in soft circle bg) + title + description + CTA
- **Active sidebar**: Existing `data-[active=true]` styling from shadcn sidebar
