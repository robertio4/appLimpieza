"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/calendario/calendar-view";
import { TrabajoForm } from "@/components/calendario/trabajo-form";
import { TrabajoDetailModal } from "@/components/calendario/trabajo-detail-modal";
import { GoogleConnectButton } from "@/components/calendario/google-connect-button";
import { getTrabajos } from "@/lib/actions/trabajos";
import { getClientes } from "@/lib/actions/clientes";
import {
  getGoogleOAuthTokens,
  revokeGoogleOAuthTokens,
} from "@/lib/actions/google-oauth";
import {
  syncAllTrabajosToGoogle,
  pullFromGoogleCalendar,
  importFromGoogleCalendar,
} from "@/lib/actions/calendario-sync";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import type { TrabajoConCliente, Cliente } from "@/types/database";

function CalendarioContent() {
  const searchParams = useSearchParams();

  // State
  const [trabajos, setTrabajos] = useState<TrabajoConCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasAutoImported, setHasAutoImported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [showTrabajoForm, setShowTrabajoForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTrabajo, setSelectedTrabajo] =
    useState<TrabajoConCliente | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load trabajos and clientes in parallel
      const [trabajosResult, clientesResult, oauthResult] = await Promise.all([
        getTrabajos(),
        getClientes(),
        getGoogleOAuthTokens(),
      ]);

      if (!trabajosResult.success) {
        setError(trabajosResult.error);
      } else {
        setTrabajos(trabajosResult.data);
      }

      if (!clientesResult.success) {
        setError(clientesResult.error);
      } else {
        setClientes(clientesResult.data);
      }

      if (oauthResult.success && oauthResult.data) {
        setIsGoogleConnected(true);
      }
    } catch {
      setError("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-import from Google Calendar on first load if connected
  useEffect(() => {
    const autoImport = async () => {
      // Only auto-import once per session and if Google is connected
      if (!hasAutoImported && isGoogleConnected && !isLoading) {
        setHasAutoImported(true);
        setIsSyncing(true);

        try {
          const result = await importFromGoogleCalendar();

          if (result.success && result.data.imported > 0) {
            setSuccessMessage(
              `Importados ${result.data.imported} eventos de Google Calendar`,
            );
            // Reload data to show imported events
            await loadData();
          }
        } catch (err) {
          console.error("Error auto-importing from Google Calendar:", err);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    autoImport();
  }, [isGoogleConnected, isLoading, hasAutoImported]);

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams?.get("success");
    const errorParam = searchParams?.get("error");

    if (success === "connected") {
      setSuccessMessage("Google Calendar conectado correctamente");
      setIsGoogleConnected(true);
      // Clear URL params
      window.history.replaceState({}, "", "/calendario");
    }

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        oauth_denied: "Acceso denegado. Por favor, autoriza la aplicación.",
        no_code: "Error en la autorización. Inténtalo de nuevo.",
        token_exchange: "Error al intercambiar tokens. Inténtalo de nuevo.",
        oauth_init_failed: "Error al iniciar OAuth. Inténtalo de nuevo.",
      };
      setError(errorMessages[errorParam] || "Error de autenticación");
      // Clear URL params
      window.history.replaceState({}, "", "/calendario");
    }
  }, [searchParams]);

  const handleDisconnect = async () => {
    const result = await revokeGoogleOAuthTokens();
    if (result.success) {
      setIsGoogleConnected(false);
      setSuccessMessage("Google Calendar desconectado");
    } else {
      setError(result.error);
    }
  };

  const handleSyncWithGoogle = async () => {
    setIsSyncing(true);
    setError(null);

    // Sincronización bidireccional
    // 1. Importar desde Google Calendar
    const importResult = await importFromGoogleCalendar();
    const pullResult = await pullFromGoogleCalendar();

    // 2. Exportar a Google Calendar
    const syncResult = await syncAllTrabajosToGoogle();

    // Evaluar resultados
    const allSuccess =
      importResult.success && pullResult.success && syncResult.success;

    if (allSuccess) {
      const imported = importResult.data.imported;
      const updated = pullResult.data.updated;
      const synced = syncResult.data.synced;
      const errors = syncResult.data.errors;

      const changes = imported + updated + synced;

      if (changes > 0) {
        const messages = [];
        if (imported > 0) messages.push(`${imported} eventos importados`);
        if (updated > 0) messages.push(`${updated} eventos actualizados`);
        if (synced > 0) messages.push(`${synced} trabajos exportados`);
        if (errors > 0) messages.push(`${errors} errores`);

        setSuccessMessage(`Sincronización completa: ${messages.join(", ")}`);
        await loadData();
      } else {
        setSuccessMessage("Calendario sincronizado, sin cambios");
      }
    } else {
      const errorMsg =
        !importResult.success && "error" in importResult
          ? importResult.error
          : !pullResult.success && "error" in pullResult
            ? pullResult.error
            : !syncResult.success && "error" in syncResult
              ? syncResult.error
              : "Error al sincronizar con Google Calendar";
      setError(errorMsg);
    }

    setIsSyncing(false);
  };

  const handleEventClick = (trabajo: TrabajoConCliente) => {
    setSelectedTrabajo(trabajo);
    setShowDetailModal(true);
  };

  const handleDateSelect = (start: Date) => {
    setDefaultDate(start);
    setSelectedTrabajo(null);
    setShowTrabajoForm(true);
  };

  const handleEdit = (trabajo: TrabajoConCliente) => {
    setSelectedTrabajo(trabajo);
    setShowDetailModal(false);
    setShowTrabajoForm(true);
  };

  const handleSuccess = () => {
    loadData();
    setSuccessMessage("Cambios guardados correctamente");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-2" />
          <p className="text-neutral-600">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Calendario</h1>
          <p className="text-neutral-600">
            Gestiona tus trabajos de limpieza y sincroniza con Google Calendar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isGoogleConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncWithGoogle}
              disabled={isSyncing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Sincronizando..." : "Sincronizar con Google"}
            </Button>
          )}
          <Button
            onClick={() => {
              setSelectedTrabajo(null);
              setDefaultDate(undefined);
              setShowTrabajoForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Trabajo
          </Button>
        </div>
      </div>

      {/* Google Calendar Connection */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">
              Sincronización con Google Calendar
            </h3>
            <p className="text-sm text-neutral-600">
              {isGoogleConnected
                ? "Tus trabajos se sincronizan automáticamente con Google Calendar"
                : "Conecta tu cuenta de Google para sincronizar tus trabajos"}
            </p>
          </div>
          <GoogleConnectButton
            isConnected={isGoogleConnected}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-700"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* No clientes warning */}
      {clientes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900 mb-1">
              No hay clientes
            </h4>
            <p className="text-sm text-amber-700">
              Necesitas crear al menos un cliente antes de crear trabajos.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/clientes")}
          >
            Ir a Clientes
          </Button>
        </div>
      )}

      {/* Calendar */}
      <CalendarView
        trabajos={trabajos}
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
      />

      {/* Modals */}
      <TrabajoForm
        open={showTrabajoForm}
        onOpenChange={setShowTrabajoForm}
        trabajo={selectedTrabajo}
        clientes={clientes}
        defaultDate={defaultDate}
        onSuccess={handleSuccess}
      />

      <TrabajoDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        trabajo={selectedTrabajo}
        onEdit={handleEdit}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CalendarioContent />
    </Suspense>
  );
}
