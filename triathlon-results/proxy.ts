import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { API_BASE_URL } from "@/lib/api";

/**
 * Pages course, classement et athlète : vérifie l'id avant le rendu pour répondre avec le bon
 * code HTTP.
 *
 * Ces pages ont un écran de chargement (loading.tsx) : Next.js commence à envoyer la page, avec
 * le code 200, avant de savoir si l'id existe. Sans cette étape, un ancien id remplacé (voir
 * transform/ids_stables.sql) ne redirigeait qu'en JavaScript et une page introuvable répondait
 * 200 (« soft 404 ») : les moteurs de recherche ne voyaient ni la redirection ni l'absence.
 *
 * GET /resolve/{races|athletes}/{id} de l'API dit si la page existe, a été remplacée ou n'existe
 * pas. En cas d'erreur de l'API, la page est affichée normalement (elle gère elle-même l'erreur).
 */
const ID_PAGE = /^\/(races|athletes)\/(\d+)(\/results)?$/;

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const match = request.nextUrl.pathname.match(ID_PAGE);
  if (!match || !API_BASE_URL) return NextResponse.next();

  const [, kind, id, suffix = ""] = match;
  if (kind === "athletes" && suffix) return NextResponse.next();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/resolve/${kind}/${id}`, { cache: "no-store" });
  } catch {
    return NextResponse.next();
  }

  if (response.status === 404) {
    // Chemin qui n'existe pas : Next.js affiche app/not-found.tsx avec le code 404.
    return NextResponse.rewrite(new URL("/page-introuvable", request.url));
  }
  if (!response.ok) return NextResponse.next();

  const target: { id: number; redirect: boolean } = await response.json();
  if (!target.redirect) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${kind}/${target.id}${suffix}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/races/:id(\\d+)", "/races/:id(\\d+)/results", "/athletes/:id(\\d+)"],
};
