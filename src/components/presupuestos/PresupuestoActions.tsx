"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { PresupuestoPDF } from "./PresupuestoPDF";
import { formatCurrency } from "@/lib/utils";
import type { PresupuestoCompleto } from "@/types/database";
import { DATOS_EMPRESA } from "@/lib/constants";
import { Download, Mail, Loader2 } from "lucide-react";

interface PresupuestoActionsProps {
  presupuesto: PresupuestoCompleto;
  onSuccess?: () => void;
}

export function PresupuestoActions({
  presupuesto,
  onSuccess,
}: PresupuestoActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  };

  const downloadPDF = async () => {
    setIsDownloading(true);
    try {
      const blob = await pdf(
        <PresupuestoPDF presupuesto={presupuesto} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Presupuesto-${presupuesto.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Error al generar el PDF");
      return false;
    } finally {
      setIsDownloading(false);
    }
  };

  const sendByGmail = async () => {
    setIsSending(true);
    try {
      // First download the PDF
      const downloaded = await downloadPDF();
      if (!downloaded) {
        setIsSending(false);
        return;
      }

      // Prepare email content
      const clienteEmail = presupuesto.cliente.email || "";
      const subject = encodeURIComponent(
        `Presupuesto ${presupuesto.numero} - ${DATOS_EMPRESA.nombre}`
      );
      const body = encodeURIComponent(
        `Estimado/a ${presupuesto.cliente.nombre},\n\n` +
          `Adjunto le enviamos el presupuesto ${presupuesto.numero} para los servicios solicitados.\n\n` +
          `Importe total: ${formatCurrency(presupuesto.total)}\n\n` +
          `Este presupuesto tiene validez hasta el ${new Date(presupuesto.fecha_validez).toLocaleDateString("es-ES")}.\n\n` +
          `Quedamos a su disposición para cualquier consulta.\n\n` +
          `Atentamente,\n${DATOS_EMPRESA.nombre}`
      );

      // Open Gmail compose
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${clienteEmail}&su=${subject}&body=${body}`;
      window.open(gmailUrl, "_blank");

      // Show toast to inform user to attach the PDF
      showToast("PDF descargado. Por favor, adjunta el archivo en Gmail.");
      onSuccess?.();
    } catch (error) {
      console.error("Error sending email:", error);
      showToast("Error al preparar el correo");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={downloadPDF}
          disabled={isDownloading || isSending}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Descargar PDF
        </Button>
        <Button onClick={sendByGmail} disabled={isDownloading || isSending}>
          {isSending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Enviar por Gmail
        </Button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md animate-in fade-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </>
  );
}
