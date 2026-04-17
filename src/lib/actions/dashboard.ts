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

    // Build period-filtered query builders
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withPeriod = (q: any) =>
      startDate && endDate
        ? q.gte("fecha", startDate).lte("fecha", endDate)
        : q;

    // All 8 queries fired in parallel — ~1 roundtrip instead of 8
    const [
      paidResult,
      unpaidResult,
      gastosResult,
      overdueResult,
      draftResult,
      lastInvoicesResult,
      lastExpensesResult,
      activeClientsResult,
    ] = await Promise.all([
      withPeriod(
        supabase
          .from("facturas")
          .select("total")
          .eq("user_id", user.id)
          .eq("estado", "pagada"),
      ),
      withPeriod(
        supabase
          .from("facturas")
          .select("total")
          .eq("user_id", user.id)
          .eq("estado", "enviada"),
      ),
      withPeriod(
        supabase.from("gastos").select("importe").eq("user_id", user.id),
      ),
      supabase
        .from("facturas")
        .select(`*, cliente:clientes(*)`)
        .eq("user_id", user.id)
        .eq("estado", "enviada")
        .lt("fecha_vencimiento", today)
        .order("fecha_vencimiento", { ascending: true }),
      supabase
        .from("facturas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("estado", "borrador"),
      supabase
        .from("facturas")
        .select(`*, cliente:clientes(*)`)
        .eq("user_id", user.id)
        .order("fecha", { ascending: false })
        .limit(5),
      supabase
        .from("gastos")
        .select(`*, categoria:categorias_gasto(*)`)
        .eq("user_id", user.id)
        .order("fecha", { ascending: false })
        .limit(5),
      withPeriod(
        supabase.from("facturas").select("cliente_id").eq("user_id", user.id),
      ),
    ]);

    if (paidResult.error) return createErrorResult(paidResult.error.message);
    if (unpaidResult.error)
      return createErrorResult(unpaidResult.error.message);
    if (gastosResult.error)
      return createErrorResult(gastosResult.error.message);
    if (overdueResult.error)
      return createErrorResult(overdueResult.error.message);
    if (draftResult.error) return createErrorResult(draftResult.error.message);
    if (lastInvoicesResult.error)
      return createErrorResult(lastInvoicesResult.error.message);
    if (lastExpensesResult.error)
      return createErrorResult(lastExpensesResult.error.message);
    if (activeClientsResult.error)
      return createErrorResult(activeClientsResult.error.message);

    const paidInvoices = paidResult.data;
    const unpaidInvoices = unpaidResult.data;

    const totalFacturado =
      paidInvoices?.reduce(
        (sum: number, f: { total: number }) => sum + f.total,
        0,
      ) || 0;
    const pendienteCobro =
      unpaidInvoices?.reduce(
        (sum: number, f: { total: number }) => sum + f.total,
        0,
      ) || 0;
    const totalGastos =
      gastosResult.data?.reduce(
        (sum: number, g: { importe: number }) => sum + g.importe,
        0,
      ) || 0;
    const balance = totalFacturado - totalGastos;

    const totalInvoicesCount = paidInvoices?.length || 0;
    const ticketPromedio =
      totalInvoicesCount > 0 ? totalFacturado / totalInvoicesCount : 0;

    const clientesActivos = activeClientsResult.data
      ? new Set(
          activeClientsResult.data.map(
            (f: { cliente_id: string }) => f.cliente_id,
          ),
        ).size
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
      facturasVencidas: (overdueResult.data as FacturaConCliente[]) || [],
      facturasBorrador: draftResult.count || 0,
      ultimasFacturas: (lastInvoicesResult.data as FacturaConCliente[]) || [],
      ultimosGastos: (lastExpensesResult.data as GastoConCategoria[]) || [],
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

    // Build date ranges for all months up front
    const monthRanges = Array.from({ length: months }, (_, i) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1 - i),
        1,
      );
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { year, month, startDate, endDate };
    });

    // All months queried in parallel — 3 queries × N months fired simultaneously
    const allMonthResults = await Promise.all(
      monthRanges.map(({ startDate, endDate }) =>
        Promise.all([
          supabase
            .from("facturas")
            .select("total")
            .eq("user_id", user.id)
            .eq("estado", "pagada")
            .gte("fecha", startDate)
            .lte("fecha", endDate),
          supabase
            .from("facturas")
            .select("total")
            .eq("user_id", user.id)
            .eq("estado", "enviada")
            .gte("fecha", startDate)
            .lte("fecha", endDate),
          supabase
            .from("gastos")
            .select("importe")
            .eq("user_id", user.id)
            .gte("fecha", startDate)
            .lte("fecha", endDate),
        ]),
      ),
    );

    for (const [pagadasResult, enviadasResult, gastosResult] of allMonthResults) {
      if (pagadasResult.error) {
        return createErrorResult(pagadasResult.error.message);
      }
      if (enviadasResult.error) {
        return createErrorResult(enviadasResult.error.message);
      }
      if (gastosResult.error) {
        return createErrorResult(gastosResult.error.message);
      }
    }

    const results: MonthlyTotal[] = monthRanges.map(({ year, month }, i) => {
      const [pagadasResult, enviadasResult, gastosResult] = allMonthResults[i];
      const ingresos =
        pagadasResult.data?.reduce((sum, f) => sum + f.total, 0) || 0;
      const pendiente =
        enviadasResult.data?.reduce((sum, f) => sum + f.total, 0) || 0;
      const gastos =
        gastosResult.data?.reduce((sum, g) => sum + g.importe, 0) || 0;
      return {
        month: monthNames[month],
        monthNum: month + 1,
        year,
        ingresos,
        pendiente,
        gastos,
      };
    });

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
