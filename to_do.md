# First actions :

0. Organiser les fichiers sources
    - pour toutes les sources, 
        - [x] faire un dossier urls qui contient le fichier urls.csv
        - [x] faire un dossier raw qui contienne la donnée directement scrappée et un dossier _0 qui soit la donnée corrigée.

1. Nettoyer la colonne format_epreuve.
    - [x] regarder si cela provient d'une source de données en particulier et peut-être ajuster le scrapping.

2. Nettoyer la colonne name_epreuve.
    - [x] pour fftri_t2_area il faut que le nom de l'épreuve corresponde au morceau de l'URL adapté et ne pas prendre le nom de l'epreuve scrappée, ou alors dans une autre colonne. On se retrouve à différencier deux épreuves alors que c'est la même épreuve mais pas le même format.

3. Raffraichir la donnée.
    - [x] on veut regarder les nouvelles courses qui n'auraient pas encore été récupérée. Donc étudier comment doit être fait le check. Il est peut-être déjà fonctionnel.
    - [x] date scrapping : étudier le fait de au lieu d'utiliser un dossier _0 , utiliser une date de scrapping. Pas forcément nécessaire.

4. Corriger scrapping fftri_t2_area
    - [x] refaire code scrapping
    - [x] faire tourner le script sur toutes les urls

5. Corriger scrapping prolivesport
    - [x] refaire code scrapping
    - [x] récupérer les urls
    - [x] faire tourner le script sur toutes les urls

6. Corriger scrapping protiming
    - [ ] refaire code scrapping
    - [x] récupérer les urls
    - [ ] faire tourner le script sur toutes les urls

7. Corriger scrapping Chronoweb
    - [x] fix code avec les paths
    - [x] faire tourner le script sur toutes les urls et filtrer pour conserver les bons sports

8. Corriger type_epreuve : `select * from races where type_epreuve = ''`
    - [x] si nom_epreuve contient triathlon et que type_epreuve est vide -> type_epreuve = triathlon
    - [x] si nom_epreuve contient aquathlon et que type_epreuve est vide -> type_epreuve = aquathlon
    - [x] si nom_epreuve contient swimrun et que type_epreuve est vide -> type_epreuve = swimrun
    - [x] si nom_epreuve contient altriman ou extrememan ou xterra et que type_epreuve est vide -> type_epreuve = triathlon


# Next :
- source : regarder si les informations de genre sont bonnes.
- API : on veut pouvoir sélectionner une main épreuve et obtenir la liste des ses formats disponibles. Ex : Triathlon de xxx : format M ou L.
- Global : Comparer les performances : on veut pouvoir comparer deux résultats de course. À détailler et à faire.
- API : pagination : pour ne pas afficher directement tous les résultats.
- API : filtres : définir les filtres nécessaire par endpoint. Et les faire.
- API : tri : classement, temps, date.
- Front : 
    - page 1 : profil d'un athlète
    - page 2 : fiche d'une course
    - page 3 : résultat d'une épreuve
    - page 4 : recherche

Pour le front, chatGPT recommande Next.js + TypeScript.

Paramètres :
- limit : nombre de résultats retournés (20 par défaut).
- offset : nombre de résultats ignorés (0 par défaut).
- Limite maximale : 100 résultats par requête.

Pour la réponse on veut le format : 
```
{
  "items": [],
  "pagination": {
    "total": 1250,
    "limit": 20,
    "offset": 0,
    "has_next": true
  }
}
```

Fonction de tri : `sort by` et `order` .
Reco : 
- Utilise une liste blanche de colonnes autorisées pour éviter toute injection SQL.
- Ajoute systématiquement un deuxième critère de tri stable, par exemple id, pour éviter que des résultats changent de page lorsque plusieurs lignes ont la même valeur.

Tester l'API avant de passer au frontend
- [ ] Pagination sur un athlète ayant beaucoup de résultats.
- [ ] Pagination sur une course avec plusieurs milliers de participants.
- [ ] Combinaison de plusieurs filtres.
- [ ] Tri ascendant et descendant.
- [ ] Combinaison filtres + tri + pagination.
- [ ] Valeurs invalides (limit=-1, order=foobar, etc.).
- [ ] Aucun résultat correspondant.
- [ ] Pagination au-delà de la dernière page.