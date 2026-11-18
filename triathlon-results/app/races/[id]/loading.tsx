// Affiché pendant le chargement de la course (frontière Suspense de la route).
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement de la course">
      <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
      <div className="h-44 animate-pulse rounded-2xl bg-[#17202E]/90" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    </div>
  );
}
