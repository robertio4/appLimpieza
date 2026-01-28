"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, createErrorResult, createSuccessResult } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";
import type { FacturaConCliente, GastoConCategoria } from "@/types/database";

export type { ActionResult } from "@/lib/types";

export interface DashboardStats {
  totalFacturado: number;
  pendienteCobro: number;
  totalGastos: number;
  balance: number;
  facturasVencidas: FacturaConCliente[];
  facturasBorrador: number;
  ultimasFacturas: FacturaConCliente[];
  ultimosGastos: GastoConCategoria[];
}

export async function getDashboardStats(
  month: number,
  year: number
): Promise<ActionResult<DashboardStats>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const { data: paidInvoices, error: paidError } = await supabase
      .from("facturas")
      .select("total")
      .eq("user_id", user.id)
      .eq("estado", "pagada")
      .gte("fecha", startDate)
      .lte("fecha", endDate);

    if (paidError) {
      return createErrorResult(paidError.message);
    }

    const totalFacturado = paidInvoices?.reduce((sum, f) => sum + f.total, 0) || 0;

    const { data: unpaidInvoices, error: unpaidError } = await supabase
      .from("facturas")
      .select("total")
      .eq("user_id", user.id)
      .eq("estado", "enviada")
      .gte("fecha", startDate)
      .lte("fecha", endDate);

    if (unpaidError) {
      return createErrorResult(unpaidError.message);
    }

    const pendienteCobro = unpaidInvoices?.reduce((sum, f) => sum + f.total, 0) || 0;

    const { data: gastos, error: gastosError } = await supabase
      .from("gastos")
      .select("importe")
      .eq("user_id", user.id)
      .gte("fecha", startDate)
      .lte("fecha", endDate);

    if (gastosError) {
      return createErrorResult(gastosError.message);
    }

    const totalGastos = gastos?.reduce((sum, g) => sum + g.importe, 0) || 0;
    const balance = totalFacturado - totalGastos;

    const { data: overdueInvoices, error: overdueError } = await supabase
      .from("facturas")
      .select(`*, cliente:clientes(*)`)
      .eq("user_id", user.id)
      .eq("estado", "enviada")
      .lt("fecha_vencimiento", today)
      .order("fecha_vencimiento", { ascending: true });

    if (overdueError) {
      return createErrorResult(overdueError.message);
    }

    const { count: draftCount, error: draftError } = await supabase
      .from("facturas")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("estado", "borrador");

    if (draftError) {
      return createErrorResult(draftError.message);
    }

    const { data: lastInvoices, error: lastInvoicesError } = await supabase
      .from("facturas")
      .select(`*, cliente:clientes(*)`)
      .eq("user_id", user.id)
      .order("fecha", { ascending: false })
      .limit(5);

    if (lastInvoicesError) {
      return createErrorResult(lastInvoicesError.message);
    }

    const { data: lastExpenses, error: lastExpensesError } = await supabase
      .from("gastos")
      .select(`*, categoria:categorias_gasto(*)`)
      .eq("user_id", user.id)
      .order("fecha", { ascending: false })
      .limit(5);

    if (lastExpensesError) {
      return createErrorResult(lastExpensesError.message);
    }

    return createSuccessResult({
      totalFacturado,
      pendienteCobro,
      totalGastos,
      balance,
      facturasVencidas: (overdueInvoices as FacturaConCliente[]) || [],
      facturasBorrador: draftCount || 0,
      ultimasFacturas: (lastInvoices as FacturaConCliente[]) || [],
      ultimosGastos: (lastExpenses as GastoConCategoria[]) || [],
    });
  } catch {
    return createErrorResult("Error al obtener las estadísticas");
  }
}

export interface MonthlyTotal {
  month: string;
  monthNum: number;
  year: number;
  ingresos: number;
  gastos: number;
}

export async function getMonthlyTotals(
  months: number = 6
): Promise<ActionResult<MonthlyTotal[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const results: MonthlyTotal[] = [];
    const now = new Date();
    const monthNames = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();

      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const { data: invoices } = await supabase
        .from("facturas")
        .select("total")
        .eq("user_id", user.id)
        .eq("estado", "pagada")
        .gte("fecha", startDate)
        .lte("fecha", endDate);

      const ingresos = invoices?.reduce((sum, f) => sum + f.total, 0) || 0;

      const { data: gastos } = await supabase
        .from("gastos")
        .select("importe")
        .eq("user_id", user.id)
        .gte("fecha", startDate)
        .lte("fecha", endDate);

      const totalGastos = gastos?.reduce((sum, g) => sum + g.importe, 0) || 0;

      results.push({
        month: monthNames[month],
        monthNum: month + 1,
        year,
        ingresos,
        gastos: totalGastos,
      });
    }

    return createSuccessResult(results);
  } catch {
    return createErrorResult("Error al obtener los totales mensuales");
  }
}
