# Copilot Instructions for appLimpieza

## Repository Overview

**appLimpieza** is a Next.js 14 web application for managing cleaning businesses. It provides invoice management, client management, expense tracking, and basic accounting features with PDF generation. The app uses Supabase for authentication and database management.

**Tech Stack:**
- **Framework:** Next.js 14.2.35 (App Router)
- **Language:** TypeScript 5
- **Runtime:** Node.js v20.20.0, npm 10.8.2
- **UI:** React 18, Tailwind CSS 3.4.1, shadcn/ui components
- **Backend:** Supabase (authentication + PostgreSQL database)
- **Additional:** React Hook Form, Zod validation, Recharts, @react-pdf/renderer

**Repository Size:** ~1.4MB, 94 files, 38 TypeScript/TSX source files

## Build & Development Commands

### Installation
```bash
npm install
```
**Duration:** ~20-25 seconds
**Note:** Always run `npm install` before building if dependencies have changed or after cloning.

### Linting
```bash
npm run lint
```
**Duration:** ~5-10 seconds
**Configuration:** Uses Next.js ESLint config (`.eslintrc.json`)
**Note:** Runs ESLint with Next.js rules. Must pass before merging code.

### Building
```bash
npm run build
```
**Duration:** ~30-60 seconds
**Output:** Production build in `.next/` directory
**Steps:** Compiles TypeScript → Lints → Type checks → Generates static pages → Optimizes
**Important:** Build MUST succeed before deploying. If build cache is missing, it will take slightly longer on first build.

### Development Server
```bash
npm run dev
```
**Access:** http://localhost:3000
**Note:** Redirects root `/` to `/dashboard`. Hot reload enabled.

### Production Server
```bash
npm run build && npm start
```
**Note:** Run build first, then start production server on port 3000.

## Environment Setup

### Required Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Critical:** Application will fail at runtime without these environment variables. Build succeeds but runtime functions require Supabase connection.

