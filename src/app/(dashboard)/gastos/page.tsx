import type { Metadata } from "next";
import { GastosPage } from "@/components/gastos/GastosPage";

export const metadata: Metadata = {
  title: "Gastos | App Limpieza",
  description: "Gestión de gastos",
};

export default function Page() {
  return <GastosPage />;
}
