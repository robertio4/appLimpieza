#!/bin/bash
# overnight-limpieza-app.sh
# Script para desarrollo nocturno con Ralph Wiggum

PROJECT_DIR="/Users/robertorf/Workspace/app-limpieza"
cd "$PROJECT_DIR"

# FASE 1: Setup inicial
claude -p '/ralph-loop:ralph-loop "Implement initial setup for Next.js 14 + Supabase + shadcn/ui project.

Context: Management app for cleaning company with clients, simple invoices and expenses.
Stack: Next.js 14 (App Router), Supabase, Tailwind, shadcn/ui, TypeScript.

Requirements:
- Initialize Next.js 14 project with App Router, TypeScript and Tailwind
- Install and configure Supabase client (@supabase/supabase-js, @supabase/ssr)
- Initialize shadcn/ui with neutral theme
- Create folder structure: src/app/(auth)/login and register, src/app/(dashboard)/clientes, facturas, gastos, dashboard, src/components/ui, forms, layout, src/lib/supabase with client.ts, server.ts, middleware.ts, src/types with database.ts
- Configure environment variables in .env.local.example
- Create base layout with responsive sidebar

Success criteria:
- npm run build passes without errors
- npm run lint passes without errors
- Folder structure created
- Supabase client configured
- shadcn/ui working (test with a Button component)
- Layout with navigable sidebar between sections
- .env.local.example documented

Output <promise>COMPLETE</promise> when done." --max-iterations 30 --completion-promise "COMPLETE"' --dangerously-skip-permissions

# FASE 2: Schema Supabase
claude -p '/ralph-loop:ralph-loop "Implement Supabase database schema with RLS.

Context: Continuation of limpieza-app project.

Requirements:
- Create file supabase/migrations/001_initial_schema.sql with tables: clientes (id uuid PK, user_id uuid FK auth.users, nombre text, email text, telefono text, direccion text, nif text, notas text, created_at timestamptz, updated_at timestamptz), facturas (id uuid PK, user_id uuid FK, numero text unique, cliente_id uuid FK clientes, fecha date, fecha_vencimiento date, subtotal numeric, iva numeric default 21, total numeric, estado enum borrador enviada pagada, notas text, created_at, updated_at), lineas_factura (id uuid PK, factura_id uuid FK facturas, concepto text, cantidad numeric, precio_unitario numeric, total numeric), categorias_gasto (id uuid PK, user_id uuid FK, nombre text, color text), gastos (id uuid PK, user_id uuid FK, fecha date, concepto text, categoria_id uuid FK categorias_gasto, importe numeric, proveedor text, notas text, created_at, updated_at)
- Implement RLS policies so each user only sees their data where user_id equals auth.uid()
- Create triggers for automatic updated_at
- Create function to generate incremental invoice number per user
- Generate TypeScript types in src/types/database.ts
- Create seed data in supabase/seed.sql with 3 clients, 2 invoices, 5 expenses, 4 categories

Success criteria:
- Valid and executable SQL migration file
- RLS policies for all tables
- TypeScript types generated without errors
- Seed data complete
- README documents how to apply migrations

Output <promise>COMPLETE</promise> when done." --max-iterations 25 --completion-promise "COMPLETE"' --dangerously-skip-permissions

# FASE 3: Autenticacion
claude -p '/ralph-loop:ralph-loop "Implement authentication system with Supabase Auth.

Context: limpieza-app project with Next.js 14 App Router and Supabase.

Requirements:
- Create login page at src/app/(auth)/login/page.tsx with email and password form using shadcn/ui Card, Input, Button, Label with react-hook-form and zod validation and visible error handling
- Create register page at src/app/(auth)/register/page.tsx with fields nombre, email, password, confirm password using same structure as login
- Implement authentication middleware with protected routes /dashboard, /clientes, /facturas, /gastos and public routes /login, /register with automatic redirect based on auth state
- Create UserNav component in header showing user name/email with dropdown and logout option
- Create useUser hook to access current user

Success criteria:
- Login functional with error feedback
- Register functional with validation
- Middleware redirects correctly
- Logout works and clears session
- Unauthenticated user cannot access protected routes
- npm run build passes without errors

Output <promise>COMPLETE</promise> when done." --max-iterations 30 --completion-promise "COMPLETE"' --dangerously-skip-permissions

# FASE 4: CRUD Clientes
claude -p '/ralph-loop:ralph-loop "Implement complete client management module.

Context: limpieza-app project with authenticated user.

Requirements:
- Create clients list page at src/app/(dashboard)/clientes/page.tsx with table showing nombre, email, telefono, NIF, actions using shadcn/ui Table with search by name/email and New client button and edit/delete actions with confirmation
- Create new client page at src/app/(dashboard)/clientes/nuevo/page.tsx with react-hook-form and zod form with fields nombre required, email required with valid format, telefono, direccion, NIF, notas and redirect to list after creation
- Create edit client page at src/app/(dashboard)/clientes/[id]/page.tsx with same form as create but preloaded with save and cancel buttons
- Create server actions in src/app/(dashboard)/clientes/actions.ts with getClientes, getCliente, createCliente, updateCliente, deleteCliente with server-side zod validation
- Create reusable components ClienteForm, ClientesTable, SearchInput

