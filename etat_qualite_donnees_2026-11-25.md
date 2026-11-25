# État des lieux de la qualité des données — 25/11/2026

Audit du 25/11/2026 au commit `f064619`. La base est celle reconstruite avec
`transform/run_sql.py` après le dernier changement de `transform/` (`294ca84`, Q1) : 868 141
résultats. Elle n'a pas été reconstruite pendant l'audit.
Q18, Q20, Q21 et les petits restes de Q7, Q9 et D9 corrigés le même jour (base reconstruite :
867 812 résultats, voir plus bas).
Audit précédent : [etat_qualite_donnees_2026-11-22.md](etat_qualite_donnees_2026-11-22.md),
complété jusqu'au 25/11 (mêmes identifiants Q1 à Q19). D2, D9, D10 et D11 renvoient à
[retour_utilisateur_2026-11-23_2.md](retour_utilisateur_2026-11-23_2.md).

Depuis le 22/11 : arrivée de **protiming** (4ᵉ source, `8d4712f`), épreuves publiées en un
classement par sexe réunies (D9, `7adcf43`), noms protiming mis en forme (D10, `554f908`), lieux
corrigés à la main (D11, `7946ca1`, `a47a0b4`), minutes protiming (Q19, `2b66c24`) et totaux
prolivesport non fiables (Q1, `294ca84`).

## Volumes

| Table | 22/11/2026 | 25/11/2026 | Écart |
|-------|-----------:|-----------:|-------|
| results | 839 180 | 868 141 | +28 961 : protiming |
| — fftri_t2_area | 698 045 | 698 045 | |
| — prolivesport | 85 599 | 85 598 | |
| — chronoweb | 55 536 | 55 536 | |
| — protiming | — | 28 962 | nouvelle source |
| races (épreuves) | 3 574 | 3 927 | +455 épreuves protiming ; épreuves hommes / femmes réunies (D9) |
| noms de course | 471 | 495 | |
| athlètes (`unified_id`) | 268 188 | 280 890 | |
| — avec un résultat individuel | 258 342 | 266 183 | |
| lignes d'équipe | 9 619 | 15 134 | +5 515 protiming (relais, bike & run, swimrun en duo) |
| lignes de sous-classement | 7 682 (38 épreuves) | 7 700 (38 épreuves) | |
| doublons de source retirés | 110 paires | 172 paires (60 prolivesport, 48 chronoweb, 64 protiming) | |
| ids stables | 3 684 clés d'épreuve, 268 664 d'athlète | 4 202 clés d'épreuve, 281 369 d'athlète | |
| redirections | 110 (108 épreuves, 2 athlètes) | 276 (273 épreuves, 3 athlètes) | doublons protiming, épreuves réunies (D9) |
| lieux distincts | 412 | 412 | |

