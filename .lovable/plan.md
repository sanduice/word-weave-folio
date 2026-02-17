

# Notespace — Personal Knowledge Base

## Overview
A lightweight, single-user knowledge base for writing, organizing, linking, and finding information fast. Markdown-first, zero friction, inspired by Confluence but without the bloat.

---

## Phase 1: Foundation & Data Layer (Lovable Cloud)

### Database Setup
- **Spaces table**: id, name, icon (emoji), description, created_at
- **Pages table**: id, space_id, title, content (markdown), parent_id (nullable for hierarchy), is_favorite, created_at, updated_at
- **Page Links table**: from_page_id, to_page_id (for backlink tracking)

### Seed Data
- Create a default "Personal" space with a welcome page

---

## Phase 2: Navigation Shell

### Left Sidebar
- App name/logo at top
- **Space selector** dropdown to switch between spaces
- **Page tree** showing hierarchical pages for the current space (collapsible, up to 3 levels)
- **Favorites** section showing starred pages
- **Recently opened** section (last 10 pages)
- Collapsible sidebar with mini icon-only mode

### Top Bar
- Current page title
- Breadcrumb trail (Space > Parent > Page)
- Search trigger (Cmd+K)
- "New Page" button

---

## Phase 3: Space Management

- Create, rename, delete spaces
- Pick emoji icon for each space
- Optional description
- Switching spaces updates the sidebar page tree

---

## Phase 4: Page Editor (TipTap + Markdown)

### Rich Editor
- TipTap-based editor that stores markdown as source of truth
- Slash command menu: `/h1`, `/h2`, `/h3`, `/code`, `/quote`, `/checklist`, `/bullet`, `/numbered`
- Keyboard shortcuts: bold, italic, link insertion
- Support for headings, lists, code blocks, blockquotes, checklists, images (URL-based for v1)

### Auto-Save
- Debounced save every 2-3 seconds after edits
- Visual "Saved" / "Saving..." indicator

### Page Creation
- "New Page" button creates an untitled page instantly in the current space
- Option to set parent page for hierarchy

---

## Phase 5: Internal Linking & Backlinks

### Wiki-Style Links
- Typing `[[` triggers an autocomplete dropdown of existing pages
- Selecting a page inserts a clickable link
- If the page name doesn't exist, clicking the link creates it

### Backlinks Panel
- Bottom of each page shows "Referenced in:" with a list of pages that link to the current page
- Clicking a backlink navigates to that page
- Link index automatically updated on page save

---

## Phase 6: Search

### Global Search (Cmd+K)
- Modal search overlay triggered by keyboard shortcut or search icon
- Searches across page titles and content
- Instant results as you type
- Results ranked: title match > heading match > content match
- Click result to navigate directly to page

---

## Phase 7: Favorites & Recents

- Star/unstar pages from the editor or sidebar
- Track recently opened pages (stored per session/in database)
- Both sections visible in sidebar for quick access

---

## Design Direction
- Clean, minimal UI with generous whitespace
- Light mode only for v1 (dark mode in phase 2)
- Fast transitions, no unnecessary animations
- Typography-focused — the content is the UI

