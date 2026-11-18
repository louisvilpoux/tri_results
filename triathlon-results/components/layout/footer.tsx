import Link from "next/link";
import { Activity } from "lucide-react";

export function Footer() {
  const year = 2026
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">

        <Link href="/" className="flex items-center gap-2">
          <Activity size={18} className="text-[#FC6B32]" />
          <span className="font-bold text-[#17202E]">PACE.</span>
        </Link>

        <p className="text-center text-xs text-gray-500">
          Les résultats des sports d’endurance, réunis au même endroit.
        </p>

        <p className="text-xs text-gray-400">
          © {year} PACE
        </p>
      </div>
    </footer>
  );
}