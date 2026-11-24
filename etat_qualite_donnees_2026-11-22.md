# État des lieux de la qualité des données — 22/11/2026

Audit du 22/11/2026 au commit `d38c0de`, refait le même jour au commit `ea15b02` avec les
corrections de lieux de `transform/lieux_courses.csv` (43 lignes), base reconstruite avec
`transform/run_sql.py`.
Complété le 24/11/2026 (Q18 et Q19) : constats faits pendant la refonte UX (voir [ux.md](ux.md),
ligne « Toi » du classement). Q19 corrigé le même jour, base reconstruite : 868 141 résultats.
Audit précédent : [etat_qualite_donnees_2026-11-20.md](etat_qualite_donnees_2026-11-20.md)
(mêmes identifiants Q1 à Q14 ; D1 à D6 renvoient à [retour_utilisateur_2026-11-19.md](retour_utilisateur_2026-11-19.md)).

## Volumes

| Table | 20/11/2026 | 22/11/2026 | Écart |
|-------|-----------:|-----------:|-------|
| results | 839 101 | 839 180 | +79 : homonymes d'une même épreuve gardés (+395), Dijon 2026 chronoweb retiré comme doublon (−312) |
| — fftri_t2_area | 697 692 | 698 045 | |
| — prolivesport | 85 574 | 85 599 | |
| — chronoweb | 55 835 | 55 536 | |
| races (épreuves) | 3 575 | 3 574 | toutes ont au moins un résultat |
| noms de course | 471 | 471 | |
| athlètes (`unified_id`) | 273 319 | 268 188 | −5 131 : tirets, virgules, noms tronqués réunis ; +392 homonymes séparés |
| — avec un résultat individuel | | 258 342 | |
| lignes d'équipe | 9 615 | 9 619 | |
| lignes de sous-classement | 7 680 (38 épreuves) | 7 682 (38 épreuves) | |
| doublons de source retirés | | 110 paires (62 prolivesport, 48 chronoweb) | |
| ids stables | — | 3 684 clés d'épreuve, 268 664 clés d'athlète ; 110 redirections (108 épreuves, 2 athlètes) | nouveau |
| lieux distincts | | 412 | format unique « Ville (code postal) » ; toutes les épreuves ont un lieu |

