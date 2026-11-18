// Affiché pendant la recherche (frontière Suspense de la route, la page lit searchParams).
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Recherche en cours">
      <div className="space-y-4">
        <div className="h-9 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-12 animate-pulse rounded-xl bg-white" />
      </div>
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="space-y-px overflow-hidden rounded-xl border border-gray-200 bg-white">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-[72px] animate-pulse bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
