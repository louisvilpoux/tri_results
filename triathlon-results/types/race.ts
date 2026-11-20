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
}

// Types alignés sur GET /races/{id}/event : la course (nom + année) et ses formats.

export interface PodiumLeader {
  athlete_id: number;
  nom_athlete: string | null;
  /** Équipe (bike&run, relais) : pas de profil d'athlète. */
  equipe: boolean;
  total_time: string | null;
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
