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
import { Checkbox } from "@/components/ui/checkbox";
import { createCliente, updateCliente } from "@/lib/actions/clientes";
import type { Cliente } from "@/types/database";

interface ClienteFormProps {
  cliente?: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ClienteForm({
  cliente,
  open,
  onOpenChange,
  onSuccess,
}: ClienteFormProps) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [nif, setNif] = useState("");
  const [notas, setNotas] = useState("");
  const [facturacionRecurrente, setFacturacionRecurrente] = useState(false);
  const [diaFacturacion, setDiaFacturacion] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!cliente;

  useEffect(() => {
    if (cliente) {
      setNombre(cliente.nombre);
      setEmail(cliente.email || "");
      setTelefono(cliente.telefono || "");
      setDireccion(cliente.direccion || "");
      setNif(cliente.nif || "");
      setNotas(cliente.notas || "");
      setFacturacionRecurrente(cliente.facturacion_recurrente || false);
      setDiaFacturacion(cliente.dia_facturacion || null);
    } else {
      setNombre("");
      setEmail("");
      setTelefono("");
      setDireccion("");
      setNif("");
      setNotas("");
      setFacturacionRecurrente(false);
      setDiaFacturacion(null);
    }
    setError(null);
  }, [cliente, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    // Validate email format if provided
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("El formato del email no es válido");
      return;
    }

    // Validate dia_facturacion if facturacion_recurrente is true
    if (facturacionRecurrente) {
      if (!diaFacturacion || diaFacturacion < 1 || diaFacturacion > 31) {
        setError("El día de facturación debe estar entre 1 y 31");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const clienteData = {
        nombre: nombre.trim(),
        email: email.trim() || null,
        telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
        nif: nif.trim() || null,
        notas: notas.trim() || null,
        facturacion_recurrente: facturacionRecurrente,
        dia_facturacion: facturacionRecurrente ? diaFacturacion : null,
      };

      if (isEditing) {
        const result = await updateCliente(cliente.id, clienteData);
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createCliente(clienteData);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del cliente."
              : "Completa los datos del nuevo cliente."}
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
              <Label htmlFor="nombre">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Nombre del cliente"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="Teléfono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nif">NIF/CIF</Label>
              <Input
                id="nif"
                placeholder="NIF o CIF"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                placeholder="Dirección completa"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                placeholder="Notas adicionales"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {/* Facturación Recurrente */}
            <div className="space-y-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="facturacion-recurrente"
                  checked={facturacionRecurrente}
                  onCheckedChange={(checked) =>
                    setFacturacionRecurrente(checked as boolean)
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor="facturacion-recurrente"
                  className="text-sm font-medium cursor-pointer"
                >
                  Facturación recurrente mensual
                </Label>
              </div>

              {facturacionRecurrente && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="dia-facturacion">
                    Día de facturación del mes{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dia-facturacion"
                    type="number"
                    min="1"
                    max="31"
                    value={diaFacturacion || ""}
                    onChange={(e) =>
                      setDiaFacturacion(parseInt(e.target.value) || null)
                    }
                    placeholder="Ej: 1, 15, 30"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-neutral-500">
                    Día del mes en que se generará automáticamente la factura
                    (1-31)
                  </p>
                </div>
              )}
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
