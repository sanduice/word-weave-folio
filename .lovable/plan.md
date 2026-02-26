

# Share & Access Management — Implementation Plan

## Current State

The app is **single-user only**. All tables use `user_id = auth.uid()` RLS policies. There is no concept of shared access — every page, todo list, folder, and space belongs exclusively to one user.

## Architecture

Sharing will be implemented at the **page level** (MVP). A new `page_shares` table tracks who has access to what, with what permission level. RLS policies on `pages` (and related tables) will be updated to also allow access when a valid share record exists.

```text
┌──────────────┐       ┌──────────────────┐
│    pages     │──────▶│   page_shares    │
│  (owner)     │       │  page_id         │
└──────────────┘       │  shared_with_id  │ (nullable, for registered users)
                       │  shared_email    │ (for pending invites)
                       │  permission      │ (view/edit/full_access)
                       │  share_token     │ (for link sharing)
                       │  link_access     │ (none/view/edit)
                       │  invited_by      │
                       └──────────────────┘
```

## Database Changes (Migration)

### 1. Create `page_shares` table

```sql
CREATE TABLE public.page_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  shared_with_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_email text,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'full_access')),
  share_token uuid DEFAULT gen_random_uuid(),
  link_access text NOT NULL DEFAULT 'none' CHECK (link_access IN ('none', 'view', 'edit')),
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, shared_with_id),
  UNIQUE (page_id, shared_email)
);

ALTER TABLE public.page_shares ENABLE ROW LEVEL SECURITY;
```

### 2. RLS policies on `page_shares`

- **SELECT**: Owner of the page OR the shared user can see share records
- **INSERT**: Only the page owner can create shares
- **UPDATE**: Only the page owner can change permissions
- **DELETE**: Page owner can remove any share; shared user can remove their own

### 3. Update `pages` RLS policies

Add OR conditions to SELECT/UPDATE policies so shared users can also access pages:

```sql
-- SELECT: owner OR has a share record
(auth.uid() = user_id) OR EXISTS (
  SELECT 1 FROM page_shares
  WHERE page_shares.page_id = pages.id
  AND page_shares.shared_with_id = auth.uid()
)

-- UPDATE: owner OR has edit/full_access share
(auth.uid() = user_id) OR EXISTS (
  SELECT 1 FROM page_shares
  WHERE page_shares.page_id = pages.id
  AND page_shares.shared_with_id = auth.uid()
  AND page_shares.permission IN ('edit', 'full_access')
)
```

### 4. Helper function (avoids RLS recursion)

```sql
CREATE OR REPLACE FUNCTION public.has_page_access(
  _user_id uuid, _page_id uuid, _min_permission text DEFAULT 'view'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pages WHERE id = _page_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM page_shares
    WHERE page_id = _page_id
    AND shared_with_id = _user_id
    AND (
      _min_permission = 'view'
      OR (_min_permission = 'edit' AND permission IN ('edit', 'full_access'))
      OR (_min_permission = 'full_access' AND permission = 'full_access')
    )
  )
$$;
```

## Frontend Changes

### 5. New file: `src/hooks/use-page-shares.ts`

CRUD hooks for `page_shares` table:
- `usePageShares(pageId)` — fetch all shares for a page
- `useCreatePageShare()` — invite by email
- `useUpdatePageShare()` — change permission
- `useDeletePageShare()` — revoke access
- `useUpdateLinkAccess()` — toggle link sharing

### 6. New file: `src/components/ShareDialog.tsx`

A Popover (not modal) anchored to a Share button in TopBar, containing:
- **Email invite input** (comma-separated, with permission dropdown)
- **Access list** showing each shared user with avatar, name, email, and permission dropdown
- **General access section** with link sharing toggle (Only invited / Anyone with link)
- **Copy link button** with toast feedback

Uses shadcn components: `Popover`, `Input`, `Button`, `Select`, `Avatar`, `Separator`, `DropdownMenu`

### 7. Update `src/components/TopBar.tsx`

Add a "Share" button (between the star and search buttons) that opens the ShareDialog popover.

### 8. New route: `/shared/:token` (future consideration)

For link-based access — not required for MVP email-based sharing, but the `share_token` column is ready for it.

## File Summary

| File | Action |
|------|--------|
| Migration SQL | Create `page_shares` table, RLS, helper function, update `pages` RLS |
| `src/hooks/use-page-shares.ts` | New — CRUD hooks |
| `src/components/ShareDialog.tsx` | New — Share popover UI |
| `src/components/TopBar.tsx` | Add Share button |
| `src/App.tsx` | Add `/shared/:token` route (optional, for link access) |

## Out of Scope (MVP)

- Sharing todo lists (page-level only for now)
- Expiring/password-protected links
- Email notifications (requires email service integration)
- Real-time collaboration (requires presence/CRDT)
- Audit logs

