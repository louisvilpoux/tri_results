// Type aligné sur le modèle SQLAlchemy `Race` de l'API (api/main.py).

export interface Race {
  id: number;
  name_epreuve: string | null;
  type_epreuve: string | null;
  format_epreuve: string | null;
  year_epreuve: string | null;
  date_epreuve: string | null;
  lieu_epreuve: string | null;
}
