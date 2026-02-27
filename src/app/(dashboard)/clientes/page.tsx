"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { getClientes, deleteCliente } from "@/lib/actions/clientes";
import type { Cliente } from "@/types/database";
import { Pencil, Trash2, Mail, Phone, MapPin, FileText, CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadClientes = async () => {
    setIsLoading(true);
    const result = await getClientes();
    if (result.success) {
      setClientes(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const handleNewCliente = () => {
    setSelectedCliente(null);
    setFormOpen(true);
  };

  const handleEditCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadClientes();
  };

  const handleDeleteClick = (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteCliente(clienteToDelete.id);

    if (result.success) {
      setDeleteDialogOpen(false);
      loadClientes();
    } else {
      setDeleteError(result.error);
    }

    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
            <p className="text-neutral-600">Gestiona tus clientes</p>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-neutral-500 text-center py-8">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
          <p className="text-neutral-600">Gestiona tus clientes</p>
        </div>
        <Button onClick={handleNewCliente}>Nuevo Cliente</Button>
      </div>

      {clientes.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-neutral-500 text-center py-8">
            No hay clientes registrados
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => (
            <Card
              key={cliente.id}
              className="relative cursor-pointer transition-colors hover:bg-neutral-50"
              onClick={() => handleEditCliente(cliente)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{cliente.nombre}</CardTitle>
                    {cliente.nif && (
                      <CardDescription className="mt-1">
                        {cliente.nif}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCliente(cliente);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(cliente);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                )}
                {cliente.telefono && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{cliente.telefono}</span>
                  </div>
                )}
                {cliente.direccion && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-2">{cliente.direccion}</span>
                  </div>
                )}
                {cliente.notas && (
                  <div className="flex items-start gap-2 text-sm text-neutral-600">
                    <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{cliente.notas}</span>
                  </div>
                )}
                {cliente.facturacion_recurrente && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {cliente.dia_facturacion != null
                        ? `Facturación mensual (día ${cliente.dia_facturacion})`
                        : "Facturación mensual (día no definido)"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClienteForm
        cliente={selectedCliente}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el cliente{" "}
              <strong>{clienteToDelete?.nombre}</strong>? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
