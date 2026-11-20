-- Remise à zéro des identifiants stables (voir ids_stables.sql). À lancer à la main, seulement
-- pour tout renuméroter : les liens déjà partagés vers un athlète ou une épreuve casseront.
--   psql -d tri_results -f transform/reset_ids_stables.sql
-- puis reconstruire la base (transform/run_sql.py).
DROP TABLE IF EXISTS ids_stables;
DROP TABLE IF EXISTS redirections;
