# Retour utilisateur — PACE

Test réalisé le 19/11/2026 en se mettant dans la peau d'un triathlète amateur (profil de test :
« DUPONT Damien », Beauvais Triathlon, 21 courses du S à l'Ironman) qui veut :

1. retrouver ses temps (temps intermédiaires inclus) et suivre sa progression ;
2. savoir, pour une course qui le tente (ex. Frenchman Hourtin L), s'il y sera compétitif :
   temps du top 10 %, du podium de sa catégorie, de la moitié du classement.

Parcours testé : accueil → recherche « dupont » → profil athlète → classement Frenchman
Hourtin 2025 (L) → page de l'édition → liste des courses → classement en vue mobile.

**Note globale : 6,5/10.** Très bonne base pour consulter des résultats, mais elle n'aide pas
encore l'athlète à se situer.

---

## Points forts

- **Accueil** : clair et moderne, recherche bien visible, toutes les disciplines présentées.
- **Recherche** : « dupont » → 144 athlètes avec club, nombre de courses et dernière saison.
- **Profil athlète** : nombre de courses, podiums, top 10, meilleur classement, saisons,
  meilleurs temps par format, historique complet avec classement sous la forme « 77 / 243 ».
- **Classement d'une course** : natation, T1, vélo, T2, course à pied et total ; filtres par
  sexe et catégorie ; tri par segment.
- **Page d'une édition** : formats, vainqueur, première femme, participants, autres éditions.
- **Mobile** : utilisable (les filtres prennent toutefois beaucoup de place en hauteur).

---

## Problèmes de qualité des données (priorité haute)

Un record faux sur un profil fait perdre confiance dans tout le reste.

| # | Problème | Exemple constaté | Piste |
|---|----------|------------------|-------|
| D1 | Meilleur temps impossible | Triathlon S en **00:09:22** (Villeneuve-d'Ascq, 28/04/2019) sur `/athletes/806619` | Exclure des meilleurs temps ceux qui sont invalides pour le format (seuil minimal par discipline/format), vérifier la source de la ligne |
| D2 | Catégories d'âge incohérentes | Même athlète en MSE, SE, MS2, MS3, MS4, M30-34, M35, MV1, MA ; MV1 à Hourtin (05/2025) puis MS2 aux Sables (06/2025) | Normaliser les catégories (FFTRI vs Ironman vs autres sources) dans `transform/` |
| D3 | Éditions d'une même course non regroupées | « Duathlon De **Sainte** Aldegonde » vs « Duathlon De **Saint** Aldegonde » | Normaliser les noms de course (saint/sainte, apostrophes, « D » / « D' ») |
| D4 | Ordre nom/prénom variable | « Pierre DUPONT » vs « DUPONT Philippe » dans la même liste | Normaliser l'affichage en NOM Prénom |
| D5 | Caractères parasites | « TRIATHLON CLUB D\`HAZEBROUCK » | Remplacer \` par ' au nettoyage |
| D6 | Classement d'une même course qui change de format | « Ironman Des Sables D Olonne » en L (2020, 2023) et en XXL (2025) | Vérifier s'il s'agit de deux épreuves distinctes (70.3 / full) et le rendre lisible |

---

## Problèmes d'interface (priorité moyenne)

| # | Problème | Où |
|---|----------|----|
| U1 | Titre de l'onglet en minuscules : « frenchman hourtin 2025 \| PACE », « Classement frenchman hourtin (L) » | `/races/{id}`, `/races/{id}/results` |
| U2 | Lieu de la course absent de la page de l'édition | `/races/{id}` |
| U3 | Lieu absent pour beaucoup de courses dans la liste (Bayman, Ixt 29…) | `/races` |
| U4 | Pas de suggestions pendant la saisie dans la recherche, il faut valider | Accueil, en-tête |
| U5 | Pas de recherche par nom ni de filtre par région/département sur la liste des courses | `/races` |
| U6 | Filtres du classement très hauts sur mobile (le tableau arrive après un long défilement) | `/races/{id}/results` |

---

## Fonctionnalités manquantes pour « serai-je compétitif ? »

Classées par valeur pour l'utilisateur.

### F1 — Repères de niveau sur une course (indispensable)
Sur la page d'un format : temps du vainqueur, temps des top 10 %, 25 % et 50 %, temps du dernier
classé, temps du 3ᵉ de chaque catégorie, histogramme de répartition des temps. Même chose par
segment (natation, vélo, course à pied).

### F2 — « Où aurais-je fini ? »
À partir de mon meilleur temps sur le même format (ou d'un temps saisi), afficher le classement
estimé, global et dans ma catégorie, sur une édition précédente. C'est la fonctionnalité qui
pourrait justifier un abonnement.

### F3 — Tendances entre éditions
Comparer les temps médians et les temps du top 10 % d'une année sur l'autre pour une course
(parcours plus ou moins rapide, effet météo).

### F4 — Calendrier des courses à venir
Courses futures avec filtres discipline, format, région et mois. Aujourd'hui seules les courses
passées sont listées.

### F5 — Progression par segment sur le profil
Graphique de l'évolution des temps de natation, vélo et course à pied (et du classement en
pourcentage) au fil des saisons, par format.

### F6 — Comparaison et suivi
Comparer deux athlètes (face-à-face sur les courses communes), suivre un athlète, revendiquer
son profil.

---

## Proposition de priorisation

1. **Fiabilité des données** : D1, D2, D3 (préalable à F1 et F2).
2. **F1** Repères de niveau sur une course.
3. **F2** Classement estimé.
4. Corrections d'interface rapides : U1, U2, U5.
5. **F4** Calendrier, **F5** Progression par segment.
6. **F3**, **F6**, U4, U6.
