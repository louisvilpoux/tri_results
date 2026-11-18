import { ListLoading } from "@/components/shared/list-loading";

// Frontière Suspense de la route : la page lit searchParams.
export default function Loading() {
  return <ListLoading label="Chargement des athlètes" />;
}
