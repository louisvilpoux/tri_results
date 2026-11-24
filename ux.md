# Refonte UX des pages course, classement et athlète — 24/11/2026

Revue UX des pages course, classement et athlète, puis mise en œuvre des recommandations, du
commit `7910db7` au commit `05e6a1a`. Points des retours utilisateur traités : U6, U14 et en
partie U16 (voir [retour_utilisateur_2026-11-23.md](retour_utilisateur_2026-11-23.md) et
[retour_utilisateur_2026-11-23_2.md](retour_utilisateur_2026-11-23_2.md)).

---

## Constat

Avec l'arrivée des analyses (Tendances, Repères, « Et moi ? », Progression), ces blocs ont été
ajoutés **au-dessus** des tableaux. Or le classement et l'historique sont la raison principale de
la visite, et il fallait beaucoup faire défiler la page pour les atteindre.

Position du contenu principal, en pixels depuis le haut de la page, avant la refonte :

| Page | Contenu principal | Desktop (1280 px) | Mobile (390 px) |
|---|---|---|---|
| Classement (Frenchman Hourtin L 2025) | tableau | 1 200 px | 2 040 px |
| Profil athlète (CHEVREUIL Mathieu) | historique | 2 056 px | **4 478 px**, page de 6 380 px |
| Édition (Frenchman Hourtin 2025) | cartes « Formats », seul chemin vers le classement | 1 400 px | 2 125 px |

## Principe retenu

**D'abord ce que l'on vient chercher (classement, historique), ensuite le contexte (repères,
tendances, progression)**, replié ou dans un onglet. La même règle s'applique aux trois pages.

---

## Ce qui a été fait

### 1. Ordre des sections (`7910db7`)

- **Page édition** : les cartes Formats, avec « Voir le classement », passent avant Tendances.
- **Profil athlète** : l'historique vient juste après les chiffres clés, puis les meilleurs temps,
  puis la progression. Cet ordre est ensuite remplacé par les onglets (section 4).
- **Repères** : seuls les 6 chiffres clés restent visibles (vainqueur, podium, top 10 %, top 25 %,
  médiane, dernier). L'histogramme et le 3ᵉ de chaque catégorie sont repliés derrière « Voir la
  répartition et le 3ᵉ de chaque catégorie ». Ce bloc **s'ouvre automatiquement** dès qu'un temps
  est saisi dans « Et moi ? », pour garder le repère « Toi » visible dans l'histogramme (U16).

### 2. Autres éditions dans l'en-tête de la page course (`8be3e60`)

Les années de la course quittent le bas de la page pour l'en-tête sombre, sous la date et le
lieu : on change d'édition sans faire défiler la page. C'est de la navigation, sa place est dans
l'en-tête. Sur mobile, les années tiennent sur une seule ligne qui défile horizontalement : les
13 éditions de Frenchman Hourtin prenaient 4 lignes.

### 3. Ligne « Toi » dans le classement (`b859128`)

Le temps saisi dans « Et moi ? » apparaît comme **une ligne du classement, à sa place**, sur fond
sombre comme le repère de l'histogramme. Elle affiche la place estimée, la catégorie, le sexe, les
temps par segment et le total.

- **Nom** : « Toi » et non « Vous », car l'application tutoie partout (« Saisis tes temps »,
  « Toi · 5h00 »).
- **Bandeau au-dessus des filtres** : « Avec 04:45:00, tu serais 369ᵉ sur 2 125 classés au temps
  total. » Il propose « Voir ma ligne » si la ligne est sur la page affichée, ou « Aller à ma
  place » si elle est sur une autre page : cette page s'ouvre et la ligne est centrée à l'écran.
- **Avec un filtre sexe ou catégorie**, la ligne s'insère parmi les lignes filtrées, mais le
  bandeau ne propose pas « Aller à ma place » : la page de la place ne peut pas se calculer.
- **Pas de ligne** quand le tri porte sur une autre colonne ou est inversé, en recherche par nom,
  ou sur une épreuve sans temps.
- **Classement de la source dans le désordre** : quelques sources classent autrement que par le
  temps total publié (pénalités, autre temps de référence). C'est le cas de **34 épreuves sur
  3 636** avec au moins une inversion de plus de 30 s (31 chez fftri t2area, 1 chez protiming,
  1 chez prolivesport, 1 chez chronoweb), dont 7 où les inversions touchent plus de 5 % des
  lignes ; détail dans Q18 de [etat_qualite_donnees_2026-11-22.md](etat_qualite_donnees_2026-11-22.md).
  Exemple : Ventouxman 2026, où le 23ᵉ a 06:05:21 et le 25ᵉ 05:59:47. Quand les temps de la page
  affichée ne se suivent pas, la ligne n'est pas insérée : le bandeau l'explique et propose
  « Trier par temps total ». Les lignes non classées (statuts prolivesport 0 et 99991-99999,
  dont 268 ont un temps) sont ignorées, comme dans « Et moi ? ».
