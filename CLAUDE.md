# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Business management application for cleaning companies built with Next.js 14 (App Router), TypeScript, and Supabase. Provides quote/estimate management (presupuestos), invoice management (facturas), client management, expense tracking, and financial dashboard with PDF generation. Quotes can be converted to invoices with a single click, maintaining full traceability.

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
2. Apply migrations in order:
   - Run SQL from `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
   - Run SQL from `supabase/migrations/002_presupuestos.sql` in Supabase SQL Editor
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
│   │   ├── presupuestos/  # Quote/estimate management
│   │   │   ├── [id]/      # Quote detail page (dynamic route)
│   │   │   └── nueva/     # New quote creation
│   │   ├── facturas/      # Invoice management
│   │   │   ├── [id]/      # Invoice detail page (dynamic route)
│   │   │   └── nueva/     # New invoice creation
│   │   ├── gastos/        # Expense tracking
│   │   └── calendario/    # Calendar view for trabajos
│   ├── layout.tsx         # Root layout with fonts
│   └── page.tsx           # Root page (redirects to /dashboard)
├── components/
│   ├── dashboard/         # Dashboard-specific components
│   ├── presupuestos/      # Quote components (PDF, actions)
│   ├── facturas/          # Invoice components (PDF, actions)
│   ├── gastos/            # Expense components
│   ├── layout/            # Layout components (Sidebar, UserNav)
│   └── ui/                # shadcn/ui components (Button, Card, Dialog, etc.)
├── hooks/
│   └── use-user.ts        # User authentication hook
├── lib/
│   ├── actions/           # Server actions (categorias, clientes, dashboard, facturas, presupuestos, gastos)
│   ├── supabase/          # Supabase clients
│   │   ├── client.ts      # Browser client for client components
│   │   ├── server.ts      # Server client for server components/actions
│   │   └── middleware.ts  # Middleware for session management
│   ├── action-helpers.ts  # Reusable server action helpers (auth, error handling)
│   ├── types.ts           # Shared types (ActionResult<T>)
│   ├── constants.ts       # App constants (IVA_RATE, DATOS_EMPRESA, PRESUPUESTO_VALIDITY_DAYS)
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

7 main tables (all have RLS with `user_id = auth.uid()`):
- `clientes` - Client information (name, email, phone, address, NIF)
- `presupuestos` - Quotes/estimates (status: pendiente/aceptado/rechazado/expirado)
- `lineas_presupuesto` - Quote line items (linked to presupuestos)
- `facturas` - Invoices (status: borrador/enviada/pagada)
- `lineas_factura` - Invoice line items (linked to facturas)
- `categorias_gasto` - Expense categories (custom colors)
- `gastos` - Expense records (linked to categories)

**Quote to Invoice Flow:** When a presupuesto is accepted, it's converted to a factura using `convertPresupuestoToFactura()`. The presupuesto keeps a reference to the generated factura via `factura_id`, maintaining full traceability. Presupuestos in estado "aceptado" cannot be edited or deleted.

TypeScript types in `src/types/database.ts` match Supabase schema exactly.

### Code Organization Patterns

**Recent Refactoring:** Codebase underwent significant cleanup to eliminate duplication:
- Authentication logic: Use `getAuthenticatedUser()` instead of inline Supabase calls
- Error handling: Use `createErrorResult()` and `createSuccessResult()` from `action-helpers.ts`
- Formatting: Use `formatCurrency()` and `formatDate()` from `utils.ts`
- Status badges: Use `estadoBadgeStyles`, `estadoLabels`, `estadoPresupuestoBadgeStyles`, and `estadoPresupuestoLabels` from `utils.ts`
- IVA calculations: Use `IVA_RATE` constant from `constants.ts`
- Presupuesto expiration: Use `isPresupuestoExpired()` from `utils.ts`

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

**Status Values:**
- Invoice (EstadoFactura): `borrador`, `enviada`, `pagada`
- Presupuesto (EstadoPresupuesto): `pendiente`, `aceptado`, `rechazado`, `expirado`

**Company Data:** Configured in `src/lib/constants.ts` as `DATOS_EMPRESA` (used in PDF generation).

**Presupuesto Numbering:** Format is `PRE-YYYY-NNNN` (e.g., PRE-2026-0001), generated by database function `generate_presupuesto_number()`. Default validity is 30 days from creation date.

## Key Workflows

### Presupuesto (Quote) Management

**Creating a Quote:**
1. Navigate to `/presupuestos/nueva`
2. Select client, add line items, set validity date (defaults to today + 30 days)
3. System generates unique presupuesto number on save
4. Estado starts as "pendiente"

**Quote States and Transitions:**
- `pendiente` → `aceptado` (via conversion to factura)
- `pendiente` → `rechazado` (manual)
- `pendiente` → `expirado` (manual or automatic detection)
- `expirado` → `aceptado` (via conversion, if allowed)

**Edit Restrictions:**
- Pendiente: ✅ Can edit, delete, convert
- Aceptado: ❌ Cannot edit or delete (preserves historical record)
- Rechazado: ❌ Cannot edit, but can delete or duplicate
- Expirado: ✅ Can edit (extend validity), delete, or convert

**Converting Quote to Invoice:**
1. Call `convertPresupuestoToFactura(presupuestoId)` from `src/lib/actions/presupuestos.ts`
2. System validates presupuesto is not already aceptado or rechazado
3. Generates new factura with estado "borrador" and current date
4. Copies all line items from presupuesto to factura
5. Updates presupuesto estado to "aceptado" and links to factura via `factura_id`
6. Presupuesto notes are copied to factura with reference to original presupuesto number
7. Returns created factura for redirect to `/facturas/[id]`

**Duplicating Rejected Quotes:**
- Use `duplicatePresupuesto(id)` to create a new quote with the same data
- Useful for rejected quotes that need minor modifications
- Generates new presupuesto number, resets estado to "pendiente"

## Validation & Testing

**No test framework installed.** To validate changes:
1. `npm run lint` - must pass
2. `npm run build` - must succeed (includes type checking)
3. Manual testing in browser with `npm run dev`

## Common Issues

**Build fails with Supabase type errors:** Ensure `src/types/database.ts` matches your Supabase schema. After running migrations, regenerate types if needed.

**Runtime errors about environment variables:** Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Authentication not working:** Verify `middleware.ts` is properly configured and Supabase session is refreshing.

**Presupuesto conversion fails:** Ensure the presupuesto estado is not already "aceptado" or "rechazado". Only "pendiente" and "expirado" presupuestos can be converted to facturas.

**PDF generation errors:** Verify all required data (cliente, lineas) is loaded before calling PDF generation. Check that `DATOS_EMPRESA` in constants.ts is properly configured.

## Development Workflow

1. Use `@/*` path aliases, not relative paths
2. Add new pages under appropriate route group in `src/app/`
3. Add server actions to `src/lib/actions/` using action-helpers pattern
4. Use centralized utilities from `utils.ts` and constants from `constants.ts`
5. Follow existing TypeScript patterns and types from `database.ts`
6. Run `npm run lint` and `npm run build` before committing

## Additional Features

The codebase includes additional functionality not fully documented above:

- **Calendario/Trabajos:** Calendar view and job management system (`/calendario`, `trabajos` table, `calendario_sync` table)
- **Google Calendar Sync:** Integration for syncing trabajos with Google Calendar
- **Tipo de Servicio:** Service type categorization (limpieza_general, limpieza_profunda, etc.)

These features follow the same architectural patterns as documented above. Refer to `src/types/database.ts` for complete schema and type definitions.
