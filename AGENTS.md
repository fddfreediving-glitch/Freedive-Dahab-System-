# Freedive Dahab ERP — working rules

Internal ERP/CRM for Freedive Dahab, an SSI freediving school in Dahab, Egypt.

## Commands

```bash
npm install --legacy-peer-deps   # required: vite 8 and tsx pin different esbuild versions
npm run dev                      # Express + Vite on http://localhost:3000
npm test                         # 35 node:test integration tests, temp database, one file at a time (Windows file locks)
npm run typecheck                # tsc --noEmit
```

There is no bun/pnpm on this machine. Do not delete `package-lock.json`.

## Domain rules (non-negotiable)

- **SSI only.** Never write AIDA, Molchanovs, PADI or other agency names in this
  system's course catalogue, staff certifications or marketing copy. Students may
  arrive with prior certifications from other agencies; that is only a student
  attribute, never a course the centre sells.
- **Season pricing:** low season 1 Dec – 31 Mar, high season 1 Apr – 30 Nov.
  Accommodation and package prices differ by season; never average them.
- **Real package names:** Training Week (diving only / 8 nights low / 8 nights high),
  Beginner Week, Advanced Week, Beginner + Advanced Combo, Master Program,
  Zero to Hero, React Right, Training Techniques, Monofin, No-Fins, Variable Weight,
  Equalization, Mouthfill, Marine Ecology.
- **Money:** EUR and EGP are both real. Never convert implicitly or add currencies
  together; the finance module records an explicit FX rate per payment.
- Prices live in `src/data/posCatalog.ts` (seeded by the POS module). The
  `courses` seed mirrors those SSI prices; keep the two in sync when pricing
  changes, and keep EGP at 0 when a course is quoted in EUR only.

## Architecture

- `src/` React 19 + Vite 8 + Tailwind 4, no router (tab state in `App.tsx`).
- `server.ts` Express 4 entry; serves Vite middleware in dev, `dist/` in production.
- `server/api.ts` all REST routes; `server/db.ts` SQLite schema; `server/auth.ts`
  scrypt passwords, cookie sessions, role middleware, audit log.
- SQLite file `data/freedive_dahab.db`, seeded once by `server/seed.ts`.
- Tests spin up the real router against a temporary database, so schema changes
  must keep `initializeDatabase()` and `seedInitialData()` working from empty.

## Security invariants

- `POST /api/auth/switch-demo` is a passwordless role switcher. It is disabled
  unless `ALLOW_DEMO_LOGIN=true`; the client hides it unless
  `VITE_ALLOW_DEMO_LOGIN=true`. Never enable it on a deployed system.
- Medical notes and clearance are restricted to owner, operations manager and HR.
  Financial endpoints require owner/finance.
- Every booking, payment, expense, invoice edit and health change writes an audit
  log entry.
- Secrets never go in `src/` or in `.env.example`.

## UI rules

- Light theme is the default; every screen must also work in dark mode.
- No sample/template rows, fake counts or decorative pagination. Every number and
  every page control must come from the database.
- Tables need a real empty state, real sorting/paging, and readable contrast in
  both themes.
- Explain changes in customer outcomes, not framework internals.

## Known debt (do not pretend it is done)

1. Demo students, bookings and invoices are seeded on first run so screens are not
   empty. They must be replaced by real records before go-live, and seeding must
   never run on a production database that already has users.
2. Two ledgers coexist: legacy `bookings`/`invoices` and the newer
   `customer_requests`/POS flow. Finance shows both.
3. Planner is an unconfigured Google Calendar iframe, not an ERP calendar; it does
   not render sessions or accommodation stays.
4. `npm run build` only builds the client. Production start is unverified.
5. Default seeded passwords are for local demo only; production needs a first-run
   admin setup and forced password change.
6. `@google/genai` is an unused dependency inherited from AI Studio.

## Definition of done

`npm run typecheck` and `npm test` pass; the affected screen was opened in a real
browser at 1600 px and 390 px, in light and dark mode, and the change is described
in terms of what the office or instructor can now do.
