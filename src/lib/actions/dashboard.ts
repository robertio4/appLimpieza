"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  createErrorResult,
  createSuccessResult,
} from "@/lib/action-helpers";
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
  ticketPromedio: number;
  clientesActivos: number;
  tasaCobro: number;
}

export interface GastosPorCategoria {
  categoria: string;
  total: number;
  color: string;
}

export interface TopCliente {
  id: string;
  nombre: string;
  total: number;
}

export async function getDashboardStats(
  month: number,
  year: number,
): Promise<ActionResult<DashboardStats>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const isAllTime = month === 0;
    const startDate = isAllTime
      ? null
      : `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = isAllTime ? null : new Date(year, month, 0).getDate();
    const endDate = isAllTime
      ? null
      : `${year}-${String(month).padStart(2, "0")}-${String(lastDay!).padStart(2, "0")}`;
    const today = new Date().toLocaleDateString("sv-SE");

    const paidBase = supabase
      .from("facturas")
      .select("total")
      .eq("user_id", user.id)
      .eq("estado", "pagada");
    const { data: paidInvoices, error: paidError } = await (startDate && endDate
      ? paidBase.gte("fecha", startDate).lte("fecha", endDate)
      : paidBase);

    if (paidError) {
      return createErrorResult(paidError.message);
    }

    const totalFacturado =
      paidInvoices?.reduce((sum, f) => sum + f.total, 0) || 0;

    const unpaidBase = supabase
      .from("facturas")
      .select("total")
      .eq("user_id", user.id)
      .eq("estado", "enviada");
    const { data: unpaidInvoices, error: unpaidError } = await (startDate &&
    endDate
      ? unpaidBase.gte("fecha", startDate).lte("fecha", endDate)
      : unpaidBase);

    if (unpaidError) {
      return createErrorResult(unpaidError.message);
    }

    const pendienteCobro =
      unpaidInvoices?.reduce((sum, f) => sum + f.total, 0) || 0;

    const gastosStatBase = supabase
      .from("gastos")
      .select("importe")
      .eq("user_id", user.id);
    const { data: gastos, error: gastosError } = await (startDate && endDate
      ? gastosStatBase.gte("fecha", startDate).lte("fecha", endDate)
      : gastosStatBase);

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

    // Calcular métricas adicionales
    const totalInvoicesCount = paidInvoices?.length || 0;
    const ticketPromedio =
      totalInvoicesCount > 0 ? totalFacturado / totalInvoicesCount : 0;

    const activeClientsBase = supabase
      .from("facturas")
      .select("cliente_id")
      .eq("user_id", user.id);
    const { data: activeClients } = await (startDate && endDate
      ? activeClientsBase.gte("fecha", startDate).lte("fecha", endDate)
      : activeClientsBase);

    const clientesActivos = activeClients
      ? new Set(activeClients.map((f) => f.cliente_id)).size
      : 0;

    const totalInvoices =
      (paidInvoices?.length || 0) + (unpaidInvoices?.length || 0);
    const tasaCobro =
      totalInvoices > 0
        ? ((paidInvoices?.length || 0) / totalInvoices) * 100
        : 0;

    return createSuccessResult({
      totalFacturado,
      pendienteCobro,
      totalGastos,
      balance,
      facturasVencidas: (overdueInvoices as FacturaConCliente[]) || [],
      facturasBorrador: draftCount || 0,
      ultimasFacturas: (lastInvoices as FacturaConCliente[]) || [],
      ultimosGastos: (lastExpenses as GastoConCategoria[]) || [],
      ticketPromedio,
      clientesActivos,
      tasaCobro,
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
  pendiente: number;
  gastos: number;
}

export async function getMonthlyTotals(
  months: number = 6,
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
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();

      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const monthLastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(monthLastDay).padStart(2, "0")}`;

      const { data: invoices } = await supabase
        .from("facturas")
        .select("total")
        .eq("user_id", user.id)
        .eq("estado", "pagada")
        .gte("fecha", startDate)
        .lte("fecha", endDate);

      const ingresos = invoices?.reduce((sum, f) => sum + f.total, 0) || 0;

      const { data: pendienteInvoices } = await supabase
        .from("facturas")
        .select("total")
        .eq("user_id", user.id)
        .eq("estado", "enviada")
        .gte("fecha", startDate)
        .lte("fecha", endDate);

      const pendiente =
        pendienteInvoices?.reduce((sum, f) => sum + f.total, 0) || 0;

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
        pendiente,
        gastos: totalGastos,
      });
    }

    return createSuccessResult(results);
  } catch {
    return createErrorResult("Error al obtener los totales mensuales");
  }
}

