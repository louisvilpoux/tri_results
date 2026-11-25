# Retour utilisateur — PACE — 25/11/2026

Quatrième test, au commit `03e263d` (après la refonte UX du 24/11, D9, la catégorie FFTRI
commune et les corrections de l'audit du 25/11). Tests précédents :
[retour_utilisateur_2026-11-19.md](retour_utilisateur_2026-11-19.md),
[retour_utilisateur_2026-11-23.md](retour_utilisateur_2026-11-23.md),
[retour_utilisateur_2026-11-23_2.md](retour_utilisateur_2026-11-23_2.md). Les identifiants D, U
et F continuent la numérotation de ces retours.

**Nouveau profil** : triathlète **et** duathlète amateur, V4 (55-59 ans), club de la Côte
d'Opale, une dizaine de courses par an dans le Nord – Pas-de-Calais : sprints et M l'été,
duathlons au printemps et à l'automne, un format long ou XXL par an. Profil réel utilisé pour le
test : BELLET Jean francois (108 courses, 2007-2026). Je découvre PACE.

Ce que j'attends en arrivant :
1. retrouver mes temps et voir si je progresse ou si je décline avec l'âge ;
2. pour une course où je pense m'inscrire, savoir si je serai **compétitif dans ma catégorie
   d'âge** (pas au scratch : à 57 ans, je ne joue pas la gagne).

Parcours testé : recherche « bellet jean » → profil (Résultats, Meilleurs temps, Progression en
Triathlon M et Duathlon S, filtre saison 2019) → liste des courses → Duathlon de Sainte
Aldegonde 2026 (S) avec « Et moi ? » rempli avec mes temps de 2025 → classement du Duathlon
Lomme 2026 (S).

**Note globale : 7/10.** Pour suivre mes courses passées, c'est déjà le meilleur outil que je
connaisse. Pour décider où m'inscrire, il me manque encore l'essentiel : les courses à venir et
une comparaison dans ma tranche d'âge.

---

## Ce que j'aime

- **Tout mon historique au même endroit, en une recherche.** Je tape « bellet jean », la
  suggestion affiche mon club et « 108 courses » : je suis sûr que c'est moi avant de cliquer.
  20 saisons, triathlon, duathlon, cross et aquathlon réunis. Aucun site de chronométreur ne fait
  ça : jusqu'ici je tenais un tableur.
- **L'onglet Progression.** Les 21 Triathlon M côte à côte, natation, vélo et course séparés,
  avec le classement en % : je vois en un coup d'œil que ma natation tient (31 min) mais que mon
  vélo et ma course à pied reculent depuis 2019. La phrase « le classement en pourcentage est le
  repère le plus fiable » est juste et utile.
- **« Même course ».** Mes 5 Triathlon de Gravelines alignés, avec l'écart d'une année sur
  l'autre et l'écart à la médiane : passer de « Top 14 % » en 2019 à « Top 32 % » en 2026,
  toujours 10 minutes devant la médiane, c'est exactement la lecture que je fais moi-même après
  chaque course. Les onglets par format (Duathlon S, Cross duathlon S…) couvrent bien mon
  profil multi-disciplines.
- **« Et moi ? » est la fonctionnalité qui me ferait revenir.** Avec mes temps 2025 à Sainte
  Aldegonde, j'obtiens : 242ᵉ / 339 au général, 37ᵉ / 55 chez les Masters, place par segment,
  et « Juste devant : 241ᵉ Francois MESNARD 01:10:14 ». Je vois que ma course 2 est mon point
  fort (top 56 %) et ma course 1 mon point faible (top 78 %). Le repère « Toi · 1h10 » dans
  l'histogramme et la ligne « Toi » dans le classement rendent ça très concret.
- **Les temps douteux sont signalés.** Mon Duathlon de Noyon 2019 en « 00:08:35 » porte une
  explication (temps anormal, probablement une erreur de la source). Je fais davantage confiance
  au reste parce que le site reconnaît ses erreurs.
- **Navigation rapide.** Les éditions dans l'en-tête de la course, le classement qui arrive vite
  à l'écran, les onglets du profil dans l'adresse (je peux envoyer ma progression à mon coach).

---

## Ce que je n'aime pas

### Données (ce qui me fait douter des chiffres)

| # | Problème | Exemple constaté | Piste |
|---|----------|------------------|-------|
| D12 | **Segments faux sur un duathlon entier** | Duathlon Lomme 2026 S : « T1 00:17:06 », « Vélo 00:12:36 », « T2 00:17:04 » pour moi ; le vainqueur a aussi « T1 00:14:19 » et « T2 00:14:16 ». Un vélo de sprint en 12 min et des transitions de 17 min : les colonnes sont visiblement décalées (tours de vélo ?). Même chose en 2025. Mes graphiques Duathlon S en sont faussés (vélo « 13 min ») | Vérifier le découpage des segments prolivesport sur cette course ; marquer les segments non fiables comme on marque les totaux |
| D13 | **Ma catégorie change d'une course à l'autre** | Même saison 2026 : « Master » à Ardres, Gravelines, Lomme ; « V4 » à l'Omois, Vercorsman, Bray-Dunes. Le 20 et le 21/06 à Bray-Dunes : V4 au triathlon, Master au duathlon | Quand la source ne publie que « Master », déduire la tranche (V4) des autres résultats de l'athlète la même saison |
| D14 | **Courses de « triathlon » rangées en duathlon sans explication** | « Triathlon de Ardres » 2022 (M) et « Triathlon de Pontivy » 2024 (L) apparaissent avec le filtre Duathlon ; mon record « Duathlon · M » est « Triathlon de Ardres ». Si la natation a été annulée, il faut le dire | Afficher « natation annulée, couru en duathlon » sur la course et dans l'historique |
| D15 | **Un même format S recouvre des courses très différentes** | Mes Triathlon S 2026 : 1:17:29 à l'Audomarois, 1:55:26 à Ardres. Mon record Triathlon M (1:43:41, Ardres 2017) est plus rapide que tous mes M réels (2:20 à 2:44) | Afficher les distances (natation / vélo / course) quand elles sont connues ; ne pas mettre en record un temps venant d'une course hors normes |
| D16 | Segments manquants sur d'anciennes courses | Duathlon de Douai L (2008-2019) : seul le vélo est rempli, ni course 1 ni course 2 | Vérifier la source ; à défaut, ne pas tracer ces courses dans la Progression par segment |
| D17 | Mon club existe en trois versions | « COTE D OPALE TRIATHLON SAINT OMER » (209 athlètes), « COTE D OPALE TRIATHLON CALAIS SAINT OMER » (198), « COTE D'OPALE TRIATHLON » (9) | Table de correspondance des clubs |
| D18 | Noms affichés de deux façons | « BELLET Jean francois » sur mon profil, « Jean Francois BELLET » dans les classements prolivesport ; « Felix  POUILLY » avec deux espaces dans l'API | Même mise en forme « NOM Prénom » partout |
| D19 | Type de course incohérent | « Cross-Duathlon Hinges » 2019 classé « Duathlon M » dans mon historique, alors que les autres cross duathlons sont bien rangés | Déduire le type du nom quand il contient « cross » |

### Interface

| # | Problème | Où |
|---|----------|----|
| U19 | **La page saute pendant la saisie dans « Et moi ? »** : dès le premier temps saisi, la répartition des Repères s'ouvre au-dessus et pousse le formulaire vers le bas ; mon clic suivant tombe ailleurs. J'ai dû recommencer | Classement |
| U20 | **« Et moi ? » m'avertit pour T1 alors que la course ne publie pas de T1** (colonne « — » pour tous à Sainte Aldegonde) : « Champ non rempli : T1… trop optimiste ». Le champ T1 ne devrait pas être proposé, ou l'avertissement devrait dire que T1 est inclus dans un autre segment | Classement |
| U21 | La catégorie de « Et moi ? » ne me correspond pas : on me propose « Master (niveau non publié) », soit 55 hommes de 40 à 80 ans. Être 37ᵉ / 55 ne me dit pas si je suis compétitif chez les V4 | Classement |
| U22 | Nombre de participants différent entre l'historique et Même course (« 140 / 465 » contre « 140/445 » à Gravelines 2026) : je ne sais pas lequel croire | Profil |
| U23 | Records sans contexte : un temps, une course, une date, mais ni place ni % ; noms de course coupés (« Championnat de France A… », « Triathlon des Gorges de l'A… ») ; « Aquathlon » sans format | Profil, Meilleurs temps |
| U24 | Aucune place en catégorie dans mon historique : je vois 140ᵉ / 465, pas « 6ᵉ V4 » | Profil, Résultats |

---

## Ce qui me manque

### F4 — Calendrier des courses à venir (toujours la priorité)
C'est ma première question en novembre : **où courir l'an prochain ?** La liste des courses ne
montre que le passé, et ne filtre ni par mois ni par département. Je voudrais voir les duathlons
de mars-avril dans le Nord et le Pas-de-Calais, avec la date prévue, le lien d'inscription et,
pour chacune, les repères des éditions passées.

### F9 — « Serai-je compétitif ? » sur une course à venir
À partir de mon niveau récent sur le même format (par exemple ma moyenne en % sur mes 3 derniers
Duathlon S), afficher sur chaque course : « place attendue : top 60 % au général, top 30 % chez
les V4 », sur la base des éditions passées. Aujourd'hui je dois saisir mes temps à la main course
par course, édition par édition.

### F10 — Classement par tranche d'âge réelle
Le classement et « Et moi ? » filtrés sur V4 (ou 55-59 ans), quelle que soit la façon dont la
source publie la catégorie. C'est **la** comparaison qui compte pour un athlète de mon âge :
podium V4 ou pas.

### F8 — « C'est moi » (inchangé)
Me déclarer sur mon profil pour pré-remplir « Et moi ? » avec mes temps récents, retrouver mon
profil sans recherche et peut-être corriger moi-même une catégorie ou un résultat qui ne sont
pas à moi.

### F11 — Distances des parcours
Afficher les distances réelles quand elles sont connues (ou au moins les distances standard du
format) : sans elles, je ne peux pas comparer deux S ni comprendre un temps qui détonne.

### F12 — Comparer avec un rival ou un équipier
Mettre deux profils côte à côte sur les courses faites ensemble : qui a gagné, de combien, sur
quel segment. Dans un club, c'est le sujet de discussion du lundi.

### F13 — Suivi de mes futurs résultats
Être prévenu quand un nouveau résultat apparaît sur mon profil (courriel ou notification), pour
ne plus aller chercher sur chaque site de chronométrage.

---

## Pourquoi je reviendrais

- **Après chaque course**, pour voir ma place en %, l'écart à la médiane et la comparaison avec
  mes éditions précédentes : PACE remplace mon tableur et les cinq sites de chronométreurs que je
  consulte aujourd'hui.
- **Avant de m'inscrire**, pour regarder les repères d'une course et simuler mon temps avec
  « Et moi ? » : c'est déjà possible et c'est convaincant, à condition de connaître la course.
- **En fin de saison**, pour l'onglet Progression : voir mon vélo baisser depuis 2019 m'aide à
  savoir quoi travailler cet hiver.
- **Pour le club**, en envoyant un lien de profil ou de simulation à un équipier.

Ce qui me ferait revenir **chaque semaine** plutôt qu'après chaque course : le calendrier (F4)
avec une estimation de mon niveau sur les courses à venir (F9), la comparaison par tranche d'âge
(F10), et une alerte quand un nouveau résultat arrive (F13).

Ce qui pourrait me faire partir : tomber sur un deuxième cas comme Lomme (D12). Un vélo de
12 minutes dans mes graphiques, c'est le genre d'erreur qui fait douter de tout le reste.

---

## Proposition de priorisation

1. **D12** Segments décalés sur le Duathlon Lomme, et recherche des autres courses touchées
   (contrôle : vélo plus court qu'une transition).
2. **F4** Calendrier des courses à venir, filtrable par mois et département.
3. **D13 + F10 + U21** Tranche d'âge réelle quand la source publie « Master », et filtre
   correspondant dans le classement et « Et moi ? ».
4. Corrections rapides : **U19** (la page saute), **U20** (T1 non publié), **U22**, **D18**,
   **D19**.
5. **D14 + D15 + F11** Natation annulée signalée, distances affichées, records fiables (**U23**).
6. **F9**, **F8**, puis **D16**, **D17**, **U24**, **F12**, **F13**.

---

## Suivi

| # | Statut |
|---|--------|
| D12 | **Corrigé le 25/11/2026.** Au Duathlon Lomme 2025 et 2026 S (prolivesport), les colonnes T1 et T2 contiennent des tours de vélo : la somme des segments donne bien le total, le contrôle existant ne le voyait pas. Nouveau contrôle, toutes sources (`transform/segments_prolivesport.sql`) : une épreuve où plus de la moitié des classés ont une transition plus longue que le vélo perd tous ses segments. 18 épreuves touchées, toutes aux segments manifestement faux : Lomme 2025 et 2026 S, Quiberon 2025 XS, Ardres 2026 M, Ironman de Nice 2019 (transitions de 8 h), Jura Vouglans 2011 et 2013 L (vélo de 3 min), Altriman 2011 L, Luberon 2014 L, relais militaire de Brive 2023, épreuves jeunes de Noyon, Sainte-Aldegonde et Beauvais… L'utilisateur est averti : bandeau sur la page de classement (« Les temps intermédiaires publiés par la source pour cette épreuve sont incohérents […] ») et note dans la progression du profil, qui nomme les courses sans point sur les graphiques de segments. Les épreuves dont les segments étaient déjà retirés par l'ancien contrôle (somme ≠ total) ont désormais le même bandeau : 112 épreuves, 14 610 résultats en tout (`results.segments_retires`). |