### Supabase Database Setup
1. Create Supabase project at https://supabase.com
2. Optional: Install Supabase CLI globally: `npm install -g supabase`
3. Apply schema: Run SQL from `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
4. Optional: Seed data from `supabase/seed.sql` (requires authenticated user first)

## Project Architecture

### Directory Structure
```
/
├── .github/              # GitHub configurations and custom agents
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── (auth)/      # Auth pages (login, register) - route group
│   │   ├── (dashboard)/ # Dashboard pages - route group
│   │   │   ├── layout.tsx        # Dashboard layout with Sidebar
│   │   │   ├── dashboard/        # Main dashboard with charts
│   │   │   ├── clientes/         # Client management
│   │   │   ├── facturas/         # Invoice management
│   │   │   │   ├── [id]/         # Dynamic invoice detail page
│   │   │   │   └── nueva/        # New invoice creation
│   │   │   └── gastos/           # Expense tracking
│   │   ├── layout.tsx   # Root layout with fonts
│   │   ├── page.tsx     # Root page (redirects to /dashboard)
│   │   └── globals.css  # Global styles with Tailwind
│   ├── components/
│   │   ├── dashboard/   # Dashboard-specific components
│   │   ├── facturas/    # Invoice components (PDF, actions)
│   │   ├── gastos/      # Expense components
│   │   ├── layout/      # Layout components (Sidebar, UserNav)
│   │   └── ui/          # shadcn/ui components (Button, Card, Dialog, etc.)
│   ├── hooks/           # Custom React hooks
│   │   └── use-user.ts  # User authentication hook
│   ├── lib/
│   │   ├── actions/     # Server actions (categorias, dashboard, facturas, gastos)
│   │   ├── supabase/    # Supabase clients (client, server, middleware)
│   │   ├── constants.ts # App constants
│   │   └── utils.ts     # Utility functions (cn for className merging)
│   └── types/
│       └── database.ts  # TypeScript types for Supabase database schema
├── supabase/
│   ├── migrations/      # Database migration files
│   │   └── 001_initial_schema.sql
│   └── seed.sql         # Development seed data
├── middleware.ts        # Next.js middleware for Supabase auth
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript config with path aliases (@/*)
├── tailwind.config.ts   # Tailwind configuration
├── components.json      # shadcn/ui configuration
├── next.config.mjs      # Next.js configuration (minimal)
├── .eslintrc.json       # ESLint configuration
└── postcss.config.mjs   # PostCSS with Tailwind plugin
```

### Key Architecture Patterns

**Route Groups:** `(auth)` and `(dashboard)` are route groups that don't affect URL structure but allow separate layouts.

**Path Aliases:** Use `@/*` to import from `src/` directory (e.g., `@/components/ui/button`).

**Server Actions:** All data mutations are in `src/lib/actions/` as Next.js Server Actions.

**Supabase Clients:**
- `src/lib/supabase/client.ts` - Browser client for client components
- `src/lib/supabase/server.ts` - Server client for server components/actions
- `src/lib/supabase/middleware.ts` - Middleware for session management

**Database Schema:** 5 main tables:
- `clientes` (clients) - Customer information
- `facturas` (invoices) - Invoices with status tracking
- `lineas_factura` (invoice lines) - Line items for invoices
- `categorias_gasto` (expense categories) - Custom expense categories
- `gastos` (expenses) - Expense records

All tables have Row Level Security (RLS) enabled with `user_id = auth.uid()` policies.

**TypeScript Types:** Database types in `src/types/database.ts` match the Supabase schema exactly.

**UI Components:** Using shadcn/ui (New York style) with Tailwind CSS and Lucide icons.

## Validation & Testing

**No test framework installed.** There are no test files in the repository. To validate changes:

1. **Lint:** `npm run lint` - Must show no errors
2. **Type Check:** Included in `npm run build` 
3. **Build:** `npm run build` - Must complete successfully
4. **Manual Testing:** Run `npm run dev` and test features in browser

**Pre-commit Checklist:**
- [ ] Code lints without errors
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Manual testing confirms functionality works

## Common Issues & Workarounds

**Issue:** Build fails with type errors in Supabase-related code
- **Fix:** Ensure `src/types/database.ts` matches your Supabase schema exactly

**Issue:** Runtime errors about Supabase environment variables
- **Fix:** Ensure `.env.local` exists with correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Issue:** Authentication not working
- **Fix:** Check middleware.ts is properly configured and Supabase session is being refreshed

**Issue:** npm install shows vulnerabilities
- **Expected:** 4 vulnerabilities (1 moderate, 3 high) are known and acceptable. Don't run `npm audit fix --force` as it may break dependencies.

## Development Workflow

1. **Before making changes:**
   - Run `npm install` if package.json changed
   - Create `.env.local` with Supabase credentials (if testing locally)
   
2. **During development:**
   - Use `npm run dev` for hot reload
   - Check console for errors
   - Lint frequently with `npm run lint`

3. **Before committing:**
   - Run `npm run lint` - must pass
   - Run `npm run build` - must succeed
   - Test changes manually in browser

4. **File modifications:**
   - Add new UI components to `src/components/ui/` following shadcn/ui patterns
   - Add new pages under appropriate route group in `src/app/`
   - Add server actions to `src/lib/actions/`
   - Import using `@/*` path alias, not relative paths
   - Follow existing TypeScript patterns and use proper types from `database.ts`

## CI/CD

**No GitHub Actions workflows configured.** There are no automated CI/CD pipelines. All validation is manual.

## Trust These Instructions

Follow these instructions precisely to minimize exploration time. Only search the codebase if:
- These instructions are incomplete for your specific task
- You find an error or inconsistency in these instructions
- You need to understand implementation details of a specific feature

The commands and patterns documented here have been validated and work correctly as of the last update.
