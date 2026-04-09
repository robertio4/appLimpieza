// Server Component
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { getPresupuestos, getClientes, getAvailableMonthsPresupuestos } from "@/lib/actions/presupuestos";
import { PresupuestosClient } from "@/components/presupuestos/PresupuestosClient";

export const metadata: Metadata = { title: "Presupuestos | App Limpieza" };

export default async function PresupuestosPage() {
  const [presupuestosResult, clientesResult, mesesResult] = await Promise.all([
    getPresupuestos(),
    getClientes(),
    getAvailableMonthsPresupuestos(),
  ]);

  return (
    <PresupuestosClient
      initialPresupuestos={presupuestosResult.success ? presupuestosResult.data : []}
      initialClientes={clientesResult.success ? clientesResult.data : []}
      initialAvailableMonths={mesesResult.success ? mesesResult.data : []}
    />
  );
}
