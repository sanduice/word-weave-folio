

# Design System Refactor — shadcn/ui Everywhere + Remove "Notespace/Untitled" Branding

## Scope

Audit of all components reveals **raw HTML `<button>` and `<input>` elements** used extensively instead of shadcn/ui primitives. The app name "Notespace" still appears in the login page. The placeholder text "Untitled" is used for empty titles throughout.

## Changes by File

### 1. `src/pages/LoginPage.tsx`
- Change app name from **"Notespace"** to **"Wordwrap"** (matches published URL)
- Update tagline accordingly

### 2. `src/components/AppSidebar.tsx`
- Replace raw icon `<button>` elements (new page, new folder) with shadcn `Button` variant="ghost" size="icon"
- Replace footer trigger raw `<button>` with shadcn `Button` variant="ghost"
- Replace favorites drag grip raw `<span>` pattern — keep as-is (grip handles are decorative, not interactive buttons)

### 3. `src/components/TodoListView.tsx`
- Replace **rename/delete raw buttons** in header with `Button` variant="ghost" size="icon"
- Replace **filter toggle buttons** (To Do / Done) with shadcn `Tabs` component (`TabsList` + `TabsTrigger`)
- Replace raw **inline edit `<input>`** elements with shadcn `Input` (styled appropriately for inline use)
- Replace raw **"New task" add button** row with shadcn `Button` variant="ghost"
- Replace raw **edit pencil `<button>`** with `Button` variant="ghost" size="icon"

### 4. `src/components/TodoDetail.tsx`
- Replace raw **title `<input>`** with shadcn `Input` (unstyled variant for seamless look)
- Replace **close `<button>`** with `Button` variant="ghost" size="icon"

### 5. `src/components/TodoList.tsx`
- Replace **add button** raw `<button>` with `Button` variant="ghost" size="icon"
- Replace **3-dot trigger** raw `<button>` with `Button` variant="ghost" size="icon"
- Replace **rename `<input>`** with shadcn `Input`

### 6. `src/components/FolderItem.tsx`
- Replace **expand chevron** raw `<button>` with `Button` variant="ghost" size="icon"
- Replace **3-dot trigger** raw `<button>` with `Button` variant="ghost" size="icon"  
- Replace **rename `<input>`** with shadcn `Input`
- Replace **grip `<span>`** — keep decorative (not a button)

### 7. `src/components/PageTree.tsx`
- Replace **3-dot trigger** raw `<button>` with `Button` variant="ghost" size="icon"
- Replace **expand chevron** raw `<button>` with `Button` variant="ghost" size="icon"
- Replace **rename `<input>`** with shadcn `Input`

### 8. `src/components/SpaceSelector.tsx`
- Replace **emoji picker raw `<button>`** elements with `Button` variant="ghost"
- Dropdown trigger raw `<button>` is already `asChild` — keep pattern but style with `Button`

### 9. `src/components/TopBar.tsx`
- Already uses shadcn `Button` — no changes needed

### 10. `src/components/PageEditor.tsx`
- Replace raw **title `<input>`** with shadcn `Input` (transparent variant)

### 11. `src/components/TodoItem.tsx`
- Replace raw **rename `<input>`** with shadcn `Input`

### 12. `src/components/SearchDialog.tsx`
- Already uses shadcn `Dialog` + `Input` — no changes needed

### 13. `src/pages/HomePage.tsx`
- Replace raw **recent page `<button>`** cards with shadcn `Card` + `CardContent` (clickable)
- Replace raw **upcoming todo `<button>`** list items similarly
- Already uses `Button` and `Card` for other parts — align remaining elements

### 14. `src/index.css`
- No structural changes — existing CSS variables and editor styles stay

## "Untitled" Removal
- `displayTitle()` helper in `AppSidebar.tsx`, `PageTree.tsx` — change fallback from `"Untitled"` to empty string `""` or a more subtle placeholder like `"New page"`
- `TodoListView.tsx` — change `"Untitled"` fallback for todos to `"New task"`
- `TodoItem.tsx` — same change
- `HomePage.tsx` — same change for recent pages and upcoming todos
- `SearchDialog.tsx` — change `"Untitled"` to `"New page"`
- `PageEditor.tsx` — change placeholder from `"Untitled"` to `"New page"`
- `TodoDetail.tsx` — change placeholder from `"Untitled"` to `"New task"`
- `LoginPage.tsx` — remove "Notespace", replace with "Wordwrap"

## Technical Notes
- No database changes
- No new dependencies — all shadcn components already installed (`Button`, `Input`, `Tabs`, `Card`, etc.)
- Tabs component is already installed (`@radix-ui/react-tabs`)
- All changes are cosmetic/structural — no logic changes
- Sidebar grip handles and drag behaviors remain unchanged

