import {
  ArrowRight,
  Bike,
  Clock,
  Footprints,
  Mountain,
  TreePine,
  Waves,
  WavesLadder,
  type LucideIcon,
} from "lucide-react";

import Link from "next/link";
import { Suspense } from "react";

import { LatestRaces, LatestRacesLoading } from "@/components/home/latest-races";
import { PersonWithBike } from "@/components/home/person-with-bike-icon";
import { TrailIntoWater } from "@/components/home/trail-into-water-icon";
import { SearchForm } from "@/components/search/search-form";

interface Discipline {
  name: string;
  description: string;
  icon: LucideIcon;
  /** Liste des courses filtrée sur la discipline ; absent tant que la discipline est en développement. */
  href?: string;
}

const disciplines: Discipline[] = [
  {
    name: "Triathlon",
    description: "Natation, cyclisme et course à pied",
    icon: Waves,
    href: "/races?discipline=triathlon",
  },
  {
    name: "Cross Triathlon",
    description: "Natation, VTT et trail",
    icon: Mountain,
    href: "/races?discipline=cross%20triathlon",
  },
  {
    name: "Duathlon",
    description: "Course à pied et cyclisme",
    icon: Bike,
    href: "/races?discipline=duathlon",
  },
  {
    name: "Cross Duathlon",
    description: "Trail, VTT et trail",
    icon: TreePine,
    href: "/races?discipline=cross%20duathlon",
  },
  {
    name: "Aquathlon",
    description: "Natation et course à pied",
    icon: WavesLadder,
    href: "/races?discipline=aquathlon",
  },
  {
    name: "Swimrun",
    description: "Nage et course en pleine nature, en alternance",
    icon: TrailIntoWater,
    href: "/races?discipline=swimrun",
  },
  {
    name: "Bike & Run",
    description: "En équipe de deux, un vélo pour deux, chacun ses baskets",
    icon: PersonWithBike,
    href: "/races?discipline=bike%26run",
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {disciplines.map((discipline) => {
            const Icon = discipline.icon;

            const content = (
              <>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FC6B32]">
                  <Icon size={24} />
                </div>

                <h3 className="text-lg font-bold">
                  {discipline.name}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {discipline.description}
                </p>

                {discipline.href ? (
                  <div className="mt-auto flex items-center pt-5 gap-2 text-sm font-bold text-[#FC6B32]">
                    Explorer
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                ) : (
                  <div className="mt-auto flex items-center pt-5 gap-2 text-sm font-semibold text-gray-500">
                    <Clock size={15} aria-hidden />
                    En cours de développement, bientôt disponible
                  </div>
                )}
              </>
            );

            return discipline.href ? (
              <Link
                key={discipline.name}
                href={discipline.href}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#FC6B32]/50 hover:shadow-lg"
              >
                {content}
              </Link>
            ) : (
              <div
                key={discipline.name}
                className="flex flex-col rounded-xl border border-dashed border-gray-300 bg-white/60 p-6"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* Dernières compétitions */}
      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">
              Résultats
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              Dernières compétitions
            </h2>
          </div>
          <Link
            href="/races"
            className="group flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#FC6B32]"
          >
            Toutes les courses
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <Suspense fallback={<LatestRacesLoading />}>
          <LatestRaces />
        </Suspense>
      </section>

    </div>
  );
}