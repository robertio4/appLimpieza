import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardStats, getMonthlyTotals } from "@/lib/actions/dashboard";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { formatCurrency, formatDate, estadoBadgeStyles, estadoLabels } from "@/lib/utils";
import type { EstadoFactura } from "@/types/database";
import {
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  ArrowRight,
} from "lucide-react";

function getStatusBadge(estado: EstadoFactura) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estadoBadgeStyles[estado]}`}
    >
      {estadoLabels[estado]}
    </span>
  );
}

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [statsResult, monthlyResult] = await Promise.all([
    getDashboardStats(month, year),
    getMonthlyTotals(6),
  ]);

  const stats = statsResult.success ? statsResult.data : null;
  const monthlyData = monthlyResult.success ? monthlyResult.data : [];

  const monthName = now.toLocaleDateString("es-ES", { month: "long" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-600">
          Resumen de {monthName} {year}
        </p>
      </div>

      {/* Alerts Section */}
      {stats && (stats.facturasVencidas.length > 0 || stats.facturasBorrador > 0) && (
        <div className="space-y-3">
          {stats.facturasVencidas.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">
                  {stats.facturasVencidas.length} factura
                  {stats.facturasVencidas.length > 1 ? "s" : ""} vencida
                  {stats.facturasVencidas.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-2 space-y-1">
                  {stats.facturasVencidas.slice(0, 3).map((factura) => (
                    <li key={factura.id} className="text-sm text-red-700">
                      <Link
                        href={`/facturas/${factura.id}`}
                        className="hover:underline"
                      >
                        {factura.numero} - {factura.cliente.nombre} -{" "}
                        {formatCurrency(factura.total)} (vencida{" "}
                        {formatDate(factura.fecha_vencimiento!)})
                      </Link>
                    </li>
                  ))}
                  {stats.facturasVencidas.length > 3 && (
                    <li className="text-sm text-red-600">
                      <Link href="/facturas?estado=enviada" className="hover:underline">
                        Ver todas las facturas vencidas...
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {stats.facturasBorrador > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <FileText className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">
                  {stats.facturasBorrador} factura
                  {stats.facturasBorrador > 1 ? "s" : ""} en borrador pendiente
                  {stats.facturasBorrador > 1 ? "s" : ""} de enviar
                </p>
              </div>
              <Link href="/facturas?estado=borrador">
                <Button variant="outline" size="sm">
                  Ver
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Total Facturado
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-neutral-900">
              {formatCurrency(stats?.totalFacturado || 0)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Facturas pagadas en {monthName}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Pendiente de Cobro
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-neutral-900">
              {formatCurrency(stats?.pendienteCobro || 0)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Facturas enviadas sin pagar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Total Gastos
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-neutral-900">
              {formatCurrency(stats?.totalGastos || 0)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Gastos en {monthName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-neutral-600" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                (stats?.balance || 0) >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(stats?.balance || 0)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Facturado menos gastos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs Gastos</CardTitle>
          <CardDescription>Comparativa de los ultimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <MonthlyChart data={monthlyData} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-neutral-500">
              No hay datos disponibles
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Last Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ultimas Facturas</CardTitle>
              <CardDescription>Las 5 facturas mas recientes</CardDescription>
            </div>
            <Link href="/facturas">
              <Button variant="ghost" size="sm">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.ultimasFacturas && stats.ultimasFacturas.length > 0 ? (
              <ul className="space-y-3">
                {stats.ultimasFacturas.map((factura) => (
                  <li key={factura.id}>
                    <Link
                      href={`/facturas/${factura.id}`}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-900 truncate">
                          {factura.numero} - {factura.cliente.nombre}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {formatDate(factura.fecha)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {getStatusBadge(factura.estado)}
                        <span className="font-medium text-neutral-900">
                          {formatCurrency(factura.total)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-neutral-500 py-8">
                No hay facturas registradas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Last Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ultimos Gastos</CardTitle>
              <CardDescription>Los 5 gastos mas recientes</CardDescription>
            </div>
            <Link href="/gastos">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.ultimosGastos && stats.ultimosGastos.length > 0 ? (
              <ul className="space-y-3">
                {stats.ultimosGastos.map((gasto) => (
                  <li
                    key={gasto.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 truncate">
                        {gasto.concepto}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {formatDate(gasto.fecha)}
                        {gasto.categoria && (
                          <span
                            className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor: gasto.categoria.color
                                ? `${gasto.categoria.color}20`
                                : "#f5f5f5",
                              color: gasto.categoria.color || "#737373",
                            }}
                          >
                            {gasto.categoria.nombre}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-medium text-red-600 ml-4">
                      -{formatCurrency(gasto.importe)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-neutral-500 py-8">
                No hay gastos registrados
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Link href="/facturas/nueva">
          <Button>Nueva Factura</Button>
        </Link>
        <Link href="/gastos">
          <Button variant="outline">Nuevo Gasto</Button>
        </Link>
        <Link href="/clientes">
          <Button variant="outline">Nuevo Cliente</Button>
        </Link>
      </div>
    </div>
  );
}
