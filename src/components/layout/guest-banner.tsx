"use client";

import { useUser } from "@/hooks/use-user";
import { GUEST_USER_EMAIL } from "@/lib/constants";

export function GuestBanner() {
  const { user, isLoading } = useUser();

  if (isLoading || !user || user.email !== GUEST_USER_EMAIL) return null;

  return (
    <div className="w-full bg-amber-400 text-amber-900 text-center text-sm font-medium py-2 px-4">
      Modo Invitado — Estás viendo datos de demostración
    </div>
  );
}
