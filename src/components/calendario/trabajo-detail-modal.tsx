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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate, estadoTrabajoBadgeStyles, estadoTrabajoLabels } from "@/lib/utils";
import { TIPOS_SERVICIO } from "@/lib/constants";
import { deleteTrabajo, completarTrabajo } from "@/lib/actions/trabajos";
import { Edit, Trash2, CheckCircle2, FileText } from "lucide-react";
import type { TrabajoConCliente } from "@/types/database";
import { useRouter } from "next/navigation";

interface TrabajoDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trabajo: TrabajoConCliente | null;
  onEdit: (trabajo: TrabajoConCliente) => void;
  onSuccess: () => void;
}

export function TrabajoDetailModal({
  open,
  onOpenChange,
  trabajo,
  onEdit,
  onSuccess,
}: TrabajoDetailModalProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!trabajo) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    const result = await deleteTrabajo(trabajo.id);

    if (!result.success) {
      setError(result.error);
      setIsDeleting(false);
      return;
    }

    setShowDeleteDialog(false);
    onOpenChange(false);
    onSuccess();
  };

  const handleComplete = async () => {
    if (trabajo.estado === "completado") {
      setError("Este trabajo ya está completado");
      return;
    }

    setIsCompleting(true);
    setError(null);

    const result = await completarTrabajo(trabajo.id);

    if (!result.success) {
      setError(result.error);
      setIsCompleting(false);
      return;
    }

    // Show success and redirect to invoice
    onOpenChange(false);
    onSuccess();
    router.push(`/facturas/${result.data.factura_id}`);
  };

  const fechaInicio = new Date(trabajo.fecha_inicio);
  const fechaFin = new Date(trabajo.fecha_fin);
  const duracion = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{trabajo.titulo}</DialogTitle>
            <DialogDescription>
              {TIPOS_SERVICIO[trabajo.tipo_servicio]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Status Badge */}
            <div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  estadoTrabajoBadgeStyles[trabajo.estado]
                }`}
              >
                {estadoTrabajoLabels[trabajo.estado]}
              </span>
            </div>

            {/* Cliente */}
            <div>
              <h4 className="text-sm font-medium text-neutral-900 mb-1">
                Cliente
              </h4>
              <p className="text-sm text-neutral-600">{trabajo.cliente.nombre}</p>
              {trabajo.cliente.telefono && (
                <p className="text-sm text-neutral-600">
                  Tel: {trabajo.cliente.telefono}
                </p>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-neutral-900 mb-1">
                  Inicio
                </h4>
                <p className="text-sm text-neutral-600">
                  {formatDate(trabajo.fecha_inicio.split("T")[0])}
                </p>
                <p className="text-sm text-neutral-500">
                  {fechaInicio.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-neutral-900 mb-1">Fin</h4>
                <p className="text-sm text-neutral-600">
                  {formatDate(trabajo.fecha_fin.split("T")[0])}
                </p>
                <p className="text-sm text-neutral-500">
                  {fechaFin.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Duración */}
            <div>
              <h4 className="text-sm font-medium text-neutral-900 mb-1">
                Duración
              </h4>
              <p className="text-sm text-neutral-600">
                {duracion} {duracion === 1 ? "hora" : "horas"}
              </p>
            </div>

            {/* Dirección */}
            {trabajo.direccion && (
              <div>
                <h4 className="text-sm font-medium text-neutral-900 mb-1">
                  Dirección
                </h4>
                <p className="text-sm text-neutral-600">{trabajo.direccion}</p>
              </div>
            )}

            {/* Precio */}
            {trabajo.precio_acordado && (
              <div>
                <h4 className="text-sm font-medium text-neutral-900 mb-1">
                  Precio Acordado
                </h4>
                <p className="text-lg font-semibold text-neutral-900">
                  {formatCurrency(trabajo.precio_acordado)}
                </p>
              </div>
            )}

            {/* Descripción */}
            {trabajo.descripcion && (
              <div>
                <h4 className="text-sm font-medium text-neutral-900 mb-1">
                  Descripción
                </h4>
                <p className="text-sm text-neutral-600 whitespace-pre-wrap">
                  {trabajo.descripcion}
                </p>
              </div>
            )}

            {/* Invoice link if completed */}
            {trabajo.factura_id && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-700" />
                    <span className="text-sm font-medium text-blue-900">
                      Factura generada
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/facturas/${trabajo.factura_id}`)}
                  >
                    Ver Factura
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(trabajo);
                }}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </div>

            {trabajo.estado !== "completado" && !trabajo.factura_id && (
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                className="flex items-center gap-2"
              >
                {isCompleting ? (
                  "Completando..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Completar y Facturar
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar trabajo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El trabajo se eliminará
              permanentemente y se quitará del calendario de Google.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
