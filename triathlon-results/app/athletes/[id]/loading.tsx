// Affiché pendant le chargement du profil (frontière Suspense de la route,
// nécessaire avec cacheComponents puisque la page lit searchParams).
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement du profil">
      <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
      <div className="h-48 animate-pulse rounded-2xl bg-[#17202E]/90" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
      <div className="space-y-px overflow-hidden rounded-xl border border-gray-200 bg-white">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-14 animate-pulse bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
