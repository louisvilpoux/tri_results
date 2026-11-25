# État des lieux de la qualité des données — 25/11/2026 (second audit)

Audit du 25/11/2026 au soir, au commit `ee5706f`, sur la base reconstruite avec
`transform/run_sql.py` après l'arrivée de timingzone : 894 636 résultats. Elle n'a pas été
reconstruite pendant l'audit.
Audit précédent : [etat_qualite_donnees_2026-11-25.md](etat_qualite_donnees_2026-11-25.md) (même
jour, au commit `f064619`, complété jusqu'aux corrections Q5, Q13, Q18, Q20, Q21). Les identifiants
Q1 à Q21 sont repris ; Q22 à Q25 sont nouveaux. D12 à D19 renvoient à
[retour_utilisateur_2026-11-25.md](retour_utilisateur_2026-11-25.md).

Depuis le premier audit du 25/11 : corrections Q20, Q21, Q18, Q13, Q5 et petits restes (`85747cd` à
`3f697e9`), segments décalés retirés et signalés (D12, `b00e29a`), corrections rapides du retour du
25/11 (U19, U20, U22, D18, D19, `3c32ced`), natation probablement annulée signalée (D14, `8ce6880`)
et arrivée de **timingzone**, 5ᵉ source (`6cfacb9`, `33214fc`, `ee5706f`).

## Volumes

Colonne « 25/11 matin » : chiffres du premier audit après ses corrections (Q20, Q21) quand il les
donne, sinon ceux de l'audit.

| Table | 25/11 matin | 25/11 soir | Écart |
|-------|-----------:|-----------:|-------|
| results | 867 812 | 894 636 | +26 824 : timingzone (+26 829), relais de Cepoy 2026 retirés (−5) |
| — fftri_t2_area | 698 045 | 698 045 | |
| — prolivesport | 85 269 | 85 269 | |
| — chronoweb | 55 536 | 55 536 | |
| — protiming | 28 962 | 28 957 | −5 (Q18, Cepoy 2026) |
| — timingzone | — | 26 829 | nouvelle source, 254 épreuves |
| races (épreuves) | 3 925 | 4 178 | +254 timingzone, finales d'Extrememan 2020 réunies (−1) |
| noms de course | 495 | 511 | |
| athlètes (`unified_id`) | 280 809 | 292 290 | |
| — avec un résultat individuel | 266 035 | 273 336 | |
| lignes d'équipe | 15 202 | 20 014 | +4 784 timingzone, Entreprises de Bordeaux 2026 (Q18) |
| lignes de sous-classement | 7 700 (38 épreuves) | 7 790 (39 épreuves) | |
| doublons de source retirés | 172 paires | 200 paires (60 prolivesport, 48 chronoweb, 64 protiming, 28 timingzone) | |
| ids stables | 4 202 clés d'épreuve, 281 369 d'athlète | 4 511 clés d'épreuve, 292 851 d'athlète | |
| redirections | 276 (273 épreuves, 3 athlètes) | 303 (300 épreuves, 3 athlètes) | |
| lieux distincts | 412 | 421 | |

Contrôles sans anomalie : aucune épreuve sans résultat, sans date, avec une date future ou une
année différente de sa date ; aucun athlète deux fois dans la même épreuve ; aucun total à
00:00:00 ; aucun temps négatif ; aucun total mal formé ; aucun club avec « ` » ; aucune clé
d'athlète avec tiret, apostrophe ou virgule ; aucun nom de course écrit de deux façons (même clé) ;
aucune épreuve en double entre deux sources (date à un jour près, au moins la moitié des athlètes
en commun) ; sexe M, F ou vide partout ; **plus aucun nom avec un double espace** (82 239 le matin,
mis en forme par `noms_affiches.sql`, D18) ; aucun SWIMBIKE (Q20).

Segments cohérents avec le total à 5 % près (lignes avec les 5 segments) : prolivesport 100 %,
**timingzone 100 %**, fftri_t2_area 98,7 % (98,1 % le matin : segments décalés retirés, D12),
protiming 97,9 %, chronoweb 97,5 %.

Classement dans l'ordre des temps (classés individuels, hors temps suspects et sous-classements ;
une inversion = total plus court de plus de 30 s que celui du classé précédent) : 3 310 épreuves
sur 3 335. Les équipes sont exclues du calcul, d'où un total plus faible que le matin (3 601).

---

## Synthèse par gravité

| # | Problème | 25/11 matin | 25/11 soir | Statut |
|---|----------|-------------|------------|--------|
| Q22 | **Club écrit à la place du nom de l'athlète** | — | Triathlon de Hyères 2026 (timingzone) : 98 lignes individuelles, 37 faux athlètes (« TRI ACADEMY SQUAD » : 14 résultats). 0 après correction | **Corrigé** le 25/11 |
| Q24 | **Duos de swimrun comptés comme des athlètes** | — | chronoweb : 392 lignes (10 épreuves, 2 courses) ; prolivesport : Douai 2023 « Swimrun S (Duo) », 11 lignes. 0 après correction | **Corrigé** le 25/11 |
| Q23 | Classement par catégorie présenté comme un classement général | — | 3 épreuves jeunes timingzone à plusieurs « 1ᵉʳ » (Hyères 2026 Poussins / Pupilles : 4 ; Funny Day 2024 : 2 et 2) | Nouveau |
| Q25 | Catégories timingzone non reconnues | — | 3,1 % des lignes (« JUN », « VET », « CAD » : 174 lignes, faciles à lire). 2,2 % après correction (« HOM », « FEM », « PRO », voulus) | **Corrigé** le 25/11 |
| Q13 | Épreuves sans format | 45 | 75 (+30 timingzone ; « MIDDLE DISTANCE », « MINI POUS / POUS » lisibles). 72 après correction | **Corrigé** le 25/11 (reste faute de distance) |
| Q7 | Lieu manquant ou incohérent | 0 | 1 ville écrite de deux façons (Saint-Laurent-du-Var), Monaco sans code postal | Rouvert (mineur) |
| Q16 | Identifiants instables | non revérifié | 2 redirections en chaîne (806 → 804 → 1691, 807 → 805 → 1692) | Mineur |
| Q1 | Temps total faux | 5 084 temps suspects | 5 168 (+84 timingzone, à juste titre) | Corrigé |
| Q2 | Épreuves sans temps ni classement | 262 épreuves, 17 539 lignes | inchangé (toutes prolivesport) | Traité (affichage « Participants ») |
| Q3 | Total à 00:00:00 | 0 | 0 | Corrigé |
| Q4 | Temps illisibles | 0 | 0 | Corrigé |
| Q5 | Catégories d'âge | 0,9 % de saisons à plusieurs catégories | 1,0 % ; timingzone : 92,8 % de catégories précises | Corrigé |
| Q6 | Épreuves en double le même jour | 38 sous-classements | 39 | Corrigé |
| Q8 | Club manquant | 39,8 % | 40,3 % des résultats individuels (timingzone 59,6 %, dont Q22) | Corrigé (la source ne le donne pas) |
| Q9 | Noms mal encodés | 3 noms irrécupérables | inchangé ; aucun dans timingzone | Corrigé, résidu de la source |
| Q10 | Segments prolivesport décalés | 0 | 0 ; 14 610 lignes à segments retirés (D12 : 11 504 prolivesport, 3 106 fftri) | Corrigé |
| Q11 | Noms de course | 0 | 0 | Corrigé |
| Q12 | Athlètes avec résultats des deux sexes | 689 | 731 | Atténué |
| Q14 | Noms d'athlètes | 0 | 0 ; 63 noms vides ou sans lettre | Corrigé |
| Q15 | Sexe | 0 valeur hors M/F | 0 | Corrigé |
| Q17 | Noms de course sans ponctuation | inchangé | timingzone en majuscules mis en forme (« Triathlon de Hyeres ») | Corrigé |
| Q18 | Classement publié qui ne suit pas les temps | 7 épreuves signalées | 6 fftri inchangées ; Marcq 2024 sorti du calcul (équipes) ; 4 timingzone, dont 3 relèvent de Q23 | Corrigé |
| Q19 | Temps protiming « mm:ss:00 » | 0 | 0 ; 9 totaux au-dessus de 24 h, tous fftri | Corrigé |
| Q20 | Épreuve natation + vélo | 0 | 0 (« SWIM BIKE » du Réunion Tri Tour exclu) | Corrigé |
| Q21 | Duos prolivesport comptés comme des athlètes | 0 | 0 dans les épreuves « Duo » de triathlon ; voir Q24 pour le swimrun | Corrigé |

---

## Détail des nouveaux points

### Q22 — Club écrit à la place du nom de l'athlète (Hyères 2026)

Le Triathlon de Hyères 2026 (timingzone, RACE RESULT 422721) publie ses épreuves individuelles
avec la mise en page des relais : une colonne « Team name » (le club et le dossard, « SAINT
RAPHAEL TRIATHLON (41) ») et une colonne « AfficherNoms » (la personne, « SAJAT, David / »).
`timingzone_organize.py` prend « Team name » comme nom, et « AfficherNoms » seulement quand
« Team name » est vide.

| Épreuve | Lignes | Nom = club | Clubs distincts |
|---------|-------:|-----------:|----------------:|
| SPRINT INDIVIDUELS | 413 | 93 | 37 |
| BENJAMINS | 13 | 5 | 5 |

Conséquences :
- 37 faux athlètes portent un nom de club et réunissent les licenciés de ce club classés dans
  l'épreuve (« TRI ACADEMY SQUAD » : 14 résultats, « TOULON VAR TRIATHLON » et « HYERES
  TRIATHLON » : 8) ; ils sortent dans la liste des athlètes et la recherche ;
- les 98 athlètes réels n'ont pas ce résultat dans leur profil ;
- aucune des 417 lignes n'a de club : quand il est publié, il est pris pour le nom.

Les autres fichiers avec « AfficherNoms » sont des relais, où le nom d'équipe est voulu ; aucune
autre épreuve individuelle n'est concernée (mêmes épreuves de Hyères 2022, 2024 et 2025 publiées
dans une mise en page individuelle).

Corrigé le 25/11/2026 dans `sources/timingzone_organize.py` : quand aucune ligne d'un fichier ne
liste plus d'un équipier et que le libellé de l'épreuve ne dit ni « relais », ni « duo », ni
« équipe », ni « team », l'épreuve est individuelle : le nom vient des équipiers (« SAJAT, David »
→ « SAJAT David ») et le nom d'équipe, sans le dossard, devient le club. La condition sur le
libellé évite l'aquathlon en relais de Provence Verte 2025, qui donne son premier relayeur dans
« Team » et le second seul dans « AfficherNom2 ». Seuls les deux fichiers de Hyères 2026 changent.

Résultat (timingzone rechargé, base reconstruite) : 0 nom de club dans ces deux épreuves, 98
lignes avec leur club, plus aucun faux athlète au nom d'un club (les 5 lignes restantes au nom
d'un club sont des relais et des duos, à juste titre) ; 9 lignes de plus (26 838 résultats
timingzone) : deux licenciés d'un même club au même temps ne formaient qu'une ligne. Test :
`test_timingzone_individuals_named_after_the_person` (`api/test_race_results.py`).

### Q24 — Duos de swimrun comptés comme des athlètes

Les swimruns chronoweb se courent en duo. La source écrit le nom de l'équipe dans le nom et les
deux équipiers dans le club, ou l'inverse :

| Nom | Club |
|-----|------|
| GRAS DOUBLE | GRANGER Maxence / DOULE Julien |
| Wonder Women | GIL Line / RATIER Laetitia |
| MILLER Romain / Giardinelli Gaetan | Punishers |

**392 lignes de swimrun chronoweb ne sont pas marquées équipe** (10 épreuves, 2 courses), dont 387
avec deux équipiers séparés par « / » ; les 5 autres sont aussi des duos dont le second équipier
manque (« VALULU », club « KUHLER Lucille / »). Chaque duo devient un faux athlète, et les profils, la liste
des athlètes, la recherche et les clubs (« Punishers », « Perebas ») en contiennent. Hors swimrun,
34 autres lignes chronoweb ont la même forme (29 en triathlon, 5 en cross triathlon : relais ou
duos à vérifier).

Même cas côté prolivesport : Duathlon de Douai 2023, « Swimrun S (Duo) », 11 lignes au nom d'équipe
(« RETARDATAIRE . », « LES BONS BUVEURS . »), non marquées équipe. La règle « duo » de Q21
(`prolivesport_team_name`) attend deux noms d'équipiers ; ici seul le nom d'équipe est publié.

Les swimruns protiming (« Solo », « Individuel ») et timingzone (« SOLO ») non marqués équipe sont
bien individuels.

Les 34 lignes hors swimrun sont de vrais individuels dont le club contient « / » (« TULLE
TRIATHLON / NATATION », « RMT / Triathlon catalan »), sauf 4 lignes d'un cross chronoweb
(« BUGNON / Alfos ») qui ressemblent à des duos, laissées telles quelles.

Corrigé le 25/11/2026 dans `transform/results.sql` :
- chronoweb : toutes les lignes d'un swimrun sont des équipes, lues comme un relais par
  `chronoweb_team_name` (« GRAS DOUBLE », « MILLER Romain & Giardinelli Gaetan (Punishers) ») ;
- prolivesport : toutes les lignes d'une épreuve « Duo » sont des équipes ; quand seul le nom
  d'équipe est publié, il est gardé sans le point qui tient lieu de prénom (« RETARDATAIRE . » →
  « RETARDATAIRE »).

Résultat : 0 ligne de swimrun chronoweb ni d'épreuve Duo prolivesport hors équipe (392 et 11
avant) ; +403 lignes d'équipe ; ces faux profils répondent 404 et sortent de la liste des
athlètes, de la recherche et des clubs. Test : `test_swimrun_duos_are_teams`
(`api/test_race_results.py`).

### Q23 — Classement par catégorie présenté comme un classement général

Trois épreuves jeunes timingzone sont publiées en un seul classement où le rang est celui de la
catégorie et du sexe :

| Épreuve | « 1ᵉʳ » |
|---------|--------:|
| Triathlon de Hyères 2026, POUSSINS / PUPILLES | 4 (PO et PU, filles et garçons) |
| Funny Day (Le Luc) 2024, DUATHLON 6-9 ans | 2 |
| Funny Day (Le Luc) 2024, DUATHLON 12-15 ans | 2 |

Le classement affiche donc plusieurs 1ᵉʳ, 2ᵉ…, et le contrôle Q18 y voit des inversions (14 sur
46 à Hyères). Les règles de Q18 ne marquent rien dans ces épreuves (exception « plusieurs 1ᵉʳ »).
Seule autre épreuve à plusieurs 1ᵉʳ : l'Ironman de Nice 2023 (fftri, 2, déjà connue).
Le 4ᵉ cas timingzone de Q18, Triathlon Saint-Raphaël 2024 aquathlon S (6 classés, 1 inversion),
est une petite épreuve sans conséquence.

Correction proposée : quand une épreuve a plusieurs 1ᵉʳ et que chaque groupe catégorie × sexe a
son propre rang 1, 2, 3…, recalculer le rang général par temps (comme D9) et garder le rang publié
dans `rang_categorie`.

### Q25 — Catégories timingzone non reconnues

`categorie_fftri` lit 92,8 % des catégories timingzone en catégorie précise, 2,7 % en Senior ou
Master sans niveau ; 3,1 % ne sont pas reconnues, 1,4 % sont vides. Parmi les non reconnues :

| Catégorie | Lignes | Lecture |
|-----------|-------:|---------|
| HOM / FEM | 417 | sexe seulement, voulu (pas de code) |
| JUN | 101 | Junior → JU |
| VET | 52 | Vétéran → VE |
| PRO | 35 | voulu (pas de code) |
| CAD | 21 | Cadet → CA |
| « _PU », « _PO », « P_ », « _BE », « 6_ MI »… | une quinzaine | abîmées par la lecture des PDF |

« JUN », « VET » et « CAD » (174 lignes) s'ajoutent sans risque à `categorie_fftri`.

Corrigé le 25/11/2026 dans `categorie_fftri` (`transform/disciplines.sql`) :
- timingzone : « JUN » → JU (101 lignes), « CAD » → CA (21), « VET » → VE (52, vétéran sans
  niveau) ;
- reste de rang abîmé par la lecture du PDF du Triathlon des Jeunes du Cap d'Antibes 2024 retiré
  quand il reste un code entier : « _PU » → PU, « 6_ MI » → MI, « 1_) PO » → PO, « 1_) 30-34 » →
  S3, « _ V1M » → V1 (une quarantaine de lignes). Quand une lettre manque (« P_ », « B_ »,
  « _M_ », « __E », 17 lignes), la catégorie n'est pas devinée (« P_ » peut être PO ou PU).

Résultat (base reconstruite, lignes individuelles timingzone) : catégorie précise 92,8 % →
93,4 %, senior ou master sans niveau 2,7 % → 3,0 %, non reconnue 3,1 % → 2,2 %. Restent sans code,
à dessein : « HOM » / « FEM » (426 lignes, le sexe seul), « PRO » (35), « HANDI » (1). Tests :
`api/test_categories.py`.

Effet de Q24 au passage : chronoweb passe de 1,1 % à 0,3 % de catégories non reconnues, les duos
de swimrun (« MIXT », « MASC ») n'étant plus des lignes individuelles.

---

## Points rouverts

### Q13 — Épreuves sans format (75 ; 45 le matin)

+30 épreuves timingzone, dont le libellé ne donne pas de distance : « INDIVIDUELS », « CLASSEMENT
INDIVIDUEL », « XTREME IND » (Cannes 2024-2026), « TOP » (Top de Porquerolles 2023-2026), « DUATHLON
INDIVIDUEL » (Saint-Laurent-du-Var 2022-2026), swimruns « ULTRA », « MOYENNE » de la Côte Vermeille.
Deux libellés sont lisibles et pourraient recevoir un format :
- « MIDDLE DISTANCE INDIVIDUEL » (Trigames Cagnes 2024) : distance L ;
- « AQUATHLON MINI POUS / POUS » (Saint-Raphaël 2023, 2024) : JEUNES.
Les autres demandent une distance publiée (timingzone n'en donne pas : `distance_epreuve` vide).

Corrigé le 25/11/2026 dans `epreuve_format` (`transform/disciplines.sql`) : « middle » donne L,
comme « half » (la middle distance est la distance L), « POUS » compte comme poussins (JEUNES).
Base reconstruite : seules ces 3 épreuves changent de format (Trigames de Cagnes 2024 → L, Saint-Raphaël 2023 et 2024 → JEUNES ; le
« MIDDLE DISTANCE RELAIS » reste RELAIS) ; 72 épreuves sans format. Tests :
`api/test_formats.py`.

### Q7 — Lieux

Aucune épreuve sans lieu. Nouveaux :
- le Duathlon de Saint-Laurent-du-Var est à « St Laurent du Var (06700) » en 2022-2023 et
  « Saint Laurent du Var (06700) » en 2025-2026 : seule course à deux lieux hors Pierre Percée
  (voulu). `lieux.sql` ne ramène pas « St » à « Saint » ; une ligne dans `lieux_courses.csv`
  suffit (« Saint-Laurent-du-Var (06700) ») ;
- « Monaco » (Triathlon International de Monaco 2026) n'a pas de code postal, comme « Tangier » et
  « Geraardsbergen (9500) » : étranger, normal ; « Monaco (98000) » est possible à la main.

### Q16 — Redirections en chaîne

Deux redirections mènent à une épreuve qui redirige elle-même : 806 → 804 → 1691 et 807 → 805 →
1692 (Duathlon du Lac d'Ardres 2025 et 2026, Duathlon F et M réunis par D9, puis l'épreuve réunie
remplacée). L'ancien lien `/races/806` arrive bien au bout, mais en deux redirections 308. À
aplatir dans `ids_stables.sql` (une redirection doit viser l'id final).

---

## Suivi des corrections récentes

| # | Mesure |
|---|--------|
| D12 | 14 610 lignes à segments retirés et signalés : 11 504 prolivesport (106 épreuves), 3 106 fftri_t2_area (6 épreuves) ; cohérence des segments fftri 98,1 % → 98,7 %. |
| D14 | 15 épreuves à natation probablement annulée signalées (Deauville 2020, Val de Gray 2021, Nevers 2022, Ardres 2022, Chantilly 2022…). |
| D18 | Noms au format « NOM Prénom » : plus aucun double espace (82 239 le matin) ; tout en majuscules : 14 lignes protiming, 94 timingzone (dont les clubs de Q22). |
| Q1 | 5 168 temps suspects : prolivesport 4 485 (38 épreuves), fftri 598 (13), timingzone 84 (22), chronoweb 1. Timingzone : athlètes arrêtés avant l'arrivée classés à la fin, comme Openlakes (Cannes 2026 M : 18, sans course à pied). Triathlons L dont le vainqueur est sous 3 h : 6, parcours courts ou réduits déjà connus (Guiche 2024-2025, Revel 2026, Ardèche 2022, Dijon 2015, Elsassman 2026) ; aucun XXL sous 7 h. |

## Autres constats

- 63 résultats individuels ont un nom vide, sans lettre ou fait de « X » (inchangé).
- 8 athlètes-saisons dépassent 15 courses : probables homonymes réunis (inchangé).
- Non classés avec un temps total : 325 timingzone (Cannes 2025 : 38, Cannes 2026 : 28, Monaco
  2026 : 23…), 268 prolivesport, 184 chronoweb, 150 fftri ; ignorés par les Repères, « Et moi ? »
  et la ligne « Toi ».
- Club manquant : 59,6 % des lignes individuelles timingzone (la source le publie rarement ;
  Hyères 2026 compte à part, Q22).

---

## Ordre de travail proposé

1. ~~**Q22** et **Q24**~~ : corrigés le 25/11/2026 (base reconstruite : 894 645 résultats,
   292 238 athlètes, 20 417 lignes d'équipe).
2. **Q23** : classements jeunes à plusieurs 1ᵉʳ.
3. Petites corrections : ~~**Q25**~~ et ~~**Q13**~~ (corrigés le 25/11/2026), **Q7**
   (Saint-Laurent-du-Var, Monaco), **Q16** (aplatir les redirections en chaîne).
