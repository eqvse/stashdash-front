# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains App Router routes per feature; colocate server/client components with their data loaders.
- `components/` exposes shadcn-based primitives and layout shells—reuse these before creating new UI.
- `hooks/`, `stores/`, and `lib/` host shared React logic, Zustand state, API helpers, validators, and Supabase utilities.
- `types/` mirrors backend DTOs; update alongside Symfony API changes to avoid type drift.
- Static assets live in `public/`; `next.config.js`, `tailwind.config.js`, and `components.json` manage global config, while `middleware.ts` enforces auth checks.

## Build, Test, and Development Commands
- `npm install` installs dependencies after cloning or editing `package.json`.
- `npm run dev` starts the hot-reloading dev server at `http://localhost:3000`.
- `npm run build` generates an optimized production bundle; run before deploy approvals.
- `npm run start` serves the built app locally for smoke testing.
- `npm run lint` applies ESLint/Next rules; append `--fix` to auto-resolve most formatting issues.

## Coding Style & Naming Conventions
Use TypeScript everywhere with 2-space indents and trailing commas to satisfy the repo ESLint config. Components use `PascalCase`, hooks `useCamelCase`, stores `useSomethingStore`, and utilities `camelCase`. Tailwind utilities should read layout → spacing → color for clarity. Keep imports ordered: npm packages, shared modules (`lib/`, `components/`), then relative paths.

## Testing Guidelines
Automated tests are not yet wired in. When adding coverage, colocate `*.test.ts(x)` files beside the code and prepare an `npm test` script in the PR. Until then, rely on `npm run dev` for functional smoke tests and `npm run build && npm run start` to catch production regressions. Document manual QA steps in the pull request.

## Commit & Pull Request Guidelines
History follows Conventional Commit prefixes (`feat:`, `fix:`, `chore:`). Keep commits scoped and descriptive. PRs should include a summary, linked issue or ticket, before/after screenshots for UI updates, and explicit callouts for config changes. Update `.env.example` whenever a new environment variable is introduced.

## Environment & Security Tips
Create `.env.local` from `.env.example` and populate Supabase URL, anon key, and API base URL. Never commit real secrets or demo credentials. Use `NEXT_PUBLIC_DEV_MODE=true` only for local seeding and disable it for production builds. When auth or routing changes, verify redirects still operate through `middleware.ts`.
