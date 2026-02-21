

# Fix: Page Title Overwriting on Page Switch During Pending Save

## Root Cause

The bug is a **race condition** between the debounced save timer and page switching. Here is the exact sequence:

### Scenario: User renames Page A, then clicks Page B before save completes

1. User renames Page A to "New Name A"
2. `scheduleSave("New Name A", htmlA)` fires, sets a 1500ms timer (closure captures `selectedPageId = A`)
3. User clicks Page B **within 1500ms**
4. `selectedPageId` changes to B, `scheduleSave` is recreated with new closure
5. Page B data loads -- the effect runs:
   - `setTitle("Page B Title")` -- queued (async state update, not yet rendered)
   - `lastSavedTitle.current = "Page B Title"`
   - `lastSavedContent.current = contentB`
   - `editor.commands.setContent(contentB)` -- this may trigger `onUpdate`
6. **Problem A**: If `setContent` triggers `onUpdate`, it calls the NEW `scheduleSave` (closure B) with `titleRef.current` -- but `titleRef` still holds "New Name A" because `setTitle` hasn't rendered yet. So it schedules saving `{ id: B, title: "New Name A" }` -- **overwriting Page B's title with Page A's name**.
7. **Problem B**: The OLD timer from step 2 fires and saves correctly to page A, but then overwrites `lastSavedTitle.current = "New Name A"` and `lastSavedContent.current = htmlA`. These shared refs now hold page A's data while the user is on page B, corrupting future comparisons.

### Two bugs in one

| Bug | Cause | Effect |
|---|---|---|
| Pending timer not cancelled on page switch | No cleanup effect for `selectedPageId` change | Old timer corrupts shared refs after completing |
| `titleRef` stale during page load | `setTitle()` is async, `titleRef` updates on render, but `setContent` may trigger `onUpdate` before render | Page A's title is saved to Page B |

## Solution

### Fix 1: Cancel pending save and flush on page switch

Add a `useEffect` that runs when `selectedPageId` changes to:
- Clear any pending save timer
- Reset save status

This prevents the old page's timer from firing after the user has moved to a new page.

### Fix 2: Guard saves with page ID check

Store the target page ID directly in the `setTimeout` closure (not via ref or `useCallback` closure). Before executing the save, verify the page ID still matches `selectedPageId`. If not, skip the ref updates.

### Fix 3: Update refs BEFORE calling setContent

In the page load effect, update `titleRef` synchronously (via the ref directly) before calling `editor.commands.setContent()`, so if `onUpdate` fires, it reads the correct title.

## File to Modify

`src/components/PageEditor.tsx` -- approximately 10 lines changed.

## Detailed Changes

### Change 1: Add page-switch cleanup effect (new, after line 120)

```typescript
// Cancel pending save when switching pages
useEffect(() => {
  return () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
  };
}, [selectedPageId]);
```

This ensures any in-flight debounced save from the old page is cancelled when the user navigates away.

### Change 2: Update titleRef before setContent in the load effect (modify lines 109-120)

```typescript
useEffect(() => {
  if (page && editor) {
    setTitle(page.title);
    titleRef.current = page.title;  // <-- sync ref IMMEDIATELY, before setContent
    lastSavedTitle.current = page.title;
    const content = page.content || "";
    lastSavedContent.current = content;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content || "");
    }
    setSaveStatus("saved");
  }
}, [page?.id, page?.content, page?.title]);
```

The key addition is `titleRef.current = page.title` right after `setTitle()`. This ensures that if `setContent` triggers `onUpdate`, `titleRef.current` already holds the new page's title, not the old page's title.

### Change 3: Capture page ID in setTimeout and guard ref updates (modify scheduleSave)

```typescript
const scheduleSave = useCallback(
  (newTitle: string, newContent: string) => {
    if (!selectedPageId) return;
    const targetPageId = selectedPageId; // capture at call time
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      // If user switched pages, abort -- don't save or update refs
      if (useAppStore.getState().selectedPageId !== targetPageId) {
        return;
      }
      const safeTitle = (newTitle === "" && lastSavedTitle.current !== "") 
        ? lastSavedTitle.current : newTitle;
      const updates: any = {};
      if (safeTitle !== lastSavedTitle.current) updates.title = safeTitle;
      if (newContent !== lastSavedContent.current) updates.content = newContent;
      if (Object.keys(updates).length === 0) {
        setSaveStatus("saved");
        return;
      }
      await updatePage.mutateAsync({ id: targetPageId, ...updates });
      // Only update refs if still on the same page
      if (useAppStore.getState().selectedPageId === targetPageId) {
        lastSavedTitle.current = safeTitle;
        lastSavedContent.current = newContent;
        setSaveStatus("saved");
      }
    }, 1500);
  },
  [selectedPageId, updatePage],
);
```

Key changes:
- `targetPageId` is captured at call time, not read from closure during timeout
- Before saving, check if the user is still on the same page via `useAppStore.getState()`
- After saving, only update shared refs if still on the target page -- prevents ref corruption

## What Is NOT Changing

- `use-pages.ts` -- hooks are correct
- `BubbleMenuToolbar.tsx`, `StickyToolbar.tsx`, `TableToolbar.tsx` -- untouched
- `AppSidebar.tsx`, sidebar page tree -- untouched
- Database schema -- no migration needed

## Edge Cases Handled

| Case | Solution |
|---|---|
| User renames page A, clicks page B quickly | Timer cancelled by cleanup effect; even if it fires, the page ID check aborts it |
| `setContent` triggers `onUpdate` during page load | `titleRef.current` is updated synchronously before `setContent`, so `onUpdate` reads the correct title |
| User edits page B after switching from A | Refs are not corrupted because old timer either was cancelled or skipped ref updates |
| Rapid page switching (A to B to C) | Each switch cancels the previous timer; the page ID guard prevents stale saves |