Contrôles sans anomalie : aucune épreuve sans résultat, sans date, avec une date future ou une
année différente de sa date ; aucun athlète deux fois dans la même épreuve ; aucun total à
00:00:00 ; aucun nom ni club mal encodé (« Ã© ») ; aucun club avec « ` » ; aucune clé d'athlète
avec tiret, apostrophe ou virgule ; aucun nom de course écrit de deux façons (même clé) ;
segments prolivesport : 100 % cohérents avec le total à 5 % près (fftri 98,1 %, chronoweb
97,5 %) ; classement cohérent avec le temps dans 3 217 épreuves sur 3 223 (≥ 10 classés).

---

## Synthèse par gravité

| # | Problème | 20/11/2026 | 22/11/2026 | Statut |
|---|----------|-----------|-----------|--------|
| Q1 | Temps total faux | ≥ 22 épreuves | 4 épreuves recalculées, 19 temps suspects signalés ; 7 épreuves prolivesport S/XS au vainqueur sous 15 min | **Partiel** |
| Q2 | Épreuves sans temps ni classement | 270 épreuves, 17 584 lignes | 270 épreuves, 17 583 lignes (prolivesport) | Traité (affichage « Participants ») |
| Q3 | Total à 00:00:00 | 0 | 0 | Corrigé |
| Q4 | Temps chronoweb illisibles | 0 | 0 ; ailleurs, 6 totaux et 286 lignes avec un segment négatifs (« -00:00:01 ») | Corrigé |
| Q5 | Catégories d'âge | 3 141 valeurs | 3 050 valeurs, dont 2 592 parasites | **Ouvert** (mis de côté) |
| Q6 | Épreuves en double le même jour | 38 sous-classements | 38 | Corrigé |
| Q7 | Lieu manquant ou incohérent | 2 219 épreuves | 0 épreuve sans lieu ; 1 course à deux lieux, voulu | **Corrigé** le 22/11 |
| Q8 | Club manquant ou parasite | 40 % sans club | 39,7 % des résultats individuels sans club ; club affiché = le plus récent | Corrigé |
| Q9 | Noms mal encodés | 0 | 0 | Corrigé |
| Q10 | Segments prolivesport décalés | partiel | 0 ligne incohérente | **Corrigé** |
| Q11 | Noms de course | 0 cas connu | 0 cas | Corrigé |
| Q12 | Athlètes avec résultats des deux sexes | 634 | 668 (636 avant Q15) | Atténué |
| Q13 | Épreuves sans format | 57 | 57 | **Ouvert** |
| Q14 | Noms d'athlètes (tirets, virgules, tronqués, homonymes) | — | 0 clé avec ponctuation ; 477 noms tronqués rattachés ; 392 homonymes séparés | **Corrigé** |
| Q15 | Sexe chronoweb : premier caractère de la catégorie | — | 31 820 lignes chronoweb (62 %) ; 0 après correction | **Corrigé** le 22/11 |
| Q16 | Identifiants instables | constat | 0 changement entre deux reconstructions | **Corrigé** |
| Q17 | Noms de course sans ponctuation (tirés de l'adresse fftri) | — | 2 courses, corrigées par alias | **Corrigé** |
| Q18 | Classement publié qui ne suit pas les temps totaux | — | 24/11 : 34 épreuves, dont 7 sur plus de 5 % des lignes | **Ouvert** |
| Q19 | Temps protiming de moins d'une heure écrits « mm:ss:00 » | — | 24/11 : 99 totaux sur 10 épreuves (Cepoy 2015-2016, Chartres 2016) ; 0 après correction | **Corrigé** le 24/11 |

---

## Corrigé depuis le 20/11/2026

| # | Commit | Correction |
|---|--------|------------|
| Q14 | `fdc8b59` | Clé d'athlète sans tirets ni apostrophes ; 477 noms tronqués rattachés (`athletes_tronques.sql`) ; deux homonymes d'une même épreuve gardés comme deux athlètes (`homonymes.sql`, +395 résultats). |
| Q14 | `6a85da2` | La virgule (« MEUNIER, Paul », chronoweb) ne sépare plus deux profils : 2 268 profils réunis. |
| Q1 | `f4fb7c0` | Total recalculé depuis les segments quand les totaux ne suivent pas le classement mais les segments si (Tribreizh 2022, Saint Remy sur Durolle 2005, Roybon 2021, Paris 2022). Meilleurs temps limités aux classés. |
| Q1 | `b58c3dd` | 19 totaux classés de moins de la moitié de la médiane marqués `temps_suspect` : alerte ⚠ dans le classement, le podium et le profil, exclus des meilleurs temps. |
| — | `0927ffa` | Épreuves sans aucun temps intermédiaire : seule la colonne du total est affichée. |
| Q10 | `edfdfb3` | Segments prolivesport vidés quand leur somme s'écarte de plus de 5 % du total, et sur toute l'épreuve quand la moitié de ses lignes le sont. |
| Q16 | `126f29f` | Id d'épreuve et d'athlète stables (`ids_stables`), anciens id redirigés. |
| Q8 | `d38c0de` | Club affiché : celui de la course la plus récente, le même dans la liste et le profil. |
| Q17 | `5f93b9d` | Alias « La 0-3000 » et « T97.4 » (noms fftri sans ponctuation). |
| Q7 | lieu fftri | Lieu lu dans l'en-tête de la page fftri de chaque épreuve. |
| Q7 | `ea15b02` | Format unique « Ville (code postal) », une écriture par ville dans une course, lieu de la course pour une épreuve sans lieu ; corrections à la main dans `transform/lieux_courses.csv` (43 lignes). |
| Q15 | sexe chronoweb | Sexe lu dans la catégorie après le rang (`sexe_categorie`) : 0 valeur autre que M, F ou vide ; chronoweb passe de 15 912 à 47 462 résultats avec M ou F. |

---

## Détail des points ouverts

### Q1 — Temps totaux faux restants (priorité 1)
Les corrections ligne par ligne (recalcul, temps suspects) ne voient pas une épreuve dont
**tous** les totaux sont faux de la même façon, sans segments pour les recalculer. 7 épreuves
prolivesport S ou XS ont un vainqueur sous 15 minutes (ou négatif) :

| Épreuve | Format | Vainqueur |
|---------|--------|-----------|
| Nouveau Triathlon d'Amiens 2018 | S | -00:00:01 |
| Triathlon & Duathlon de l'Audomarois 2018 | S | 00:07:45 |
| Triathlon Villeneuve d'Ascq 2019 | XS | 00:07:42 |
| Triathlon Chevilly-larue 2024 | XS | 00:08:19 |
| Triathlon Dunkerque 2019 | S | 00:09:28 |
| L'Aventure Grandeur Nature - Lumbres 2019 | XS | 00:13:34 |
| Triathlon de Chantilly 2019 | S | 00:14:05 |

Ces temps entrent dans les meilleurs temps S et XS des profils. Les autres vainqueurs « rapides »
relevés (Ardres M en 01:14 à 01:26, Pop Triathlon de Guiche L en 02:36, Ironman de Nice 2019 en
07:16 par un professionnel) correspondent à des parcours courts ou à l'élite : un seuil fixe par
format écarterait de vrais temps.

Piste : seuil minimal par discipline et format, appliqué à l'épreuve entière (médiane des
classés) plutôt qu'à la ligne : une épreuve S dont la médiane est sous 20 minutes est marquée
`temps_suspect` en bloc.

### Q15 — Sexe chronoweb (corrigé le 22/11/2026)
31 820 lignes chronoweb (62 %) avaient un chiffre dans la colonne sexe. Ce n'était pas un rang :
raw_data.sql prenait le premier caractère de la catégorie, et chronoweb écrit souvent la
catégorie précédée du rang (« 14/MV3 » → « 1 », « 34/MVE » → « 3 »). fftri avait de même 7 491
valeurs autres que M/F (« ELM » → « E », « 40-44 » → « 4 »). Conséquences : le filtre sexe du
classement ignorait ces lignes, et le sexe d'un athlète qui ne court que chez chronoweb était
inconnu.

Correction : `sexe_categorie` lit la lettre M ou F qui ouvre la catégorie, après le rang éventuel ;
les catégories mixtes (« MIXT »), « MASTERS », « MA » et minimes (« MI », « MINC ») ne donnent pas
de sexe. Résultat : plus aucune valeur autre que M, F ou vide ; chronoweb a 47 462 résultats sur
51 604 avec M ou F (15 912 avant) ; restent vides les lignes sans catégorie (4 142 chronoweb,
21 838 fftri, dont « ELM », « JU », « 40-44 »). Le rang « n/ » reste dans la catégorie (Q5).

### Q5 — Catégories d'âge (mis de côté)
3 050 valeurs distinctes (chronoweb 2 223, fftri 794, prolivesport 101), dont 2 592 parasites :
2 163 avec un rang collé (« 1/MJU », « 2/MJU »), 414 nombres seuls (« 4044 », « 3539 » : tranches
d'âge Ironman sans tiret), 15 avec parenthèses. 18 150 résultats sans catégorie. 16,0 % des
saisons d'athlète ont plusieurs catégories (15,3 % le 20/11).

### Q7 — Lieu manquant
Corrigé le 22/11/2026. Les 2 219 épreuves fftri_t2_area n'avaient pas de lieu (chronoweb et
prolivesport sont complets). Contrairement au constat du 20/11, la source le donne : l'en-tête de
la page d'une épreuve sur fftri.t2area.com affiche la ville et le code postal (« SAINT PIERRE
(97410) »). Le scraper le lit maintenant (`extract_lieu`, `sources/fftri_t2_area.py`), et
`sources/fftri_t2_area_lieux.py` l'a ajouté aux 2 237 CSV déjà téléchargés (une page par
épreuve).

Harmonisation : `lieu_lisible` (raw_data.sql) met les lieux de toutes les sources au format
« Ville (code postal) » (« 62610 ARDRES 62 - Pas-de-Calais France » → « Ardres (62610) ») et vide
les « nan nan nan nan » de prolivesport, qui comptaient jusque-là comme des lieux. `lieux.sql`
ramène les écritures d'une même ville à une seule dans chaque course (« Chateau thierry » →
« Château-Thierry ») et donne à une épreuve sans lieu celui de sa course. Les courses à plus d'un
lieu passent de 46 à 13.

Corrections à la main (`transform/lieux_courses.csv`, 43 lignes, liste de départ produite par
`python transform/export_lieux_a_verifier.py`) : avant elles, 171 épreuves de 29 courses étaient
sans lieu (surtout prolivesport, « nan nan nan nan » ; Épinal et Bouzigues chez fftri) et 13
courses avaient des lieux différents selon l'édition (« Chantiily (60500) », « Toulouse » /
« Tournefeuille (31170) », « Limoges » pour le Triathlon de Chalain Jura). Après :

- aucune épreuve sans lieu (412 lieux distincts) ; les 4 dernières courses (Aquathlon Achicourt,
  Aquathlon du Calaisis, Bike&Run Berck sur Mer, 1/2 Finale Jeunes de Sangatte, 25 épreuves
  prolivesport) ont été complétées à la main ;
- 1 course à deux lieux, voulu : Triathlon de la Pierre Percee, Celles-sur-Plaine (88110) en 2022
  (ligne avec année), Pierre-Percée (54540) les autres années.

Les lieux saisis à la main sont gardés tels quels (pas de mise en forme automatique).

### Q13 — Épreuves sans format
Inchangé : 57 épreuves (« CD » d'Altriman, « Poursuite », finales…) n'apparaissent dans aucun
filtre de format.

### Q17 — Noms de course sans ponctuation (corrigé le 22/11/2026)
Le nom des épreuves fftri_t2_area est tiré de l'adresse de la page (`calendrier/0-3000/`,
`calendrier/t974/`), qui perd tirets et points. Deux courses de La Réunion s'affichaient « 0 3000 »
et « T974 » ; leurs résultats étaient justes. Vrais noms lus sur fftri.t2area.com : « La 0-3000 »
(Saint-Pierre, 3 épreuves en 2023) et « T97.4 » (Saint-Leu, 2 épreuves en 2026). Deux alias dans
`transform/noms_epreuves.sql` les corrigent ; leurs id ne changent pas (la clé de l'id garde le
nom publié). D'autres noms peuvent avoir perdu leur ponctuation sans être aussi visibles.

### Q18 — Classement publié qui ne suit pas les temps totaux (constat du 24/11/2026)

Classés (rang entre 1 et 99 989, hors temps suspects et sous-classements) dont le total est plus
court de plus de 30 secondes que celui du classé précédent. **34 épreuves sur 3 636** ont au
moins une inversion : 31 fftri_t2_area, 1 protiming, 1 prolivesport, 1 chronoweb.

> Un premier comptage, cité pendant la refonte UX, donnait 66 épreuves : il comptait les lignes
> de statut prolivesport (rang 0 et 99991-99999, dont 268 ont un temps) comme des inversions.
> Triathlon de Chartres 2016 S, 35ᵉ épreuve du constat initial, est sorti de la liste avec la
> correction de Q19.

Ce n'est pas le cas traité par Q1 (`transform/temps_totaux.sql`) : là, les totaux sont faux et
les segments suivent le classement. Ici, les totaux sont cohérents avec les segments ; c'est le
**classement** qui suit un autre temps, ou quelques lignes qui sont à part.

Conséquences dans l'application :
- le classement paraît dans le désordre (Ventouxman 2026 L : 23ᵉ en 06:05:21, 25ᵉ en 05:59:47) ;
- « Et moi ? » place un temps par rapport aux temps, pas aux rangs : « juste devant : 25ᵉ »,
  « juste derrière : 31ᵉ » ;
- la ligne « Toi » n'est pas insérée sur une page dont les temps ne se suivent pas : le bandeau
  propose de trier par temps total (`components/results/my-place.tsx`).

**Classements sur un autre temps** : plus de 5 % des lignes inversées, par petits écarts.
Totaux et segments concordent : la source classe probablement sur un autre temps (départs par
vagues, temps officiel au lieu du temps réel, pénalités).

| Épreuve | Source | Classés | Inversions | Pire écart |
|---------|--------|--------:|-----------:|-----------:|
| Tours N Man 2024, triathlon L | fftri_t2_area | 537 | 229 (42,6 %) | 28:15 |
| Triathlon de Chamouille 2022, triathlon M | fftri_t2_area | 566 | 229 (40,5 %) | 59:27 |
| Bayman 2024, triathlon L | fftri_t2_area | 847 | 342 (40,4 %) | 11:15 |
| Ventouxman 2026, triathlon L | fftri_t2_area | 338 | 125 (37,0 %) | 13:26 |
| Ventouxman 2026, duathlon L | fftri_t2_area | 77 | 17 (22,1 %) | 16:29 |
| Triathlon en Provence Verte 2022, triathlon M | fftri_t2_area | 91 | 8 (8,8 %) | 1:54 |
| Bike & Run de l'Hippodrome de Marcq 2024 | prolivesport | 79 | 5 (6,3 %) | 8:58 |

Sur Ventouxman, T1 et T2 ne sont pas publiés (« — ») mais sont inclus dans le total : environ
5 minutes d'écart entre la somme natation + vélo + course et le total.

**Inversions isolées** : 1 à 36 lignes, souvent avec un gros écart.

| Épreuve | Source | Classés | Inversions | Pire écart | Cause probable |
|---------|--------|--------:|-----------:|-----------:|----------------|
| Openlakes Champagne 2026, triathlon XXL | fftri_t2_area | 255 | 9 | 4:23:39 | derniers classés avec des temps courts (distance réduite ?) |
| Triathlon du Val de Gray 2013, triathlon L | fftri_t2_area | 94 | 3 | 13:49 | |
| Ironman de Nice 2023, triathlon XXL | fftri_t2_area | 1 427 | 36 | 47:44 | petits écarts répartis (pénalités ?) |
| Triathlon de Chantilly 2023, duathlon M | fftri_t2_area | 40 | 1 | 2:55 | |
| Triathlon de Cepoy 2026, triathlon M | protiming | 127 | 3 | 1:04:30 | 2ᵉ à 4ᵉ en 3:01-3:13, 5ᵉ en 2:09 |
| Triathlon de la Combe de Savoie 2024, triathlon L | fftri_t2_area | 43 | 1 | 4:28 | |
| Aquathlon de la Verrerie 2023, aquathlon XS | chronoweb | 54 | 1 | 13:32 | dernier classé avec un temps court |
| Triathlon Pont A Mousson 2019, cross triathlon M | fftri_t2_area | 56 | 1 | 7:29 | |
| Duathlon de Grasse 2022, duathlon M | fftri_t2_area | 119 | 2 | 50:45 | derniers classés avec des temps courts |
| Vercorsman 2021, triathlon XL | fftri_t2_area | 217 | 3 | 3:53:44 | derniers classés avec des temps courts |
| Altriman 2011, triathlon XXL | fftri_t2_area | 74 | 1 | 7:56 | |
| Triathlon de la Fleche 2025, cross triathlon M | fftri_t2_area | 86 | 1 | 1:14:43 | dernier classé avec un temps court |
| Triathlon de Saint Remy sur Durolle 2005, triathlon L | fftri_t2_area | 87 | 1 | 3:31 | |
| Triathlon de Saint Remy sur Durolle 2006, triathlon L | fftri_t2_area | 93 | 1 | 1:19 | |
| Openlakes Champagne 2026, triathlon L | fftri_t2_area | 750 | 7 | 3:32:20 | classés en fin de liste avec des temps courts |
| Champ Man 2024, triathlon L | fftri_t2_area | 120 | 1 | 0:47 | |
| Triathlon de Carnac 2016, triathlon M | fftri_t2_area | 256 | 2 | 8:33:00 | 228ᵉ et 252ᵉ au même total aberrant, 11:23:46 |
| Trigames de Mandelieu 2021, triathlon L | fftri_t2_area | 146 | 1 | 2:16:35 | dernier classé avec un temps court |
| Triathlon des Moines 2019, triathlon M | fftri_t2_area | 159 | 1 | 1:35:39 | dernier classé avec un temps court |
| Triathlon Saint Raphael 2022, triathlon M | fftri_t2_area | 490 | 3 | 3:17:26 | derniers classés avec des temps courts |
| Triathlon Jura Vouglans 2012, triathlon L | fftri_t2_area | 169 | 1 | 0:46 | |
| Trialong 2016, triathlon L | fftri_t2_area | 318 | 1 | 2:03 | |
| Triathlon des Gorges de l'Ardeche 2022, triathlon L | fftri_t2_area | 449 | 1 | 2:25:39 | dernier classé avec un temps court |
| Champ Man 2025, triathlon L | fftri_t2_area | 460 | 1 | 57:34 | 231ᵉ en 6:50:59 entre deux 5:53 |
| Trialong 2021, triathlon M | fftri_t2_area | 541 | 1 | 4:19 | |
| Triathlon des Gorges de l'Ardeche 2022, triathlon M | fftri_t2_area | 577 | 1 | 1:22:34 | dernier classé avec un temps court |
| Triathlon de Gerardmer 2011, triathlon L | fftri_t2_area | 1 042 | 1 | 0:45 | |

Pistes :
- **Classements sur un autre temps** : garder le rang de la source, qui est le classement
  officiel, et signaler l'épreuve à l'affichage (« classement publié différent de l'ordre des
  temps »). Un drapeau d'épreuve calculé dans `transform/` (part de lignes inversées au-dessus de
  5 %) servirait au classement, à « Et moi ? » et aux Repères.
- **Derniers classés avec des temps courts** : vérifier sur la source s'il s'agit d'une distance
  réduite (hors délai, abandon d'un segment). Si c'est le cas, les sortir des Repères et des
  meilleurs temps, comme les temps suspects.
- **Totaux aberrants isolés** (Carnac 2016, Champ Man 2025) : marquer `temps_suspect` les totaux
  plus longs que le classé suivant de plus d'une heure ; aujourd'hui, seuls les totaux trop
  courts le sont.

### Q19 — Temps protiming de moins d'une heure écrits « mm:ss:00 » (corrigé le 24/11/2026)

Sur certaines épreuves, protiming écrit un temps de moins d'une heure en minutes, secondes et
« 00 » : « 31:18:00 » pour 31 min 18 s (valeur `officialTime` de la source, vitesse publiée
16,2 km/h, soit 8,4 km et non 507 km). Les temps d'une heure ou plus restent en hh:mm:ss.

Le constat initial (84 totaux au-dessus de 24 heures sur 6 épreuves) en manquait : les épreuves
Jeunes ont des temps « 07:23:00 » ou « 14:48:00 », sous 24 heures mais tout aussi faux. Au total,
**99 totaux sur 10 épreuves** :

| Épreuve | Totaux corrigés | Vainqueur avant | Vainqueur après |
|---------|----------------:|----------------:|----------------:|
| Triathlon de Cepoy 2015, XS (cross duathlon) | 7 sur 7 | 31:18:00 | 00:31:18 |
| Triathlon de Cepoy 2015, XS (cross triathlon) | 21 sur 21 | 29:44:00 | 00:29:44 |
| Triathlon de Cepoy 2015, Jeunes (2004-2005) | 5 sur 5 | 14:48:00 | 00:14:48 |
| Triathlon de Cepoy 2015, Jeunes (2006-2009) | 4 sur 4 | 07:23:00 | 00:07:23 |
| Triathlon de Cepoy 2016, XS (cross duathlon) | 27 sur 28 | 28:21:00 | 00:28:21 |
| Triathlon de Cepoy 2016, XS (cross triathlon) | 6 sur 7 | 26:06:00 | 00:26:06 |
| Triathlon de Cepoy 2016, Jeunes (pupilles) | 2 sur 2 | 14:32:00 | 00:14:32 |
| Triathlon de Cepoy 2016, Jeunes (poussins) | 4 sur 4 | 06:42:00 | 00:06:42 |
| Triathlon de Chartres 2016, S | 2 sur 29 | 59:30:00 | 00:59:30 (3ᵉ en 01:02:09) |
| Triathlon de Chartres 2016, XS | 21 sur 21 | 35:17:00 | 00:35:17 |

Correction dans `sources/protiming_organize.py` (`temps_en_minutes`), par épreuve :
- si tous les temps non nuls (au moins deux) ont la forme « mm:ss:00 », ce sont des minutes ;
- sinon, un temps de cette forme est lu de la façon dont la distance (vitesse × temps) est la
  plus proche de celle des autres classés (Chartres 2016 S : 59:30:00 à 25,7 km/h fait 1 529 km
  lu en heures, 25,5 km lu en minutes, pour 25,4 km chez les autres).

Vérifié sur les 549 fichiers protiming : seules ces 99 lignes changent. Les deux derniers de
Cepoy 2016 XS sont à 00:00:00 dans la source (probablement des temps d'une heure ou plus mal
écrits) : ils restent vidés au chargement, comme tout 00:00:00.

Après correction, il reste 9 totaux au-dessus de 24 heures, tous fftri_t2_area : 8 à Evergreen
2016 XXL (de 24:01:23 à 24:24:08), plausibles, et 1 non classé du Triathlon de la Baule 2022 M
(42:23:00).

### Q12 — Athlètes avec résultats des deux sexes
668 athlètes (634 le 20/11, 636 avant la correction de Q15) : homonymes réunis ou sexe mal
renseigné. La hausse vient du sexe chronoweb désormais connu, qui révèle des conflits jusque-là
invisibles. Le profil et le filtre affichent le sexe le plus fréquent.

### Autres constats
- 95 résultats ont un nom vide ou anonyme (« XXX XXX » 23, « .  . » 13, « ??? »…) : chacun de ces
  noms forme un seul « athlète » qui réunit des personnes différentes.
- 82 243 noms individuels contiennent un double espace (prolivesport « Prénom  NOM ») ; ils sont
  remis en forme à l'affichage du profil, pas dans la table.
- 7 athlètes-saisons dépassent 15 courses (CHEVREUIL Mathieu : 24 en 2022, 23 en 2021) : à
  vérifier, probables homonymes réunis.
- Temps négatifs (« -00:00:01 ») : 6 totaux (prolivesport, dont le vainqueur d'Amiens 2018 S) et
  286 lignes avec un segment négatif (269 prolivesport, 17 fftri_t2_area). Ils sont affichés tels
  quels ; piste : les vider dans results.sql, comme 00:00:00.

---

## Ordre de travail proposé

1. **Q1** : seuil par épreuve (médiane des classés trop basse pour le format), pour les 7
   épreuves prolivesport S/XS, et temps négatifs vidés. C'est ce qui fausse encore des meilleurs
   temps de profil.
2. **Q18** (ajouté le 24/11) : drapeau d'épreuve « classement publié différent de l'ordre des
   temps », totaux aberrants trop longs marqués suspects.
3. Q13.
4. Q5 (catégories), mis de côté.

Q19 (ajouté et corrigé le 24/11) ne figure plus dans cette liste.
