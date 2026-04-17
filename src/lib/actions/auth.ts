"use server";

import { GUEST_USER_EMAIL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export async function signInAsGuest(): Promise<{ error?: string }> {
  const email = GUEST_USER_EMAIL;
  const password = process.env.GUEST_USER_PASSWORD;

  if (!email || !password) {
    return { error: "El modo invitado no está configurado." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "No se pudo iniciar sesión como invitado. Inténtalo de nuevo." };
  }
  return {};
}
