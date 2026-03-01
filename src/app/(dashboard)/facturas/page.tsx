"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getFacturas,
  getFacturasByFilters,
  deleteFactura,
  updateEstadoFactura,
  getClientes,
  getFacturaCompleta,
} from "@/lib/actions/facturas";
import { generateRecurringInvoices } from "@/lib/actions/clientes";
import { pdf } from "@react-pdf/renderer";
import { FacturaPDF } from "@/components/facturas/FacturaPDF";
import {
  formatCurrency,
  formatDate,
  estadoBadgeStyles,
  estadoBadgeColors,
  estadoLabels,
} from "@/lib/utils";
import { DATOS_EMPRESA, MONTH_NAMES, QUARTER_NAMES } from "@/lib/constants";
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
  FileEdit,
  Send,
  CircleCheck,
  CalendarClock,
  AlertTriangle,
  XCircle,
} from "lucide-react";

export default function FacturasPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<FacturaConCliente[]>([]);
  const [allFacturas, setAllFacturas] = useState<FacturaConCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Recurring invoices
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    generated: Array<{
      cliente_nombre: string;
      factura_numero: string;
      factura_id: string;
    }>;
    skipped: Array<{ cliente_nombre: string; reason: string }>;
    errors: Array<{ cliente_nombre: string; error: string }>;
  } | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // Period download
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year">(
    "month",
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString(),
  );
  const [selectedQuarter, setSelectedQuarter] = useState("1");
  const [downloadSelectedClientes, setDownloadSelectedClientes] = useState<
    string[]
  >([]);
  const [isDownloadingPeriod, setIsDownloadingPeriod] = useState(false);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterCliente, setFilterCliente] = useState("");

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

  const loadAllFacturas = useCallback(async () => {
    const result = await getFacturas();
    if (result.success) {
      setAllFacturas(result.data);
    }
  }, []);

  // Compute available years and months from all facturas (only periods with actual invoices)
  // Parse fecha as 'YYYY-MM-DD' string to avoid timezone-related date shifts
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allFacturas.forEach((f) => {
      const year = parseInt(f.fecha.slice(0, 4), 10);
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allFacturas]);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    const year = parseInt(selectedYear);
    allFacturas.forEach((f) => {
      const fechaYear = parseInt(f.fecha.slice(0, 4), 10);
      const fechaMonth = parseInt(f.fecha.slice(5, 7), 10);
      if (fechaYear === year) {
        months.add(fechaMonth);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [allFacturas, selectedYear]);

  const availableQuarters = useMemo(() => {
    const quarters = new Set<number>();
    const year = parseInt(selectedYear);
    allFacturas.forEach((f) => {
      const fechaYear = parseInt(f.fecha.slice(0, 4), 10);
      const fechaMonth = parseInt(f.fecha.slice(5, 7), 10);
      if (fechaYear === year) {
        const quarter = Math.ceil(fechaMonth / 3);
        quarters.add(quarter);
      }
    });
    return Array.from(quarters).sort((a, b) => a - b);
  }, [allFacturas, selectedYear]);

  const loadFacturas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const hasFilters =
        !!filterStartDate ||
        !!filterEndDate ||
        (!!filterEstado && filterEstado !== "all") ||
        (!!filterCliente && filterCliente !== "all");

      let result;
      if (hasFilters) {
        result = await getFacturasByFilters(
          filterStartDate || undefined,
          filterEndDate || undefined,
          filterEstado && filterEstado !== "all"
            ? (filterEstado as EstadoFactura)
            : undefined,
          filterCliente && filterCliente !== "all" ? filterCliente : undefined,
        );
      } else {
        result = await getFacturas();
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
    loadAllFacturas();
  }, [loadClientes, loadAllFacturas]);

  // Reset month/quarter when year changes and selection is not available
  useEffect(() => {
    if (
      availableMonths.length > 0 &&
      !availableMonths.includes(parseInt(selectedMonth))
    ) {
      setSelectedMonth(availableMonths[availableMonths.length - 1].toString());
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    if (
      availableQuarters.length > 0 &&
      !availableQuarters.includes(parseInt(selectedQuarter))
    ) {
      setSelectedQuarter(
        availableQuarters[availableQuarters.length - 1].toString(),
      );
    }
  }, [availableQuarters, selectedQuarter]);

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
        `Factura ${factura.numero} - ${DATOS_EMPRESA.nombre}`,
      );
      const body = encodeURIComponent(
        `Estimado/a ${factura.cliente.nombre},\n\n` +
          `Adjunto le enviamos la factura ${factura.numero} correspondiente a nuestros servicios.\n\n` +
          `Importe total: ${formatCurrency(factura.total)}\n\n` +
          /*           `Por favor, realice el pago mediante transferencia a:\n` +
          `${DATOS_EMPRESA.iban}\n\n` + */
          `Atentamente,\n${DATOS_EMPRESA.nombre}`,
      );

      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${clienteEmail}&su=${subject}&body=${body}`,
        "_blank",
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

  const handleClearFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterEstado("");
    setFilterCliente("");
  };

  const hasActiveFilters =
    filterStartDate ||
    filterEndDate ||
    (filterEstado && filterEstado !== "all") ||
    (filterCliente && filterCliente !== "all");

  const handleGenerateRecurring = async () => {
    setIsGenerating(true);
    try {
      const result = await generateRecurringInvoices();
      if (result.success) {
        setGenerationResult(result.data);
        setShowResultDialog(true);
        loadFacturas(); // Recargar lista
      } else {
        showToast(result.error);
      }
    } catch (error) {
      console.error("Error generating recurring invoices:", error);
      showToast("Error al generar facturas recurrentes");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPeriod = async () => {
    setIsDownloadingPeriod(true);
    try {
      // Calculate date range based on period type
      let startDate: string;
      let endDate: string;
      const year = parseInt(selectedYear);

      if (periodType === "month") {
        const month = parseInt(selectedMonth);
        startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
      } else if (periodType === "quarter") {
        const quarter = parseInt(selectedQuarter);
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
        const lastDay = new Date(year, endMonth, 0).getDate();
        endDate = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
      } else {
        // year
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }

      // Get facturas for the period
      const result = await getFacturasByFilters(
        startDate,
        endDate,
        undefined,
        undefined,
        downloadSelectedClientes.length > 0
          ? downloadSelectedClientes
          : undefined,
      );
      if (!result.success || result.data.length === 0) {
        showToast("No hay facturas en el período seleccionado");
        setIsDownloadingPeriod(false);
        return;
      }

      const facturasToDownload = result.data;
      const zip = new JSZip();

      // Generate PDFs for all invoices in the period with bounded concurrency
      const CONCURRENCY_LIMIT = 3;
      let addedCount = 0;

      for (let i = 0; i < facturasToDownload.length; i += CONCURRENCY_LIMIT) {
        const batch = facturasToDownload.slice(i, i + CONCURRENCY_LIMIT);

        const batchResults = await Promise.all(
          batch.map(async (factura) => {
            try {
              const facturaCompleta = await getFacturaCompleta(factura.id);
              if (!facturaCompleta.success) {
                console.error(`Error al obtener factura ${factura.id}`);
                return null;
              }

              const pdfBlob = await pdf(
                <FacturaPDF factura={facturaCompleta.data} />,
              ).toBlob();

              return {
                filename: `Factura-${facturaCompleta.data.numero}.pdf`,
                blob: pdfBlob,
              };
            } catch (error) {
              console.error(
                `Error generando PDF para factura ${factura.id}:`,
                error,
              );
              return null;
            }
          }),
        );

        for (const resultItem of batchResults) {
          if (resultItem) {
            zip.file(resultItem.filename, resultItem.blob);
            addedCount++;
          }
        }
      }

      // Generate and download ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename based on period
      let filename: string;
      if (periodType === "month") {
        filename = `Facturas-${MONTH_NAMES[parseInt(selectedMonth) - 1]}-${selectedYear}.zip`;
      } else if (periodType === "quarter") {
        filename = `Facturas-${QUARTER_NAMES[parseInt(selectedQuarter) - 1]}-${selectedYear}.zip`;
      } else {
        filename = `Facturas-${selectedYear}.zip`;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`${addedCount} facturas descargadas correctamente`);
      setShowPeriodDialog(false);
      setDownloadSelectedClientes([]);
    } catch (error) {
      console.error("Error generando ZIP:", error);
      showToast("Error al generar el archivo ZIP");
    } finally {
      setIsDownloadingPeriod(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Facturas</h1>
          <p className="text-neutral-600">Gestiona tus facturas</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setDownloadSelectedClientes(clientes.map((c) => c.id));
              setShowPeriodDialog(true);
            }}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDFs
          </Button>
          <Button onClick={handleNewFactura}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Factura
          </Button>
          <Button
            onClick={handleGenerateRecurring}
            variant="outline"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <CalendarClock className="h-4 w-4 mr-2" />
                Generar Recurrentes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-500" />
            <span className="font-medium text-neutral-700">Filtros</span>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            {hasActiveFilters
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
                    onClick={() => handleViewFactura(factura.id)}
                    className="hover:bg-neutral-50 transition-colors cursor-pointer"
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          estadoBadgeStyles[factura.estado]
                        }`}
                        style={{
                          backgroundColor: estadoBadgeColors[factura.estado],
                        }}
                      >
                        {factura.estado === "borrador" && (
                          <FileEdit className="h-3.5 w-3.5" />
                        )}
                        {factura.estado === "enviada" && (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        {factura.estado === "pagada" && (
                          <CircleCheck className="h-3.5 w-3.5" />
                        )}
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
                            onClick={(e) => e.stopPropagation()}
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

      {/* Dialog de Resultados de Generación */}
      {showResultDialog && generationResult && (
        <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Facturas Recurrentes Generadas</DialogTitle>
              <DialogDescription>
                Resumen de la generación de facturas para este mes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Sección: Generadas con éxito */}
              {generationResult.generated.length > 0 && (
                <div>
                  <h3 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Generadas ({generationResult.generated.length})
                  </h3>
                  <ul className="space-y-1">
                    {generationResult.generated.map((item) => (
                      <li key={item.factura_id} className="text-sm">
                        • {item.cliente_nombre} -{" "}
                        <Link
                          href={`/facturas/${item.factura_id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {item.factura_numero}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sección: Omitidas */}
              {generationResult.skipped.length > 0 && (
                <div>
                  <h3 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Omitidas ({generationResult.skipped.length})
                  </h3>
                  <ul className="space-y-1">
                    {generationResult.skipped.map((item, idx) => (
                      <li key={idx} className="text-sm text-neutral-600">
                        • {item.cliente_nombre}: {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sección: Errores */}
              {generationResult.errors.length > 0 && (
                <div>
                  <h3 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Errores ({generationResult.errors.length})
                  </h3>
                  <ul className="space-y-1">
                    {generationResult.errors.map((item, idx) => (
                      <li key={idx} className="text-sm text-red-600">
                        • {item.cliente_nombre}: {item.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowResultDialog(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Descarga por Período */}
      <Dialog open={showPeriodDialog} onOpenChange={setShowPeriodDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Descargar Facturas</DialogTitle>
            <DialogDescription>
              Selecciona el período y los clientes para descargar todas las
              facturas en un archivo ZIP. Cada factura se descargará como un PDF
              individual dentro del ZIP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="period-type">Tipo de período</Label>
              <Select
                value={periodType}
                onValueChange={(value) =>
                  setPeriodType(value as "month" | "quarter" | "year")
                }
              >
                <SelectTrigger id="period-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="year">Año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === "month" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Mes</Label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger id="month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {MONTH_NAMES[month - 1]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year-month">Año</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="year-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {periodType === "quarter" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quarter">Trimestre</Label>
                  <Select
                    value={selectedQuarter}
                    onValueChange={setSelectedQuarter}
                  >
                    <SelectTrigger id="quarter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuarters.map((quarter) => (
                        <SelectItem key={quarter} value={quarter.toString()}>
                          {QUARTER_NAMES[quarter - 1]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year-quarter">Año</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="year-quarter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {periodType === "year" && (
              <div className="space-y-2">
                <Label htmlFor="year">Año</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro de clientes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Clientes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={() => {
                    if (downloadSelectedClientes.length === clientes.length) {
                      setDownloadSelectedClientes([]);
                    } else {
                      setDownloadSelectedClientes(clientes.map((c) => c.id));
                    }
                  }}
                >
                  {downloadSelectedClientes.length === clientes.length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </Button>
              </div>
              <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-2">
                {clientes.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-2">
                    No hay clientes
                  </p>
                ) : (
                  clientes.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`download-cliente-${cliente.id}`}
                        checked={downloadSelectedClientes.includes(cliente.id)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setDownloadSelectedClientes((prev) => {
                              if (prev.includes(cliente.id)) return prev;
                              return [...prev, cliente.id];
                            });
                          } else if (checked === false) {
                            setDownloadSelectedClientes((prev) =>
                              prev.filter((id) => id !== cliente.id),
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`download-cliente-${cliente.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {cliente.nombre}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {downloadSelectedClientes.length === 0
                  ? "Ningún cliente seleccionado"
                  : downloadSelectedClientes.length === clientes.length
                    ? `Todos los clientes (${clientes.length})`
                    : `${downloadSelectedClientes.length} cliente${downloadSelectedClientes.length > 1 ? "s" : ""} seleccionado${downloadSelectedClientes.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPeriodDialog(false)}
              disabled={isDownloadingPeriod}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDownloadPeriod}
              disabled={isDownloadingPeriod || downloadSelectedClientes.length === 0}
            >
              {isDownloadingPeriod ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Descargando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md animate-in fade-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </div>
  );
}
