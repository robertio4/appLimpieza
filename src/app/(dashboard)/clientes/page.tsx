import type { Metadata } from "next";
import { ClientesPage } from "@/components/clientes/ClientesPage";

export const metadata: Metadata = {
  title: "Clientes | App Limpieza",
  description: "Gestión de clientes",
};

export default function Page() {
  return <ClientesPage />;
}
