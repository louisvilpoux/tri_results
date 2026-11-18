/** Squelette de chargement commun aux pages de liste (titre, filtres, lignes). */
export function ListLoading({ label }: { label: string }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="h-[74px] animate-pulse rounded-xl bg-white" />
      <div className="space-y-px overflow-hidden rounded-xl border border-gray-200 bg-white">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-[72px] animate-pulse bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
