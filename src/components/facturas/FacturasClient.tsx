"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  getFacturaCompleta,
  getAvailableMonthsFacturas,
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

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function getInitialFilterYear(availableMonths: string[]): string {
  if (availableMonths.length === 0) return "all";
  return "all";
}

// --------------------------------------------------------------------------
// Props
// --------------------------------------------------------------------------

interface FacturasClientProps {
  initialFacturas: FacturaConCliente[];
  initialClientes: Cliente[];
  initialAvailableMonths: string[];
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export function FacturasClient({
  initialFacturas,
  initialClientes,
  initialAvailableMonths,
}: FacturasClientProps) {
  const router = useRouter();
  const [facturas, setFacturas] =
    useState<FacturaConCliente[]>(initialFacturas);
  const [allFacturas] = useState<FacturaConCliente[]>(initialFacturas);
  const [clientes] = useState<Cliente[]>(initialClientes);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [availableMonths, setAvailableMonths] = useState<string[]>(
    initialAvailableMonths,
  );
  const [filterYear, setFilterYear] = useState(() =>
    getInitialFilterYear(initialAvailableMonths),
  );
  const [filterPeriodType, setFilterPeriodType] = useState<
    "month" | "quarter" | "year"
  >("month");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterQuarter, setFilterQuarter] = useState("1");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const didSkipInitialFetch = useRef(false);

  // --------------------------------------------------------------------------
  // Derived state
  // --------------------------------------------------------------------------

  const availableYears = useMemo(
    () =>
      Array.from(new Set(availableMonths.map((ym) => ym.split("-")[0]))).sort(
        (a, b) => Number(b) - Number(a),
      ),
    [availableMonths],
  );

  const monthsForYear = useMemo(
    () =>
      availableMonths
        .filter((ym) => ym.startsWith(filterYear))
        .map((ym) => {
          const month = parseInt(ym.split("-")[1]);
          const date = new Date(parseInt(filterYear), month - 1);
          const monthName = new Intl.DateTimeFormat("es-ES", {
            month: "long",
          }).format(date);
          return {
            value: month.toString(),
            label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          };
        })
        .sort((a, b) => Number(a.value) - Number(b.value)),
    [availableMonths, filterYear],
  );

  const { filterStartDate, filterEndDate } = useMemo(() => {
    if (!filterYear || filterYear === "all") {
      return { filterStartDate: "", filterEndDate: "" };
    }
    const year = parseInt(filterYear);
    if (filterPeriodType === "year") {
      return {
        filterStartDate: `${year}-01-01`,
        filterEndDate: `${year}-12-31`,
      };
    } else if (filterPeriodType === "quarter") {
      const quarter = parseInt(filterQuarter);
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = startMonth + 2;
      const lastDay = new Date(year, endMonth, 0).getDate();
      return {
        filterStartDate: `${year}-${String(startMonth).padStart(2, "0")}-01`,
        filterEndDate: `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`,
      };
    } else {
      if (filterMonth === "all") {
        return {
          filterStartDate: `${year}-01-01`,
          filterEndDate: `${year}-12-31`,
        };
      } else {
        const month = parseInt(filterMonth);
        const lastDay = new Date(year, month, 0).getDate();
        return {
          filterStartDate: `${year}-${String(month).padStart(2, "0")}-01`,
          filterEndDate: `${year}-${String(month).padStart(2, "0")}-${lastDay}`,
        };
      }
    }
  }, [filterYear, filterPeriodType, filterMonth, filterQuarter]);

  // Download dialog computed values
  const downloadAvailableYears = useMemo(() => {
    const years = new Set<number>();
    allFacturas.forEach((f) => years.add(parseInt(f.fecha.slice(0, 4), 10)));
    return Array.from(years).sort((a, b) => b - a);
  }, [allFacturas]);

