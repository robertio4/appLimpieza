"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { PresupuestoActions } from "@/components/presupuestos/PresupuestoActions";
import {
  getPresupuestoCompleto,
  updatePresupuesto,
  updateEstadoPresupuesto,
  getClientes,
  convertPresupuestoToFactura,
  duplicatePresupuesto,
} from "@/lib/actions/presupuestos";
import {
  formatCurrency,
  formatDate,
  estadoPresupuestoBadgeStyles,
  estadoPresupuestoBadgeColors,
  estadoPresupuestoLabels,
  isPresupuestoExpired,
} from "@/lib/utils";
import { DATOS_EMPRESA, IVA_PERCENTAGE } from "@/lib/constants";
import type {
  PresupuestoCompleto,
  Cliente,
  EstadoPresupuesto,
} from "@/types/database";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Printer,
  Save,
  X,
  FileText,
  Copy,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface LineaForm {
  id: string;
  concepto: string;
  cantidad: number;
  precio_unitario: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function PresupuestoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const presupuestoId = params.id as string;

  const [presupuesto, setPresupuesto] = useState<PresupuestoCompleto | null>(
    null,
  );
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Edit form state
  const [editClienteId, setEditClienteId] = useState<string>("");
  const [editFecha, setEditFecha] = useState<string>("");
  const [editFechaValidez, setEditFechaValidez] = useState<string>("");
  const [editNotas, setEditNotas] = useState<string>("");
  const [editLineas, setEditLineas] = useState<LineaForm[]>([]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  };

  const loadPresupuesto = useCallback(async () => {
    setIsLoading(true);
    try {
      const [presupuestoResult, clientesResult] = await Promise.all([
        getPresupuestoCompleto(presupuestoId),
        getClientes(),
      ]);

      if (presupuestoResult.success) {
        setPresupuesto(presupuestoResult.data);
      } else {
        setError(presupuestoResult.error);
      }

      if (clientesResult.success) {
        setClientes(clientesResult.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [presupuestoId]);

  useEffect(() => {
    loadPresupuesto();
  }, [loadPresupuesto]);

  const startEditing = () => {
    if (!presupuesto) return;

    // Don't allow editing if aceptado or rechazado
    if (
      presupuesto.estado === "aceptado" ||
      presupuesto.estado === "rechazado"
    ) {
      showToast("No se puede editar un presupuesto aceptado o rechazado");
      return;
    }

    setEditClienteId(presupuesto.cliente_id);
    setEditFecha(presupuesto.fecha);
    setEditFechaValidez(presupuesto.fecha_validez);
    setEditNotas(presupuesto.notas || "");
    setEditLineas(
      presupuesto.lineas_presupuesto.map((l) => ({
        id: l.id,
        concepto: l.concepto,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
      })),
    );
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleAddLinea = () => {
    setEditLineas([
      ...editLineas,
      { id: generateId(), concepto: "", cantidad: 1, precio_unitario: 0 },
    ]);
  };

  const handleRemoveLinea = (id: string) => {
    if (editLineas.length === 1) return;
    setEditLineas(editLineas.filter((l) => l.id !== id));
  };

  const handleLineaChange = (
    id: string,
    field: keyof LineaForm,
    value: string | number,
  ) => {
    setEditLineas(
      editLineas.map((l) => {
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

  const editSubtotal = editLineas.reduce(
    (sum, linea) => sum + calculateLineaTotal(linea),
    0,
  );
  const editIva = editSubtotal * (IVA_PERCENTAGE / 100);
  const editTotal = editSubtotal + editIva;

  const handleSave = async () => {
    if (!editClienteId) {
      setError("Debes seleccionar un cliente");
      return;
    }

    const validLineas = editLineas.filter(
      (l) => l.concepto.trim() && l.cantidad > 0 && l.precio_unitario > 0,
    );

    if (validLineas.length === 0) {
      setError("Debes añadir al menos una línea válida");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await updatePresupuesto(presupuestoId, {
        cliente_id: editClienteId,
        fecha: editFecha,
        fecha_validez: editFechaValidez,
        notas: editNotas || undefined,
        lineas: validLineas.map((l) => ({
          concepto: l.concepto,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
      });

      if (result.success) {
        setIsEditing(false);
        loadPresupuesto();
        showToast("Presupuesto actualizado correctamente");
      } else {
        setError(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEstadoChange = async (estado: EstadoPresupuesto) => {
    setIsSaving(true);
    try {
      const result = await updateEstadoPresupuesto(presupuestoId, estado);
      if (result.success) {
        loadPresupuesto();
        showToast(`Estado actualizado a "${estadoPresupuestoLabels[estado]}"`);
      } else {
        showToast(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertToFactura = async () => {
    if (!confirm("¿Convertir este presupuesto a factura?")) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await convertPresupuestoToFactura(presupuestoId);
      if (result.success) {
        showToast("Presupuesto convertido a factura");
        router.push(`/facturas/${result.data.id}`);
      } else {
        showToast(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setIsSaving(true);
    try {
      const result = await duplicatePresupuesto(presupuestoId);
      if (result.success) {
        showToast("Presupuesto duplicado");
        router.push(`/presupuestos/${result.data.id}`);
      } else {
        showToast(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!presupuesto) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Presupuesto no encontrado</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/presupuestos")}
        >
          Volver a presupuestos
        </Button>
      </div>
    );
  }

  const isExpired = isPresupuestoExpired(presupuesto.fecha_validez);
  const canEdit =
    presupuesto.estado !== "aceptado" && presupuesto.estado !== "rechazado";
  const canConvert =
    presupuesto.estado === "pendiente" || presupuesto.estado === "expirado";

  return (
    <div className="space-y-6">
      {/* Header - Hide on print */}
      <div className="print:hidden flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/presupuestos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Presupuesto {presupuesto.numero}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  estadoPresupuestoBadgeStyles[presupuesto.estado]
                }`}
                style={{
                  backgroundColor:
                    estadoPresupuestoBadgeColors[presupuesto.estado],
                }}
              >
                {estadoPresupuestoLabels[presupuesto.estado]}
              </span>
              {isExpired && presupuesto.estado === "pendiente" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <AlertTriangle className="h-3 w-3" />
                  Expirado
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <PresupuestoActions
                presupuesto={presupuesto}
                onSuccess={loadPresupuesto}
              />
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              {canEdit && (
                <Button variant="outline" onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              {canConvert && (
                <Button onClick={handleConvertToFactura} disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <FileText className="h-4 w-4 mr-2" />
                  Convertir a Factura
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDuplicate}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
              {presupuesto.estado === "pendiente" && (
                <Select
                  value={presupuesto.estado}
                  onValueChange={(v) =>
                    handleEstadoChange(v as EstadoPresupuesto)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="aceptado">Aceptado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                    <SelectItem value="expirado">Expirado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error message - Hide on print */}
      {error && (
        <div className="print:hidden rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Link to Factura if accepted */}
      {presupuesto.estado === "aceptado" && presupuesto.factura_id && (
        <div className="print:hidden rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-green-800">
                Presupuesto Aceptado
              </h3>
              <p className="text-sm text-green-700">
                Este presupuesto ha sido convertido a factura
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/facturas/${presupuesto.factura_id}`)}
            >
              Ver Factura
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Presupuesto Preview / Edit Form */}
      {isEditing ? (
        // Edit Form
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Información básica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={editClienteId} onValueChange={setEditClienteId}>
                  <SelectTrigger id="cliente">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha presupuesto *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaValidez">Fecha validez *</Label>
                <Input
                  id="fechaValidez"
                  type="date"
                  value={editFechaValidez}
                  onChange={(e) => setEditFechaValidez(e.target.value)}
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
              {editLineas.map((linea) => (
                <div
                  key={linea.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-2 bg-neutral-50 rounded-lg"
                >
                  <div className="md:col-span-5 space-y-1">
                    <Label className="md:hidden text-xs text-neutral-500">
                      Concepto
                    </Label>
                    <Textarea
                      placeholder="Descripción del servicio..."
                      value={linea.concepto}
                      onChange={(e) => {
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                        handleLineaChange(linea.id, "concepto", e.target.value);
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = "auto";
                          el.style.height = el.scrollHeight + "px";
                        }
                      }}
                      rows={1}
                      className="resize-none overflow-hidden min-h-[38px]"
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
                      disabled={editLineas.length === 1}
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
                  <span className="font-medium">
                    {formatCurrency(editSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-neutral-50 rounded">
                  <span className="text-neutral-600">
                    IVA ({IVA_PERCENTAGE}%)
                  </span>
                  <span className="font-medium">{formatCurrency(editIva)}</span>
                </div>
                <div className="flex justify-between px-3 py-3 bg-neutral-900 text-white rounded">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(editTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Notas
            </h2>
            <Textarea
              placeholder="Notas adicionales para el presupuesto..."
              value={editNotas}
              onChange={(e) => setEditNotas(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      ) : (
        // Preview Mode - styled HTML presupuesto (A4 size: 210mm x 297mm)
        <div
          className="mx-auto bg-white rounded-lg border border-neutral-200 shadow-lg print:border-none print:shadow-none p-8 print:p-0 flex flex-col"
          style={{ width: "210mm", minHeight: "297mm" }}
        >
          {/* Presupuesto Header */}
          <div className="flex justify-between items-start mb-8">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-32 h-32 object-contain"
            />
            <div className="text-right">
              <h2 className="text-lg font-bold text-neutral-900">
                {DATOS_EMPRESA.nombre}
              </h2>
              <p className="text-sm text-neutral-600">
                {DATOS_EMPRESA.direccion}
              </p>
              <p className="text-sm text-neutral-600">
                NIF: {DATOS_EMPRESA.nif}
              </p>
              <p className="text-sm text-neutral-600">
                Tel: {DATOS_EMPRESA.telefono}
              </p>
              <p className="text-sm text-neutral-600">{DATOS_EMPRESA.email}</p>
            </div>
          </div>

          {/* Presupuesto Title */}
          <h1 className="text-3xl font-bold text-center text-neutral-900 mb-8">
            PRESUPUESTO
          </h1>

          {/* Client and Presupuesto Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-neutral-50 p-4 rounded-lg">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                Cliente
              </h3>
              <p className="font-semibold text-neutral-900">
                {presupuesto.cliente.nombre}
              </p>
              {presupuesto.cliente.direccion && (
                <p className="text-sm text-neutral-600">
                  {presupuesto.cliente.direccion}
                </p>
              )}
              {presupuesto.cliente.nif && (
                <p className="text-sm text-neutral-600">
                  NIF: {presupuesto.cliente.nif}
                </p>
              )}
              {presupuesto.cliente.email && (
                <p className="text-sm text-neutral-600">
                  {presupuesto.cliente.email}
                </p>
              )}
              {presupuesto.cliente.telefono && (
                <p className="text-sm text-neutral-600">
                  Tel: {presupuesto.cliente.telefono}
                </p>
              )}
            </div>
            <div className="border-l-2 border-neutral-900 pl-4">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                Detalles Presupuesto
              </h3>
              <p className="text-lg font-bold text-neutral-900">
                N.º {presupuesto.numero}
              </p>
              <p className="text-sm text-neutral-600 mt-2">
                <span className="text-neutral-500">Fecha: </span>
                {formatDate(presupuesto.fecha)}
              </p>
              <p className="text-sm text-neutral-600">
                <span className="text-neutral-500">Validez: </span>
                {formatDate(presupuesto.fecha_validez)}
                {isExpired && (
                  <span className="ml-2 text-amber-600 font-medium">
                    (Expirado)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Lines Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-900 text-white">
                  <th className="text-left py-3 px-4 text-sm font-semibold rounded-tl">
                    Concepto
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">
                    Cantidad
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">
                    Precio
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold rounded-tr">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.lineas_presupuesto.map((linea, index) => (
                  <tr
                    key={linea.id}
                    className={index % 2 === 1 ? "bg-neutral-50" : "bg-white"}
                  >
                    <td className="py-3 px-4 text-sm text-neutral-900">
                      {linea.concepto}
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-900 text-center">
                      {linea.cantidad}
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-900 text-right">
                      {formatCurrency(linea.precio_unitario)}
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-900 text-right font-medium">
                      {formatCurrency(linea.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72">
              <div className="flex justify-between py-2 border-b border-neutral-200">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(presupuesto.subtotal)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-200">
                <span className="text-neutral-600">IVA (21%)</span>
                <span className="font-medium">
                  {formatCurrency(presupuesto.iva)}
                </span>
              </div>
              <div className="flex justify-between py-3 bg-neutral-900 text-white rounded mt-2 px-3">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  {formatCurrency(presupuesto.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes and Payment - Al final de la página */}
          <div className="space-y-4 mt-auto">
            {/* {factura.notas && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <h3 className="text-sm font-semibold text-amber-800 mb-1">
                  Notas
                </h3>
                <p className="text-sm text-amber-900">{factura.notas}</p>
              </div>
            )} */}
            <div className="bg-gray-50 border-l-4 border-gray-500 p-2 rounded flex flex-col gap-2 text-xs text-gray-700">
              <p>
                Responsable: Manuel Rodriguez Gomez - NIF: 33861402C -
                Dir.Postal: Rua da Fraga, 1 Bjo. 27003 Lugo
              </p>
              <p>
                En nombre de la empresa tratamos la información que nos facilita
                con el fin de prestarles el servicio solicitado, realizar la
                facturación del mismo. Los datos proporcionados se conservarán
                mientras se mantenga la relación comercial o durante los años
                necesarios para cumplir con las obligaciones legales. Los datos
                no se cederán a terceros salvo en los casos en que exista una
                obligación legal. Usted tiene derecho a obtener confirmación
                sobre si en Manuel Rodríguez Gómez estamos tratando sus datos
                personales por tanto tiene derecho a acceder a sus datos
                personales, rectificar los datos inexactos o solicitar su
                supresión cuando los datos ya no sean necesarios.
              </p>
              <p>Transferencia bancaria a: {DATOS_EMPRESA.iban}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 print:hidden">
          {toast}
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
