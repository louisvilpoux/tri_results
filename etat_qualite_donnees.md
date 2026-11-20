# État des lieux de la qualité des données

Audit initial du 20/11/2026 au commit `007557a`, mis à jour le 20/11/2026 (noms d'athlètes, après `f5ecb2c`)
(base reconstruite avec `transform/run_sql.py`). Fait suite à
[retour_utilisateur.md](retour_utilisateur.md) (identifiants D1 à D6).

## Volumes

| Table | Lignes |
|-------|--------|
| results | 839 492 (fftri_t2_area 698 045, prolivesport 85 599, chronoweb 55 848) |
| races (épreuves) | 3 575, sous 471 noms de course |
| athlètes (`unified_id`) | 270 455 |
| lignes d'équipe | 9 615 |
| lignes de sous-classement | 7 680 (38 épreuves) |

Contrôles sans anomalie : aucune épreuve sans résultat, aucune épreuve sans date, aucun
résultat individuel sans athlète, aucun athlète deux fois dans la même épreuve, aucun athlète
avec plus de 25 courses adultes sur une saison (pas de fusion massive d'homonymes visible),
classement cohérent avec le temps dans 99 % des épreuves.

---

## Synthèse par gravité

| # | Problème | Ampleur actuelle | Statut |
|---|----------|------------------|--------|
| Q1 | Temps total faux alors que les segments sont bons | ≥ 22 épreuves, 341 lignes < 5 min hors jeunes | **Ouvert** : meilleur temps faux sur le profil |
| Q2 | Épreuves sans aucun temps total | 270 épreuves prolivesport, 17 584 lignes | **Traité** (affichage) : liste de participants, pas de recalcul |
| Q3 | Temps total à 00:00:00 | 0 ligne | **Corrigé** : vidé, affiché « — » |
| Q4 | Temps chronoweb illisibles | 0 temps hors format hh:mm:ss | **Corrigé** |
| Q5 | Catégories d'âge non normalisées | 3 141 valeurs distinctes | Ouvert (D2) |
| Q6 | Épreuves en double le même jour | 38 sous-classements, 2 doublons supprimés | **Corrigé** |
| Q7 | Lieu manquant | 2 219 épreuves sur 3 575 (62 %), toutes fftri_t2_area | Ouvert |
| Q8 | Club manquant ou parasite | 0 \`, 0 parasite ; 344 172 lignes sans club (40 %, la source ne le donne pas) | **Corrigé** (D5) |
| Q9 | Noms mal encodés | 0 | **Corrigé** |
| Q10 | Segments incohérents avec le total (prolivesport) | 00:00:00 vidés ; segments décalés restants | Partiel |
| Q11 | Noms de course encore séparés | 0 cas connu ; accents fftri manquants | **Corrigé** (D3) |
| Q12 | Athlètes avec résultats des deux sexes | 634 athlètes | Atténué : le sexe affiché est le plus fréquent |
| Q13 | Épreuves sans format | 57 épreuves | Ouvert |
| Q14 | Un athlète en plusieurs profils / homonymes d'une épreuve fusionnés | 477 noms tronqués, ~390 homonymes | **Corrigé** |

---

## Points corrigés depuis l'audit initial

| # | Commit | Correction |
|---|--------|------------|
| Q4 | `ef85a7f` | `chronoweb_temps` (raw_data.sql) : fractions de seconde tronquées, « ? » et dates Excel vidés. |
| Q2 / Q3 | `70eb4c1` | 00:00:00 vidé dans results.sql (total et segments). Les 270 épreuves sans temps ni classement sont marquées `sans_temps` : page « Participants » par ordre alphabétique, pas de podium. Pas de recalcul : la somme des segments prolivesport ne correspond au total à 2 s près que dans 60 % des cas. |
| Q6 | `816340e` | `sous_classements.sql` : une épreuve dont ≥ 95 % des athlètes sont dans une épreuve plus grande du même jour est un sous-classement (26 « Championnat de France Fftri » publiés à côté de leur course hôte, catégories para de Cabourg 2025, « Open » / « Jeunes » des Moines 2020…). Visible sur sa page, non compté dans les profils. 2 doublons identiques supprimés. |
| Q8 | nettoyage des clubs | `nettoie_club` (raw_data.sql) : « ` » → apostrophe (5 694 lignes), valeurs « pas de club » (1 519) et licences individuelles (environ 700) vidées : ce ne sont pas des clubs. |
| Q9 | `c4ec3f4` | `corrige_encodage` (raw_data.sql) : 218 noms et 29 clubs corrigés (« ThÃ©o » → « Théo ») ; les résultats rejoignent le bon athlète. |
| Q11 | `8e1542c` puis « Saint / Sainte » | Normalisation des noms de course (504 → 471) : clé sans petits mots ni ponctuation, « St / Ste / Sainte » = « Saint », alias, noms fftri mis en forme. |
| Q12 | `8e1542c` | `athletes_sexe.sql` : le filtre sexe de la liste suit le sexe le plus fréquent du profil. |
| Q14 | noms d'athlètes | Clé d'athlète sans tirets ni apostrophes (« Jean-Marc » = « Jean Marc ») ; `athletes_tronques.sql` rattache 477 noms coupés par la source (« BASSETTO JEAN MA ») ; `homonymes.sql` garde les deux homonymes d'une même épreuve (temps différents) comme deux athlètes : 395 résultats retrouvés. |

---

## Détail des points ouverts

### Q1 — Temps total faux, segments corrects (priorité 1)
Le successeur direct de D1 : l'exclusion des CLM a corrigé Villeneuve-d'Ascq, mais le même
type d'erreur existe ailleurs.

- **Tribreizh 2022, L** (fftri_t2_area) : 31 lignes, médiane du total à 00:01:06 alors que
  les segments sont normaux (1er : total 00:01:03, natation 00:29:51, vélo 02:30:39, course
  01:15:47). Conséquence : « MACQ Guillaume » a un meilleur temps L de **00:01:03** sur son
  profil. Toujours présent au commit `c4ec3f4`.
- Même cas : Duathlon de Douai 2017 S, Triathlon de Saint Remy sur Durolle 2005 L.
- Totaux isolés aberrants (< 50 % de la médiane de l'épreuve) : 86 lignes fftri sur 15
  épreuves, 28 lignes prolivesport sur 7 épreuves (Openlakes Champagne 2026, Bordeaux
  2018-2021, Obernai 2016…).
- Vainqueurs trop rapides pour le format (triathlon) : 20 en L, 20 en M, 12 en S, 3 en XL,
  3 en XS, 2 en XXL.

Piste : quand les 5 segments sont valides et que le total est incohérent (écart > 5 % avec
leur somme), recalculer le total — ces cas viennent surtout de fftri, dont les segments sont
fiables (somme cohérente avec le total dans 98 % des lignes) ; sinon, exclure la ligne des
meilleurs temps. Ajouter un seuil minimal par discipline et format pour les meilleurs temps.

### Q10 — Segments prolivesport décalés
Les segments à 00:00:00 sont maintenant vides. Restent des colonnes décalées : au
Cross-Duathlon du Haricot 2018, « T2 » vaut 01:32:31 et la course à pied 00:01:38, comme pour
les épreuves CLM exclues. Même quand le total existe, la somme des segments prolivesport ne lui
correspond à 2 s près que dans 60 % des lignes (80 % à 5 % près). Piste : n'afficher les
segments prolivesport que lorsque leur somme est cohérente avec le total.

### Q5 — Catégories (D2, inchangé)
- 3 141 valeurs distinctes. Chaque source a son système : fftri et chronoweb « MSE, MV1,
  MS3 », prolivesport « SE, MA, VE, JU », Ironman « M30-34 ».
- 566 valeurs contiennent autre chose qu'une catégorie : « 38/MS3 », « 2/F 25-29 »
  (classement collé), « M(15.) », nombres seuls.
- 18 534 lignes sans catégorie.
- 15,3 % des saisons d'athlète ont plusieurs catégories. Ex. DUPONT Damien en 2025 : MA,
  MS2 et MV1.

Piste : table de correspondance vers les catégories FFTRI, nettoyage des préfixes « n/ » ; à
terme, calculer la catégorie à partir de l'année de naissance quand elle est connue.

### Q7 — Lieu manquant
Les 2 219 épreuves fftri_t2_area n'ont pas de lieu (la source ne le donne pas). chronoweb et
prolivesport sont complets. Piste : reprendre le lieu d'une autre édition ou d'une autre
source de la même course, ou le récupérer dans le calendrier FFTRI.

### Q8 — Clubs (corrigé)
- « \` » remplacé par une apostrophe ; valeurs « pas de club » et licences individuelles
  (« INDIVIDUEL », « LICENCE INDIV. », « LICENSE INDIVIDUELLE »…) vidées.
- Reste : 344 172 lignes de la table athletes sans club (40 %) — la source ne le donne pas.
  Quelques écritures rares de licence individuelle restent (« H-LIC.INDIVIDUELLE-C »,
  « TRIATHLON INDIVIDUEL », 5 lignes) ; les « clubs » qui commencent par « INDIVIDUEL » suivi
  d'un nom (« INDIVIDUEL TO BE SPORT ») sont aussi vidés.

### Q11 — Noms de course (D3, corrigé)
« Saint » / « Sainte » Aldegonde sont réunis en « Duathlon de Sainte Aldegonde - Pays de
Mormal » (2023-2026). Reste une limite : les accents des noms fftri_t2_area ne peuvent pas être
retrouvés automatiquement (« Triathlon d'Angouleme ») ; ils s'ajoutent au cas par cas par un
alias dans `transform/noms_epreuves.sql`.

### Q12 / Q13
- 634 athlètes ont des résultats marqués M et F : homonymes fusionnés ou sexe mal renseigné.
  Le profil et le filtre affichent le sexe le plus fréquent.
- 57 épreuves sans format (« CD » d'Altriman, « Poursuite », finales…) : elles n'apparaissent
  dans aucun filtre de format.

---

## Suivi des points du retour utilisateur

| # | Statut |
|---|--------|
| D1 Meilleur temps impossible | Corrigé pour Villeneuve-d'Ascq (CLM exclus) ; **même erreur ailleurs** (Q1) |
| D2 Catégories incohérentes | Non corrigé (Q5) |
| D3 Éditions non regroupées | Corrigé (504 → 471 noms) ; accents fftri manquants (Q11) |
| D4 Ordre nom/prénom | Affichage en NOM Prénom sur les classements ; à revérifier dans les listes de recherche |
| D5 Caractère \` dans les clubs | Corrigé (Q8) |
| D6 Format qui change entre éditions | Non audité : plusieurs formats par course sont normaux, le contrôle demande une règle plus fine ; l'ordre des formats est désormais stable (`007557a`) |

Autre constat : les identifiants d'athlète (`unified_id`) et d'épreuve changent à chaque
reconstruction de la base, ce qui casse les liens de profil et de course.

## Ordre de travail proposé

1. **Q1** : recalcul ou exclusion des totaux incohérents, seuil minimal sur les meilleurs
   temps. C'est ce qui rend un profil faux.
2. **Q10** : masquer les segments prolivesport incohérents avec le total.
3. **Q5** : table de correspondance des catégories.
4. Identifiants d'athlète et d'épreuve stables.
5. Q7, Q13.
