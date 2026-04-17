"use server";

import { headers } from "next/headers";
import { GUEST_USER_EMAIL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { UAParser } from "ua-parser-js";

async function getGeoData(ip: string) {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,countryCode,city,regionName`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return (await res.json()) as {
      country?: string;
      countryCode?: string;
      city?: string;
      regionName?: string;
    };
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  const success = !error;

  // Log (fire-and-forget)
  supabase.from("guest_login_events").insert({
    success,
    ip_address: ip,
    country: geo?.country ?? null,
    country_code: geo?.countryCode ?? null,
    city: geo?.city ?? null,
    region: geo?.regionName ?? null,
    browser: ua.browser.name ?? null,
    browser_ver: ua.browser.version ?? null,
    os: ua.os.name
      ? `${ua.os.name} ${ua.os.version ?? ""}`.trim()
      : null,
    device_type: deviceType,
    language,
    user_agent: userAgent || null,
    error_msg: error?.message ?? null,
  });

  // Email (fire-and-forget)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
      from: "App Limpieza <onboarding@resend.dev>",
      to: process.env.NOTIFICATION_EMAIL ?? "roberto.rgz.fdz@gmail.com",
      subject: success
        ? "✅ Nuevo acceso de invitado"
        : "❌ Intento fallido de invitado",
      text: [
        `Fecha:       ${new Date().toLocaleString("es-ES")}`,
        `Estado:      ${success ? "Éxito ✅" : "Fallido ❌"}`,
        ``,
        `--- Ubicación ---`,
        `IP:          ${ip}`,
        `País:        ${geo?.country ?? "desconocido"} (${geo?.countryCode ?? "-"})`,
        `Ciudad:      ${geo?.city ?? "desconocida"}`,
        `Región:      ${geo?.regionName ?? "desconocida"}`,
        ``,
        `--- Dispositivo ---`,
        `Navegador:   ${ua.browser.name ?? "desconocido"} ${ua.browser.version ?? ""}`,
        `Sistema Op:  ${ua.os.name ?? "desconocido"} ${ua.os.version ?? ""}`,
        `Tipo:        ${deviceType}`,
        `Idioma:      ${language ?? "desconocido"}`,
        error ? `\nError: ${error.message}` : "",
      ]
        .join("\n")
        .trim(),
    });
  }

  if (error) {
    return {
      error: "No se pudo iniciar sesión como invitado. Inténtalo de nuevo.",
    };
  }
  return {};
}
