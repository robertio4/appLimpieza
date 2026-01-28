"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createGasto, updateGasto } from "@/lib/actions/gastos";
import { CreateCategoriaInline } from "./categoria-modal";
import type { CategoriaGasto, GastoConCategoria } from "@/types/database";
import { Plus } from "lucide-react";

interface GastoFormProps {
  gasto?: GastoConCategoria | null;
  categorias: CategoriaGasto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCategoriasChange: () => void;
}

export function GastoForm({
  gasto,
  categorias,
  open,
  onOpenChange,
  onSuccess,
  onCategoriasChange,
}: GastoFormProps) {
  const [fecha, setFecha] = useState("");
  const [concepto, setConcepto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [importe, setImporte] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [notas, setNotas] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewCategoriaModal, setShowNewCategoriaModal] = useState(false);

  const isEditing = !!gasto;

  useEffect(() => {
    if (gasto) {
      setFecha(gasto.fecha);
      setConcepto(gasto.concepto);
      setCategoriaId(gasto.categoria_id || "");
      setImporte(gasto.importe.toString());
      setProveedor(gasto.proveedor || "");
      setNotas(gasto.notas || "");
    } else {
      // Default to today's date
      const today = new Date().toISOString().split("T")[0];
      setFecha(today);
      setConcepto("");
      setCategoriaId("");
      setImporte("");
      setProveedor("");
      setNotas("");
    }
    setError(null);
  }, [gasto, open]);

  const formatCurrency = (value: string): string => {
    // Remove non-numeric characters except decimal point and comma
    const cleaned = value.replace(/[^\d.,]/g, "");
    // Replace comma with period for parsing
    const normalized = cleaned.replace(",", ".");
    return normalized;
  };

  const handleImporteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setImporte(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fecha) {
      setError("La fecha es obligatoria");
      return;
    }
    if (!concepto.trim()) {
      setError("El concepto es obligatorio");
      return;
    }
    if (!categoriaId) {
      setError("La categoría es obligatoria");
      return;
    }
    const importeNum = parseFloat(importe.replace(",", "."));
    if (isNaN(importeNum) || importeNum <= 0) {
      setError("El importe debe ser un número válido mayor que 0");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const gastoData = {
        fecha,
        concepto: concepto.trim(),
        categoria_id: categoriaId,
        importe: importeNum,
        proveedor: proveedor.trim() || null,
        notas: notas.trim() || null,
      };

      if (isEditing) {
        const result = await updateGasto(gasto.id, gastoData);
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createGasto(gastoData);
        if (!result.success) {
          setError(result.error);
          return;
        }
      }

      onOpenChange(false);
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoriaCreated = (newCategoria: CategoriaGasto) => {
    setCategoriaId(newCategoria.id);
    onCategoriasChange();
  };

  const handleSelectChange = (value: string) => {
    if (value === "__new__") {
      setShowNewCategoriaModal(true);
    } else {
      setCategoriaId(value);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Gasto" : "Nuevo Gasto"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modifica los datos del gasto"
                : "Añade un nuevo gasto"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="importe">Importe (€) *</Label>
                <Input
                  id="importe"
                  type="text"
                  inputMode="decimal"
                  value={importe}
                  onChange={handleImporteChange}
                  placeholder="0.00"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepto">Concepto *</Label>
              <Input
                id="concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Descripción del gasto"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría *</Label>
              <Select value={categoriaId} onValueChange={handleSelectChange}>
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
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
                  <SelectItem value="__new__">
                    <div className="flex items-center gap-2 text-primary">
                      <Plus className="h-3 w-3" />
                      Nueva categoría
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre del proveedor (opcional)"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas adicionales (opcional)"
                disabled={isLoading}
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Guardando..."
                  : isEditing
                  ? "Guardar cambios"
                  : "Crear gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateCategoriaInline
        open={showNewCategoriaModal}
        onOpenChange={setShowNewCategoriaModal}
        onCategoriaCreated={handleCategoriaCreated}
      />
    </>
  );
}
