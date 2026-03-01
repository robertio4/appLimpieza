"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPresupuesto,
  getClientes,
  getNextNumeroPresupuesto,
} from "@/lib/actions/presupuestos";
import { formatCurrency } from "@/lib/utils";
import { IVA_PERCENTAGE, PRESUPUESTO_VALIDITY_DAYS } from "@/lib/constants";
import type { Cliente } from "@/types/database";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";

interface LineaForm {
  id: string;
  concepto: string;
  cantidad: number;
  precio_unitario: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getDefaultFechaValidez(): string {
  const date = new Date();
  date.setDate(date.getDate() + PRESUPUESTO_VALIDITY_DAYS);
  return date.toISOString().split("T")[0];
}

export default function NuevoPresupuestoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [numeroPresupuesto, setNumeroPresupuesto] = useState<string>("");

  // Form fields
  const [clienteId, setClienteId] = useState<string>("");
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [fechaValidez, setFechaValidez] = useState<string>(
    getDefaultFechaValidez(),
  );
  const [notas, setNotas] = useState<string>("");
  const [lineas, setLineas] = useState<LineaForm[]>([
    { id: generateId(), concepto: "", cantidad: 1, precio_unitario: 0 },
  ]);

  const loadInitialData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [clientesResult, numeroResult] = await Promise.all([
        getClientes(),
        getNextNumeroPresupuesto(),
      ]);

      if (clientesResult.success) {
        setClientes(clientesResult.data);
      }
      if (numeroResult.success) {
        setNumeroPresupuesto(numeroResult.data);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleAddLinea = () => {
    setLineas([
      ...lineas,
      { id: generateId(), concepto: "", cantidad: 1, precio_unitario: 0 },
    ]);
  };

  const handleRemoveLinea = (id: string) => {
    if (lineas.length === 1) return;
    setLineas(lineas.filter((l) => l.id !== id));
  };

  const handleLineaChange = (
    id: string,
    field: keyof LineaForm,
    value: string | number,
  ) => {
    setLineas(
      lineas.map((l) => {
        if (l.id === id) {
          return { ...l, [field]: value };
        }
        return l;
      }),
    );
  };

  const calculateLineaTotal = (linea: LineaForm): number => {
    return linea.cantidad * linea.precio_unitario;
  };

  const subtotal = lineas.reduce(
    (sum, linea) => sum + calculateLineaTotal(linea),
    0,
  );
  const iva = subtotal * (IVA_PERCENTAGE / 100);
  const total = subtotal + iva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId) {
      setError("Debes seleccionar un cliente");
      return;
    }

    const validLineas = lineas.filter(
      (l) => l.concepto.trim() && l.cantidad > 0 && l.precio_unitario > 0,
    );

    if (validLineas.length === 0) {
      setError("Debes añadir al menos una línea válida");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createPresupuesto({
        cliente_id: clienteId,
        fecha,
        fecha_validez: fechaValidez,
        notas: notas || undefined,
        lineas: validLineas.map((l) => ({
          concepto: l.concepto,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
      });

      if (result.success) {
        router.push(`/presupuestos/${result.data.id}`);
      } else {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Nuevo Presupuesto
          </h1>
          <p className="text-neutral-600">
            {numeroPresupuesto && `Número: ${numeroPresupuesto}`}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Información básica
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger id="cliente">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No hay clientes registrados
                    </SelectItem>
                  ) : (
                    clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha presupuesto *</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaValidez">Fecha validez *</Label>
              <Input
                id="fechaValidez"
                type="date"
                value={fechaValidez}
                onChange={(e) => setFechaValidez(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Presupuesto Lines */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">
              Líneas de presupuesto
            </h2>
            <Button type="button" variant="outline" onClick={handleAddLinea}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir línea
            </Button>
          </div>

          <div className="space-y-4">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-sm font-medium text-neutral-600">
              <div className="col-span-5">Concepto</div>
              <div className="col-span-2 text-center">Cantidad</div>
              <div className="col-span-2 text-right">Precio</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>

            {/* Lines */}
            {lineas.map((linea) => (
              <div
                key={linea.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-2 bg-neutral-50 rounded-lg"
              >
                <div className="md:col-span-5 space-y-1">
                  <Label className="md:hidden text-xs text-neutral-500">
                    Concepto
                  </Label>
                  <Input
                    placeholder="Descripción del servicio..."
                    value={linea.concepto}
                    onChange={(e) =>
                      handleLineaChange(linea.id, "concepto", e.target.value)
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="md:hidden text-xs text-neutral-500">
                    Cantidad
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    className="text-center"
                    value={linea.cantidad}
                    onChange={(e) =>
                      handleLineaChange(
                        linea.id,
                        "cantidad",
                        parseInt(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="md:hidden text-xs text-neutral-500">
                    Precio unitario
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="text-right"
                    value={linea.precio_unitario}
                    onChange={(e) =>
                      handleLineaChange(
                        linea.id,
                        "precio_unitario",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="md:hidden text-xs text-neutral-500">
                    Total
                  </Label>
                  <div className="h-10 flex items-center justify-end px-3 bg-white border border-neutral-200 rounded-md font-medium">
                    {formatCurrency(calculateLineaTotal(linea))}
                  </div>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveLinea(linea.id)}
                    disabled={lineas.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full md:w-72 space-y-2">
              <div className="flex justify-between px-3 py-2 bg-neutral-50 rounded">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 bg-neutral-50 rounded">
                <span className="text-neutral-600">
                  IVA ({IVA_PERCENTAGE}%)
                </span>
                <span className="font-medium">{formatCurrency(iva)}</span>
              </div>
              <div className="flex justify-between px-3 py-3 bg-neutral-900 text-white rounded">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Notas</h2>
          <Textarea
            placeholder="Notas adicionales para el presupuesto..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear Presupuesto
          </Button>
        </div>
      </form>
    </div>
  );
}
