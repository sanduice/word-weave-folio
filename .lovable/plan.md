

# Home Dashboard

## Overview
Create a Home dashboard as the default landing view when no page or todo list is selected. It shows a greeting, recent pages, quick actions, and upcoming due todos.

## Approach
- New component: `src/pages/HomePage.tsx`
- Render it in `Index.tsx` when neither a page nor a todo list is selected (i.e. `selectedPageId === null && selectedTodoListId === null`)
- Add a "Home" button at the top of the sidebar that clears selection to return to the dashboard
- No database changes needed — reuses existing `recent_pages`, `pages`, `todos`, and `profiles` data

## Sections

### 1. Greeting Header
- Time-based greeting ("Good morning/afternoon/evening") using `new Date().getHours()`
- Subtitle: "Pick up where you left off"
- Uses profile `full_name` if available

### 2. Recently Visited (reuses `useRecentPages`)
- Show up to 8 recent pages as cards with icon, title, space name, and relative time
- Click opens the page (sets `selectedSpaceId` + `selectedPageId`)
- Empty state: "No recent pages yet" with a "Create a page" button

### 3. Quick Actions
- Row of action cards: "New Page", "New Todo List", "Search"
- Each triggers existing mutations or opens the search dialog

### 4. Upcoming Todos
- Query todos with `due_date` in the next 7 days, status != done, ordered by due_date
- New hook `useUpcomingTodos()` — simple query, no schema change
- Show as a list with title, due date, priority badge
- Click opens the todo (sets `selectedTodoListId` + `selectedTodoId`)
- Empty state: "No upcoming deadlines"

## File Changes

| File | Change |
|------|--------|
| `src/pages/HomePage.tsx` | **New** — greeting, recent pages grid, quick actions, upcoming todos |
| `src/hooks/use-todos.ts` | Add `useUpcomingTodos()` query (todos due in next 7 days) |
| `src/pages/Index.tsx` | Show `HomePage` when no page/todoList selected |
| `src/components/AppSidebar.tsx` | Add "Home" button at top that clears `selectedPageId` and `selectedTodoListId` |
| `src/stores/app-store.ts` | Add a `goHome()` action that resets page/todo selection |

## What's Excluded (future scope)
- Templates section (no template system exists yet)
- Learn/Getting Started cards (no help content system yet)
- Analytics tracking
- Right panel tips/AI suggestions
- Customizable layout / reordering sections

These can be layered on once the core dashboard is in place.

