// Server Component – data is fetched here and passed to the interactive client layer
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import {
  getFacturas,
  getClientes,
  getAvailableMonthsFacturas,
} from "@/lib/actions/facturas";
import { FacturasClient } from "@/components/facturas/FacturasClient";

export const metadata: Metadata = {
  title: "Facturas | App Limpieza",
  description: "Gestión de facturas",
};

export default async function FacturasPage() {
  const [facturasResult, clientesResult, mesesResult] = await Promise.all([
    getFacturas(),
    getClientes(),
    getAvailableMonthsFacturas(),
  ]);

  return (
    <FacturasClient
      initialFacturas={facturasResult.success ? facturasResult.data : []}
      initialClientes={clientesResult.success ? clientesResult.data : []}
      initialAvailableMonths={mesesResult.success ? mesesResult.data : []}
    />
  );
}