  const downloadAvailableMonths = useMemo(() => {
    const months = new Set<number>();
    const year = parseInt(selectedYear);
    allFacturas.forEach((f) => {
      if (parseInt(f.fecha.slice(0, 4), 10) === year) {
        months.add(parseInt(f.fecha.slice(5, 7), 10));
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [allFacturas, selectedYear]);

  const downloadAvailableQuarters = useMemo(() => {
    const quarters = new Set<number>();
    const year = parseInt(selectedYear);
    allFacturas.forEach((f) => {
      if (parseInt(f.fecha.slice(0, 4), 10) === year) {
        quarters.add(Math.ceil(parseInt(f.fecha.slice(5, 7), 10) / 3));
      }
    });
    return Array.from(quarters).sort((a, b) => a - b);
  }, [allFacturas, selectedYear]);

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  // Reset filterMonth when year changes
  useEffect(() => {
    setFilterMonth("all");
  }, [filterYear]);

  // Sync available months from server when component mounts (for filter dropdown accuracy)
  useEffect(() => {
    getAvailableMonthsFacturas().then((result) => {
      if (result.success) {
        setAvailableMonths(result.data);
      }
    });
  }, []);

  // Sync download selection when client list changes
  useEffect(() => {
    if (
      downloadAvailableMonths.length > 0 &&
      !downloadAvailableMonths.includes(parseInt(selectedMonth))
    ) {
      setSelectedMonth(
        downloadAvailableMonths[downloadAvailableMonths.length - 1].toString(),
      );
    }
  }, [downloadAvailableMonths, selectedMonth]);

  useEffect(() => {
    if (
      downloadAvailableQuarters.length > 0 &&
      !downloadAvailableQuarters.includes(parseInt(selectedQuarter))
    ) {
      setSelectedQuarter(
        downloadAvailableQuarters[
          downloadAvailableQuarters.length - 1
        ].toString(),
      );
    }
  }, [downloadAvailableQuarters, selectedQuarter]);

  // --------------------------------------------------------------------------
  // Data loading (filter-driven)
  // --------------------------------------------------------------------------

  const loadFacturas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const hasFilters =
        !!filterStartDate ||
        !!filterEndDate ||
        (!!filterEstado && filterEstado !== "all") ||
        (!!filterCliente && filterCliente !== "all");

      const result = hasFilters
        ? await getFacturasByFilters(
            filterStartDate || undefined,
            filterEndDate || undefined,
            filterEstado && filterEstado !== "all"
              ? (filterEstado as EstadoFactura)
              : undefined,
            filterCliente && filterCliente !== "all"
              ? filterCliente
              : undefined,
          )
        : await getFacturas();

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
    if (!didSkipInitialFetch.current) {
      didSkipInitialFetch.current = true;
      return;
    }
    loadFacturas();
  }, [loadFacturas]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleNewFactura = () => router.push("/facturas/nueva");

  const handleViewFactura = (id: string) => router.push(`/facturas/${id}`);

  const handleDownloadPDF = async (facturaId: string) => {
    setLoadingAction(facturaId);
    try {
      const result = await getFacturaCompleta(facturaId);
      if (!result.success) {
        toast.error("Error al obtener la factura");
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
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Error al generar el PDF");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendEmail = async (facturaId: string) => {
    setLoadingAction(facturaId);
    try {
      const result = await getFacturaCompleta(facturaId);
      if (!result.success) {
        toast.error("Error al obtener la factura");
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

      const clienteEmail = factura.cliente.email || "";
      const subject = encodeURIComponent(
        `Factura ${factura.numero} - ${DATOS_EMPRESA.nombre}`,
      );
      const body = encodeURIComponent(
        `Estimado/a ${factura.cliente.nombre},\n\n` +
          `Adjunto le enviamos la factura ${factura.numero} correspondiente a nuestros servicios.\n\n` +
          `Importe total: ${formatCurrency(factura.total)}\n\n` +
          `Atentamente,\n${DATOS_EMPRESA.nombre}`,
      );
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${clienteEmail}&su=${subject}&body=${body}`,
        "_blank",
      );
      toast.success("PDF descargado. Por favor, adjunta el archivo en Gmail.");
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("Error al preparar el correo");
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
        toast.success("Factura marcada como pagada");
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteFactura = async (facturaId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta factura?")) return;
    setLoadingAction(facturaId);
    try {
      const result = await deleteFactura(facturaId);
      if (result.success) {
        loadFacturas();
        toast.success("Factura eliminada");
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClearFilters = () => {
    setFilterYear("all");
    setFilterPeriodType("month");
    setFilterMonth("all");
    setFilterQuarter("1");
    setFilterEstado("");
    setFilterCliente("");
  };

  const hasActiveFilters =
    (filterYear && filterYear !== "all") ||
    (filterEstado && filterEstado !== "all") ||
    (filterCliente && filterCliente !== "all");

  const handleGenerateRecurring = async () => {
    setIsGenerating(true);
    try {
      const result = await generateRecurringInvoices();
      if (result.success) {
        setGenerationResult(result.data);
        setShowResultDialog(true);
        loadFacturas();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error("Error generating recurring invoices:", err);
      toast.error("Error al generar facturas recurrentes");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPeriod = async () => {
    setIsDownloadingPeriod(true);
    try {
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
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }

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
        toast.error("No hay facturas en el período seleccionado");
        setIsDownloadingPeriod(false);
        return;
      }

      const facturasToDownload = result.data;
      // Dynamic import — JSZip (~100KB) only loaded when actually downloading
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const CONCURRENCY_LIMIT = 3;
      let addedCount = 0;

      for (let i = 0; i < facturasToDownload.length; i += CONCURRENCY_LIMIT) {
        const batch = facturasToDownload.slice(i, i + CONCURRENCY_LIMIT);
        const batchResults = await Promise.all(
          batch.map(async (factura) => {
            try {
              const facturaCompleta = await getFacturaCompleta(factura.id);
              if (!facturaCompleta.success) return null;
              const pdfBlob = await pdf(
                <FacturaPDF factura={facturaCompleta.data} />,
              ).toBlob();
              return {
                filename: `Factura-${facturaCompleta.data.numero}.pdf`,
                blob: pdfBlob,
              };
            } catch {
              return null;
            }
          }),
        );
        for (const item of batchResults) {
          if (item) {
            zip.file(item.filename, item.blob);
            addedCount++;
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;

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

      toast.success(`${addedCount} facturas descargadas correctamente`);
      setShowPeriodDialog(false);
      setDownloadSelectedClientes([]);
    } catch (err) {
      console.error("Error generando ZIP:", err);
      toast.error("Error al generar el archivo ZIP");
    } finally {
      setIsDownloadingPeriod(false);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

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
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Descargar PDFs
          </Button>
          <Button onClick={handleNewFactura}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Nueva Factura
          </Button>
          <Button
            onClick={handleGenerateRecurring}
            variant="outline"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                Generando...
              </>
            ) : (
              <>
                <CalendarClock className="h-4 w-4 mr-2" aria-hidden="true" />
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
            <Filter className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <span className="font-medium text-neutral-700">Filtros</span>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-2" aria-hidden="true" />
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {filterPeriodType === "month" &&
            filterYear &&
            filterYear !== "all" && (
              <div className="space-y-2">
                <Label htmlFor="filter-month">Mes</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger id="filter-month">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {monthsForYear.length > 0
                      ? monthsForYear.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))
                      : Array.from({ length: 12 }, (_, i) => {
                          const date = new Date(parseInt(filterYear), i);
                          const monthName = new Intl.DateTimeFormat("es-ES", {
                            month: "long",
                          }).format(date);
                          return (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {monthName.charAt(0).toUpperCase() +
                                monthName.slice(1)}
                            </SelectItem>
                          );
                        })}
                  </SelectContent>
                </Select>
              </div>
            )}
          {filterPeriodType === "quarter" &&
            filterYear &&
            filterYear !== "all" && (
              <div className="space-y-2">
                <Label htmlFor="filter-quarter">Trimestre</Label>
                <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                  <SelectTrigger id="filter-quarter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Ene-Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Abr-Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct-Dic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          <div className="space-y-2">
            <Label htmlFor="filter-period">Periodo</Label>
            <Select
              value={filterPeriodType}
              onValueChange={(value) =>
                setFilterPeriodType(value as "month" | "quarter" | "year")
              }
              disabled={!filterYear || filterYear === "all"}
            >
              <SelectTrigger id="filter-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Año</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-year">Año</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger id="filter-year">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${estadoBadgeStyles[factura.estado]}`}
                        style={{
                          backgroundColor: estadoBadgeColors[factura.estado],
                        }}
                      >
                        {factura.estado === "borrador" && (
                          <FileEdit
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                        {factura.estado === "enviada" && (
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {factura.estado === "pagada" && (
                          <CircleCheck
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
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
                            aria-label="Abrir menú de acciones"
                          >
                            {loadingAction === factura.id ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <MoreHorizontal
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewFactura(factura.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                            Ver / Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(factura.id)}
                          >
                            <Download
                              className="h-4 w-4 mr-2"
                              aria-hidden="true"
                            />
                            Descargar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSendEmail(factura.id)}
                          >
                            <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                            Enviar por Gmail
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {factura.estado !== "pagada" && (
                            <DropdownMenuItem
                              onClick={() => handleMarkAsPaid(factura.id)}
                            >
                              <CheckCircle
                                className="h-4 w-4 mr-2"
                                aria-hidden="true"
                              />
                              Marcar como pagada
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteFactura(factura.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2
                              className="h-4 w-4 mr-2"
                              aria-hidden="true"
                            />
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

      {/* Dialog: Recurring Generation Result */}
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
              {generationResult.generated.length > 0 && (
                <div>
                  <h3 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" aria-hidden="true" />
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
              {generationResult.skipped.length > 0 && (
                <div>
                  <h3 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
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
              {generationResult.errors.length > 0 && (
                <div>
                  <h3 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <XCircle className="h-5 w-5" aria-hidden="true" />
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

      {/* Dialog: Period Download */}
      <Dialog open={showPeriodDialog} onOpenChange={setShowPeriodDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Descargar Facturas</DialogTitle>
            <DialogDescription>
              Selecciona el período y los clientes para descargar todas las
              facturas en un archivo ZIP.
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
                      {downloadAvailableMonths.map((month) => (
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
                      {downloadAvailableYears.map((year) => (
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
                      {downloadAvailableQuarters.map((quarter) => (
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
                      {downloadAvailableYears.map((year) => (
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
                    {downloadAvailableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cliente filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Clientes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={() => {
                    setDownloadSelectedClientes(
                      downloadSelectedClientes.length === clientes.length
                        ? []
                        : clientes.map((c) => c.id),
                    );
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
                            setDownloadSelectedClientes((prev) =>
                              prev.includes(cliente.id)
                                ? prev
                                : [...prev, cliente.id],
                            );
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
              disabled={
                isDownloadingPeriod || downloadSelectedClientes.length === 0
              }
            >
              {isDownloadingPeriod ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  Descargando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Descargar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