export async function getGastosPorCategoria(
  month: number,
  year: number,
): Promise<ActionResult<GastosPorCategoria[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const isAllTime = month === 0;
    const startDate = isAllTime
      ? null
      : `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = isAllTime ? null : new Date(year, month, 0).getDate();
    const endDate = isAllTime
      ? null
      : `${year}-${String(month).padStart(2, "0")}-${String(lastDay!).padStart(2, "0")}`;

    const gastosBase = supabase
      .from("gastos")
      .select(
        `
        importe,
        categoria:categorias_gasto(nombre, color)
      `,
      )
      .eq("user_id", user.id);
    const { data: gastos, error } = await (startDate && endDate
      ? gastosBase.gte("fecha", startDate).lte("fecha", endDate)
      : gastosBase);

    if (error) {
      return createErrorResult(error.message);
    }

    const categoriaMap = new Map<string, { total: number; color: string }>();

    gastos?.forEach((gasto) => {
      const categoriaNombre = gasto.categoria?.nombre || "Sin categoría";
      const categoriaColor = gasto.categoria?.color || "#9ca3af";

      if (categoriaMap.has(categoriaNombre)) {
        categoriaMap.get(categoriaNombre)!.total += gasto.importe;
      } else {
        categoriaMap.set(categoriaNombre, {
          total: gasto.importe,
          color: categoriaColor,
        });
      }
    });

    const result: GastosPorCategoria[] = Array.from(categoriaMap.entries())
      .map(([categoria, { total, color }]) => ({
        categoria,
        total,
        color,
      }))
      .sort((a, b) => b.total - a.total);

    return createSuccessResult(result);
  } catch {
    return createErrorResult("Error al obtener gastos por categoría");
  }
}

export interface MonthWithInvoices {
  month: number;
  year: number;
  count: number;
}

export async function getMonthsWithInvoices(): Promise<
  ActionResult<MonthWithInvoices[]>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    const { data: facturas, error } = await supabase
      .from("facturas")
      .select("fecha")
      .eq("user_id", user.id)
      .order("fecha", { ascending: false });

    if (error) {
      return createErrorResult(error.message);
    }

    const monthMap = new Map<string, MonthWithInvoices>();

    facturas?.forEach((factura) => {
      if (!factura.fecha) return;
      // fecha is a Postgres DATE string "YYYY-MM-DD" – extract directly to avoid timezone issues
      const [yearStr, monthStr] = factura.fecha.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const key = `${year}-${month}`;

      if (monthMap.has(key)) {
        monthMap.get(key)!.count++;
      } else {
        monthMap.set(key, { month, year, count: 1 });
      }
    });

    const result = Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return createSuccessResult(result);
  } catch {
    return createErrorResult("Error al obtener meses con facturas");
  }
}

export async function getTopClientes(
  month: number,
  year: number,
  limit: number = 5,
): Promise<ActionResult<TopCliente[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const isAllTime = month === 0;
    const startDate = isAllTime
      ? null
      : `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = isAllTime ? null : new Date(year, month, 0).getDate();
    const endDate = isAllTime
      ? null
      : `${year}-${String(month).padStart(2, "0")}-${String(lastDay!).padStart(2, "0")}`;

    const facturasBase = supabase
      .from("facturas")
      .select(
        `
        total,
        cliente:clientes(id, nombre)
      `,
      )
      .eq("user_id", user.id)
      .eq("estado", "pagada");
    const { data: facturas, error } = await (startDate && endDate
      ? facturasBase.gte("fecha", startDate).lte("fecha", endDate)
      : facturasBase);

    if (error) {
      return createErrorResult(error.message);
    }

    const clienteMap = new Map<string, { nombre: string; total: number }>();

    facturas?.forEach((factura) => {
      if (factura.cliente) {
        const clienteId = factura.cliente.id;
        const clienteNombre = factura.cliente.nombre;

        if (clienteMap.has(clienteId)) {
          clienteMap.get(clienteId)!.total += factura.total;
        } else {
          clienteMap.set(clienteId, {
            nombre: clienteNombre,
            total: factura.total,
          });
        }
      }
    });

    const result: TopCliente[] = Array.from(clienteMap.entries())
      .map(([id, { nombre, total }]) => ({
        id,
        nombre,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    return createSuccessResult(result);
  } catch {
    return createErrorResult("Error al obtener top clientes");
  }
}
