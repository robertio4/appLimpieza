import { Button } from "@/components/ui/button";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
          <p className="text-neutral-600">Gestiona tus clientes</p>
        </div>
        <Button>Nuevo Cliente</Button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-neutral-500 text-center py-8">
          No hay clientes registrados
        </p>
      </div>
    </div>
  );
}
