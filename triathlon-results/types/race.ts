// Type aligné sur le modèle SQLAlchemy `Race` de l'API (api/main.py).

export interface Race {
  id: number;
  name_epreuve: string | null;
  type_epreuve: string | null;
  format_epreuve: string | null;
  year_epreuve: string | null;
  date_epreuve: string | null;
  lieu_epreuve: string | null;
  /** Aucun temps total publié par la source : pas de classement (participants seulement). */
  sans_temps: boolean;
  /** Au moins un temps intermédiaire publié : sinon seul le temps total est affiché. */
  avec_segments: boolean;
  /** Nombre de temps signalés comme probablement faux dans la source. */
  temps_suspects: number;
  /** Tous les temps totaux sont suspects : la source ne publie pas de temps total fiable. */
  temps_non_fiables: boolean;
  /** Le classement publié suit un autre temps que le total (plus de 5 % des classés hors ordre). */
  classement_hors_ordre: boolean;
}

// Types alignés sur GET /races/{id}/event : la course (nom + année) et ses formats.

export interface PodiumLeader {
  athlete_id: number;
  nom_athlete: string | null;
  /** Équipe (bike&run, relais) : pas de profil d'athlète. */
  equipe: boolean;
  total_time: string | null;
  /** Temps anormalement court : probable erreur de la source. */
  temps_suspect: boolean;
}

export interface RaceFormat {
  id: number;
  type_epreuve: string | null;
  format_epreuve: string | null;
  date_epreuve: string | null;
  participants: number;
  winner: PodiumLeader | null;
  first_woman: PodiumLeader | null;
  /** Aucun temps total publié par la source : pas de podium ni de classement. */
  sans_temps: boolean;
  /**
   * Sous-classement (championnat, catégorie…) d'une autre épreuve du même jour : ses résultats
   * n'y sont pas comptés une seconde fois dans les profils.
   */
  sous_classement: boolean;
}

export interface RaceEdition {
  year_epreuve: string;
  race_id: number;
}

export interface RaceEvent {
  id: number;
  name_epreuve: string | null;
  year_epreuve: string | null;
  lieu_epreuve: string | null;
  date_start: string | null;
  date_end: string | null;
  participants: number;
  formats: RaceFormat[];
  editions: RaceEdition[];
}

// Repères de niveau d'une épreuve (GET /races/{id}/stats).

export interface HistogramBar {
  debut: string;
  fin: string;
  count: number;
}

export interface CategoryBenchmark {
  /** Catégorie d'âge FFTRI (S3, V1, JU ; SE et VE sans niveau). */
  categorie: string;
  /** Sexe dans les repères de tous les classés (S3 hommes et S3 femmes) ; null par sexe. */
  sexe: "M" | "F" | null;
  classes: number;
  /** Temps du 3e de la catégorie ; null quand elle compte moins de 3 classés. */
  troisieme: string | null;
}

/** Repères du temps total ou d'un segment (natation, vélo, course à pied…). */
export interface SegmentBenchmarks {
  key: string;
  label: string;
  classes: number;
  vainqueur: string;
  /** Temps du 3e (null sous 3 classés). */
  podium: string | null;
  /** Temps sous lequel se trouvent les 10 % / 25 % les plus rapides ; null quand ce rang tombe
   * dans le podium (top 10 % sous 31 classés, top 25 % sous 13). */
  top10: string | null;
  top25: string | null;
  mediane: string;
  dernier: string;
  /** null sous 20 classés. */
  histogramme: { largeur_minutes: number; barres: HistogramBar[] } | null;
  categories: CategoryBenchmark[];
}

export interface RaceStats {
  id: number;
  /** Tous les classés : total d'abord, puis les segments affichés par le classement ; vide sans temps. */
  segments: SegmentBenchmarks[];
  /** Mêmes repères pour les hommes (M) et les femmes (F). */
  par_sexe: { M: SegmentBenchmarks[]; F: SegmentBenchmarks[] };
}

// Tendances d'une course entre éditions (GET /races/{id}/trends).

/** Une édition pour tous les classés, ou pour un sexe. */
export interface EditionSummary {
  participants: number;
  classes: number;
  /** Part de classés (0 à 1). */
  taux_classes: number | null;
  mediane: string | null;
  /** null sous 31 classés (il tomberait dans le podium). */
  top10: string | null;
  /** Médiane de chaque segment, par clé (swim, bike, run ; run1, bike, run2 en duathlon). */
  segments: Record<string, string>;
}

export interface TrendEdition {
  year: string;
  race_id: number;
  date: string | null;
  tous: EditionSummary;
  M: EditionSummary;
  F: EditionSummary;
}

/** Une discipline et un format d'une course, avec au moins deux éditions. */
export interface TrendSeries {
  type_epreuve: string;
  format_epreuve: string;
  segments: { key: string; label: string }[];
  editions: TrendEdition[];
}

export interface RaceTrends {
  id: number;
  name_epreuve: string;
  series: TrendSeries[];
}

// Temps des classés d'une épreuve, pour le simulateur « Et moi ? » (GET /races/{id}/times).

export interface TimedAthlete {
  /** null pour une équipe (pas de profil). */
  athlete_id: number | null;
  nom: string;
  clt: number;
  sexe: "M" | "F" | null;
  categorie: string | null;
  /** Temps en secondes, par clé : total, segments (swim, bike, run…) et transitions (t1, t2). */
  [time: string]: number | string | null;
}

export interface RaceTimes {
  id: number;
  /** Segments classés (natation, vélo, course à pied ; course 1, vélo, course 2 en duathlon). */
  segments: { key: string; label: string }[];
  /** T1 et T2 : saisissables pour calculer le total, non classées. */
  transitions: { key: string; label: string }[];
  athletes: TimedAthlete[];
}
