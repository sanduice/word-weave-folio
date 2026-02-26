

# Fix: Page & Todo Title Sizes Broken by Input's `md:text-sm`

## Root Cause
The shadcn `Input` component has base classes `text-base md:text-sm`. When custom title inputs pass `text-3xl font-bold`, `tailwind-merge` correctly overrides `text-base` → `text-3xl`, but **`md:text-sm` remains** because it's a different Tailwind variant. On desktop (md+), titles render at `text-sm` instead of the intended size.

## Fix
Add matching `md:` overrides to every title Input so they win over the base `md:text-sm`.

## Affected Files

### 1. `src/components/PageEditor.tsx` (~line 408)
- Change: `text-3xl font-bold` → `text-3xl md:text-3xl font-bold`

### 2. `src/components/TodoDetail.tsx` (~line 194)  
- Change: `text-xl font-bold` → `text-xl md:text-xl font-bold`

### 3. `src/components/TodoListView.tsx` (~line 146)
- Rename input: `text-3xl font-bold` → `text-3xl md:text-3xl font-bold`
- List title h1 is fine (not an Input, so unaffected)

### 4. `src/components/TodoListView.tsx` (~line 235, ~284)
- Todo item edit inputs: `text-sm font-semibold` → `text-sm md:text-sm font-semibold` (these happen to match but should be explicit for safety)

### 5. `src/components/TodoItem.tsx` (~line 60)
- Rename input: same pattern — add `md:text-sm` explicitly

### 6. `src/components/FolderItem.tsx`, `src/components/PageTree.tsx`, `src/components/TodoList.tsx`
- Any inline rename `Input` using custom text sizes — add matching `md:` variant

All changes are single-line className string updates. No logic changes.