Contrôles sans anomalie : aucune épreuve sans résultat, sans date, avec une date future ou une
année différente de sa date ; aucun athlète deux fois dans la même épreuve ; aucun total à
00:00:00 ; **aucun temps négatif** (6 totaux et 286 segments le 22/11) ; aucun club avec « ` » ;
aucune clé d'athlète avec tiret, apostrophe ou virgule ; aucun nom de course écrit de deux façons
(même clé) ; aucun temps total mal formé ; aucune épreuve en double entre deux sources (même date
à un jour près, au moins la moitié des athlètes en commun) ; sexe M, F ou vide partout.
Segments cohérents avec le total à 5 % près (lignes avec les 5 segments) : prolivesport 100 %,
fftri_t2_area 98,1 %, protiming 97,9 %, chronoweb 97,5 %. Classement dans l'ordre des temps dans
3 569 épreuves classées sur 3 601.

---

## Synthèse par gravité

| # | Problème | 22/11/2026 | 25/11/2026 | Statut |
|---|----------|-----------|-----------|--------|
| Q1 | Temps total faux | 4 épreuves recalculées, 19 temps suspects ; 7 épreuves prolivesport S/XS au vainqueur sous 15 min | 4 500 totaux suspects dans 42 épreuves (35 en bloc, 7 isolées) ; 0 temps négatif | Corrigé (1 relais restant) |
| Q2 | Épreuves sans temps ni classement | 270 épreuves, 17 583 lignes | 262 épreuves, 17 539 lignes (toutes prolivesport) | Traité (affichage « Participants ») |
| Q3 | Total à 00:00:00 | 0 | 0 | Corrigé |
| Q4 | Temps illisibles | 0 | 0 | Corrigé |
| Q5 | Catégories d'âge | 3 050 valeurs | 3 086 valeurs, dont 67 protiming (« S3M », « V1M ») | **Ouvert** |
| Q6 | Épreuves en double le même jour | 38 sous-classements | 38 | Corrigé |
| Q7 | Lieu manquant ou incohérent | 0 épreuve sans lieu | 0 sans lieu ; lieux protiming au format « Ville (code postal) » ; 3 villes écrites de deux façons, Volcanik Tri mal situé ; 0 après correction | Corrigé |
| Q8 | Club manquant | 39,7 % | 39,8 % des résultats individuels (protiming 44,1 %) | Corrigé (la source ne le donne pas) |
| Q9 | Noms mal encodés | 0 | 5 lignes (Ironman de Nice 2019, Sardines Titus 2015) ; club réparé, 3 noms irrécupérables | Corrigé, résidu de la source |
| Q10 | Segments prolivesport décalés | 0 ligne incohérente | 0 | Corrigé |
| Q11 | Noms de course | 0 cas | 0 cas | Corrigé |
| Q12 | Athlètes avec résultats des deux sexes | 668 | 689 | Atténué |
| Q13 | Épreuves sans format | 57 | 85 (dont 35 protiming, surtout des bike & run) | **Ouvert** |
| Q14 | Noms d'athlètes | 0 clé avec ponctuation | 0 | Corrigé |
| Q15 | Sexe chronoweb | 0 valeur hors M/F | 0 ; protiming : 0 ligne individuelle sans sexe | Corrigé |
| Q16 | Identifiants instables | 0 changement | non revérifié (pas de reconstruction) | Corrigé |
| Q17 | Noms de course sans ponctuation | 2 courses corrigées | inchangé | Corrigé |
| Q18 | Classement publié qui ne suit pas les temps | 34 épreuves (24/11) | 32 épreuves, dont 7 sur plus de 5 % des lignes ; Openlakes 2026 : 83 classés plus rapides que le vainqueur (arrêtés avant l'arrivée). Après correction : 5 082 temps suspects (Openlakes 2026 L : 334, XXL : 230), 7 épreuves signalées | **Corrigé** le 25/11 (totaux trop longs restants) |
| Q19 | Temps protiming « mm:ss:00 » | 0 après correction | 0 ; 9 totaux au-dessus de 24 h, tous fftri, plausibles | Corrigé |
| Q20 | Épreuve natation + vélo classée triathlon L | — | Chtriman 2023 et 2024 « SWIMBIKE », 329 résultats ; 0 après correction | **Corrigé** le 25/11 |
| Q21 | Duos comptés comme des athlètes | — | Triath'Elles Gravelines 2017, 3 épreuves « Duo », 68 lignes ; 0 après correction | **Corrigé** le 25/11 |

---

## Corrigé depuis le 22/11/2026

| # | Commit | Correction |
|---|--------|------------|
| D9 | `7adcf43` | Épreuves d'une même course, date, discipline et format publiées en un classement par sexe (« S Masculin » / « S Feminin ») réunies : classement général recalculé par temps, classement publié gardé dans `rang_sexe`. |
| — | `8d4712f` | Protiming chargé : 28 962 résultats, 455 épreuves, 64 épreuves publiées aussi par fftri_t2_area retirées. |
| D10 | `554f908` | Noms protiming réécrits « NOM Prénom » : 32 lignes individuelles sur 23 447 restent tout en majuscules (contre 22 242 le 23/11). |
| D11 / Q7 | `7946ca1`, `a47a0b4` | Lieux corrigés à la main dans `transform/lieux_courses.csv` : toutes les épreuves protiming ont un code postal, « La Longueville (59570) », « Bordeaux (33000) » partout. |
| Q19 | `2b66c24` | 99 totaux protiming écrits « mm:ss:00 » relus en minutes (Cepoy 2015-2016, Chartres 2016). |
| Q1 | `294ca84` | Totaux prolivesport non fiables marqués suspects en bloc (35 épreuves, 4 481 totaux) ; temps négatifs vidés. |
| Q20 | 25/11 | Épreuves « SWIMBIKE » (natation + vélo) exclues de la base : −2 épreuves, −329 résultats, −81 athlètes. |
| Q21 | 25/11 | Lignes des épreuves « Duo » prolivesport marquées équipe : +68 lignes d'équipe, 68 faux profils retirés. |
| Q18 | 25/11 | Classés plus rapides que le vainqueur, puis que des mieux classés, marqués `temps_suspect` (Openlakes 2026 : 334 en L, 230 en XXL) ; épreuves classées sur un autre temps signalées (`classement_hors_ordre`, bandeau sur le classement). |
| Q7, Q9, D9 | 25/11 | Petits restes : 6 lignes dans `transform/lieux_courses.csv`, « À » abîmé réparé dans les clubs, finales d'Extrememan 2020 réunies. |

---

## Détail des points ouverts

### Q18 — Classement publié qui ne suit pas les temps (corrigé le 25/11/2026)

Classés (rang 1 à 99 989, hors temps suspects et sous-classements) dont le total est plus court
de plus de 30 secondes que celui du classé précédent : **32 épreuves sur 3 601** (34 le 24/11) :
30 fftri_t2_area, 1 prolivesport, 1 protiming, 1 chronoweb. Les 7 classements sur un autre temps
(plus de 5 % des lignes inversées) sont inchangés :

| Épreuve | Source | Classés | Inversions |
|---------|--------|--------:|-----------:|
| Tours N Man 2024, triathlon L | fftri_t2_area | 537 | 229 |
| Triathlon de Chamouille 2022, triathlon M | fftri_t2_area | 566 | 229 |
| Bayman 2024, triathlon L | fftri_t2_area | 847 | 342 |
| Ventouxman 2026, triathlon L | fftri_t2_area | 338 | 125 |
| Ventouxman 2026, duathlon L | fftri_t2_area | 77 | 17 |
| Triathlon en Provence Verte 2022, triathlon M | fftri_t2_area | 91 | 8 |
| Bike & Run de l'Hippodrome de Marcq 2024 | prolivesport | 79 | 5 |

**Nouveau constat : Openlakes Champagne 2026.** Le 22/11, ses derniers classés aux temps courts
étaient attribués à une « distance réduite ? ». Les données montrent qu'il s'agit d'athlètes
arrêtés avant l'arrivée, que la source classe quand même, à la fin de la liste, avec le temps de
leur dernier passage : en L, 78 classés ont un total proche de natation + T1 + vélo (moins de
10 minutes d'écart), sans course à pied (02:52:57 = 00:27:37 de natation, 02:21:04 de vélo et la transition). Le contrôle Q18 n'en
voit que quelques-uns (7 et 9 inversions), parce que ces lignes se suivent entre elles. Mais
beaucoup sont **plus rapides que le vainqueur** :

| Épreuve | Classés | Plus rapides que le 1ᵉʳ (plus d'une minute) | Vainqueur | Plus court total non suspect |
|---------|--------:|-------:|-------:|-------:|
| Openlakes Champagne 2026, triathlon L | 750 | 47 | 03:52:32 | 02:52:57 (natation et vélo seulement) |
| Openlakes Champagne 2026, triathlon XXL | 255 | 36 | 08:43:24 | 05:00:47 (natation seulement) |

L'absence de temps de course à pied ne suffit pas à les repérer : dans ces deux épreuves, la
source ne publie la course à pied que pour une partie des finishers (413 classés L sur 750 et 239
XXL sur 255 n'en ont pas, alors que leur total l'inclut).

Seuls les plus courts sont marqués `temps_suspect` (moins de la moitié du temps médian, Q1). Les
autres entrent dans les Repères (vainqueur, top 10 %, histogramme), dans « Et moi ? », dans les
Tendances de la course et dans les meilleurs temps L et XXL de leurs profils. Ailleurs, ce cas
est rare : 4 autres épreuves ont un seul classé plus rapide que le vainqueur (Triathlon des
Moines 2019 M, Vercorsman 2021 XL, Aquathlon de la Verrerie 2023) ou suivent un autre temps
(Bike & Run de Marcq 2024, 14 lignes).

Correction du 25/11/2026 :

1. **Classés plus rapides que le vainqueur** (`transform/temps_totaux.sql`) : un total plus court
   de plus d'une minute que celui du 1ᵉʳ est impossible ; il est marqué `temps_suspect`. Deux
   exceptions : les épreuves classées sur un autre temps (point 2 : Bike & Run de Marcq 2024), et
   celles qui ont **plusieurs « 1ᵉʳ »**, où l'on ne sait pas lequel est le vainqueur. La simulation
   a révélé ce second cas : Triathlon de Cepoy 2026 M (protiming) mêle aux individuels deux
   classements d'équipes (« MACH 2 », « Tic et tac »…, trois « 1ᵉʳ »), et l'Ironman de Nice 2023 a
   deux « 1ᵉʳ ». Sans cette exception, 41 individuels de Cepoy et 4 de Nice auraient été marqués
   à tort.

   Résultat : **86 temps marqués** (Openlakes Champagne 2026 : 47 en L, 36 en XXL ; un dernier
   classé à Vercorsman 2021 XL, aux Moines 2019 M et à l'Aquathlon de la Verrerie 2023). 4 586
   temps suspects en tout. Les Repères d'Openlakes 2026 L comptent 703 classés et donnent le vrai
   vainqueur (03:52:32) ; le message de l'alerte ⚠ cite maintenant ce cas. Les classés arrêtés
   avant l'arrivée mais plus lents que le vainqueur restent invisibles : une règle « total égal à
   la somme des segments sans course à pied » toucherait aussi des aquathlons et des épreuves
   jeunes dont les colonnes sont utilisées autrement (Arcachon 2016, Ardres 2026…).

   Complément (même jour) : **classés plus rapides que des mieux classés**. À Openlakes 2026 L,
   la source classe après le dernier finisher (428ᵉ, 07:17:34) les athlètes arrêtés avant
   l'arrivée, regroupés selon la distance parcourue, avec le temps de leur dernier passage
   (429ᵉ en 05:49:04, natation et vélo seulement). Plus lents que le vainqueur, ils échappaient à la
   règle précédente. Règle ajoutée : un classé dont au moins 3 mieux classés ont un total plus
   long de plus de 5 % est suspect ; à partir de ce premier cas (rupture), tout classé suivant plus
   court de plus d'une minute qu'un mieux classé l'est aussi. Mêmes exceptions que plus haut.
   Le seuil de 5 % et le minimum de 3 laissent de côté les petites inversions de pénalités (Val de
   Gray 2013 L, 1 à 2 %) et un ou deux totaux aberrants trop longs devant (Carnac 2016 M, Champ Man
   2025 L). Résultat : seul Openlakes 2026 est touché par la rupture ; en L, les 428 finishers
   gardent leur temps et les **334 suivants** sont signalés (absents des Repères, de « Et moi ? »
   et des meilleurs temps du profil, alerte ⚠ dans le classement et l'historique). 5 082 temps
   suspects en tout.

   Openlakes 2026 XXL : 230 classés signalés sur 256, à juste titre. Seuls les 16 premiers ont
   un temps de course à pied ; la suite est découpée en blocs, chacun classé par temps, selon le
   dernier point de passage atteint. La course à pied implicite (total moins natation, transitions
   et vélo) le montre :

   | Rangs | Classés | Course à pied implicite (min / médiane / max) | Lecture |
   |---|---|---|---|
   | 1 à 16 | 16 | 03:07:39 / 03:33:12 / 04:12:21 (publiée) | finishers |
   | 17 à 51 | 35 | 02:39:38 / 03:07:13 / 03:45:20 | dernier pointage avant l'arrivée |
   | 52 à 141 | 90 | 01:51:54 / 02:23:31 / 03:12:35 | pointage précédent |
   | 142 à 203 | 62 | 00:48:05 / 01:18:30 / 02:02:01 | début du marathon |
   | 204 à 256 | 53 | moins de 01:33 ou pas de vélo | arrêtés plus tôt |

   Le bloc 17 à 51 n'est pas fait de finishers sans temps de course à pied : ces athlètes sont plus
   lents à vélo que les finishers (médiane 05:21:14 contre 04:52:22), mais 18 sur 35 auraient couru
   plus vite que le meilleur marathon de l'épreuve (03:07:38, celui du vainqueur), et 33 sur 35 plus
   vite que le marathon médian des finishers. Leur total est le temps d'un pointage avant l'arrivée,
   pas un temps final : l'alerte est correcte et la règle reste telle quelle.

2. **Classements sur un autre temps** : GET /races/{id} renvoie `classement_hors_ordre`, vrai quand
   plus de 5 % des classés (temps valide, non suspect) ont un total plus court de plus de
   30 secondes que celui du classé précédent ; c'est le cas des 7 épreuves du tableau ci-dessus.
   Calculé à la demande (une requête), sans colonne en base. La page de classement affiche alors :
   « Le classement publié par la source ne suit pas l'ordre des temps totaux (départs par vagues,
   temps officiel ou pénalités) : un athlète peut être classé devant un autre plus rapide. Le
   classement de la source est gardé ; trier par temps total donne l'ordre des temps. »

Tests : `api/test_race_results.py` (aucun classé non suspect plus rapide que l'unique 1ᵉʳ hors
épreuves signalées ; à Openlakes 2026 L, les classés restants suivent les temps et les Repères
les comptent tous ; drapeau vrai sur l'épreuve la plus désordonnée, faux sur la plus ordonnée).

Restent :
- **Totaux aberrants trop longs** (Carnac 2016 : 228ᵉ et 252ᵉ en 11:23:46 ; Champ Man 2025 : 231ᵉ
  en 6:50:59 entre deux 5:53) : `temps_suspect` et son message visent les temps trop courts ; les
  marquer demanderait un second message.
- **Plusieurs classements dans une épreuve** : Cepoy 2026 M mêle équipes et individuels dans le
  même classement (les équipes n'y sont pas repérées comme telles) ; à séparer, ou à marquer
  équipe, dans `transform/`.

### Q20 — Épreuve natation + vélo classée triathlon L (corrigé le 25/11/2026)

Le Chtriman de Gravelines (prolivesport) publie en 2023 et 2024 une épreuve « SWIMBIKE » :
natation et vélo, sans course à pied. `transform/disciplines.sql` ne reconnaît pas ce libellé et
la range en **triathlon L**, à côté du vrai triathlon L de la même course :

| Édition | Épreuve | Résultats | Vainqueur |
|---------|---------|----------:|----------:|
| 2023 | SWIMBIKE | 162 | 02:47:18 (natation 00:31:04, vélo 02:14:16) |
| 2024 | SWIMBIKE | 167 | 02:39:34 (natation 00:31:59, vélo 02:05:08) |

Conséquences : 301 athlètes ont un « triathlon L » en 2:40 à 3:30 dans leur historique, leurs
meilleurs temps et leur progression ; le filtre « triathlon + L » de la liste des courses et les
statistiques de l'épreuve sont faux. C'est le seul libellé de ce type en base (aucun « aquabike »).

Correction (`transform/disciplines.sql`, `epreuve_discipline`) : une épreuve dont le libellé
contient « swimbike » ou « aquabike » (avec ou sans espace ou tiret) n'est **pas intégrée**,
comme les épreuves d'autres sports ; « Swim Bike Run » n'est pas concerné. La règle vaut aussi
pour protiming, dont la discipline passe par la même fonction. Base reconstruite :

| | Avant | Après |
|---|------:|------:|
| results | 868 141 | 867 812 (−329, prolivesport) |
| races | 3 927 | 3 925 |
| athlètes (`unified_id`) | 280 890 | 280 809 (−81 qui n'avaient couru que ce SWIMBIKE) |

Les triathlons L du Chtriman 2023 et 2024 ne contiennent plus que le vrai triathlon (890 et 390
résultats). Les anciennes pages des deux épreuves (`/races/508`, `/races/510`) répondent 404 :
elles n'ont pas d'équivalent vers lequel rediriger, et elles sortent du sitemap. Le reste de
l'audit garde les chiffres d'avant la correction.

### Q21 — Duos comptés comme des athlètes (corrigé le 25/11/2026)

Triath'Elles Gravelines 2017 (prolivesport) publie trois épreuves « Verte - Duo », « Bleue - Duo »
et « Rouge - Duo » (69 lignes). Les deux équipières sont écrites dans le nom, séparées par deux
espaces (« AUGER Lucie  AUGER AGNES »), sans séparateur que `prolivesport_team_name` reconnaisse :
**68 lignes sur 69 ne sont pas marquées équipe**. Chaque duo devient un faux athlète, avec un
profil, une place dans la liste des athlètes et la recherche.

Les autres épreuves en duo (chronoweb, protiming) sont bien marquées équipe. Dans les autres
relais et bike & run prolivesport, les lignes non marquées équipe (134 en triathlon, 606 en
bike & run, 30 en aquathlon et cross triathlon) sont, d'après un échantillon, des relayeurs seuls
(« Sarah  DELCOURT »), comme prévu.

Correction (`transform/results.sql`, `transform/disciplines.sql`) : dans une épreuve prolivesport
dont le libellé contient le mot « duo », `prolivesport_team_name` lit le nom comme une paire
d'équipiers, comme dans un bike & run : « AUGER Lucie  AUGER AGNES » → équipe « AUGER Lucie &
AUGER AGNES ». Un relayeur seul (« Sarah  DELCOURT ») reste un athlète. Base reconstruite :

| | Avant | Après |
|---|------:|------:|
| lignes Duo marquées équipe | 1 sur 69 | 69 sur 69 |
| lignes d'équipe | 15 134 | 15 202 |
| athlètes avec un résultat individuel | 266 183 (avant Q20) | 266 035 (après Q20 et Q21) |

Les 68 faux profils (« /athletes/125671 »…) répondent 404 et ne sortent plus dans la recherche
ni la liste des athlètes ; ces duos s'affichent sans lien, avec « Équipe » dans le classement,
comme les autres équipes. Les équipières ne retrouvent pas ce résultat dans leur profil (limite
connue des équipes, voir frontend.md).

### Q13 — Épreuves sans format

85 épreuves (57 le 22/11) n'apparaissent dans aucun filtre de format : 35 protiming, 30
prolivesport, 20 chronoweb. Côté protiming, ce sont surtout des bike & run décrits par leur seule
distance (« 6km », « Bike and Run 20km », « 4500m » : Bike and Run d'Orléans 2017-2019, de
Bordeaux, du Parc de Loire 2026). Piste : seuils de distance par discipline pour le bike & run
(comme `epreuve_format` le fait déjà pour le triathlon), sinon garder « format non précisé ».

### Q5 — Catégories d'âge (D2, D10)

3 086 valeurs distinctes : chronoweb 2 223, fftri_t2_area 794, prolivesport 101, **protiming 67**.
Protiming ajoute un quatrième système : « S1M » à « S4M », « V1M » à « V4M », « JUM », « CAM »,
« MIM », « BEM », « PUM »… (S = senior, V = vétéran, dernière lettre = sexe), et « DUH », « DUM »,
« REH », « REM », « REF » (duos et relais).
Valeurs parasites : 2 241 avec un rang collé (« 1/MJU »), 414 nombres seuls (« 4044 »), 15 avec
parenthèses. 18 230 résultats individuels sans catégorie. 15,8 % des saisons d'athlète ont
plusieurs catégories (16,0 % le 22/11).

Piste inchangée : table de correspondance vers les catégories FFTRI, protiming compris.

### Q7 — Lieux

Aucune épreuve sans lieu ; une seule course à deux lieux, voulue (Triathlon de la Pierre Percée).
Restent :
- 2 lieux sans code postal à 5 chiffres, 6 épreuves prolivesport à l'étranger : « Tangier » et
  « Geraardsbergen (9500) » (code belge, normal) ;
- 3 villes écrites de deux façons dans des courses différentes : « La Baule Escoublac (44055) » /
  « La Baule-Escoublac (44500) » (44055 est le code commune, pas le code postal), « Lissac sur
  Couze » / « Lissac-sur-Couze », « Saint Georges d'Oléron » / « Saint-Georges-d'Oléron ». Les
  autres villes à plusieurs écritures sont des villes distinctes (Port-Louis du Morbihan et de
  Guadeloupe) ou une même ville sous plusieurs codes postaux (Paris, Nice, Tours, Saint-Leu) ;
- à vérifier : Volcanik Tri (2016-2019) est situé à « Saint-Pierre (97500) », code de
  Saint-Pierre-et-Miquelon, quand les autres courses de Saint-Pierre sont à La Réunion (97410).

Corrigé le 25/11/2026 dans `transform/lieux_courses.csv` (6 lignes ajoutées, 3 modifiées) :
« La Baule-Escoublac (44500) », « Lissac-sur-Couze (19600) », « Saint-Georges-d'Oléron (17190) »,
« Saint-Pierre (97410) » et « Saint-Leu (97424) » partout. Volcanik Tri : fftri le situe à
« Saint-Pierre (97500) », mais la course (devenue Ocean Lava Réunion) se court dans le lagon de
Saint-Pierre de La Réunion ; elle est remise à « Saint-Pierre (97410) ». Restent, voulues, les
villes distinctes (Port-Louis) et une même ville sous plusieurs codes postaux (Paris, Nice, Tours,
Les Sables-d'Olonne, Saint-Leu 97424 / 97436).

### Q9 — Noms mal encodés

14 lignes contiennent « Ã », dont 9 sont justes (« JOÃO », « ROMÃO », « DA APRESENTAÇÃO »).
5 sont des noms abîmés par la source :
- le club « COURIR Ã FUVEAU TRIATHL... » (Sardines Titus Triathlon 2015, 2 lignes) et « COURIR ‡
  FUVEAU TRIA » (1 ligne) : « À » abîmé, réparé le 25/11/2026 dans `nettoie_club`
  (`transform/raw_data.sql`) → « COURIR À FUVEAU… » ;
- 3 noms de l'Ironman de Nice 2019, « JHOAÃIBOEL THOMAS », « LSElaÃibO GUERRIERE »,
  « JeOrÃsiOld Jensen Christian » : lettres mélangées dans la source, le vrai nom ne peut pas être
  retrouvé de façon sûre. Laissés tels quels.

### Q12 — Athlètes avec résultats des deux sexes

689 athlètes (668 le 22/11) : la hausse vient des athlètes protiming rattachés aux profils
existants. Le profil et le filtre affichent le sexe le plus fréquent.

### Q1 — Vainqueurs encore rapides

Hors temps suspects, le plus court total classé est sous 3 heures dans 9 triathlons L et sous
7 heures dans 1 triathlon XXL. 4 de ces 10 viennent de Q20 (Chtriman SWIMBIKE, retiré depuis) et Q18
(Openlakes 2026) ; les autres sont des
parcours courts ou réduits, avec des segments cohérents : Pop Triathlon de Guiche 2024-2025,
Triathlon de Revel 2026, Gorges de l'Ardèche 2022, Dijon 2015, Elsassman 2026 (natation en 10 min,
probablement raccourcie). Les duathlons L entre 2 h et 3 h sont normaux pour ce format.

Reste aussi le relais CHTRIMAN 2017 relevé le 25/11 (4 équipes, vainqueur en 01:10:23).

### Autres constats

- 63 résultats individuels ont un nom vide, sans lettre ou fait de « X » : chacun de ces noms
  forme un seul « athlète » qui réunit des personnes différentes.
- 82 239 noms individuels contiennent un double espace (prolivesport « Prénom  NOM »), remis en
  forme à l'affichage seulement.
- 8 athlètes-saisons dépassent 15 courses (CHEVREUIL Mathieu : 24 en 2022, 23 en 2021, 16 en
  2018) : probables homonymes réunis.
- 268 lignes prolivesport non classées (rang 0 ou 99991-99999) ont un temps total : ignorées par
  les Repères, « Et moi ? » et la ligne « Toi ».

---

## Suivi des points du retour utilisateur du 23/11/2026 (second test)

| # | Statut |
|---|--------|
| D2 | Catégories d'âge : non corrigé (Q5). |
| D9 | Épreuves publiées par sexe : corrigé le 23/11. Restaient 11 paires hors épreuves jeunes (10 après la correction ci-dessous), presque toutes des classements **par division ou par catégorie**, que la règle laisse séparés à dessein : D3F / D3H (Noyon 2017, Lomme 2018, Audomarois 2017, Moines 2021 Est et Nord), « FEMMES » / « SEH » / « MAH » (Championnats de France Sprint 2024). Extrememan 2020, « Finale Hommes » / « Finales Femmes » (pluriel différent) : réunies le 25/11/2026 (`format_sans_sexe` lit « finales » comme « finale »), l'ancienne épreuve des femmes redirige vers l'épreuve réunie. |
| D10 | Noms protiming : corrigé (32 lignes tout en majuscules sur 23 447). Catégories protiming : ouvert (Q5). |
| D11 | Lieux : corrigé ; 3 villes écrites de deux façons, corrigées le 25/11 (Q7). |

---

## Ordre de travail proposé

1. Q18 (reste) : équipes mêlées aux individuels à Cepoy 2026 M, totaux aberrants trop longs.
2. Q13 : format des bike & run décrits par leur distance.
3. Q5 / D2 / D10 : table de correspondance des catégories, protiming compris.
