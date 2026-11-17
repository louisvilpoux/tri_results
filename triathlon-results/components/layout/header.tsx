import Link from "next/link";
import { Activity, Search } from "lucide-react";

const navigation = [
  { label: "Courses", href: "/races" },
  { label: "Athlètes", href: "/athletes" },
  { label: "Résultats", href: "/results" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FC6B32] text-white">
            <Activity size={21} strokeWidth={2.5} />
          </div>

          <span className="text-xl font-black tracking-tight text-[#17202E]">
            PACE<span className="text-[#FC6B32]">.</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-gray-600 transition-colors hover:text-[#FC6B32]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#FC6B32] hover:text-[#FC6B32]"
        >
          <Search size={17} />
          <span className="hidden sm:inline">Rechercher</span>
        </Link>
      </div>
    </header>
  );
}