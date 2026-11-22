# État des lieux de la qualité des données — 22/11/2026

Audit du 22/11/2026 au commit `d38c0de`, base reconstruite avec `transform/run_sql.py`.
Audit précédent : [etat_qualite_donnees_2026-11-20.md](etat_qualite_donnees_2026-11-20.md)
(mêmes identifiants Q1 à Q14 ; D1 à D6 renvoient à [retour_utilisateur.md](retour_utilisateur.md)).

## Volumes

| Table | 20/11/2026 | 22/11/2026 | Écart |
|-------|-----------:|-----------:|-------|
| results | 839 101 | 839 180 | +79 : homonymes d'une même épreuve gardés (+395), Dijon 2026 chronoweb retiré comme doublon (−312) |
| — fftri_t2_area | 697 692 | 698 045 | |
| — prolivesport | 85 574 | 85 599 | |
| — chronoweb | 55 835 | 55 536 | |
| races (épreuves) | 3 575 | 3 574 | toutes ont au moins un résultat |
| noms de course | 471 | 471 | |
| athlètes (`unified_id`) | 273 319 | 268 187 | −5 132 : tirets, virgules, noms tronqués réunis ; +392 homonymes séparés |
| — avec un résultat individuel | | 258 341 | |
| lignes d'équipe | 9 615 | 9 619 | |
| lignes de sous-classement | 7 680 (38 épreuves) | 7 682 (38 épreuves) | |
| doublons de source retirés | | 110 paires (62 prolivesport, 48 chronoweb) | |
| ids stables | — | 3 684 clés d'épreuve, 268 664 clés d'athlète, 108 redirections | nouveau |

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
| Q7 | Lieu manquant | 2 219 épreuves | 2 219 (toutes fftri_t2_area) | **Ouvert** |
| Q8 | Club manquant ou parasite | 40 % sans club | 39,7 % des résultats individuels sans club ; club affiché = le plus récent | Corrigé |
| Q9 | Noms mal encodés | 0 | 0 | Corrigé |
| Q10 | Segments prolivesport décalés | partiel | 0 ligne incohérente | **Corrigé** |
| Q11 | Noms de course | 0 cas connu | 0 cas ; 2 noms illisibles (« 0 3000 », « T974 ») | Corrigé (Q17 ouvert) |
| Q12 | Athlètes avec résultats des deux sexes | 634 | 636 | Atténué |
| Q13 | Épreuves sans format | 57 | 57 | **Ouvert** |
| Q14 | Noms d'athlètes (tirets, virgules, tronqués, homonymes) | — | 0 clé avec ponctuation ; 477 noms tronqués rattachés ; 392 homonymes séparés | **Corrigé** |
| Q15 | Sexe chronoweb remplacé par un rang | — | 31 820 lignes chronoweb (62 %) | **Nouveau** |
| Q16 | Identifiants instables | constat | 0 changement entre deux reconstructions | **Corrigé** |
| Q17 | Noms de course illisibles (slug fftri) | — | 2 courses | **Nouveau** (mineur) |

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

### Q15 — Sexe chronoweb remplacé par un rang (nouveau)
31 820 lignes chronoweb (62 %) ont un nombre dans la colonne sexe (« 1 », « 5 », « 9 ») : c'est
leur rang dans leur sexe ou leur catégorie, la catégorie elle-même étant « 5/FS3 », « 9/FSE »,
« 1/MASC ». 3 872 autres lignes n'ont pas de sexe. Conséquences : le filtre sexe du classement
ignore ces lignes, et le sexe d'un athlète qui ne court que chez chronoweb est inconnu. fftri a
aussi 7 491 valeurs autres que M/F (première lettre d'une catégorie : E, J…).
Piste : déduire le sexe de la lettre F/M de la catégorie (« 5/FS3 » → F) dans raw_data.sql, et
séparer le rang du préfixe « n/ » (lié à Q5).

### Q5 — Catégories d'âge (mis de côté)
3 050 valeurs distinctes (chronoweb 2 223, fftri 794, prolivesport 101), dont 2 592 parasites :
2 163 avec un rang collé (« 1/MJU », « 2/MJU »), 414 nombres seuls (« 4044 », « 3539 » : tranches
d'âge Ironman sans tiret), 15 avec parenthèses. 18 150 résultats sans catégorie. 16,0 % des
saisons d'athlète ont plusieurs catégories (15,3 % le 20/11).

### Q7 — Lieu manquant
Inchangé : les 2 219 épreuves fftri_t2_area n'ont pas de lieu ; chronoweb et prolivesport sont
complets. Piste : reprendre le lieu d'une autre édition ou d'une autre source de la même
course.

### Q13 — Épreuves sans format
Inchangé : 57 épreuves (« CD » d'Altriman, « Poursuite », finales…) n'apparaissent dans aucun
filtre de format.

### Q17 — Noms de course illisibles (nouveau, mineur)
2 courses ont pour nom le seul identifiant de l'URL fftri : « 0 3000 » (3 épreuves en 2023 :
duathlon M et L, triathlon L, 197 résultats ; `calendrier/0-3000/`) et « T974 ». Piste : alias
dans `transform/noms_epreuves.sql` une fois le vrai nom connu.

### Q12 — Athlètes avec résultats des deux sexes
636 athlètes (634 le 20/11) : homonymes réunis ou sexe mal renseigné. Le profil et le filtre
affichent le sexe le plus fréquent. Q15 en explique une partie.

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
2. **Q15** : sexe chronoweb déduit de la catégorie.
3. Q13, Q17 (alias), Q7.
4. Q5 (catégories), mis de côté.
