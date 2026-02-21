

# Page Context Menu & Title Truncation

## Overview

Add a hover-triggered action menu (three-dot "more" button) to each page item in the sidebar, with Duplicate, Rename, and Delete options. Also ensure page titles never wrap to multiple lines.

## Current State

- Page titles already use `truncate` CSS class, but the parent container doesn't constrain width properly with `min-w-0`, so long titles can push the layout.
- No action menu exists on page items currently.
- `useDeletePage` and `useCreatePage` hooks already exist in `use-pages.ts`.
- No dedicated duplicate hook exists yet.

## What to Build

### 1. Three-dot action menu on hover (ContextMenu pattern)

Each page item in the sidebar will show a small "..." (MoreHorizontal) icon button on hover, aligned to the right. Clicking it opens a dropdown with:

- **Rename** -- Turns the title into an inline editable input field. On blur or Enter, saves via `useUpdatePage`.
- **Duplicate** -- Creates a copy of the page (same title + " (copy)", same content, same space/folder/parent). Selects the new page after creation.
- **Delete** -- Deletes the page with a confirmation. If the deleted page was selected, clears `selectedPageId`.

### 2. Title single-line enforcement

Add `min-w-0` and `overflow-hidden` to the flex container so `truncate` works correctly on deeply nested or long titles.

## Files to Modify

| File | Changes |
|---|---|
| `src/components/PageTree.tsx` | Add MoreHorizontal button on hover, dropdown menu with Rename/Duplicate/Delete, inline rename state, and fix title overflow |
| `src/hooks/use-pages.ts` | Add `useDuplicatePage` hook that fetches the source page and inserts a copy |

## Detailed Design

### `use-pages.ts` -- New `useDuplicatePage` Hook

```typescript
export function useDuplicatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pageId: string) => {
      const { data: source } = await supabase.from("pages").select("*").eq("id", pageId).single();
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("pages").insert({
        space_id: source.space_id,
        title: (source.title?.trim() || "Untitled") + " (copy)",
        content: source.content,
        parent_id: source.parent_id,
        folder_id: source.folder_id,
        user_id: user.data.user.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pages", data.space_id] });
    },
  });
}
```

### `PageTree.tsx` -- Changes to `PageTreeItem`

**New props passed down from `PageTree`:**
- `onDuplicate(pageId)` -- calls `useDuplicatePage` then selects the new page
- `onDelete(pageId)` -- calls `useDeletePage`, clears selection if needed
- `onRename(pageId, newTitle)` -- calls `useUpdatePage`

**New local state in `PageTreeItem`:**
- `isRenaming: boolean` -- when true, shows an input instead of the title span
- `renameValue: string` -- the current input value

**UI structure change (per page item):**

```
[GripVertical] [Chevron?] [FileText] [Title...] [MoreHorizontal (hover-only)]
```

The MoreHorizontal button appears via `opacity-0 group-hover:opacity-100` and opens a `DropdownMenu` with:
- Rename (Pencil icon) -- sets `isRenaming = true`, focuses input
- Duplicate (Copy icon) -- calls `onDuplicate(page.id)`
- Delete (Trash2 icon, destructive red) -- shows confirmation dialog, then calls `onDelete(page.id)`

**Inline rename behavior:**
- Input replaces the title span
- Auto-focused on mount
- On Enter or blur: save via `onRename(page.id, renameValue)`, exit rename mode
- On Escape: cancel, restore original title, exit rename mode

**Title overflow fix:**
- Add `min-w-0 overflow-hidden` to the outer flex div of each page item
- Ensure the `SidebarMenuButton` has `min-w-0` so the truncate on the inner span works

### Delete confirmation

Use an `AlertDialog` from the existing UI components to confirm deletion. The dialog says "Delete [page title]?" with "This action cannot be undone." message and Cancel/Delete buttons.

## Implementation Sequence

1. Add `useDuplicatePage` hook to `use-pages.ts`
2. Update `PageTree.tsx`:
   a. Add imports for hooks, DropdownMenu, AlertDialog, MoreHorizontal/Copy/Pencil/Trash2 icons
   b. Add `onDuplicate`, `onDelete`, `onRename` handlers in `PageTree` component using the hooks
   c. Pass handlers to `PageTreeItem`
   d. Add rename state, dropdown menu, and delete confirmation to `PageTreeItem`
   e. Fix overflow with `min-w-0`
3. No CSS file changes needed -- all styling via Tailwind classes

## Edge Cases

| Case | Handling |
|---|---|
| Delete the currently selected page | Clear `selectedPageId` to null after deletion |
| Rename to empty string | Save as empty -- sidebar already shows "Untitled" for blank titles |
| Duplicate a page with children | Only duplicates the page itself, not its children (keeps it simple) |
| Click "more" button while dragging | The button is inside the drag container but uses `stopPropagation` on click to prevent drag interference |
| Rename while another rename is active | Only one rename at a time per item (local state) |

