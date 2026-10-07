# Khedmti

French/Arabic artisan workspace built with Next.js, React, TypeScript, Tailwind and Lucide. Mobile navigation, dark/light modes and a coherent olive/cream visual system.

## Local development

```bash
npm ci
npm run dev
```

Without Supabase environment variables, the application runs in local mode. Existing `khedmti-v1` records are retained. Export a backup before clearing browser storage or switching devices.

## Features

- Client directory with contact information, notes, detail/history pages and guarded deletion.
- Multi-line quotes: quantity × unit price, fixed discount and optional VAT. Amounts are rounded to two decimal places. Review tax settings for your business.
- Quote numbering, status filters, search, duplication, PDF print layout and manual WhatsApp sharing.
- Accepted quote → intervention conversion keeps the quote and carries the advance. Quotes are excluded from revenue totals. Repeat conversion is blocked.
- Intervention dates/times/statuses, monthly calendar and day-specific lists.
- Bounded payments with dated payment history and payment methods; legacy advances remain identifiable.
- Business settings, company logo, JSON backup export/validated restore and spreadsheet-compatible CSV export with formula protection.
- Help/FAQ with explanations of local versus cloud storage.

## Activate Supabase

Use a dedicated **Khedmti** project. Do not use another application's project accidentally.

1. Run `database/setup.sql` once in that project's SQL Editor. It creates the `khedmti_workspaces` table, authenticated grants and owner-restricted SELECT/INSERT/UPDATE/DELETE RLS policies. No anonymous table access.
2. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key. Never add a service-role/secret key to a `NEXT_PUBLIC_` variable.
3. In Supabase Authentication URL Configuration, set your Site URL and allow `http://localhost:3000`, `http://localhost:3000/?recovery=1`, the production origin and its `/?recovery=1` URL. If your dev port changes, add that origin too.
4. Enable email/password authentication. Configure confirmation emails and SMTP before opening signup to customers. The default Supabase mail service has limitations; sender identity is configured there, not in the frontend.
5. Restart development, or set the same two environment variables in Vercel and redeploy.

When configured, the app provides sign in, signup, confirmation redirects, password recovery/update, sign out and an optional device-local workspace. Each signed-in user has a separate local cache and cloud row. RLS remains the access boundary; no privileged server key is used.

Cloud saving is **explicit** through “Enregistrer dans le cloud”. Unsaved drafts are cached under a user-scoped key and restored on reload. A revision condition prevents silent overwrite by another session. On a conflict, export your draft, then reload the cloud through Settings. Data is fetched when the workspace opens; this version does not stream real-time collaboration updates.

Cloud storage uses one JSON document per owner for this initial single-user product. It is not a team/multi-tenant normalized relational schema. Test with two real accounts before production launch. The SQL and live authentication could not be executed without the dedicated project's configuration.

## Deploy on Vercel

Import `abdelkhalekligflam/khedmti`, use the Next.js preset, set the Supabase variables if cloud mode is desired, and deploy. Add the final Vercel origin to Supabase Auth redirect URLs.

## Checks

```bash
npm run build
npm run test
```

Tests cover totals, payment bounds, legacy backup compatibility, backup rejection, creation/conversion/payment flows and local persistence with DOM-based integration checks, plus mocked cloud revision conflicts and user-scoped draft recovery. Visual browser QA and live Supabase account-isolation checks are still required in the configured environment.

No paid subscription checkout, automated WhatsApp delivery, account deletion, online customer payments or legal/business compliance promise is included. Billing needs a configured payment provider and server-side entitlement/webhook handling before it can be sold as a subscription.