Success criteria:
- List clients with working search
- Create client with validation
- Edit client preloads data correctly
- Delete client with confirmation modal
- Success/error messages with toast using shadcn/ui
- Loading states in all operations
- npm run build without errors

Output <promise>COMPLETE</promise> when done." --max-iterations 35 --completion-promise "COMPLETE"' --dangerously-skip-permissions

# FASE 5: CRUD Gastos
claude -p '/ralph-loop:ralph-loop "Implement expense management module.

Context: limpieza-app project with same pattern as clients.

Requirements:
- Create category management with modal to create/edit categories from expenses page with color selector using input type color or preset colors and default categories Material, Transporte, Nominas, Seguros, Otros
- Create expenses list page at src/app/(dashboard)/gastos/page.tsx with table showing fecha, concepto, categoria with color badge, importe, proveedor with filters for date range and category and visible total sum of filtered expenses ordered by date descending by default
- Create expense form with fields fecha required, concepto required, categoria required, importe required, proveedor, notas with category selector including option to create new and currency format for importe in euros
- Create server actions for CRUD gastos and CRUD categorias and getGastosByDateRange for filters

Success criteria:
- CRUD categories working
- CRUD expenses working
- Date filter works
- Category filter works
- Expenses total updates with filters
- Category badges show correct color
- npm run build without errors

Output <promise>COMPLETE</promise> when done." --max-iterations 35 --completion-promise "COMPLETE"' --dangerously-skip-permissions

# FASE 6: Facturas con PDF y Gmail
claude -p '/ralph-loop:ralph-loop "Implement invoicing module with PDF generation and Gmail sending.

Context: limpieza-app project with simple invoices. Install @react-pdf/renderer.

Requirements:
- Create invoices list page at src/app/(dashboard)/facturas/page.tsx with table showing numero, cliente, fecha, total, estado with colored badges borrador gray, enviada blue, pagada green with filters for estado, cliente, date range and actions ver/editar, descargar PDF, enviar email, marcar como pagada, eliminar
- Create invoice form page with cliente selector, fecha factura, fecha vencimiento, dynamic invoice lines with add line button and fields concepto, cantidad, precio_unitario, total calculated and remove line button, automatic calculation of subtotal, IVA 21 percent, total, optional notas field, auto-generated invoice number format YYYY-XXXX
- Create PDF component at src/components/facturas/FacturaPDF.tsx using @react-pdf/renderer with professional design including header with logo placeholder and company data, client data nombre direccion NIF, invoice number and dates, lines table with columns Concepto Cantidad Precio Total, Subtotal IVA 21 percent Total in bold, footer with notes and payment method
- Create FacturaActions component at src/components/facturas/FacturaActions.tsx with Download PDF button using pdf() from @react-pdf/renderer to generate blob and download as Factura-numero.pdf and Send by Gmail button that downloads PDF first then opens Gmail compose at https://mail.google.com/mail/?view=cm&fs=1&to=cliente.email&su=subject&body=body with subject Factura numero - nombre_empresa and body template with greeting and reference to attached invoice and shows toast indicating PDF downloaded attach it in Gmail
- Create invoice detail page at src/app/(dashboard)/facturas/[id]/page.tsx with visual preview as styled HTML not PDF with prominent buttons Descargar PDF and Enviar por Gmail and secondary Print button using window.print with CSS media print
- Create company data config at src/lib/constants.ts with DATOS_EMPRESA containing nombre, direccion, nif, telefono, email, iban
- Create server actions createFactura with lines in transaction, updateFactura, updateEstadoFactura, deleteFactura, getNextNumeroFactura, getFacturaCompleta with client and lines for PDF

Success criteria:
- Create invoice with multiple lines works
- Automatic calculations correct for subtotal IVA total
- Invoice number autoincremental per year
- PDF generates correctly with @react-pdf/renderer
- PDF includes all data empresa cliente lines totals
- Download PDF button works and downloads file
- Send Gmail button opens compose with client email subject and body
- Toast informs user to attach PDF
- Change invoice status works
- Print view with CSS print as fallback
- Delete invoice with confirmation
- npm run build without errors

Output <promise>COMPLETE</promise> when done." --max-iterations 50 --completion-promise "COMPLETE"' --dangerously-skip-permissions

# FASE 7: Dashboard
claude -p '/ralph-loop:ralph-loop "Implement dashboard with metrics and summary.

Context: limpieza-app project main page after login.

Requirements:
- Create dashboard page at src/app/(dashboard)/dashboard/page.tsx
- Create summary cards for current month showing Total facturado sum of paid invoices, Pendiente de cobro unpaid sent invoices, Total gastos, Balance facturado minus gastos
- Create simple chart of income vs expenses for last 6 months using recharts with grouped bars ingresos green and gastos red
- Create quick lists showing last 5 invoices with status and last 5 expenses with links to view all
- Create alerts section showing overdue unpaid invoices highlighted in red and number of draft invoices pending to send
- Create server actions getDashboardStats for month and year and getMonthlyTotals for last 6 months

Success criteria:
- Summary cards with real data
- Bar chart renders correctly
- Last 6 months data correct
- Quick lists work with links
- Overdue invoice alerts visible
- Responsive on mobile
- npm run build without errors

Output <promise>COMPLETE</promise> when done." --max-iterations 30 --completion-promise "COMPLETE"' --dangerously-skip-permissions

echo "Script completado. Revisa los resultados."