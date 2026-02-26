

# Match Notion Sidebar Design: Colors, Weight, Background

## Current vs Notion

Comparing our screenshot with the Notion screenshot (image-25.png):

| Property | Current (ours) | Notion | 
|---|---|---|
| Sidebar bg | Cool gray `240 5% 97%` | Warm beige `#f7f7f5` → `40 12% 97%` |
| Text color | Cool gray `240 4% 30%` | Warm brown `#37352f` → `40 10% 20%` |
| Accent/hover | Cool gray `240 5% 93%` | Warm tan `#eeeeec` → `40 6% 93%` |
| Border | Cool gray `240 6% 90%` | Nearly invisible warm `40 6% 92%` |
| Section labels | UPPERCASE, tracking-wider, very muted | Sentence case, normal tracking, slightly muted |
| Font weight | `font-semibold` on space name | `font-medium` — lighter feel overall |
| Muted text | Cool gray | Warm gray |

## Changes

### 1. `src/index.css` — Sidebar CSS variables (warm palette)
Update the sidebar-specific variables to warm tones:
```
--sidebar-background: 40 12% 97%;      /* warm off-white */
--sidebar-foreground: 40 10% 20%;      /* warm dark brown */
--sidebar-accent: 40 6% 93%;           /* warm hover */
--sidebar-accent-foreground: 40 10% 15%;
--sidebar-border: 40 6% 92%;           /* subtle warm border */
```

### 2. `src/components/AppSidebar.tsx` — Section labels
- **Todo Lists label** and **Pages label**: Remove `uppercase tracking-wider`, use sentence case, change opacity from `text-muted-foreground/60` to `text-sidebar-foreground/50`
- **Favorites label**: Same treatment

### 3. `src/components/TodoList.tsx` — Section label
- Remove `uppercase tracking-wider` from the "Todo Lists" label
- Use `text-sidebar-foreground/50` instead of `text-muted-foreground/60`

### 4. `src/components/SpaceSelector.tsx` — Font weight
- Change space name from `font-semibold` to `font-medium` to match Notion's lighter weight

### 5. `src/components/AppSidebar.tsx` — Menu item text
- Sidebar menu buttons (`Search`, `Home`) already use `text-sm` — keep as-is
- Footer user name: keep `text-xs font-medium`

All changes are CSS variable updates and className string tweaks. No logic changes.

