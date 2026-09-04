import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Keep-alive endpoint for Supabase.
 *
 * Proyectos Supabase en el plan gratuito se pausan tras un periodo de
 * inactividad (sin peticiones a la API/BD). Este endpoint hace una consulta
 * mínima para mantener el proyecto "vivo". Está pensado para ser invocado
 * periódicamente por un Vercel Cron Job (ver vercel.json).
 *
 * GET /api/cron/keep-alive
 */
export async function GET(request: NextRequest) {
  // Vercel añade automáticamente `Authorization: Bearer $CRON_SECRET` a las
  // invocaciones de sus propios cron jobs cuando la env var CRON_SECRET
  // está definida. Si está configurada, la validamos para evitar que
  // cualquiera pueda golpear este endpoint público.
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Consulta mínima solo para generar tráfico contra la BD (no necesita
    // devolver datos reales; RLS puede devolver un array vacío sin problema).
    const { error } = await supabase.from("clientes").select("id").limit(1);

    if (error) {
      console.error("Keep-alive query error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Keep-alive error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
