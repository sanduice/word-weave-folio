

# Sidebar Redesign

## Current Problems
1. **Header**: Shows "Notespace" branding instead of active space name like Notion
2. **Space selector**: Buried as a dropdown inside the content area
3. **Todo lists**: No context menu (rename, delete, drag) — pages have full 3-dot menus, folders have full menus, but todo lists have nothing
4. **Search**: Not in sidebar — only accessible via TopBar shortcut
5. **Inconsistent structure**: Space label section, separate Home button, separate Space dropdown — too many levels

## New Sidebar Layout (Notion-inspired)

```text
┌─────────────────────────┐
│ 📘 Space Name    ▼  ✏️+ │  ← Header = active space (dropdown to switch/create)
├─────────────────────────┤
│ 🔍 Search               │  ← Quick action row
│ 🏠 Home                 │
├─────────────────────────┤
│ TODO LISTS          [+] │  ← Section label
│   ☑ My Tasks        ··· │  ← Each item gets hover 3-dot menu
│   ☑ Sprint Board    ··· │    (Rename, Delete)
├─────────────────────────┤
│ PAGES            [📄][📁]│  ← Section label with add buttons
│   📄 Getting Started ···│  ← Existing page tree (unchanged)
│   📁 Docs            ···│
├─────────────────────────┤
│ ⭐ FAVORITES             │  ← Existing favorites (unchanged)
│   📄 Pinned page         │
├─────────────────────────┤
│ 👤 User Name         ▲  │  ← Footer (unchanged)
└─────────────────────────┘
```

## File Changes

### 1. `src/components/AppSidebar.tsx` — Major restructure
- **Header**: Replace "Notespace" branding with the active space name + icon. Add a dropdown (using existing `SpaceSelector` logic inline) to switch spaces. Add a "new page" quick-create button next to it (like Notion's pencil icon in the screenshot).
- **Remove** the separate "Space" section with `SpaceSelector` component
- **Add** Search button row (opens `setSearchOpen(true)`) and Home button as flat menu items at the top
- Remove the `SidebarGroupLabel` "Space" section entirely

### 2. `src/components/TodoList.tsx` — Add context menu parity
- Add hover-visible `MoreHorizontal` 3-dot menu to each todo list item (matching page items)
- Menu actions: **Rename** (inline input), **Delete** (with confirmation dialog)
- Add inline rename state (`renamingId`, `renameValue`) with input on blur/Enter commit, Escape cancel
- Use existing `useUpdateTodoList` and `useDeleteTodoList` hooks
- Add `AlertDialog` for delete confirmation
- When deleting the active todo list, clear `selectedTodoListId`

### 3. `src/components/SpaceSelector.tsx` — Refactor for header use
- Change from a `Select` dropdown to a `DropdownMenu` that renders in the sidebar header
- Show space icon + name as the trigger
- List all spaces as menu items, plus "New Space" option at the bottom
- Keep the existing create-space dialog

### Technical notes
- No database changes needed
- No new hooks needed — all CRUD hooks exist (`useUpdateTodoList`, `useDeleteTodoList`)
- `group-hover` pattern for 3-dot visibility already established in page/folder items — reuse same classes

