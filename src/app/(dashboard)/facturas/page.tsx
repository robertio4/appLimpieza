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
  getFacturas,
  getFacturasByFilters,
  deleteFactura,
  updateEstadoFactura,
  getClientes,
  getFacturaCompleta,
} from "@/lib/actions/facturas";
import { pdf } from "@react-pdf/renderer";
import { FacturaPDF } from "@/components/facturas/FacturaPDF";
import { formatCurrency, formatDate, estadoBadgeStyles, estadoLabels } from "@/lib/utils";
import { DATOS_EMPRESA } from "@/lib/constants";
import type {
  FacturaConCliente,
  Cliente,
  EstadoFactura,
} from "@/types/database";
import {
  Plus,
  Filter,
  X,
  MoreHorizontal,
  Eye,
  Download,
  Mail,
  CheckCircle,
  Trash2,
  Loader2,
} from "lucide-react";

export default function FacturasPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<FacturaConCliente[]>([]);
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

  const loadFacturas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const hasFilters =
        filterStartDate || filterEndDate || filterEstado || filterCliente;

      let result;
      if (hasFilters) {
        result = await getFacturasByFilters(
          filterStartDate || undefined,
          filterEndDate || undefined,
          filterEstado ? (filterEstado as EstadoFactura) : undefined,
          filterCliente || undefined
        );
        setIsFiltered(true);
      } else {
        result = await getFacturas();
        setIsFiltered(false);
      }

      if (result.success) {
        setFacturas(result.data);
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
    loadFacturas();
  }, [loadFacturas]);

  const handleNewFactura = () => {
    router.push("/facturas/nueva");
  };

  const handleViewFactura = (id: string) => {
    router.push(`/facturas/${id}`);
  };

  const handleDownloadPDF = async (facturaId: string) => {
    setLoadingAction(facturaId);
    try {
      const result = await getFacturaCompleta(facturaId);
      if (!result.success) {
        showToast("Error al obtener la factura");
        return;
      }

      const factura = result.data;
      const blob = await pdf(<FacturaPDF factura={factura} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Factura-${factura.numero}.pdf`;
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

  const handleSendEmail = async (facturaId: string) => {
    setLoadingAction(facturaId);
    try {
      const result = await getFacturaCompleta(facturaId);
      if (!result.success) {
        showToast("Error al obtener la factura");
        return;
      }

      const factura = result.data;

      // Download PDF first
      const blob = await pdf(<FacturaPDF factura={factura} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Factura-${factura.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Open Gmail
      const clienteEmail = factura.cliente.email || "";
      const subject = encodeURIComponent(
        `Factura ${factura.numero} - ${DATOS_EMPRESA.nombre}`
      );
      const body = encodeURIComponent(
        `Estimado/a ${factura.cliente.nombre},\n\n` +
          `Adjunto le enviamos la factura ${factura.numero} correspondiente a nuestros servicios.\n\n` +
          `Importe total: ${formatCurrency(factura.total)}\n\n` +
          `Por favor, realice el pago mediante transferencia a:\n` +
          `${DATOS_EMPRESA.iban}\n\n` +
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

  const handleMarkAsPaid = async (facturaId: string) => {
    setLoadingAction(facturaId);
    try {
      const result = await updateEstadoFactura(facturaId, "pagada");
      if (result.success) {
        loadFacturas();
        showToast("Factura marcada como pagada");
      } else {
        showToast(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteFactura = async (facturaId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta factura?")) {
      return;
    }

    setLoadingAction(facturaId);
    try {
      const result = await deleteFactura(facturaId);
      if (result.success) {
        loadFacturas();
        showToast("Factura eliminada");
      } else {
        showToast(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApplyFilters = () => {
    loadFacturas();
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
          <h1 className="text-2xl font-bold text-neutral-900">Facturas</h1>
          <p className="text-neutral-600">Gestiona tus facturas</p>
        </div>
        <Button onClick={handleNewFactura}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
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
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="enviada">Enviada</SelectItem>
                <SelectItem value="pagada">Pagada</SelectItem>
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

      {/* Facturas table */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-500">Cargando...</div>
        ) : facturas.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            {isFiltered
              ? "No hay facturas que coincidan con los filtros"
              : "No hay facturas registradas"}
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
                {facturas.map((factura) => (
                  <tr
                    key={factura.id}
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                      {factura.numero}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900">
                      {factura.cliente.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {formatDate(factura.fecha)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900 text-right font-medium">
                      {formatCurrency(factura.total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          estadoBadgeStyles[factura.estado]
                        }`}
                      >
                        {estadoLabels[factura.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={loadingAction === factura.id}
                          >
                            {loadingAction === factura.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewFactura(factura.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver / Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(factura.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSendEmail(factura.id)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Enviar por Gmail
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {factura.estado !== "pagada" && (
                            <DropdownMenuItem
                              onClick={() => handleMarkAsPaid(factura.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar como pagada
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteFactura(factura.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
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
