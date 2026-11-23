import { ApiError, getRaceTimes } from "@/lib/api";

/**
 * GET /api/races/{id}/times : relaie GET /races/{id}/times de l'API au navigateur, qui ne connaît
 * pas l'adresse de l'API (API_BASE_URL est réservée au serveur). Le simulateur « Et moi ? » de la
 * page classement ne charge ces temps (jusqu'à environ 900 Ko pour les plus grosses épreuves)
 * que lorsqu'on l'ouvre.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ detail: "Race not found" }, { status: 404 });
  }
  try {
    return Response.json(await getRaceTimes(id));
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502;
    return Response.json({ detail: "Temps indisponibles" }, { status });
  }
}
