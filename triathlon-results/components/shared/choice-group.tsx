"use client";

/** Groupe de boutons à choix unique (sexe, temps, format…), comme des onglets compacts. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === selected}
          onClick={() => onSelect(option.value)}
          className={
            option.value === selected
              ? "rounded-md bg-white px-3 py-1.5 text-sm font-bold text-[#17202E] shadow-sm"
              : "rounded-md px-3 py-1.5 text-sm font-semibold text-gray-500 hover:text-[#17202E]"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
