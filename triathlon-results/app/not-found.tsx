import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-[#FC6B32]">Erreur 404</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Page introuvable</h1>
      <p className="mt-3 text-sm text-gray-500">
        Cette course ou cet athlète n’existe pas, ou son adresse a changé.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/races"
          className="rounded-lg bg-[#17202E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#FC6B32]"
        >
          Voir les courses
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-[#17202E] hover:border-[#FC6B32] hover:text-[#FC6B32]"
        >
          Rechercher
        </Link>
      </div>
    </div>
  );
}
