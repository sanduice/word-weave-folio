
# Sidebar: Remove Recent, Drag-to-Reorder, and Untitled Fallback

## Summary of Changes

Three independent improvements to the sidebar, implemented cleanly with minimal blast radius.

---

## 1. Remove the "Recent" Segment

### What changes
- `src/components/AppSidebar.tsx`: Remove the entire `{/* Recents */}` JSX block and the `useRecentPages` import/call.
- `src/hooks/use-pages.ts`: The `useRecentPages` and `useTrackPageOpen` hooks still exist (they are still called from `PageEditor.tsx` via `trackOpen.mutate`) — only the import in `AppSidebar.tsx` is removed.
- `AppSidebar.tsx` import line: Remove `useRecentPages` from the destructured import (keep `useFavoritePages`).

### Corner cases
| Case | Handling |
|---|---|
| `useTrackPageOpen` still used in `PageEditor.tsx` | Leave hook in `use-pages.ts` untouched |
| `Clock` icon import | Remove from `AppSidebar.tsx` imports (no longer used) |
| `useRecentPages` query still runs | Remove the `useRecentPages()` call from `AppSidebar` to stop the unnecessary network request |

---

## 2. Drag-to-Reorder — Pages and Favorites

### Database change
The `pages` table currently has no ordering column. Rows are fetched ordered by `created_at`. To support persistent drag ordering, a `sort_order` integer column is added.

**Migration SQL:**
```sql
ALTER TABLE public.pages ADD COLUMN sort_order integer;

-- Backfill existing rows using row_number over created_at within each (space_id, parent_id) group
UPDATE public.pages p
SET sort_order = sub.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY space_id, parent_id
           ORDER BY created_at ASC
         ) AS rn
  FROM public.pages
) sub
WHERE p.id = sub.id;
```

No new RLS policy is needed — the existing "Allow all access to pages" policy covers UPDATE.

### How reordering works (client-side only, no new library)

Native HTML5 drag-and-drop is used (no extra package). This keeps the bundle small and avoids version compatibility issues with libraries like `dnd-kit` or `react-beautiful-dnd`.

Each draggable item gets:
- `draggable={true}`
- `onDragStart` — stores the dragged page ID in `dragState` ref
- `onDragOver` — sets a visual drop indicator (CSS class `drag-over`) on the target item
- `onDrop` — computes new order and fires `useReorderPages` mutation
- `onDragLeave` / `onDragEnd` — cleans up visual state

### New hook: `useReorderPages` in `src/hooks/use-pages.ts`

```ts
export function useReorderPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      // Batch update: one UPDATE per page (Supabase JS doesn't support batch UPDATE natively)
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from("pages").update({ sort_order }).eq("id", id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pages"] }),
  });
}
```

### Updated fetch ordering in `usePages`

```ts
.order("sort_order", { ascending: true, nullsFirst: false })
.order("created_at", { ascending: true }) // tiebreaker for nulls
```

### Updated `useUpdatePage` signature

Add `sort_order?: number` to the accepted fields so the reorder hook can call update cleanly.

### PageTree changes (`src/components/PageTree.tsx`)

`PageTreeItem` receives new props:
- `onReorder: (draggedId: string, targetId: string, position: "before" | "after") => void`
- Visual drop line shown using a CSS class on the target item (a 2px blue top/bottom border indicator)

The `PageTree` component orchestrates the `draggedId` and passes the reorder callback down. After drop, it recalculates `sort_order` for all siblings:

```
// Example: pages A(1), B(2), C(3) — drag C before A
// Result: C=1, A=2, B=3 → send {C: 1, A: 2, B: 3} to useReorderPages
```

Reorder is applied optimistically in local state while the mutation is in flight to feel instant.

### Favorites drag-to-reorder

Favorites are a flat list in `AppSidebar.tsx`. The `pages` table already has `is_favorite` as a boolean, but favorites have no dedicated ordering. The same `sort_order` column is reused — favoriting a page does not reset its `sort_order`.

Favorites are rendered in `AppSidebar.tsx` with the same native drag-and-drop pattern, directly in the JSX (no sub-component needed since it's flat). After reorder, `sort_order` values for the reordered favorites pages are updated and the query invalidated.

### Corner cases

| Case | Handling |
|---|---|
| Drag a page onto itself | `draggedId === targetId` → no-op |
| Drag a parent page into its own child | Reorder only moves within the same sibling group (same `parent_id`) — cannot change parent via drag in the sidebar, only reorder siblings |
| Drop outside a valid target | `onDragLeave` / `onDragEnd` cleanup removes indicator, no reorder fires |
| Network error on reorder | `onError` reverts local optimistic state via `qc.invalidateQueries` |
| Pages at max depth (depth === 3) shown without expand | Still draggable — just no children shown |
| Favorites and Pages share the same `sort_order` column | They are in different query groups and different UI lists — no conflict. `usePages` queries per `space_id`; favorites query filters by `is_favorite`. Ordering is independent within each list. |
| Existing pages with `sort_order = null` | Migration backfills all. New pages created via `useCreatePage` should set `sort_order` to `MAX(sort_order) + 1` for the sibling group. This is handled by computing max sort_order from the current pages list in the create flow. |

---

## 3. "Untitled" Fallback for Blank Page Titles

### Where blank titles appear
- `PageTree.tsx` — `{page.title}` in both the collapsible and leaf variants
- `AppSidebar.tsx` — Favorites list `{page.title}`

### Fix
Replace bare `{page.title}` with a helper:

```ts
const displayTitle = (title: string) => title?.trim() || "Untitled";
```

Applied in:
- `PageTreeItem` (both the collapsible header and leaf node)
- Favorites loop in `AppSidebar.tsx`

### Styling
"Untitled" gets a muted italic style to visually distinguish it from real titles:

```tsx
<span className={`truncate ${!page.title?.trim() ? "italic text-muted-foreground/50" : ""}`}>
  {displayTitle(page.title)}
</span>
```

### Corner cases

| Case | Handling |
|---|---|
| Title is `null` | `page.title` is typed as `string` (NOT NULL in DB with default `'Untitled'`), but defensive `?.trim()` handles any edge case |
| Title is whitespace-only (e.g. user typed spaces) | `.trim()` converts to empty string → shows "Untitled" |
| Title changes while user is typing in editor | Sidebar is reactively updated via query invalidation after the 1.5s auto-save debounce — no special handling needed |
| Favorites section shows blank title | Fixed identically by applying the same helper in `AppSidebar.tsx` favorites loop |

---

## Files Changed

| File | Change |
|---|---|
| Database migration | Add `sort_order integer` column to `pages`, backfill from `created_at` |
| `src/hooks/use-pages.ts` | Add `useReorderPages` hook; update `usePages` to order by `sort_order`; add `sort_order` to `useUpdatePage` params |
| `src/components/PageTree.tsx` | Add drag-and-drop props and logic; apply "Untitled" fallback |
| `src/components/AppSidebar.tsx` | Remove Recent section and its imports; add drag-and-drop to Favorites; apply "Untitled" fallback to Favorites |

No new packages needed.
