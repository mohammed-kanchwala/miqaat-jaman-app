# Jaman Calendar (1448H)

A small community app for claiming jaman (communal meal) sponsorship for
the year's miqaats. Anyone with the link can browse the calendar and claim
an open miqaat; sponsor identities are only visible to the admin;
cancellations go through an admin-approval request and are locked within
15 days of the miqaat date.

Built with Next.js (App Router) + Tailwind + Supabase (Postgres).

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor** and run the contents of
   [`supabase/schema.sql`](./supabase/schema.sql). This creates the tables,
   the exclusivity constraint, row-level security policies, and the RPCs
   the app calls.
3. Go to **Authentication → Users** and create one user for yourself
   (email + password) — this is the admin login. No other family needs an
   account; the "family" role is intentionally auth-free per the PRD.
4. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key**.

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in the two values from step 1.4:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Then edit [`lib/families.ts`](./lib/families.ts) and replace the placeholder
names with the real ~12 family names — this is what populates the claim
and "My Jaman" dropdowns.

Optionally, import the year's actual miqaat rows (from the "Hijri Niyaz
Details" sheet) into the `miqaat` table via the Supabase Table Editor, or
write a one-off insert script — the columns match the sheet directly
(`hijri_month`, `hijri_day`, `gregorian_date`, `day_of_week`, `name`,
`location`, `niyaz_notes`).

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 4. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In the project's **Environment Variables** settings, add the same two
   `NEXT_PUBLIC_SUPABASE_*` values from your `.env.local`.
4. Deploy. Vercel will give you a URL — that's the link to share with the
   community.

## How the requirements map to the code

- **Exclusivity** ("once taken, no one else can take it") is enforced by a
  partial unique index in Postgres (`booking_active_miqaat_unique`), not
  just the UI — see `supabase/schema.sql`.
- **Self-service claiming** happens through the `claim_miqaat` RPC, which
  is the only way the public/anon role can write a booking.
- **Admin-only sponsor visibility** is enforced by row-level security: the
  public calendar reads from the `miqaat_status` view (status only, no
  names); the admin dashboard reads the `booking` table directly, which
  only authenticated (logged-in) sessions can select.
- **15-day cancellation cutoff** is enforced inside the `request_cancellation`
  RPC itself, so it can't be bypassed from the client.
- **Cancellation approval** is a two-step flow: a family's request sets
  status to `cancellation_requested`; only `approve_cancellation` (admin-only,
  checked via `auth.role() = 'authenticated'`) moves it to `cancelled` and
  reopens the slot.
