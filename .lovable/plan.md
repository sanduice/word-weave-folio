

# Fix: Page Titles Going Blank — Root Cause & Solution

## Root Cause Analysis

There are **two related bugs**, both stemming from a single stale closure issue in `PageEditor.tsx`.

### Bug 1: Title blanks out automatically after typing in the editor

In `PageEditor.tsx` line 94, the TipTap `onUpdate` callback captures `title` from the React state closure:

```typescript
onUpdate: ({ editor }) => {
  scheduleSave(title, editor.getHTML());  // <-- `title` is STALE here
},
```

TipTap's `useEditor` hook creates the editor instance **once** and does **not** re-bind `onUpdate` when the component re-renders. So `title` inside this closure is permanently stuck at its initial value (`""` from `useState("")`).

**What happens:**
1. User opens a page -- title loads as "My Page"
2. User starts typing in the editor body
3. `onUpdate` fires with `title = ""` (the stale initial value)
4. `scheduleSave("", editorHTML)` runs
5. After 1.5s debounce, it sees `"" !== lastSavedTitle.current ("My Page")`, so it saves `title: ""` to the database
6. The page title is now blank in the database
7. Sidebar refetches and shows "Untitled"

### Bug 2: Title lost during drag-and-drop

When a page is dragged, `useUpdatePage.mutate()` is called (to update `folder_id`/`parent_id`). Its `onSuccess` invalidates the `["pages", spaceId]` query, which triggers a refetch. If Bug 1 already saved an empty title (or if the auto-save timer fires during the drag operation), the refetched data comes back with a blank title.

Additionally, `useReorderPages` calls `Promise.all` with individual `update({ sort_order })` calls. Each of these returns no `.select()`, so they don't trigger per-page cache updates -- but the `onSuccess` invalidates `["pages"]` broadly, causing a refetch that picks up the already-corrupted blank title.

## Solution

### Fix 1: Use a ref for title in the `onUpdate` callback (core fix)

Store the current title in a `useRef` that stays in sync with the state, and read from the ref inside `onUpdate`:

**File: `src/components/PageEditor.tsx`**

```typescript
// Add a ref that always holds the latest title
const titleRef = useRef(title);
titleRef.current = title;  // sync on every render

// In useEditor config:
onUpdate: ({ editor }) => {
  scheduleSave(titleRef.current, editor.getHTML());  // reads latest title
},
```

This ensures the `onUpdate` closure always accesses the current title value, not the stale initial one.

### Fix 2: Guard against saving empty title over a non-empty one

Add a safety check in `scheduleSave` to prevent overwriting a known good title with an empty string:

```typescript
// Inside scheduleSave, before saving:
if (newTitle === "" && lastSavedTitle.current !== "") {
  // Don't overwrite a real title with empty -- likely stale closure
  newTitle = lastSavedTitle.current;
}
```

This is a defensive backstop in case any other closure issue arises.

### Fix 3: Update the `useEditor` dependency for `scheduleSave`

The `scheduleSave` callback itself has a dependency on `updatePage` in its `useCallback` deps. Since `updatePage` is a new object each render (from `useMutation`), this causes `scheduleSave` to be recreated, which is fine. But the `onUpdate` in `useEditor` still doesn't re-bind. The ref approach (Fix 1) solves this definitively.

## Files to Modify

| File | Change |
|---|---|
| `src/components/PageEditor.tsx` | Add `titleRef`, update `onUpdate` to use `titleRef.current`, add empty-title guard in `scheduleSave` |

No other files need changes. The drag-and-drop code itself is correct -- the title corruption is caused by the editor's `onUpdate` saving stale data, not by the reorder logic.

## Implementation Details

Only `PageEditor.tsx` changes, approximately 5 lines modified:

1. Add `const titleRef = useRef(title);` after the existing `title` state declaration
2. Add `titleRef.current = title;` to keep it synced on each render
3. Change line 95 from `scheduleSave(title, ...)` to `scheduleSave(titleRef.current, ...)`
4. Add the empty-title guard inside `scheduleSave` before the update call

## What Is NOT Changing

- `FolderTree.tsx`, `PageTree.tsx` -- drag-and-drop logic is correct
- `use-pages.ts` -- mutation and query hooks are correct
- `AppSidebar.tsx`, `TopBar.tsx` -- untouched
- Database schema -- no migration needed

