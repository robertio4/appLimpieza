"use server";

import { headers } from "next/headers";
import { GUEST_USER_EMAIL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { UAParser } from "ua-parser-js";

type IpapiResponse = {
  city?: string;
  region?: string;
  region_code?: string;
  country?: string;
  country_name?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
  in_eu?: boolean;
  error?: boolean;
};

async function getGeoData(ip: string): Promise<IpapiResponse | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as IpapiResponse;
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function signInAsGuest(): Promise<{ error?: string }> {
  const headersList = await headers();
  const rawIp =
    headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "";
  const ip = rawIp.split(",")[0].trim() || "desconocida";
  const userAgent = headersList.get("user-agent") ?? "";
  const language = headersList.get("accept-language")?.split(",")[0] ?? null;

  const parser = new UAParser(userAgent);
  const ua = parser.getResult();
  const deviceType = ua.device.type ?? "desktop";

  const geo = ip !== "desconocida" ? await getGeoData(ip) : null;

  const email = GUEST_USER_EMAIL;
  const password = process.env.GUEST_USER_PASSWORD;

  if (!email || !password) {
    return { error: "El modo invitado no está configurado." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  const success = !error;
  const guestUserId = data.user?.id;
  const authErrorMsg = error?.message ?? null;

  if (success && guestUserId) {
    const { error: logError } = await supabase.from("guest_login_events").insert({
      user_id: guestUserId,
      success,
      ip_address: ip,
      country: geo?.country_name ?? null,
      country_code: geo?.country ?? null,
      city: geo?.city ?? null,
      region: geo?.region ?? null,
      region_code: geo?.region_code ?? null,
      postal: geo?.postal ?? null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      timezone: geo?.timezone ?? null,
      org: geo?.org ?? null,
      in_eu: geo?.in_eu ?? null,
      browser: ua.browser.name ?? null,
      browser_ver: ua.browser.version ?? null,
      os: ua.os.name ? `${ua.os.name} ${ua.os.version ?? ""}`.trim() : null,
      device_type: deviceType,
      language,
      user_agent: userAgent || null,
      error_msg: authErrorMsg,
    });

    if (logError) {
      console.error("Error registrando guest_login_events:", logError.message);
    }
  }

  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (process.env.RESEND_API_KEY && notificationEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: "App Limpieza <onboarding@resend.dev>",
        to: notificationEmail,
        subject: success
          ? "✅ Nuevo acceso de invitado"
          : "❌ Intento fallido de invitado",
        text: [
          `Fecha:       ${new Date().toLocaleString("es-ES")}`,
          `Estado:      ${success ? "Éxito ✅" : "Fallido ❌"}`,
          ``,
          `--- Ubicación ---`,
          `IP:          ${ip}`,
          `País:        ${geo?.country_name ?? "desconocido"} (${geo?.country ?? "-"})`,
          `Ciudad:      ${geo?.city ?? "desconocida"}`,
          `Región:      ${geo?.region ?? "desconocida"} (${geo?.region_code ?? "-"})`,
          `CP:          ${geo?.postal ?? "-"}`,
          `Coordenadas: ${geo?.latitude ?? "-"}, ${geo?.longitude ?? "-"}`,
          `Zona horaria:${geo?.timezone ?? "-"}`,
          `Proveedor:   ${geo?.org ?? "-"}`,
          `En la UE:    ${geo?.in_eu != null ? (geo.in_eu ? "Sí" : "No") : "-"}`,
          ``,
          `--- Dispositivo ---`,
          `Navegador:   ${ua.browser.name ?? "desconocido"} ${ua.browser.version ?? ""}`,
          `Sistema Op:  ${ua.os.name ?? "desconocido"} ${ua.os.version ?? ""}`,
          `Tipo:        ${deviceType}`,
          `Idioma:      ${language ?? "desconocido"}`,
          authErrorMsg ? `\nError: ${authErrorMsg}` : "",
        ]
          .join("\n")
          .trim(),
      });
    } catch (emailError) {
      console.error(
        "Error enviando notificación de acceso invitado:",
        emailError instanceof Error ? emailError.message : "Error desconocido"
      );
    }
  }

  if (error) {
    return {
      error: "No se pudo iniciar sesión como invitado. Inténtalo de nuevo.",
    };
  }
  return {};
}
