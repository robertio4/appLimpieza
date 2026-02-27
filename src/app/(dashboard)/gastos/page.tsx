"use client";

import { useState, useEffect, useCallback } from "react";
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
import { GastoForm } from "@/components/gastos/gasto-form";
import { CategoriaModal } from "@/components/gastos/categoria-modal";
import {
  getGastos,
  getGastosByDateRange,
  deleteGasto,
} from "@/lib/actions/gastos";
import {
  getCategorias,
  initializeDefaultCategorias,
} from "@/lib/actions/categorias";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CategoriaGasto, GastoConCategoria } from "@/types/database";
import { Plus, Settings, Pencil, Trash2, Filter, X } from "lucide-react";

export default function GastosPage() {
  const [gastos, setGastos] = useState<GastoConCategoria[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  // Modals
  const [showGastoForm, setShowGastoForm] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoConCategoria | null>(
    null
  );

  const loadCategorias = useCallback(async () => {
    const result = await initializeDefaultCategorias();
    if (result.success) {
      setCategorias(result.data);
    }
  }, []);

  const loadGastos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result;
      const categoriaFilter = filterCategoria && filterCategoria !== "all" ? filterCategoria : undefined;

      if (filterStartDate && filterEndDate) {
        result = await getGastosByDateRange(
          filterStartDate,
          filterEndDate,
          categoriaFilter
        );
      } else if (categoriaFilter) {
        // If only category filter, use date range with wide dates
        const startOfYear = new Date();
        startOfYear.setMonth(0, 1);
        const endOfYear = new Date();
        endOfYear.setMonth(11, 31);
        result = await getGastosByDateRange(
          startOfYear.toISOString().split("T")[0],
          endOfYear.toISOString().split("T")[0],
          categoriaFilter
        );
      } else {
        result = await getGastos();
      }

      if (result.success) {
        setGastos(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterCategoria]);

  useEffect(() => {
    loadCategorias();
  }, [loadCategorias]);

  useEffect(() => {
    loadGastos();
  }, [loadGastos]);

  const handleNewGasto = () => {
    setEditingGasto(null);
    setShowGastoForm(true);
  };

  const handleEditGasto = (gasto: GastoConCategoria) => {
    setEditingGasto(gasto);
    setShowGastoForm(true);
  };

  const handleDeleteGasto = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este gasto?")) {
      return;
    }

    const result = await deleteGasto(id);
    if (result.success) {
      loadGastos();
    } else {
      setError(result.error);
    }
  };

  const handleClearFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterCategoria("");
  };

  const handleCategoriasChange = async () => {
    const result = await getCategorias();
    if (result.success) {
      setCategorias(result.data);
    }
    loadGastos();
  };

  const total = gastos.reduce((sum, gasto) => sum + gasto.importe, 0);
  const hasActiveFilters =
    (!!filterStartDate && !!filterEndDate) ||
    (!!filterCategoria && filterCategoria !== "all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gastos</h1>
          <p className="text-neutral-600">Gestiona tus gastos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoriaModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Categorías
          </Button>
          <Button onClick={handleNewGasto}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Gasto
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Label htmlFor="filter-categoria">Categoría</Label>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger id="filter-categoria">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color || "#6B7280" }}
                      />
                      {cat.nombre}
                    </div>
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

      {/* Gastos table */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-500">Cargando...</div>
        ) : gastos.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            {hasActiveFilters
              ? "No hay gastos que coincidan con los filtros"
              : "No hay gastos registrados"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                      Fecha
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                      Concepto
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                      Categoría
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">
                      Importe
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                      Proveedor
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {gastos.map((gasto) => (
                    <tr
                      key={gasto.id}
                      className="hover:bg-neutral-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {formatDate(gasto.fecha)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {gasto.concepto}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {gasto.categoria ? (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{
                              backgroundColor:
                                gasto.categoria.color || "#6B7280",
                            }}
                          >
                            {gasto.categoria.nombre}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Sin categoría</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 text-right font-medium">
                        {formatCurrency(gasto.importe)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {gasto.proveedor || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditGasto(gasto)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteGasto(gasto.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-600">
                Total {hasActiveFilters && "(filtrado)"}: {gastos.length} gastos
              </span>
              <span className="text-lg font-bold text-neutral-900">
                {formatCurrency(total)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <GastoForm
        gasto={editingGasto}
        categorias={categorias}
        open={showGastoForm}
        onOpenChange={setShowGastoForm}
        onSuccess={loadGastos}
        onCategoriasChange={handleCategoriasChange}
      />

      <CategoriaModal
        categorias={categorias}
        open={showCategoriaModal}
        onOpenChange={setShowCategoriaModal}
        onCategoriasChange={handleCategoriasChange}
      />
    </div>
  );
}
