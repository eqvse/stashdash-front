# Stashdash Frontend

Modern dashboard for the Stashdash warehouse management platform. This app delivers the operator experience for managing products, inventory, purchasing, and analytics on top of the Symfony/API Platform backend.

## Overview

- **Purpose** - Provide authenticated warehouse users a rich SPA to browse inventory, edit product data, monitor stock, and run operational workflows.
- **Architecture** - Next.js App Router with client components for interactive dashboards and server-ready data hooks.
- **Backend** - Talks to the Stashdash Symfony API (PostgreSQL via Supabase) through a thin API client with JWT authentication.

## Project Parts

- `app/` - App Router pages by feature (dashboard widgets, products, inventory, orders, onboarding).
- `components/` - Shared UI primitives (buttons, tables, cards) and layout shells.
- `stores/` - Zustand stores for session-aware state such as the selected company.
- `lib/` - API client, Supabase helpers, validation schemas, and utilities.
- `types/` - TypeScript interfaces mirroring API Platform DTOs.
- `public/` - Static assets served by Next.js.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling/UI**: Tailwind CSS, shadcn/ui (Radix primitives)
- **State**: React hooks with Zustand for shared state
- **Auth & Data**: Supabase JS client for JWT sessions, REST calls via `lib/api/client`

## Getting Started

```bash
# install dependencies
npm install

# copy environment template
cp .env.example .env.local

# update .env.local with Supabase keys and API URL

# run development server
npm run dev

# optional: lint (first run will prompt for config)
npm run lint
```

By default the app expects the Symfony API at `http://localhost:8000/api` and Supabase credentials supplied in `.env.local`.

## Development Notes

- Under `/dashboard/...` the UI assumes a valid Supabase session and at least one `CompanyUser` link.
- Set `NEXT_PUBLIC_DEV_MODE=true` to load demo data from `localStorage` when the backend is unavailable.
- Keep new routes co-located with their feature directory and reuse shared UI components where possible.

## Related Projects

- **Backend**: [stashdash](https://github.com/eqvse/stashdash) - Symfony + API Platform service powering the API

---

Made with love by EQV & IQV for reliable multi-tenant inventory operations.
