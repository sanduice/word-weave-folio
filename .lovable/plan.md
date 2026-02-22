

# Redesign Todo List: Main Content Area + Side Drawer

## What Changes

Currently, the todo list lives in the sidebar and clicking a todo replaces the page editor with a detail view. The new design (matching the Notion screenshots) changes this to:

1. **Todo list becomes a full main-content view** -- when you click "Todos" in the sidebar, the main area shows a full-page list with title, subtitle, "To Do" / "Done" tabs, a "New" button, and all todo items displayed as rows (checkbox + title + due date).

2. **Clicking a todo item opens a side drawer/panel** -- instead of replacing the entire view, a right-side panel slides in (like the comment panel) showing the todo's detail properties (title, due date, status, priority, description, delete). The list remains visible on the left.

---

## Layout Overview

```text
+------------------+-------------------------------+--------------------+
|    Sidebar        |      Todo List (main)         |   Detail Drawer    |
|                  |                               |   (slides in)      |
|  [Spaces]        |  "Todo List"                  |                    |
|  [Pages]         |  "Stay organized..."          |   Title (big)      |
|  [> Todos] <--   |  [To Do] [Done]    [New v]    |   Due date         |
|  [Favorites]     |  +--New task--+                |   Status           |
|                  |  [x] Task 1         Yesterday |   Priority         |
|                  |  [ ] Task 2         Yesterday |   Description      |
|                  |  [ ] Task 3         Today     |   [Delete]         |
|                  |  +--New task--+                |                    |
+------------------+-------------------------------+--------------------+
```

---

## Detailed Changes

### 1. Sidebar: Replace inline TodoList with a nav link

- Remove the `<TodoList />` component from the sidebar
- Add a simple "Todos" menu item (like a page link) that sets a new store flag `viewMode: "todos"` when clicked
- This keeps the sidebar clean and consistent with the Notion-style navigation

### 2. New `TodoListView` component (main content area)

A full-page component rendered in the main area when `viewMode === "todos"`:

- **Header**: Large "Todo List" title + subtitle "Stay organized with tasks, your way."
- **Tabs**: "To Do" (icon + label) and "Done" (checkbox + label) toggle filters
- **Toolbar**: "New" button (blue, with dropdown arrow) on the right
- **Task rows**: Each row shows:
  - Checkbox (toggle done)
  - Title text (click to select, inline editable)
  - Due date on the right side (relative: "Today", "Yesterday", etc.)
- **"+ New task" row** at top and bottom of the list for quick task creation
- Clicking a row selects it and opens the detail drawer

### 3. Redesign `TodoDetail` as a right-side drawer

Instead of replacing the entire main area, `TodoDetail` becomes a side panel:

- Uses a resizable panel (like the comment panel) or a Sheet component sliding from the right
- Shows the selected todo's properties in the Notion-style layout from the screenshot:
  - Large editable title at top
  - Property rows: Due date, Status (colored badge), Priority
  - Description area
  - Delete button
- Panel closes when clicking outside or pressing Escape, deselecting the todo

### 4. Store changes

Update `app-store.ts`:
- Add `viewMode: "pages" | "todos"` to track what the main area displays
- `setViewMode("todos")` clears `selectedPageId`
- `setSelectedPageId` automatically sets `viewMode` back to `"pages"`
- Keep `selectedTodoId` for the drawer open/close state

### 5. Index.tsx layout update

Conditionally render based on `viewMode`:
- `"pages"` -- render `<PageEditor />` (current behavior)
- `"todos"` -- render `<TodoListView />` with an optional `<TodoDetail />` drawer overlay or side panel

---

## Files to Create

| File | Purpose |
|---|---|
| `src/components/TodoListView.tsx` | Full-page todo list with tabs, task rows, new button |

## Files to Modify

| File | Change |
|---|---|
| `src/stores/app-store.ts` | Add `viewMode` state |
| `src/components/AppSidebar.tsx` | Replace `<TodoList />` with a "Todos" nav link |
| `src/components/TodoDetail.tsx` | Wrap in a Sheet/drawer that slides from the right |
| `src/pages/Index.tsx` | Conditionally render `TodoListView` vs `PageEditor` based on `viewMode` |
| `src/components/TodoList.tsx` | May be removed or repurposed -- its logic moves into `TodoListView` |
| `src/components/TodoItem.tsx` | Restyle as a full-width row with due date on the right |

---

## Technical Notes

- The side drawer will use the existing `Sheet` component (from `@radix-ui/react-dialog`) with `side="right"` for the slide-in effect
- Todo data hooks (`use-todos.ts`) remain unchanged -- no database changes needed
- The "New" button creates a todo and auto-selects it (opening the drawer)
- The task row layout uses flexbox: checkbox on left, title in middle (flex-1), due date on right
