"use client";

import { useState } from "react";
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
import {
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from "@/lib/actions/categorias";
import type { CategoriaGasto } from "@/types/database";
import { Pencil, Trash2, Plus, Settings } from "lucide-react";

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6B7280", // Gray
];

interface CategoriaModalProps {
  categorias: CategoriaGasto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriasChange: () => void;
}

export function CategoriaModal({
  categorias,
  open,
  onOpenChange,
  onCategoriasChange,
}: CategoriaModalProps) {
  const [editingCategoria, setEditingCategoria] =
    useState<CategoriaGasto | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingCategoria(null);
    setIsCreating(false);
    setNombre("");
    setColor(PRESET_COLORS[0]);
    setError(null);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingCategoria(null);
    setNombre("");
    setColor(PRESET_COLORS[0]);
    setError(null);
  };

  const handleStartEdit = (categoria: CategoriaGasto) => {
    setEditingCategoria(categoria);
    setIsCreating(false);
    setNombre(categoria.nombre);
    setColor(categoria.color || PRESET_COLORS[0]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (editingCategoria) {
        const result = await updateCategoria(editingCategoria.id, {
          nombre: nombre.trim(),
          color,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createCategoria({
          nombre: nombre.trim(),
          color,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
      }
      resetForm();
      onCategoriasChange();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) {
      return;
    }

    setIsLoading(true);
    const result = await deleteCategoria(id);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onCategoriasChange();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestionar Categorías
          </DialogTitle>
          <DialogDescription>
            Crea, edita o elimina categorías de gastos
          </DialogDescription>
        </DialogHeader>

        {/* List of categories */}
        <div className="max-h-[200px] overflow-y-auto space-y-2">
          {categorias.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">
              No hay categorías
            </p>
          ) : (
            categorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2 rounded-md border border-neutral-200 bg-neutral-50"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cat.color || "#6B7280" }}
                  />
                  <span className="text-sm font-medium">{cat.nombre}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleStartEdit(cat)}
                    disabled={isLoading}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cat.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Form for create/edit */}
        {(isCreating || editingCategoria) && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre de la categoría"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === presetColor
                        ? "border-neutral-900 scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                    disabled={isLoading}
                  />
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-2 border-neutral-300"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Guardando..."
                  : editingCategoria
                  ? "Actualizar"
                  : "Crear"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        <DialogFooter className="border-t pt-4">
          {!isCreating && !editingCategoria && (
            <Button onClick={handleStartCreate} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Inline modal for creating category from expense form
interface CreateCategoriaInlineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriaCreated: (categoria: CategoriaGasto) => void;
}

export function CreateCategoriaInline({
  open,
  onOpenChange,
  onCategoriaCreated,
}: CreateCategoriaInlineProps) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await createCategoria({
      nombre: nombre.trim(),
      color,
    });

    setIsLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setNombre("");
    setColor(PRESET_COLORS[0]);
    onOpenChange(false);
    onCategoriaCreated(result.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nueva Categoría</DialogTitle>
          <DialogDescription>
            Crea una nueva categoría para tus gastos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inline-nombre">Nombre</Label>
            <Input
              id="inline-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la categoría"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === presetColor
                      ? "border-neutral-900 scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                  disabled={isLoading}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-2 border-neutral-300"
                disabled={isLoading}
              />
            </div>
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
              {isLoading ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
