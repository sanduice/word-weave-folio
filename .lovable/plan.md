
# Folder System — Implementation Plan

## Current State Analysis

The app currently has:
- **Spaces** as top-level containers (no `folder_id` column)
- **Pages** with `parent_id` (self-referential) — the existing tree is a page-nesting system, NOT a true folder system
- `PageTree` renders page hierarchy by `parent_id`, with drag-to-reorder using `sort_order`
- No dedicated `folders` table exists

The key architectural decision: **The existing `parent_id` on pages is currently used to nest pages under other pages.** The folder system is a distinct concept — folders are containers, not content. This plan introduces a proper `folders` table and adds a `folder_id` foreign key to `pages`, while keeping `parent_id` for page-to-page nesting intact (pages can still be nested inside each other within a folder).

---

## Architecture Decision

```text
Space
 └─ Folder (folder_id = null → root level)
     ├─ Page (folder_id = folder.id)
     ├─ Page (folder_id = folder.id)
     └─ Folder (parent_folder_id = parent.id)
         └─ Page (folder_id = nested_folder.id)
```

The sidebar tree will render a **unified tree** of folders and pages mixed together, sorted by `sort_order`. Items with `folder_id = null` and `parent_id = null` are at the space root level.

---

## Database Changes (Migration)

### New `folders` table

```sql
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  parent_folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'New Folder',
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY folders_select ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY folders_insert ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY folders_update ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY folders_delete ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Add `folder_id` to `pages` table

```sql
ALTER TABLE public.pages ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;
```

Pages without a folder (`folder_id = NULL`) appear at the space root level, same as today. This is backward-compatible — no existing page data breaks.

---

## Files Overview

### New Files

| File | Purpose |
|---|---|
| `src/hooks/use-folders.ts` | All folder CRUD hooks |
| `src/components/FolderTree.tsx` | Unified folder + page tree renderer |
| `src/components/FolderItem.tsx` | Single folder row with context menu, inline rename, drag/drop |

### Modified Files

| File | What Changes |
|---|---|
| `src/components/AppSidebar.tsx` | Replace `PageTree` with `FolderTree`; add "New Folder" button next to "New Page" in header |
| `src/hooks/use-pages.ts` | Add `folder_id` to `useCreatePage`, `useUpdatePage`; update `useSearchPages` to include folder path |
| `src/stores/app-store.ts` | No changes required — `selectedPageId` / `selectedSpaceId` are sufficient |
| `src/integrations/supabase/types.ts` | Auto-regenerated after migration |

---

## Detailed Implementation

### 1. `src/hooks/use-folders.ts`

Exports:
- `useFolders(spaceId)` — fetches all folders for a space ordered by `sort_order`
- `useCreateFolder()` — insert with `user_id`, `space_id`, optional `parent_folder_id`
- `useUpdateFolder()` — rename, move (change `parent_folder_id`), reorder (`sort_order`)
- `useDeleteFolder()` — cascades via DB (ON DELETE CASCADE for child folders, ON DELETE SET NULL for pages)
- `useReorderFolders()` — batch update `sort_order` for optimistic drag reordering

### 2. `src/components/FolderTree.tsx`

This replaces `PageTree` as the sidebar content renderer. It renders a **mixed tree** of folders and pages at each level:

```text
Root level (folder_id = null AND parent_id = null):
  📁 Pre-Start Materials   ← folder
  📄 Getting Started       ← page (folder_id = null)
  
Inside a folder (folder_id = folder.id):
  📁 Week 1               ← nested folder
  📄 Day 1 Notes          ← page
```

The component recursively renders using:
- `folders.filter(f => f.parent_folder_id === currentFolderId)`  
- `pages.filter(p => p.folder_id === currentFolderId && !p.parent_id)`

Both folders and pages share the same `sort_order` integer for mixed ordering. Drop targets handle both types.

### 3. `src/components/FolderItem.tsx`

A single folder row with:

**Visual anatomy:**
```
[grip] [▶] [📁] Folder Name    [⋯]
```

**States:**
- Collapsed / expanded via `Collapsible`
- Inline rename: clicking the name or selecting "Rename" from context menu replaces the label with an `<input>`, Enter saves, Esc cancels
- Drop indicator: `border-t-2` or `border-b-2` on drag-over (sibling reorder), OR a blue background highlight when hovering to drop INTO the folder

**Context menu (on `⋯` hover or right-click):**
- Add Page (creates page with `folder_id = this folder's id`)
- Add Folder (creates child folder with `parent_folder_id = this folder's id`)
- Rename
- Move to... (opens a popover listing other folders in the same space)
- --- separator ---
- Delete (opens confirmation dialog)

