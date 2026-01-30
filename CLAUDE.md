# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Business management application for cleaning companies built with Next.js 14 (App Router), TypeScript, and Supabase. Provides invoice management, client management, expense tracking, and financial dashboard with PDF generation.

## Tech Stack

- **Framework:** Next.js 14.2.35 (App Router) with React 18
- **Language:** TypeScript 5
- **Backend:** Supabase (PostgreSQL + authentication)
- **UI:** Tailwind CSS 3.4.1, shadcn/ui components, Lucide icons
- **Forms:** React Hook Form with Zod validation
- **Charts:** Recharts
- **PDF:** @react-pdf/renderer

## Development Commands

### Setup
```bash
npm install
```

### Development server
```bash
npm run dev
# Opens at http://localhost:3000 (redirects to /dashboard)
```

### Linting
```bash
npm run lint
# Must pass before merging
```

### Build
```bash
npm run build
# Compiles TypeScript, lints, type checks, generates static pages
```

### Production server
```bash
npm run build && npm start
```

## Environment Setup

Create `.env.local` in root:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Application will fail at runtime without these variables.

## Database Setup

1. Create Supabase project at https://supabase.com
2. Apply schema: Run SQL from `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
3. (Optional) Seed data: Run `supabase/seed.sql` after creating a user account

## Architecture

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Route group: login, register (no auth required)
│   ├── (dashboard)/       # Route group: protected pages with sidebar layout
│   │   ├── dashboard/     # Main dashboard with charts
│   │   ├── clientes/      # Client management (CRUD)
│   │   ├── facturas/      # Invoice management
│   │   │   ├── [id]/      # Invoice detail page (dynamic route)
│   │   │   └── nueva/     # New invoice creation
│   │   └── gastos/        # Expense tracking
│   ├── layout.tsx         # Root layout with fonts
│   └── page.tsx           # Root page (redirects to /dashboard)
├── components/
│   ├── dashboard/         # Dashboard-specific components
│   ├── facturas/          # Invoice components (PDF, actions)
│   ├── gastos/            # Expense components
│   ├── layout/            # Layout components (Sidebar, UserNav)
│   └── ui/                # shadcn/ui components (Button, Card, Dialog, etc.)
├── hooks/
│   └── use-user.ts        # User authentication hook
├── lib/
│   ├── actions/           # Server actions (categorias, clientes, dashboard, facturas, gastos)
│   ├── supabase/          # Supabase clients
│   │   ├── client.ts      # Browser client for client components
│   │   ├── server.ts      # Server client for server components/actions
│   │   └── middleware.ts  # Middleware for session management
│   ├── action-helpers.ts  # Reusable server action helpers (auth, error handling)
│   ├── types.ts           # Shared types (ActionResult<T>)
│   ├── constants.ts       # App constants (IVA_RATE, DATOS_EMPRESA)
│   └── utils.ts           # Utilities (cn, formatCurrency, formatDate, status badges)
└── types/
    └── database.ts        # TypeScript types for Supabase schema
```

### Key Patterns

**Route Groups:** `(auth)` and `(dashboard)` don't affect URLs but allow separate layouts. `(auth)` has no sidebar, `(dashboard)` has sidebar and requires authentication.

**Path Aliases:** Use `@/*` to import from `src/` (e.g., `@/components/ui/button`).

**Server Actions:** All data mutations in `src/lib/actions/` as Next.js Server Actions. Each action:
- Uses `getAuthenticatedUser()` from `action-helpers.ts` for authentication
- Returns `ActionResult<T>` type from `types.ts`
- Uses `createErrorResult()` and `createSuccessResult()` helpers

**Supabase Clients:**
- Browser: `src/lib/supabase/client.ts`
- Server: `src/lib/supabase/server.ts`
- Middleware: `src/lib/supabase/middleware.ts` (session refresh on every request)

**Middleware:** `middleware.ts` at root refreshes Supabase sessions on all routes except static files/images.

### Database Schema

5 main tables (all have RLS with `user_id = auth.uid()`):
- `clientes` - Client information (name, email, phone, address, NIF)
- `facturas` - Invoices (status: borrador/enviada/pagada)
- `lineas_factura` - Invoice line items (linked to facturas)
- `categorias_gasto` - Expense categories (custom colors)
- `gastos` - Expense records (linked to categories)

TypeScript types in `src/types/database.ts` match Supabase schema exactly.

### Code Organization Patterns

**Recent Refactoring:** Codebase underwent significant cleanup to eliminate duplication:
- Authentication logic: Use `getAuthenticatedUser()` instead of inline Supabase calls
- Error handling: Use `createErrorResult()` and `createSuccessResult()` from `action-helpers.ts`
- Formatting: Use `formatCurrency()` and `formatDate()` from `utils.ts`
- Status badges: Use `estadoBadgeStyles` and `estadoLabels` from `utils.ts`
- IVA calculations: Use `IVA_RATE` constant from `constants.ts`

See `CLEANUP.md` for detailed refactoring documentation.

**Adding New Server Actions:**
```typescript
import { getAuthenticatedUser, createErrorResult, createSuccessResult } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";

export async function myAction(data: MyData): Promise<ActionResult<MyResult>> {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return createErrorResult(authError);

  try {
    // Your logic here
    return createSuccessResult(result);
  } catch (error) {
    return createErrorResult(error instanceof Error ? error.message : "Error desconocido");
  }
}
```

**Adding UI Components:** Follow shadcn/ui patterns in `src/components/ui/`. Use Tailwind CSS for styling.

**Invoice Status Values:** `borrador`, `enviada`, `pagada` (defined in `database.ts` as `EstadoFactura` type).

**Company Data:** Configured in `src/lib/constants.ts` as `DATOS_EMPRESA` (used in PDF generation).

## Validation & Testing

**No test framework installed.** To validate changes:
1. `npm run lint` - must pass
2. `npm run build` - must succeed (includes type checking)
3. Manual testing in browser with `npm run dev`

## Common Issues

**Build fails with Supabase type errors:** Ensure `src/types/database.ts` matches your Supabase schema.

**Runtime errors about environment variables:** Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Authentication not working:** Verify `middleware.ts` is properly configured and Supabase session is refreshing.

## Development Workflow

1. Use `@/*` path aliases, not relative paths
2. Add new pages under appropriate route group in `src/app/`
3. Add server actions to `src/lib/actions/` using action-helpers pattern
4. Use centralized utilities from `utils.ts` and constants from `constants.ts`
5. Follow existing TypeScript patterns and types from `database.ts`
6. Run `npm run lint` and `npm run build` before committing
