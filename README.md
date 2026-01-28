This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Project Overview

This is a business management application designed for cleaning companies, providing tools for invoice management, expense tracking, and financial dashboard reporting.

### Recent Code Improvements

The codebase has recently undergone significant refactoring and cleanup to improve maintainability and reduce code duplication. See [CLEANUP.md](./CLEANUP.md) for detailed documentation of all improvements made.

**Key Improvements:**
- ✅ Eliminated ~270 lines of duplicate code
- ✅ Created reusable utilities and helpers
- ✅ Standardized error handling across all server actions
- ✅ Centralized formatting functions and constants
- ✅ Improved type safety and consistency

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database Setup (Supabase)

This project uses Supabase as its backend. Follow these steps to set up the database:

### Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Install the Supabase CLI: `npm install -g supabase`

### Applying Migrations

#### Option 1: Using Supabase CLI (Recommended)

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

#### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL in the editor

### Database Schema

The database includes the following tables:

- **clientes**: Client information (name, email, phone, address, NIF)
- **facturas**: Invoices linked to clients with status tracking
- **lineas_factura**: Individual line items for each invoice
- **categorias_gasto**: Expense categories with custom colors
- **gastos**: Expense records linked to categories

### Row Level Security (RLS)

All tables have RLS enabled. Each user can only access their own data based on `user_id = auth.uid()`.

### Seeding Development Data

After creating a user account in your app:

```bash
# Using Supabase CLI
supabase db seed

# Or manually via SQL Editor
# Copy and run the contents of supabase/seed.sql
```

The seed data includes:
- 3 sample clients
- 2 invoices with line items
- 4 expense categories
- 5 expenses

### TypeScript Types

Database types are available in `src/types/database.ts`. Import them in your code:

```typescript
import { Cliente, Factura, Gasto, Database } from '@/types/database';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
