# Khedmti

Next.js artisan workspace, French/Arabic, responsive, with light/dark themes.

## Run

```bash
npm ci
npm run dev
```

## First version

- Create and edit clients.
- Create and edit quotes and interventions; track statuses.
- Convert accepted quotes to interventions, retaining amounts already paid.
- Record additional payments, bounded by the remaining balance.
- Print quotes using the browser's Save as PDF, or share quote text through WhatsApp.
- Dashboard totals calculated from interventions only, so quotes do not double count revenue.
- Export a JSON backup from Settings.

Records are stored in this browser's localStorage. This is a local MVP, with no authentication, cloud synchronization, subscription enforcement, or automated WhatsApp delivery. Do not clear browser storage without exporting a backup. There is currently no backup import interface.

Quotes have a single service/amount and do not calculate VAT. Review before commercial use. Cloud accounts and user-isolated Supabase persistence are the next integration stage.

## Validation

`npm run build` verifies the production build and TypeScript. Initial npm audit reports five high-severity development dependency findings in the ESLint/fast-glob/braces chain; the suggested forced fix downgrades the Next.js ESLint configuration and has not been applied.
