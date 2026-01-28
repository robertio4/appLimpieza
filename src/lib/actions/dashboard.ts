"use server";

import { createClient } from "@/lib/supabase/server";
import type { FacturaConCliente, GastoConCategoria } from "@/types/database";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    // Get paid invoices (Total facturado) - sum of paid invoices in the month
    const { data: paidInvoices, error: paidError } = await supabase
      .from("facturas")
      .select("total")
      .eq("user_id", user.id)
      .eq("estado", "pagada")
      .gte("fecha", startDate)
      .lte("fecha", endDate);

    if (paidError) {
      return { success: false, error: paidError.message };
    }

    const totalFacturado = paidInvoices?.reduce((sum, f) => sum + f.total, 0) || 0;

    // Get unpaid sent invoices (Pendiente de cobro) - sum of sent (not paid) invoices
    const { data: unpaidInvoices, error: unpaidError } = await supabase
      .from("facturas")
      .select("total")
      .eq("user_id", user.id)
      .eq("estado", "enviada")
      .gte("fecha", startDate)
      .lte("fecha", endDate);

    if (unpaidError) {
      return { success: false, error: unpaidError.message };
    }

    const pendienteCobro = unpaidInvoices?.reduce((sum, f) => sum + f.total, 0) || 0;

    // Get total expenses for the month
    const { data: gastos, error: gastosError } = await supabase
      .from("gastos")
      .select("importe")
      .eq("user_id", user.id)
      .gte("fecha", startDate)
      .lte("fecha", endDate);

    if (gastosError) {
      return { success: false, error: gastosError.message };
    }

    const totalGastos = gastos?.reduce((sum, g) => sum + g.importe, 0) || 0;

    // Calculate balance (facturado - gastos)
    const balance = totalFacturado - totalGastos;

    // Get overdue invoices (enviada and past due date)
    const { data: overdueInvoices, error: overdueError } = await supabase
      .from("facturas")
      .select(`*, cliente:clientes(*)`)
      .eq("user_id", user.id)
      .eq("estado", "enviada")
      .lt("fecha_vencimiento", today)
      .order("fecha_vencimiento", { ascending: true });

    if (overdueError) {
      return { success: false, error: overdueError.message };
    }

    // Get draft invoices count
    const { count: draftCount, error: draftError } = await supabase
      .from("facturas")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("estado", "borrador");

    if (draftError) {
      return { success: false, error: draftError.message };
    }

    // Get last 5 invoices
    const { data: lastInvoices, error: lastInvoicesError } = await supabase
      .from("facturas")
      .select(`*, cliente:clientes(*)`)
      .eq("user_id", user.id)
      .order("fecha", { ascending: false })
      .limit(5);

    if (lastInvoicesError) {
      return { success: false, error: lastInvoicesError.message };
    }

    // Get last 5 expenses
    const { data: lastExpenses, error: lastExpensesError } = await supabase
      .from("gastos")
      .select(`*, categoria:categorias_gasto(*)`)
      .eq("user_id", user.id)
      .order("fecha", { ascending: false })
      .limit(5);

    if (lastExpensesError) {
      return { success: false, error: lastExpensesError.message };
    }

    return {
      success: true,
      data: {
        totalFacturado,
        pendienteCobro,
        totalGastos,
        balance,
        facturasVencidas: (overdueInvoices as FacturaConCliente[]) || [],
        facturasBorrador: draftCount || 0,
        ultimasFacturas: (lastInvoices as FacturaConCliente[]) || [],
        ultimosGastos: (lastExpenses as GastoConCategoria[]) || [],
      },
    };
  } catch {
    return { success: false, error: "Error al obtener las estadísticas" };
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

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

      // Get paid invoices for this month
      const { data: invoices } = await supabase
        .from("facturas")
        .select("total")
        .eq("user_id", user.id)
        .eq("estado", "pagada")
        .gte("fecha", startDate)
        .lte("fecha", endDate);

      const ingresos = invoices?.reduce((sum, f) => sum + f.total, 0) || 0;

      // Get expenses for this month
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

    return { success: true, data: results };
  } catch {
    return { success: false, error: "Error al obtener los totales mensuales" };
  }
}
