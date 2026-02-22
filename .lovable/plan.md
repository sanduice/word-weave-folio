

# Todo List UI Improvements + Drag Reordering

## Changes

### 1. Remove outer border/outline from task list
Remove the `border border-border rounded-lg` classes from the task list container div (line 96). Keep only `divide-y divide-border` for row separators.

### 2. Make todo titles semibold
Change the title `<span>` from `text-sm` to `text-sm font-semibold` (line 119).

### 3. Smaller checkboxes
Reduce checkbox size from `h-4 w-4` to `h-3.5 w-3.5` on both the task row checkbox (line 116) and the inline add checkbox (line 136).

### 4. Add drag handle for reordering
- Add a `GripVertical` icon (from lucide-react) to the left of each todo row, visible on hover
- Implement drag-and-drop reordering using native HTML drag events (no new dependency needed)
- On drop, reorder the list locally and persist the new `sort_order` values to the database via `useUpdateTodo`

## Files to Modify

| File | Change |
|---|---|
| `src/components/TodoListView.tsx` | Remove outer border, semibold titles, smaller checkboxes, add drag handle + reorder logic |

## Technical Details

- Drag handles use `draggable` attribute on each row with `onDragStart`, `onDragOver`, `onDrop` handlers
- The drag handle (GripVertical icon) appears with `opacity-0 group-hover:opacity-100` so it only shows on row hover
- On drop, compute new `sort_order` values for affected items and batch-update via `useUpdateTodo`
- Each row gets `group` class for the hover-reveal pattern
- The reorder persists by updating each moved todo's `sort_order` field in the database

