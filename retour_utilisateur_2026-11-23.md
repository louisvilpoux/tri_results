# Retour utilisateur — RANKED — 23/11/2026

Deuxième test, au commit `f2ef150`, base reconstruite avec `transform/run_sql.py`.
Test précédent : [retour_utilisateur_2026-11-19.md](retour_utilisateur_2026-11-19.md)
(identifiants D, U et F repris ici).

Même profil que la première fois : triathlète amateur (« DUPONT Damien », Beauvais Triathlon,
20 courses du S à l'Ironman) qui veut suivre sa progression et savoir s'il sera compétitif sur
une course, ici le Frenchman Hourtin en L.

Parcours testé : accueil → recherche « dupont damien » → profil (Progression, Même course) →
classement Frenchman Hourtin 2025 L (Repères, Et moi ?) → page de l'édition (Tendances) →
liste des courses avec recherche « beauvais » → classement en vue mobile.

**Note globale : 8/10** (6,5/10 le 19/11). La question « serai-je compétitif ? » a maintenant
une vraie réponse sur le site. Ce qui manque surtout : un calendrier des courses à venir et
des catégories d'âge fiables.

---

## Ce qui a changé depuis le 19/11

| # | Point du 19/11 | Statut |
|---|----------------|--------|
| D1 | Meilleur temps impossible (00:09:22) | **Corrigé** : disparu ; même chose pour le 00:01:03 de Tribreizh (MACQ Guillaume, L : 04:04:58 maintenant) |
| D2 | Catégories incohérentes | **Non corrigé** : en 2025, DUPONT Damien est MA, MS2 et MV1 |
| D3 | Éditions non regroupées (Saint / Sainte Aldegonde) | **Corrigé** |
| D4 | Ordre nom/prénom | **Corrigé** sur les pages testées (NOM Prénom) |
| D5 | Caractère \` dans les clubs | **Corrigé** |
| U1 | Titre de l'onglet en minuscules | **Corrigé** (« Classement Frenchman Hourtin (L) ») |
| U2 / U3 | Lieu absent | **Corrigé** : lieu sur toutes les épreuves (« Carcans (33121) ») |
| U4 | Pas de suggestions pendant la saisie | Non corrigé |
| U5 | Pas de recherche dans la liste des courses | **Corrigé** : recherche par nom ou ville |
| U6 | Filtres du classement très hauts sur mobile | Inchangé, et la page est plus longue (voir U9) |
| F1 | Repères de niveau sur une course | **Fait** : bloc « Repères » |
| F2 | « Où aurais-je fini ? » | **Fait** : bloc « Et moi ? » |
| F3 | Tendances entre éditions | **Fait** : bloc « Tendances » |
| F4 | Calendrier des courses à venir | Non fait |
| F5 | Progression par segment | **Fait** : bloc « Progression » et « Même course » |
| F6 | Comparaison, suivi, revendiquer son profil | Non fait |

---

## Points forts

- **Repères** (classement) : vainqueur, podium, top 10 %, top 25 %, médiane, dernier classé,
  histogramme des temps, et temps du 3ᵉ de chaque catégorie. Filtres par sexe et par segment.
  En dix secondes, je sais que 4h34 me met dans le top 10 % à Hourtin.
- **Et moi ?** : je saisis 32:00 / 2:15:00 / 1:30:00 et j'obtiens 77ᵉ sur 2 125 (top 4 %),
  7ᵉ MV1 sur 248, ma place sur chaque segment, l'écart au premier et à la médiane, et les
  athlètes juste devant et juste derrière. C'est exactement ce que je venais chercher.
  Les temps saisis sont dans l'URL : je peux envoyer le lien à un ami.
- **Tendances** (page de l'édition) : médiane et top 10 % par édition depuis 2019, segments
  médians, et une note qui rappelle que parcours et météo jouent. Je vois que 2023 était une
  édition lente (+24 min sur la médiane).
- **Progression** (profil) : un graphique par segment et le classement en pourcentage, par
  discipline et format, avec une phrase qui explique pourquoi le pourcentage est le repère
  le plus fiable. **Même course** compare mes deux Hourtin ligne à ligne, avec l'écart à la
  médiane : je suis resté au même niveau relatif (top 3 % puis top 4 %).
- **Données plus propres** : plus de temps absurdes sur mon profil, noms et clubs propres,
  lieu partout.
- **Recherche de courses par ville** : « beauvais » renvoie 9 épreuves avec leur lieu.

---

## Problèmes de données

| # | Problème | Exemple constaté | Piste |
|---|----------|------------------|-------|
| D2 | Catégories d'âge incohérentes (inchangé) | DUPONT Damien : MA, MS2 et MV1 en 2025 ; M35 et MS4 en 2021. Dans « Et moi ? », le choix de ma catégorie dépend donc de la course | Table de correspondance vers les catégories FFTRI (voir Q5 dans [etat_qualite_donnees_2026-11-22.md](etat_qualite_donnees_2026-11-22.md)) |
| D7 | Majuscules des noms de course différentes selon la page | « Ironman Des Sables D'Olonne », « Triathlon De Quend » dans l'historique et la liste des courses ; « Ironman des Sables d'Olonne » dans « Même course » ; « Triathlon De L'argentine » | Utiliser partout le même nom lisible (celui de `nom_course_lisible`) |
| D8 | Format L qui mélange des courses très différentes | La progression L de DUPONT Damien mélange Hourtin, deux 70.3 et Montauban (5h30, pic de 42 min en natation) | Rien à corriger dans les données ; voir U7 |

---

## Problèmes d'interface

| # | Problème | Où |
|---|----------|----|
| U4 | Toujours pas de suggestions pendant la saisie : il faut valider la recherche | Accueil, en-tête |
| U7 | Sens des graphiques différent d'un bloc à l'autre : en haut = plus lent pour les segments, en haut = mieux pour le classement, en bas = plus rapide pour l'écart à la médiane. Dans « Même course », les deux graphiques côte à côte se lisent en sens inverse | Profil (Progression, Même course) |
| U8 | Échelles qui exagèrent : passer du top 3 % au top 4 % trace une chute sur toute la hauteur du graphique | Profil (Même course) |
| U9 | Valeurs des points uniquement dans l'infobulle native (lente sur ordinateur, invisible sur mobile) ; seuls la première et la dernière année sont écrites sur l'axe | Profil, Tendances |
| U10 | « Et moi ? » : T1 et T2 laissés vides comptent pour zéro, sans avertissement ; mon total de 4:17:00 est donc optimiste d'environ 3 minutes | Classement |
| U11 | « Et moi ? » : impossible de partir de mes propres temps (pré-remplir depuis mon profil ou mon résultat sur une autre édition) | Classement |
| U12 | « Et moi ? » : sexe et catégorie ne sont pas gardés dans l'URL, contrairement aux temps | Classement |
| U13 | Liste des courses : une ligne par édition (9 lignes « Triathlon de Beauvais ») au lieu d'une ligne par course | `/races` |
| U14 | Sur mobile, le classement arrive après environ trois écrans (en-tête, Repères, 3ᵉ par catégorie, Et moi ?, filtres) | Classement |
| U15 | Catégories (MS2, MV1, FS3…) jamais expliquées : un nouveau venu ne sait pas à quelle tranche d'âge il appartient | Repères, Et moi ? |

---

## Fonctionnalités manquantes

Classées par valeur pour l'utilisateur.

### F4 — Calendrier des courses à venir (inchangé, devient la priorité)
Je sais maintenant si je serai compétitif sur une course passée, mais je ne peux pas trouver
les courses de l'an prochain : la liste ne montre que des éditions passées, sans filtre par
mois ni par département. Une page « à venir » qui reprend les repères de la dernière édition
(médiane, top 10 %) répondrait directement à « à quelle course m'inscrire ? ».

### F7 — « Et moi ? » sur plusieurs courses
Saisir mon temps une fois et voir ma place estimée sur toutes les éditions d'une course, ou sur
toutes les courses d'un format dans ma région, pour trouver celle où je peux viser un podium
de catégorie.

### F8 — Mon profil comme point de départ
Un bouton « C'est moi » qui garde mon profil et pré-remplit « Et moi ? » avec mon meilleur temps
sur le format, ou mes temps de segment récents.

### F6 — Comparaison et suivi (inchangé)
Comparer deux athlètes sur leurs courses communes, suivre un athlète.

---

## Proposition de priorisation

1. **F4** Calendrier des courses à venir, avec les repères de la dernière édition.
2. **D2** Catégories d'âge normalisées : elles servent maintenant dans « Repères » et
   « Et moi ? ».
3. Corrections rapides : **U10** (T1/T2 manquants), **U12**, **D7**.
4. Lisibilité des graphiques : **U7**, **U8**, **U9**.
5. **F8**, **F7**, **U13**, **U4**.
6. **U14**, **U15**, **F6**.
