"use client";

import { Button } from "@/components/ui/button";
import { Chrome, Loader2 } from "lucide-react";
import { useState } from "react";

interface GoogleConnectButtonProps {
  isConnected: boolean;
  onDisconnect?: () => Promise<void>;
}

export function GoogleConnectButton({
  isConnected,
  onDisconnect,
}: GoogleConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = () => {
    setIsLoading(true);
    // Redirect to OAuth endpoint
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    setIsLoading(true);
    try {
      await onDisconnect();
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
          <Chrome className="h-4 w-4" />
          <span>Google Calendar conectado</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Desconectar"
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Conectando...
        </>
      ) : (
        <>
          <Chrome className="h-4 w-4" />
          Conectar Google Calendar
        </>
      )}
    </Button>
  );
}
