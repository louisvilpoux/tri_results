import { SWIM_CANCELLED_LABEL, SWIM_CANCELLED_MESSAGE } from "@/lib/swim-cancelled";

/** Étiquette « Natation annulée ? » d'un duathlon couru à la place d'un triathlon (D14). */
export function SwimCancelledBadge({ className = "ml-1.5" }: { className?: string }) {
  return (
    <span
      title={SWIM_CANCELLED_MESSAGE}
      className={`${className} inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-800`}
    >
      {SWIM_CANCELLED_LABEL}
      <span className="sr-only"> ({SWIM_CANCELLED_MESSAGE})</span>
    </span>
  );
}
