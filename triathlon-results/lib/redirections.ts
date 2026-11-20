import { notFound, permanentRedirect } from "next/navigation";

import { getRedirection } from "@/lib/api";

/**
 * Épreuve ou athlète introuvable : si son id a été remplacé (deux athlètes réunis, épreuve en
 * double retirée, voir transform/ids_stables.sql), redirige vers le nouvel id en gardant la
 * suite de l'adresse (« /results ») ; sinon, page 404.
 */
export async function redirectOrNotFound(
  kind: "races" | "athletes",
  id: string,
  suffix = ""
): Promise<never> {
  const newId = await getRedirection(kind, id);
  if (newId !== null) permanentRedirect(`/${kind}/${newId}${suffix}`);
  notFound();
}
