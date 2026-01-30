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
import { createTrabajo, updateTrabajo } from "@/lib/actions/trabajos";
import { TIPOS_SERVICIO, ESTADOS_TRABAJO } from "@/lib/constants";
import type {
  Trabajo,
  Cliente,
  TipoServicio,
  EstadoTrabajo,
} from "@/types/database";

interface TrabajoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trabajo?: Trabajo | null;
  clientes: Cliente[];
  defaultDate?: Date;
  onSuccess: () => void;
}

export function TrabajoForm({
  open,
  onOpenChange,
  trabajo,
  clientes,
  defaultDate,
  onSuccess,
}: TrabajoFormProps) {
  const isEditing = !!trabajo;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clienteId, setClienteId] = useState(trabajo?.cliente_id || "");
  const [titulo, setTitulo] = useState(trabajo?.titulo || "");
  const [descripcion, setDescripcion] = useState(trabajo?.descripcion || "");
  const [tipoServicio, setTipoServicio] = useState<TipoServicio>(
    trabajo?.tipo_servicio || "limpieza_general",
  );
  const [estado, setEstado] = useState<EstadoTrabajo>(
    trabajo?.estado || "pendiente",
  );
  const [fechaInicio, setFechaInicio] = useState(() => {
    if (trabajo?.fecha_inicio) {
      return new Date(trabajo.fecha_inicio).toISOString().slice(0, 16);
    }
    if (defaultDate) {
      return defaultDate.toISOString().slice(0, 16);
    }
    return "";
  });
  const [fechaFin, setFechaFin] = useState(() => {
    if (trabajo?.fecha_fin) {
      return new Date(trabajo.fecha_fin).toISOString().slice(0, 16);
    }
    if (defaultDate) {
      const endDate = new Date(defaultDate);
      endDate.setHours(endDate.getHours() + 2); // Default 2 hour duration
      return endDate.toISOString().slice(0, 16);
    }
    return "";
  });
  const [direccion, setDireccion] = useState(trabajo?.direccion || "");
  const [precioAcordado, setPrecioAcordado] = useState(
    trabajo?.precio_acordado?.toString() || "",
  );

  // Reset form when trabajo changes
  useEffect(() => {
    if (trabajo) {
      setClienteId(trabajo.cliente_id);
      setTitulo(trabajo.titulo);
      setDescripcion(trabajo.descripcion || "");
      setTipoServicio(trabajo.tipo_servicio);
      setEstado(trabajo.estado);
      setFechaInicio(new Date(trabajo.fecha_inicio).toISOString().slice(0, 16));
      setFechaFin(new Date(trabajo.fecha_fin).toISOString().slice(0, 16));
      setDireccion(trabajo.direccion || "");
      setPrecioAcordado(trabajo.precio_acordado?.toString() || "");
    } else {
      // Reset for new trabajo
      setClienteId("");
      setTitulo("");
      setDescripcion("");
      setTipoServicio("limpieza_general");
      setEstado("pendiente");
      if (defaultDate) {
        setFechaInicio(defaultDate.toISOString().slice(0, 16));
        const endDate = new Date(defaultDate);
        endDate.setHours(endDate.getHours() + 2);
        setFechaFin(endDate.toISOString().slice(0, 16));
      } else {
        setFechaInicio("");
        setFechaFin("");
      }
      setDireccion("");
      setPrecioAcordado("");
    }
    setError(null);
  }, [trabajo, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validation
      if (!clienteId || !titulo || !fechaInicio || !fechaFin) {
        setError("Por favor completa todos los campos requeridos");
        setIsLoading(false);
        return;
      }

      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        setError("La fecha de fin debe ser posterior a la fecha de inicio");
        setIsLoading(false);
        return;
      }

      const trabajoData = {
        cliente_id: clienteId,
        titulo,
        descripcion: descripcion || null,
        tipo_servicio: tipoServicio,
        estado,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        fecha_fin: new Date(fechaFin).toISOString(),
        direccion: direccion || null,
        precio_acordado: precioAcordado ? parseFloat(precioAcordado) : null,
        es_recurrente: false,
        recurrencia_patron: null,
        recurrencia_padre_id: null,
        factura_id: null,
      };

      let result;
      if (isEditing) {
        result = await updateTrabajo(trabajo.id, trabajoData);
      } else {
        result = await createTrabajo(trabajoData);
      }

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Error inesperado al guardar el trabajo");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Trabajo" : "Nuevo Trabajo"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los detalles del trabajo"
              : "Crea un nuevo trabajo de limpieza"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
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
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Limpieza de oficina"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Servicio *</Label>
                <Select
                  value={tipoServicio}
                  onValueChange={(value) =>
                    setTipoServicio(value as TipoServicio)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_SERVICIO).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Select
                  value={estado}
                  onValueChange={(value) => setEstado(value as EstadoTrabajo)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADOS_TRABAJO).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                <Input
                  id="fechaInicio"
                  type="datetime-local"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha Fin *</Label>
                <Input
                  id="fechaFin"
                  type="datetime-local"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Dejar vacío para usar dirección del cliente"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio">Precio Acordado (€)</Label>
              <Input
                id="precio"
                type="number"
                step="0.01"
                min="0"
                value={precioAcordado}
                onChange={(e) => setPrecioAcordado(e.target.value)}
                placeholder="0.00"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Notas adicionales sobre el trabajo..."
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>

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
              {isLoading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
