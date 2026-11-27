# Retour utilisateur — RANKED — 23/11/2026 (second test)

Troisième test, le même jour que le précédent, au commit `8d4712f` (après les corrections
U4, U7 à U10, U12, U13, D7, les colonnes de duathlon et l'arrivée de protiming). Base
reconstruite avec `transform/run_sql.py` : 868 142 résultats, dont 28 962 protiming.
Tests précédents : [retour_utilisateur_2026-11-19.md](retour_utilisateur_2026-11-19.md),
[retour_utilisateur_2026-11-23.md](retour_utilisateur_2026-11-23.md) (identifiants D, U et F
repris ici).

Même profil : triathlète amateur (« DUPONT Damien », Beauvais Triathlon) qui veut suivre sa
progression et savoir s'il sera compétitif, ici au Frenchman Hourtin en L.

Parcours testé : suggestions de recherche (« dupont dam », « hourtin ») → page de l'édition
2026 (Tendances) → profil (Progression, Même course) → lien partagé « Et moi ? » avec sexe et
catégorie → liste des courses « beauvais » → classement protiming (Orléans Ile Charlemagne
2025 M) → classement d'un duathlon prolivesport (Sainte Aldegonde 2025 S).

**Note globale : 8,5/10** (8/10 ce matin, 6,5/10 le 19/11). Les corrections de ce matin sont
toutes visibles et réussies. Il manque toujours le calendrier des courses à venir, et deux
problèmes de données faussent les repères de certaines courses.

---

## Ce qui a changé depuis le test de ce matin

| # | Point | Statut |
|---|-------|--------|
| U4 | Suggestions pendant la saisie | **Corrigé** : athlètes (club, nombre de courses) et courses (lieu, nombre d'éditions) ; la toute première suggestion a mis 2 à 3 secondes à venir, les suivantes sont instantanées |
| U7 | Sens des graphiques | **Corrigé** : « plus bas = plus rapide ou mieux classé » partout, écrit sous les graphiques |
| U8 | Échelles qui exagèrent | **Corrigé** : passer du top 3 % au top 4 % donne une ligne presque plate |
| U9 | Valeurs dans l'infobulle seulement | **Corrigé** : valeur, course et date au-dessus de chaque graphique ; le survol d'un point met à jour tous les graphiques du bloc |
| U10 | T1 / T2 vides comptés pour zéro | **Corrigé** : « Champs non remplis : T1 et T2… le total calculé peut donc être trop optimiste » |
| U12 | Sexe et catégorie absents de l'URL | **Corrigé** : un lien avec `moi_sexe=M&moi_categorie=MV1` ouvre le bloc rempli (77ᵉ / 2 125, 7ᵉ MV1 / 248) |
| U13 | Une ligne par édition | **Corrigé** : « beauvais » donne 3 courses, dont « Triathlon de Beauvais » avec ses 7 éditions en pastilles |
| D7 | Majuscules des noms de course | **Corrigé** : « Triathlon de Quend », « Triathlon de l'Argentine - Beauvais » partout |
| D2 | Catégories d'âge incohérentes | **Non corrigé**, et protiming ajoute un nouveau système (voir D10) |
| U11 | Partir de mes propres temps dans « Et moi ? » | Non fait |
| U14 | Classement loin sous les blocs sur mobile | Non retesté, aucun changement depuis ce matin |
| U15 | Catégories jamais expliquées | Non fait |
| F4 | Calendrier des courses à venir | Non fait |

---

## Points forts

- **Suggestions de recherche** : en tapant « hourtin », je vois « Frenchman Hourtin —
  Carcans (33121) · 13 éditions, dernière en 2026 · Triathlon » et j'arrive directement sur
  la dernière édition. C'est le chemin le plus court vers ce que je cherche.
- **Graphiques du profil** : je lis enfin mes valeurs sans survoler. Survoler mon pic de
  natation affiche « 42 min — Triathlon de Montauban 07/07/2024 » sur les quatre graphiques
  à la fois : je comprends tout de suite que c'est cette course qui était particulière.
- **Lien « Et moi ? » complet** : je peux envoyer à un ami de mon club un lien qui montre ma
  place estimée chez les MV1.
- **Liste des courses** : une ligne par course avec ses éditions, beaucoup plus lisible.
- **Protiming** : nouvelles courses (Orléans, Bordeaux, Parc de Loire) avec segments
  complets, et leurs athlètes sont rattachés aux profils existants (PELLETIER Gregoire,
  25 courses).
- **Duathlon** : colonnes « Course 1 », « Vélo », « Course 2 » dans les repères et le
  classement, plus de « Natation » sur un duathlon.

---

## Problèmes de données

| # | Problème | Exemple constaté | Piste |
|---|----------|------------------|-------|
| D9 | **Classements hommes et femmes publiés comme deux épreuves** | Duathlon de Sainte Aldegonde 2025 : « S Masculin » (210 résultats, tous M) et « S Feminin » (81) sont deux épreuves au format S. Les repères et « Et moi ? » de l'épreuve S ne comptent que les hommes, sans filtre Hommes / Femmes, et le meilleur temps femme n'y apparaît pas. 60 épreuves de 27 éditions sont dans ce cas (« S Homme », « XS Femmes », « FEMMES »…) | Réunir les épreuves d'un même format séparées par sexe en une seule, en gardant le sexe sur chaque ligne |
| D10 | Catégories et noms protiming | Catégories « S3M », « V2M », « S1F », « HAM » : un quatrième système, après FFTRI (MS3), prolivesport (SE, MA) et Ironman (M30-34). Noms tout en majuscules dans le classement (« CHAGOT DENIS », 22 242 lignes sur 23 447) et parfois sur le profil (« COQUAND LEO ») | Ajouter protiming à la table de correspondance des catégories (D2) ; mettre en forme NOM Prénom comme pour les autres sources |
| D11 | Format du lieu irrégulier | « Bordeaux » et « Bordeaux (33000) », « Orléans », « Arcachon » sans code postal (épreuves protiming) ; « La Longueville » écrit « Le Longueville (59570) » | Appliquer aux lieux protiming le format « Ville (code postal) » et `lieux_courses.csv` |
| D2 | Catégories d'âge (inchangé) | DUPONT Damien : MA, MS2 et MV1 en 2025 | Table de correspondance (voir aussi D10) |

---

## Problèmes d'interface

| # | Problème | Où |
|---|----------|----|
| U16 | Mon temps saisi dans « Et moi ? » n'apparaît pas dans l'histogramme des Repères, juste au-dessus : il faut comparer les chiffres soi-même | Classement |
| U17 | Axe du graphique « Écart à la médiane » : « méd. » en haut et « 1:05:46 » en bas, sans le signe moins alors que le tableau affiche « −1:05:46 » | Profil (Même course) |
| U18 | Première suggestion de recherche lente (2 à 3 secondes, peut-être lié au serveur de développement) | Accueil |
| U11 | « Et moi ? » ne propose pas de partir de mes temps | Classement |
| U14 | Sur mobile, le classement arrive après environ trois écrans | Classement |
| U15 | Catégories jamais expliquées (MS2, MV1, et maintenant S3M, V2M) | Repères, Et moi ? |

---

## Fonctionnalités manquantes

### F4 — Calendrier des courses à venir (inchangé, toujours la priorité)
Je sais me situer sur toutes les éditions passées d'une course, mais je ne peux toujours pas
chercher où courir l'an prochain : ni course à venir, ni filtre par mois ou par département.

### F8 — Mon profil comme point de départ (inchangé)
Un bouton « C'est moi » pour pré-remplir « Et moi ? » (U11) et retrouver mon profil sans
recherche.

### F7 — « Et moi ? » sur plusieurs courses (inchangé)
Ma place estimée sur toutes les éditions d'une course ou sur les courses d'un format dans ma
région.

### F6 — Comparaison et suivi (inchangé)

---

## Proposition de priorisation

1. **D9** Épreuves séparées par sexe : les repères de 60 épreuves sont faux pour les femmes.
2. **F4** Calendrier des courses à venir.
3. **D2 + D10** Table de correspondance des catégories, protiming compris.
4. Corrections rapides : **D10** (noms protiming), **D11**, **U17**, **U16**.
5. **F8 / U11**, **F7**.
6. **U14**, **U15**, **U18**, **F6**.
