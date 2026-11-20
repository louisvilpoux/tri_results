# État des lieux de la qualité des données

Audit du 20/11/2026, base reconstruite avec `transform/run_sql.py` au commit `007557a`
(après l'exclusion des épreuves CLM et la normalisation des noms de course).
Fait suite à [retour_utilisateur.md](retour_utilisateur.md) (identifiants D1 à D6).

## Volumes

| Table | Lignes |
|-------|--------|
| results | 839 169 (fftri_t2_area 697 692, prolivesport 85 574, chronoweb 55 903) |
| races (épreuves) | 3 577 |
| athlètes (`unified_id`) | 273 479 |
| lignes d'équipe | 9 615 |

Contrôles sans anomalie : aucune épreuve sans résultat, aucune épreuve sans date, aucun
résultat individuel sans athlète, aucun athlète deux fois dans la même épreuve, aucun athlète
avec plus de 25 courses adultes sur une saison (pas de fusion massive d'homonymes visible),
classement cohérent avec le temps dans 99 % des épreuves.

---

## Synthèse par gravité

| # | Problème | Ampleur | Visible par l'utilisateur |
|---|----------|---------|---------------------------|
| Q1 | Temps total faux alors que les segments sont bons | ≥ 22 épreuves, 341 lignes < 5 min hors jeunes | **Oui** : meilleur temps faux sur le profil |
| Q2 | Épreuves sans aucun temps total | 307 épreuves, 20 804 lignes | Oui : classement sans temps |
| Q3 | Temps total à 00:00:00 (prolivesport) | 26,8 % des lignes prolivesport | Oui |
| Q4 | Temps chronoweb illisibles | 10,5 % invalides + 10,3 % vides | Oui : temps absents |
| Q5 | Catégories d'âge non normalisées | 3 142 valeurs distinctes ; 15,3 % des saisons d'athlète ont plusieurs catégories | Oui (D2) |
| Q6 | Épreuves en double le même jour | 95 groupes ; 9 031 athlète-jours avec 2 épreuves adultes | Oui : courses comptées deux fois |
| Q7 | Lieu manquant | 2 219 épreuves sur 3 577 (62 %), toutes fftri_t2_area | Oui (U2, U3) |
| Q8 | Club manquant ou parasite | 341 436 lignes athletes sans club, 5 694 avec \` | Oui (D5) |
| Q9 | Noms mal encodés | 189 lignes (« ThÃ©o ») | Oui |
| Q10 | Segments incohérents avec le total (prolivesport) | 20,2 % des lignes comparables | Peu (segments à 00:00:00) |
| Q11 | Noms de course encore séparés | ex. « Saint » / « Sainte » Aldegonde | Oui (D3) |
| Q12 | Athlètes avec résultats des deux sexes | 634 athlètes | Peu |
| Q13 | Épreuves sans format | 58 épreuves | Oui : filtre format |

---

## Détail

### Q1 — Temps total faux, segments corrects (priorité 1)
Le successeur direct de D1 : l'exclusion des CLM a corrigé Villeneuve-d'Ascq, mais le même
type d'erreur existe ailleurs.

- **Tribreizh 2022, L** (fftri_t2_area) : 31 lignes, médiane du total à 00:01:06 alors que
  les segments sont normaux (1er : total 00:01:03, natation 00:29:51, vélo 02:30:39, course
  01:15:47). Conséquence : « MACQ Guillaume » a un meilleur temps L de **00:01:03** sur son
  profil.
- Même cas : Duathlon de Douai 2017 S, Triathlon de Saint Remy sur Durolle 2005 L.
- Totaux isolés aberrants (< 50 % de la médiane de l'épreuve) : 86 lignes fftri sur 15
  épreuves, 28 lignes prolivesport sur 7 épreuves (Openlakes Champagne 2026, Bordeaux
  2018-2021, Obernai 2016…).
- Vainqueurs trop rapides pour le format (triathlon) : 20 en L, 20 en M, 12 en S, 3 en XL,
  3 en XS, 2 en XXL.

Piste : quand les 5 segments sont valides et que le total est nul ou incohérent (écart > 5 %
avec leur somme), recalculer le total ; sinon, exclure la ligne des meilleurs temps. Ajouter
un seuil minimal par discipline et format pour les meilleurs temps.

### Q2 / Q3 — Temps total absent ou à zéro
- 307 épreuves n'ont aucun temps total : 270 prolivesport (17 584 lignes), 36 chronoweb
  (3 055), 1 fftri (165). Ex. Triathlon de Chamouille 2017 et 2019, Cross-Duathlon du
  Haricot 2016-2021, Triathlon de Chantilly 2019 XS, Triathlon des Moines 2020 S.
- La source est en cause : dans le CSV prolivesport, `temps` vaut 00:00:00 et `clt` 0 pour
  toutes les lignes, mais les segments sont souvent présents.
- Côté prolivesport, 22 946 lignes à 00:00:00 sont non classées (`clt` 0) ; 13 160 d'entre
  elles ont des segments.

Piste : recalculer le total à partir des segments quand ils sont tous présents, et recalculer
le classement ; sinon, signaler l'épreuve « sans temps » dans l'interface plutôt que
d'afficher 00:00:00.

### Q4 — Temps chronoweb
- 10,5 % des temps totaux au mauvais format : secondes décimales (`00:26:55.702000`), `?`,
  `-00:00:01`.
- 10,3 % de temps vides.

Piste : tronquer les fractions de seconde au chargement (correction simple), traiter `?` et
les négatifs comme vides.

### Q5 — Catégories (D2, inchangé)
- 3 142 valeurs distinctes. Chaque source a son système : fftri et chronoweb « MSE, MV1,
  MS3 », prolivesport « SE, MA, VE, JU », Ironman « M30-34 ».
- 566 valeurs contiennent autre chose qu'une catégorie : « 38/MS3 », « 2/F 25-29 »
  (classement collé), « M(15.) », nombres seuls.
- 18 534 lignes sans catégorie.
- 15,3 % des saisons d'athlète ont plusieurs catégories. Ex. DUPONT Damien en 2025 : MA,
  MS2 et MV1.

Piste : table de correspondance vers les catégories FFTRI, nettoyage des préfixes « n/ » ; à
terme, calculer la catégorie à partir de l'année de naissance quand elle est connue.

### Q6 — Épreuves en double le même jour
- 95 groupes d'épreuves avec même nom, année, discipline, format et date.
- Ex. Triathlon des Moines 2020 : « Triathlon S Full » (231 résultats) et « Triathlon S
  Open » (122) sont deux classements de la même course ; les mêmes athlètes apparaissent
  dans les deux.
- 9 031 cas d'un athlète classé dans deux épreuves adultes le même jour : une partie est
  normale (XS puis S), une partie est un double comptage qui gonfle `nb_races`.

Piste : pour prolivesport, ne garder que le classement « Full » (ou le plus grand) quand
deux épreuves partagent date, discipline et format.

### Q7 — Lieu manquant
Les 2 219 épreuves fftri_t2_area n'ont pas de lieu (la source ne le donne pas). chronoweb et
prolivesport sont complets. Piste : reprendre le lieu d'une autre édition ou d'une autre
source de la même course, ou le récupérer dans le calendrier FFTRI.

### Q8 — Clubs
- 341 436 lignes de la table athletes sans club (39 %).
- Valeurs parasites : « NON LICENCIE » (273), « NONE » (32), « - » (29), « . » (13).
- 5 694 clubs contiennent \` au lieu de ' (D5, inchangé).

### Q9 — Encodage
189 noms d'athlète mal encodés (« ThÃ©o HANQUIEZ ») : prolivesport 83, fftri 94, chronoweb 12.
Piste : corriger le double encodage UTF-8 au chargement.

### Q10 — Segments prolivesport
20,2 % des lignes prolivesport dont tous les segments sont lisibles ont une somme éloignée de
plus de 5 % du total, contre 2,1 % pour fftri et 3,5 % pour chronoweb. Cause principale :
segments absents écrits 00:00:00 au lieu de vides (Versailles Triathlon Festival 2019 S,
Chantilly 2019 S, Chamouille 2022 S). Piste : traiter 00:00:00 comme vide pour les segments.

### Q11 — Noms de course (D3, partiellement corrigé)
La normalisation (commit `8e1542c`) a réduit les doublons fftri de 504 à 472 noms, mais
« Duathlon de Saint Aldegonde » et « Duathlon de Sainte Aldegonde » restent séparés, et
« Pays de mormal » garde une minuscule. Piste : ajouter un alias ou traiter saint/sainte
dans `nom_course_cle`.

### Q12 / Q13
- 634 athlètes ont des résultats marqués M et F : homonymes fusionnés ou sexe mal renseigné.
- 58 épreuves sans format : n'apparaissent dans aucun filtre de format.

---

## Suivi des points du retour utilisateur

| # | Statut |
|---|--------|
| D1 Meilleur temps impossible | Corrigé pour Villeneuve-d'Ascq (CLM exclus) ; **même erreur ailleurs** (Q1) |
| D2 Catégories incohérentes | Non corrigé (Q5) |
| D3 Éditions non regroupées | Partiellement corrigé (Q11) |
| D4 Ordre nom/prénom | Affichage en NOM Prénom sur les classements ; à revérifier dans les listes de recherche |
| D5 Caractère \` dans les clubs | Non corrigé (5 694 lignes) |
| D6 Format qui change entre éditions | Non audité : plusieurs formats par course sont normaux, le contrôle demande une règle plus fine |

Autre constat : les identifiants d'athlète (`unified_id`) changent à chaque reconstruction
de la base (DUPONT Damien : 806619 puis 781617), ce qui casse les liens de profil.

## Ordre de travail proposé

1. **Q1** : recalcul ou exclusion des totaux incohérents, seuil minimal sur les meilleurs
   temps. C'est ce qui rend un profil faux.
2. **Q4** et **Q10** : corrections simples au chargement (fractions de seconde, 00:00:00
   comme vide).
3. **Q2 / Q3** : total recalculé à partir des segments quand c'est possible.
4. **Q6** : doublons « Full » / « Open » de prolivesport.
5. **Q5** : table de correspondance des catégories.
6. Identifiants d'athlète stables.
7. Q7, Q8, Q9, Q11, Q12, Q13.
