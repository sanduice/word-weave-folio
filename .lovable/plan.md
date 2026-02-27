

## Investigation Summary

After inspecting the codebase and taking a screenshot, I identified two issues:

### Issue 1: Dropdown menus in sidebar can get clipped/hidden

The sidebar's `DropdownMenuContent` components use `side="right"` or default positioning, but the sidebar container and its `SidebarContent` use `overflow-hidden` / `overflow-y-auto` internally (from the shadcn sidebar component). Since `DropdownMenuContent` renders inside a Radix Portal, it should not be clipped. However, the context menus for pages (`PageTree`), folders (`FolderItem`), and todo lists (`TodoList`) all appear to render correctly via portals already.

The actual styling gap is that the dropdown menus in the sidebar lack visual consistency with a Notion-style design. Specifically:
- The 3-dot menu trigger buttons have inconsistent opacity transitions
- Dropdown content lacks subtle styling refinements (slightly larger border-radius, softer shadow)

### Issue 2: Cards on HomePage need more rounding

The `Card` component uses `rounded-lg` which maps to `var(--radius)` = `0.5rem` (8px). For a Notion-inspired warm aesthetic, cards should be more rounded.

## Plan

### 1. Increase card border-radius

Update `--radius` CSS variable from `0.5rem` to `0.75rem` in `src/index.css`. This globally increases rounding for cards, dialogs, inputs, and other components that derive from `--radius`.

### 2. Refine dropdown menu styling in sidebar

Update `src/components/ui/dropdown-menu.tsx` to use slightly softer shadows and ensure consistent rounded corners on `DropdownMenuContent`.

### 3. Ensure sidebar dropdown menus don't get visually cut off

The Radix portal should handle this, but verify the `DropdownMenuContent` z-index is sufficient (`z-50`) and add `sideOffset` for better spacing when menus open from sidebar items.

### Files to change

| File | Change |
|------|--------|
| `src/index.css` | Increase `--radius` from `0.5rem` to `0.75rem` |
| `src/components/ui/dropdown-menu.tsx` | Add softer shadow, slight side offset improvement |
| `src/components/PageTree.tsx` | Add `sideOffset={4}` to dropdown content for better spacing |
| `src/components/FolderItem.tsx` | Add `sideOffset={4}` to dropdown content |

