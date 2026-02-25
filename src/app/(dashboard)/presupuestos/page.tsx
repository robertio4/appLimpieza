"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getPresupuestos,
  getPresupuestosByFilters,
  deletePresupuesto,
  updateEstadoPresupuesto,
  getClientes,
  getPresupuestoCompleto,
  convertPresupuestoToFactura,
  duplicatePresupuesto,
} from "@/lib/actions/presupuestos";
import { pdf } from "@react-pdf/renderer";
import { PresupuestoPDF } from "@/components/presupuestos/PresupuestoPDF";
import { formatCurrency, formatDate, estadoPresupuestoBadgeStyles, estadoPresupuestoBadgeColors, estadoPresupuestoLabels, isPresupuestoExpired } from "@/lib/utils";
import { DATOS_EMPRESA } from "@/lib/constants";
import type {
  PresupuestoConCliente,
  Cliente,
  EstadoPresupuesto,
} from "@/types/database";
import {
  Plus,
  Filter,
  X,
  MoreHorizontal,
  Eye,
  Download,
  Mail,
  XCircle,
  Trash2,
  Loader2,
  FileText,
  Copy,
  AlertTriangle,
  Clock,
  CircleCheck,
  Ban,
  CalendarX,
} from "lucide-react";

export default function PresupuestosPage() {
  const router = useRouter();
  const [presupuestos, setPresupuestos] = useState<PresupuestoConCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [isFiltered, setIsFiltered] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  };

  const loadClientes = useCallback(async () => {
    const result = await getClientes();
    if (result.success) {
      setClientes(result.data);
    }
  }, []);

  const loadPresupuestos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const hasFilters =
        filterStartDate || filterEndDate || filterEstado || filterCliente;

      let result;
      if (hasFilters) {
        result = await getPresupuestosByFilters(
          filterStartDate || undefined,
          filterEndDate || undefined,
          filterEstado ? (filterEstado as EstadoPresupuesto) : undefined,
          filterCliente || undefined
        );
        setIsFiltered(true);
      } else {
        result = await getPresupuestos();
        setIsFiltered(false);
      }

      if (result.success) {
        setPresupuestos(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterEstado, filterCliente]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  useEffect(() => {
    loadPresupuestos();
  }, [loadPresupuestos]);

  const handleNewPresupuesto = () => {
    router.push("/presupuestos/nueva");
  };

  const handleViewPresupuesto = (id: string) => {
    router.push(`/presupuestos/${id}`);
  };

  const handleDownloadPDF = async (presupuestoId: string) => {
    setLoadingAction(presupuestoId);
    try {
      const result = await getPresupuestoCompleto(presupuestoId);
      if (!result.success) {
        showToast("Error al obtener el presupuesto");
        return;
      }

      const presupuesto = result.data;
      const blob = await pdf(<PresupuestoPDF presupuesto={presupuesto} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Presupuesto-${presupuesto.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Error al generar el PDF");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendEmail = async (presupuestoId: string) => {
    setLoadingAction(presupuestoId);
    try {
      const result = await getPresupuestoCompleto(presupuestoId);
      if (!result.success) {
        showToast("Error al obtener el presupuesto");
        return;
      }

      const presupuesto = result.data;

      // Download PDF first
      const blob = await pdf(<PresupuestoPDF presupuesto={presupuesto} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Presupuesto-${presupuesto.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Open Gmail
      const clienteEmail = presupuesto.cliente.email || "";
      const subject = encodeURIComponent(
        `Presupuesto ${presupuesto.numero} - ${DATOS_EMPRESA.nombre}`
      );
      const body = encodeURIComponent(
        `Estimado/a ${presupuesto.cliente.nombre},\n\n` +
          `Adjunto le enviamos el presupuesto ${presupuesto.numero} para los servicios solicitados.\n\n` +
          `Importe total: ${formatCurrency(presupuesto.total)}\n\n` +
          `Este presupuesto tiene validez hasta el ${formatDate(presupuesto.fecha_validez)}.\n\n` +
          `Quedamos a su disposición para cualquier consulta.\n\n` +
          `Atentamente,\n${DATOS_EMPRESA.nombre}`
      );

      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${clienteEmail}&su=${subject}&body=${body}`,
        "_blank"
      );

      showToast("PDF descargado. Por favor, adjunta el archivo en Gmail.");
    } catch (error) {
      console.error("Error sending email:", error);
      showToast("Error al preparar el correo");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConvertToFactura = async (presupuestoId: string) => {
    if (!confirm("¿Convertir este presupuesto a factura?")) {
      return;
    }

    setLoadingAction(presupuestoId);
    try {
      const result = await convertPresupuestoToFactura(presupuestoId);
      if (result.success) {
        showToast("Presupuesto convertido a factura");
        router.push(`/facturas/${result.data.id}`);
      } else {
        showToast(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDuplicate = async (presupuestoId: string) => {
    setLoadingAction(presupuestoId);
    try {
      const result = await duplicatePresupuesto(presupuestoId);
      if (result.success) {
        loadPresupuestos();
        showToast("Presupuesto duplicado");
        router.push(`/presupuestos/${result.data.id}`);
      } else {
        showToast(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMarkAsRechazado = async (presupuestoId: string) => {
    setLoadingAction(presupuestoId);
    try {
      const result = await updateEstadoPresupuesto(presupuestoId, "rechazado");
      if (result.success) {
        loadPresupuestos();
        showToast("Presupuesto marcado como rechazado");
      } else {
        showToast(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMarkAsExpirado = async (presupuestoId: string) => {
    setLoadingAction(presupuestoId);
    try {
      const result = await updateEstadoPresupuesto(presupuestoId, "expirado");
      if (result.success) {
        loadPresupuestos();
        showToast("Presupuesto marcado como expirado");
      } else {
        showToast(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeletePresupuesto = async (presupuestoId: string) => {
    if (!confirm("¿Estás seguro de eliminar este presupuesto?")) {
      return;
    }

    setLoadingAction(presupuestoId);
    try {
      const result = await deletePresupuesto(presupuestoId);
      if (result.success) {
        loadPresupuestos();
        showToast("Presupuesto eliminado");
      } else {
        showToast(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApplyFilters = () => {
    loadPresupuestos();
  };

  const handleClearFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterEstado("");
    setFilterCliente("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Presupuestos</h1>
          <p className="text-neutral-600">Gestiona tus presupuestos</p>
        </div>
        <Button onClick={handleNewPresupuesto}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-neutral-500" />
          <span className="font-medium text-neutral-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="filter-start">Fecha inicio</Label>
            <Input
              id="filter-start"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-end">Fecha fin</Label>
            <Input
              id="filter-end"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-estado">Estado</Label>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger id="filter-estado">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aceptado">Aceptado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-cliente">Cliente</Label>
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger id="filter-cliente">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilters} className="flex-1">
              Aplicar
            </Button>
            {isFiltered && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Presupuestos table */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-500">Cargando...</div>
        ) : presupuestos.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            {isFiltered
              ? "No hay presupuestos que coincidan con los filtros"
              : "No hay presupuestos registrados"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                    Número
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                    Validez
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">
                    Total
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-neutral-600">
                    Estado
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {presupuestos.map((presupuesto) => {
                  const isExpired = isPresupuestoExpired(presupuesto.fecha_validez);
                  return (
                    <tr
                      key={presupuesto.id}
                      onClick={() => handleViewPresupuesto(presupuesto.id)}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        {presupuesto.numero}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {presupuesto.cliente.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {formatDate(presupuesto.fecha)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        <div className="flex items-center gap-2">
                          {formatDate(presupuesto.fecha_validez)}
                          {isExpired && presupuesto.estado === "pendiente" && (
                            <span title="Expirado">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 text-right font-medium">
                        {formatCurrency(presupuesto.total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            estadoPresupuestoBadgeStyles[presupuesto.estado]
                          }`}
                          style={{ backgroundColor: estadoPresupuestoBadgeColors[presupuesto.estado] }}
                        >
                          {presupuesto.estado === "pendiente" && <Clock className="h-3.5 w-3.5" />}
                          {presupuesto.estado === "aceptado" && <CircleCheck className="h-3.5 w-3.5" />}
                          {presupuesto.estado === "rechazado" && <Ban className="h-3.5 w-3.5" />}
                          {presupuesto.estado === "expirado" && <CalendarX className="h-3.5 w-3.5" />}
                          {estadoPresupuestoLabels[presupuesto.estado]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={loadingAction === presupuesto.id}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {loadingAction === presupuesto.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewPresupuesto(presupuesto.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver / Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownloadPDF(presupuesto.id)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendEmail(presupuesto.id)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Enviar por Gmail
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(presupuesto.estado === "pendiente" || presupuesto.estado === "expirado") && (
                              <DropdownMenuItem
                                onClick={() => handleConvertToFactura(presupuesto.id)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Convertir a Factura
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(presupuesto.id)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {presupuesto.estado === "pendiente" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsRechazado(presupuesto.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Marcar como rechazado
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsExpirado(presupuesto.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Marcar como expirado
                                </DropdownMenuItem>
                              </>
                            )}
                            {presupuesto.estado !== "aceptado" && (
                              <DropdownMenuItem
                                onClick={() => handleDeletePresupuesto(presupuesto.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md animate-in fade-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </div>
  );
}
