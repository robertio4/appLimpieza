import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { SyncStatus } from "@/types/database";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  errorMessage?: string | null;
}

export function SyncStatusBadge({ status, errorMessage }: SyncStatusBadgeProps) {
  const configs = {
    synced: {
      icon: CheckCircle2,
      label: "Sincronizado",
      className: "bg-green-50 text-green-700",
    },
    pending: {
      icon: Clock,
      label: "Pendiente",
      className: "bg-amber-50 text-amber-700",
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      className: "bg-red-50 text-red-700",
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.className}`}
      title={errorMessage || undefined}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}
