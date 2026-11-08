import { revalidatePath } from "next/cache";

/** Llamado a diario por el cron de Vercel (vercel.json). Vercel envía Authorization: Bearer <CRON_SECRET>. */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }
  revalidatePath("/");
  return Response.json({ revalidado: "/", en: new Date().toISOString() });
}
