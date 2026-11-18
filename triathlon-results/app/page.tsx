import {
  ArrowRight,
  Bike,
  Footprints,
  Waves,
} from "lucide-react";

import { SearchForm } from "@/components/search/search-form";

const disciplines = [
  {
    name: "Triathlon",
    description: "Natation, cyclisme et course à pied",
    icon: Waves,
  },
  {
    name: "Duathlon",
    description: "Course à pied et cyclisme",
    icon: Bike,
  },
  {
    name: "Course à pied",
    description: "Route et trail",
    icon: Footprints,
  },
];

export default function Home() {
  return (
    <div className="space-y-12">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-[#17202E] px-6 py-16 text-white sm:px-12 sm:py-20">
        <div className="relative z-10 max-w-2xl">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-300">
            <span className="h-2 w-2 rounded-full bg-[#FC6B32]" />
            ENDURANCE SPORTS DATABASE
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Chaque course.
            <br />
            Chaque performance.
            <br />
            <span className="text-[#FC6B32]">Une seule plateforme.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-gray-300">
            Explore les résultats des compétitions, retrouve les athlètes
            et suis leurs performances au fil des saisons.
          </p>

          <div className="mt-8">
            <SearchForm variant="hero" />
          </div>
        </div>

        {/* Décoration */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border-[50px] border-white/5" />
        <div className="absolute -bottom-40 right-20 h-96 w-96 rounded-full border-[50px] border-[#FC6B32]/10" />
      </section>

      {/* Disciplines */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">
              Explorer
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              Les disciplines
            </h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {disciplines.map((discipline) => {
            const Icon = discipline.icon;

            return (
              <div
                key={discipline.name}
                className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#FC6B32]/50 hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FC6B32]">
                  <Icon size={24} />
                </div>

                <h3 className="text-lg font-bold">
                  {discipline.name}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {discipline.description}
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#FC6B32]">
                  Explorer
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Placeholder */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-gray-500">
          Les dernières compétitions apparaîtront ici.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Cette section sera connectée à ton API FastAPI lors de la prochaine étape.
        </p>
      </section>

    </div>
  );
}