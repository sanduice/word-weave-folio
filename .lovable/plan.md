

## Plan: Shared page indicators and "Shared with me" sidebar section

### Problem
1. No visual indicator on the TopBar showing who a page is shared with
2. Users who receive shared pages have no way to find them — there's no "Shared with me" section

### Changes

#### 1. TopBar — Show shared user avatars (like Notion)
**File: `src/components/TopBar.tsx`**
- Import `usePageShares` and `Avatar` components
- Before the Share button, render a row of small overlapping avatars (max 3) for users the page is shared with
- If more than 3, show a `+N` counter
- Clicking the avatar cluster opens the ShareDialog

#### 2. New hook — Fetch pages shared with current user
**File: `src/hooks/use-shared-pages.ts`** (new)
- Query `page_shares` where `shared_with_id = auth.uid()`, joining page data (`pages(id, title, icon_type, icon_value, space_id, spaces(name, icon))`)
- Return the list of shared pages with sharer info
- RLS already permits this — `page_shares_select` allows rows where `is_page_shared_with(auth.uid(), page_id)` is true, and `pages` SELECT policy allows access via the same function

#### 3. Sidebar — "Shared with me" section
**File: `src/components/AppSidebar.tsx`**
- Add a new `SidebarGroup` labeled "Shared with me" (with a `Users` icon) between Favorites and the footer
- List pages from the new `useSharedPages` hook
- Each item shows the page icon/title; clicking navigates to the page
- If empty, the section is hidden

#### 4. Allow navigating to shared pages
**File: `src/stores/app-store.ts`** — no changes needed; `setSelectedPageId` already works for any page ID
**File: `src/hooks/use-pages.ts`** — `usePage(pageId)` already fetches by ID and RLS permits shared pages, so the PageEditor will load correctly

### Technical details

- No database migration needed — `page_shares` table and RLS policies already support all required queries
- The `usePageShares(pageId)` hook already fetches shares for a page (used for avatar display in TopBar)
- The new `useSharedPages` hook does the reverse: fetches all pages shared with the current user
- Shared pages in the sidebar won't show space-specific grouping — they appear in a flat "Shared with me" list regardless of the selected space

