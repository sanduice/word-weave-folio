
# Google Authentication — Implementation Plan

## Overview

This plan adds Google OAuth sign-in to the app, introduces a user-scoped data model so every space and page is owned by the signed-in user, and adds a clean login screen and authenticated header. The Lovable Cloud managed Google OAuth is used — no Google Cloud Console setup is required from you.

---

## What Changes and Why

The current app has no authentication. All data in the database (spaces, pages) is shared and accessible to everyone because RLS policies currently allow full anonymous access. After this implementation:

- Every user signs in with Google (one click)
- Spaces and pages are tied to the user's ID
- RLS policies are tightened so each user only sees their own data
- A new `profiles` table stores name and avatar from Google
- A protected route guard redirects unauthenticated visitors to the login page
- The sidebar footer gains a user avatar + logout dropdown

---

## Architecture Overview

```text
App.tsx
 ├─ /login         → LoginPage (public)
 └─ /              → AuthGuard → Index (protected)
                        ├─ AppSidebar (+ user avatar footer)
                        ├─ TopBar
                        └─ PageEditor
```

The `AuthGuard` component listens to the auth session. If the session is null it redirects to `/login`. If it exists it renders children.

---

## Database Changes (Migration Required)

### 1. Add `user_id` column to `spaces` and `pages`

```sql
-- spaces
ALTER TABLE public.spaces ADD COLUMN user_id uuid;
UPDATE public.spaces SET user_id = '00000000-0000-0000-0000-000000000000'; -- placeholder
ALTER TABLE public.spaces ALTER COLUMN user_id SET NOT NULL;

-- pages (already has space_id → user_id derived via space, but direct column is cleaner for RLS)
ALTER TABLE public.pages ADD COLUMN user_id uuid;
UPDATE public.pages SET user_id = '00000000-0000-0000-0000-000000000000';
ALTER TABLE public.pages ALTER COLUMN user_id SET NOT NULL;
```

> After migration, existing rows get a placeholder UUID. Once you sign in for the first time, a new space will be created under your real user ID. The old placeholder rows will not be visible to you (RLS filters them out) — they can be cleaned up manually or ignored.

### 2. Add `profiles` table

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

A database trigger auto-creates a profile row on every new sign-up using the `raw_user_meta_data` from Google (name, avatar_url, email).

### 3. Update RLS policies

**Spaces:**
- Drop the current permissive ALL policy
- Add: `SELECT/INSERT/UPDATE/DELETE` where `user_id = auth.uid()`

**Pages:**
- Drop the current permissive ALL policy
- Add: `SELECT/INSERT/UPDATE/DELETE` where `user_id = auth.uid()`

**Profiles:**
- `SELECT` where `id = auth.uid()`
- `UPDATE` where `id = auth.uid()`

**page_links and recent_pages:**
- These can be scoped via join to pages (owned by user) — the simplest MVP approach is to keep the existing permissive policies on these tables and rely on the pages RLS to prevent cross-user data leaks.

---

## New Files

| File | Purpose |
|---|---|
| `src/pages/LoginPage.tsx` | Full-page Google sign-in screen |
| `src/components/AuthGuard.tsx` | Route protection component |
| `src/hooks/use-auth.ts` | Session state, profile, logout hook |

---

## Modified Files

| File | Change |
|---|---|
| `src/App.tsx` | Add `/login` route; wrap `/` with `AuthGuard` |
| `src/components/AppSidebar.tsx` | Replace footer version text with user avatar + logout dropdown |
| `src/hooks/use-spaces.ts` | Inject `user_id: user.id` into `useCreateSpace` insert |
| `src/hooks/use-pages.ts` | Inject `user_id: user.id` into `useCreatePage` insert |

---

## Detailed Implementation

### `src/pages/LoginPage.tsx`

Clean centered card with:
- App logo/icon and name ("Notespace")
- One-liner tagline
- "Continue with Google" button using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- Subtle footer with "By continuing, you agree to our Terms and Privacy Policy"

No email/password fields — exactly as specified.

### `src/components/AuthGuard.tsx`

```tsx
// Subscribes to onAuthStateChange
// While loading → show full-page spinner
// If session → render children
// If no session → <Navigate to="/login" />
```

Sets up the auth listener BEFORE calling `getSession()` per the auth implementation rules.

### `src/hooks/use-auth.ts`

Exports:
- `useSession()` — returns `{ session, user, loading }`
- `useProfile()` — fetches from `profiles` table for current user
- `useLogout()` — calls `supabase.auth.signOut()` and clears query cache

### `src/App.tsx` changes

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### `src/components/AppSidebar.tsx` footer changes

Replace `<p className="text-[10px]...">Notespace v1</p>` with:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <div className="flex items-center gap-2 p-2 rounded hover:bg-sidebar-accent cursor-pointer w-full">
      <Avatar className="h-7 w-7">
        <AvatarImage src={profile?.avatar_url} />
        <AvatarFallback>{profile?.full_name?.[0] ?? "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs font-medium truncate">{profile?.full_name ?? "User"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
      </div>
    </div>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### `use-spaces.ts` and `use-pages.ts` changes

In `useCreateSpace` and `useCreatePage`, inject `user_id` from the current session:

```ts
const { data: { user } } = await supabase.auth.getUser();
supabase.from("spaces").insert({ ...space, user_id: user.id })
```

---

## Corner Cases Handled

| Case | Handling |
|---|---|
| User navigates directly to `/` while unauthenticated | `AuthGuard` redirects to `/login` |
| User navigates to `/login` while already signed in | `LoginPage` detects existing session and redirects to `/` |
| Google OAuth popup blocked | Not applicable — redirect-based OAuth flow used, not popup |
| OAuth callback returns to `/` | Lovable Cloud handles the `/~oauth` callback automatically; session is restored via `onAuthStateChange` |
| Existing anonymous data (old rows with placeholder user_id) | Not visible to the signed-in user — RLS filters them out. No data loss; can be cleaned up via backend console |
| Profile not yet created when app renders | `useProfile()` returns `null` gracefully; avatar shows initial letter fallback |
| User signs out in another tab | `onAuthStateChange` fires in all tabs, `AuthGuard` redirects to login everywhere |
| `useCreateSpace` / `useCreatePage` called before user session loads | `AuthGuard` prevents rendering the app until session is confirmed, so `user` is always defined inside protected routes |
| Token auto-refresh | Supabase client handles this automatically (`autoRefreshToken: true` already set in `client.ts`) |
| Profile picture from Google is a URL that expires | Stored as URL in profiles table; Supabase avatar URLs from Google are long-lived. No special handling needed for MVP |

---

## What is NOT included (per spec)

- No email/password auth
- No GitHub or other OAuth providers
- No anonymous-to-Google data migration (existing data is placeholder-owned and invisible; new sign-in starts fresh)
- No team/org accounts
- No Privacy Policy / Terms of Service pages (can be added separately)