**Delete confirmation dialog:**
> "Deleting **[Folder Name]** will permanently delete all its sub-folders. Pages inside will be moved to the space root."
>
> Buttons: **Delete** | **Cancel**

Note: The DB `ON DELETE CASCADE` handles child folders. `ON DELETE SET NULL` on `pages.folder_id` moves pages to root automatically — no orphan pages.

### 4. Drag & Drop System

The existing page drag system uses `draggedId` refs and `sort_order` updates. The folder system extends this with a **drag type** so you know what's being dragged:

```ts
// In dataTransfer
e.dataTransfer.setData("type", "folder" | "page");
e.dataTransfer.setData("id", item.id);
```

**Drop zones:**
- **Before/after** a folder or page → sibling reorder (updates `sort_order`)
- **Into** a folder (center zone, highlighted differently) → reparent (updates `folder_id` on page or `parent_folder_id` on folder)

**Circular nesting guard:**
Before updating `parent_folder_id`, walk the ancestor chain from the target folder upward. If the dragged folder's ID appears in that chain, reject the drop silently.

### 5. `useCreatePage` update in `use-pages.ts`

Add `folder_id?: string | null` to the mutation parameter. When a page is created from inside a folder context menu, the `folder_id` is passed. When created from the sidebar root `+ New Page` button, `folder_id` remains `null`.

### 6. AppSidebar changes

- Replace `<PageTree>` with `<FolderTree>`
- Pass both `folders` (from `useFolders`) and `pages` (from `usePages`) as props
- Add a `+ New Folder` button next to the section label, alongside the existing `+ New Page` button

### 7. Search Dialog update (`SearchDialog.tsx`)

Enhance results to show folder path:

```
📄 Day 1 Notes
   📘 My Space › 📁 Initial Batch › 📁 Week 1
```

The `useSearchPages` query will join with folders to construct the path. In MVP: show `folder.name` if `folder_id` is set, plus the space name.

---

## Edge Cases Handled

| Case | Solution |
|---|---|
| Delete folder with nested folders | `ON DELETE CASCADE` on `folders.parent_folder_id` — all descendants deleted |
| Delete folder with pages inside | `ON DELETE SET NULL` on `pages.folder_id` — pages moved to space root, no data loss |
| Circular drag (drop folder into itself or descendant) | Walk ancestor chain before confirming drop; reject silently with no UI change |
| Inline rename of currently-selected folder | Local optimistic update in sidebar; DB update confirmed in background |
| Drag a page from a folder to root | Set `folder_id = null` on the page |
| Page nested under another page (existing `parent_id` nesting) | These pages are only shown when their parent page is expanded — `folder_id` on the parent page determines which folder they appear under |
| Existing pages (no `folder_id`) | `folder_id = NULL` → they render at space root level, matching current behavior exactly. Zero data migration needed |
| New page created from folder context menu | `folder_id` is passed to `useCreatePage`; page immediately appears inside that folder |
| Folder collapse state across refresh | Stored in `localStorage` keyed by `folderId`, restored on mount |
| Very deep nesting (>7 levels) | UI allows it (no hard DB limit); visually indented with overflow truncation and `title` tooltip on the name |

---

## Implementation Sequence

1. **Database migration** — create `folders` table + add `folder_id` to `pages`
2. **`use-folders.ts`** — all CRUD hooks
3. **`use-pages.ts`** — add `folder_id` support to `useCreatePage`, `useUpdatePage`
4. **`FolderItem.tsx`** — single folder row component with context menu, inline rename, drag/drop
5. **`FolderTree.tsx`** — recursive mixed tree renderer
6. **`AppSidebar.tsx`** — wire up `FolderTree`, add "New Folder" button
7. **`SearchDialog.tsx`** — add folder path to results

---

## What Is NOT Changing

- The existing `parent_id` on pages (page-under-page nesting) is preserved unchanged
- `PageEditor`, `TopBar`, `BubbleMenuToolbar`, `SlashCommandMenu` — untouched
- Auth system, RLS policies for existing tables — untouched
- Spaces system — untouched
- Favorites — untouched (favorites are page-level, not folder-level)