- **Simulation gardée dans l'adresse** : jusqu'ici, changer de page, de tri ou de filtre effaçait
  les paramètres `moi_…`. Le simulateur les remet maintenant après chaque navigation, donc une
  simulation reste partageable.

**Place estimée** : la place vient de « Et moi ? », qui ignore les temps suspects. Elle peut
différer d'un rang ou deux du classement de la source ; au survol, elle est présentée comme une
place estimée.

### 4. Onglets sur le profil athlète (`968d36f`)

Sous les chiffres clés, trois onglets : **Résultats** (par défaut), **Meilleurs temps** et
**Progression**.

- L'onglet est dans l'adresse (`?vue=records`, `?vue=progression`), donc partageable. Changer
  d'onglet ne fait pas remonter la page.
- Seules les données de l'onglet affiché sont chargées : l'onglet Résultats ne charge plus la
  progression, et inversement.
- L'onglet Résultats garde l'état de l'historique (saison, discipline, tri, page).
- Un message s'affiche quand un onglet est vide, par exemple la progression d'un athlète qui n'a
  couru qu'une fois un format.
- **Mobile** : les chiffres clés passent à 3 tuiles par ligne (2 rangées au lieu de 3). Les
  onglets n'ont ni icônes ni compteurs, et « Meilleurs temps » devient « Records », pour que les
  trois onglets tiennent sur la largeur.

### 5. Filtres compacts du classement sur mobile (`05e6a1a`, U6)

- Sur mobile, seule la recherche d'athlète reste visible (Entrée la lance), à côté d'un bouton
  « Filtres » qui ouvre sexe, catégorie, nombre par page et les boutons.
- Le bouton passe en orange et affiche le nombre de filtres actifs (sexe, catégorie). On voit
  donc qu'un filtre est actif même quand le panneau est fermé.
- Desktop inchangé : tous les champs restent sur une ligne.

---

## Résultat

| Page | Contenu principal | Avant (desktop / mobile) | Après (desktop / mobile) |
|---|---|---|---|
| Classement | tableau | 1 200 / 2 040 px | 890 / **1 301 px** |
| Profil athlète | historique | 2 056 / 4 478 px | 716 / **928 px** ; page mobile de 2 829 px au lieu de 6 380 px |
| Édition | Formats | 1 400 / 2 125 px | **407 / 541 px** |

Mesures prises sur le code final (`05e6a1a`), sur Frenchman Hourtin 2025 (L) et CHEVREUIL
Mathieu, sans temps saisi dans « Et moi ? ». Sur la page édition, les années ajoutées dans
l'en-tête descendent les Formats d'environ 50 px.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `app/races/[id]/page.tsx` | Page édition : formats avant tendances |
| `components/races/race-event-header.tsx`, `race-editions.tsx` | Années dans l'en-tête |
| `components/results/race-benchmarks.tsx` | Repères : répartition repliée |
| `components/results/my-simulation.tsx` | Contexte client partagé par « Et moi ? », Repères et classement |
| `components/results/my-place.tsx` | Position de la ligne « Toi » (`locateMe`) et bandeau |
| `components/results/results-table.tsx` | Composant client : ligne « Toi » insérée |
| `components/results/race-simulator.tsx` | Simulation remontée au contexte, paramètres `moi_…` gardés |
| `components/results/filters-panel.tsx` | Panneau de filtres repliable sur mobile |
| `components/results/results-filters.tsx` | Formulaire de filtres (serveur) |
| `app/athletes/[id]/page.tsx` | Profil : onglets, chargement selon l'onglet |
| `components/athletes/athlete-tabs.tsx` | Onglets du profil (`?vue=`) |
| `components/athletes/athlete-stats.tsx` | Chiffres clés compacts sur mobile |

Tous les chemins sont relatifs à `triathlon-results/`.

---

## Limites et pistes

| # | Point | Piste |
|---|---|---|
| 1 | 34 épreuves ont un classement publié qui ne suit pas les temps totaux | Ajoutées à l'audit (Q18) ; Q19, temps protiming en minutes lus comme des heures, corrigé le 24/11 |
| 2 | T1 et T2 non publiés par certaines sources (Ventouxman) mais inclus dans leurs totaux : une simulation par segments sans transitions paraît plus rapide | Déjà signalé dans « Et moi ? » quand T1 et T2 sont vides |
| 3 | Onglet Meilleurs temps : le titre du bloc répète le nom de l'onglet | Masquer le titre dans l'onglet |
| 4 | Le panneau de filtres mobile reste ouvert après « Appliquer » | À trancher : le refermer et ne garder que le badge |
| 5 | La page de la place (« Aller à ma place ») ne peut pas se calculer avec un filtre | Calculer le rang filtré côté client avec les temps de « Et moi ? » |
