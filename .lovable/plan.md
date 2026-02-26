

## Move edit pen icon next to task title

**File**: `src/components/TodoListView.tsx`

**Problem**: The title `<span>` has `flex-1` which stretches it to fill available space, pushing the pencil icon to the far right edge of the row.

**Fix**: Wrap the title text and pencil icon together in a `flex-1` container with `flex items-center gap-1`. Remove `flex-1` from the inner `<span>` so the pencil sits right next to the text.

**Lines 248-268** — change from:
```
<span className="flex-1 ...">Title</span>
<button className="...shrink-0">pencil</button>
```
to:
```
<div className="flex-1 flex items-center gap-1 min-w-0">
  <span className="text-sm font-semibold truncate ...">Title</span>
  <button className="...shrink-0">pencil</button>
</div>
```

Same wrapping applies to the inline edit `<input>` branch (lines 225-247) — wrap input + pencil in the same `flex-1` container for consistency.

Single file change, no database or state changes needed.

