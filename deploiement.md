# Déploiement : VPS OVH + Coolify

Choix du 26/11/2026 : un VPS OVH (hébergement en France, coût le plus bas) avec Coolify, qui
construit et déploie les images Docker à chaque push et gère le HTTPS. Tout tourne sur le VPS :
front Next.js, API FastAPI et PostgreSQL. Le scraping, le chargement et les transformations restent
sur la machine locale ; seules les tables finales sont envoyées en production
(`deploy/publier_donnees.sh`).

```
Visiteur ──HTTPS──> Traefik (Coolify) ──> front Next.js (:3000) ──> API FastAPI (:8000) ──> PostgreSQL
                                      └─> API FastAPI (api.<domaine>, publique)
Machine locale ──SSH──> publier_donnees.sh ──> PostgreSQL (non exposé sur Internet)
```

Les libellés des écrans OVH et Coolify ci-dessous peuvent différer légèrement selon les versions.

## Fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `api/Dockerfile`, `api/.dockerignore` | Image de l'API (Python 3.14, uvicorn, 2 workers, healthcheck sur `/health`). |
| `api/requirements.txt` | Dépendances de production de l'API. |
| `triathlon-results/Dockerfile`, `.dockerignore` | Image du front (Node 24, sortie `standalone` de Next). |
| `triathlon-results/next.config.ts` | `output: "standalone"` pour l'image Docker. |
| `deploy/publier_donnees.sh` | Copie des tables `races`, `athletes`, `results`, `redirections` vers la production. |

## 1. Commander et sécuriser le VPS

1. Commander un VPS OVH sous **Ubuntu 24.04 LTS**. Coolify demande au minimum 2 vCPU, 2 Go de RAM et
   30 Go de disque ; avec PostgreSQL (environ 1 Go avec index) et la construction du front sur le VPS,
   viser **4 vCPU, 8 Go de RAM et 75 Go de disque ou plus** (vérifier la gamme OVH du moment).
2. Ajouter sa clé SSH à la commande, puis se connecter : `ssh ubuntu@<ip>`.
3. Sécuriser :
   - mises à jour : `sudo apt update && sudo apt upgrade -y`, puis
     `sudo apt install -y unattended-upgrades` (correctifs de sécurité automatiques) ;
   - SSH par clé seulement : dans `/etc/ssh/sshd_config`, `PasswordAuthentication no` et
     `PermitRootLogin prohibit-password`, puis `sudo systemctl restart ssh` (garder la session
     ouverte et tester une nouvelle connexion avant de la fermer) ;
   - pare-feu : utiliser le **pare-feu réseau OVH** (Edge Network Firewall, espace client) plutôt que
     `ufw`, que Docker contourne. N'ouvrir que 22 (SSH), 80 et 443 (sites), et 8000 (interface
     Coolify) le temps de la configuration ; Coolify utilise aussi 6001 et 6002 pour son
     interface en temps réel.

## 2. Installer Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Ouvrir `http://<ip>:8000`, créer le compte administrateur, choisir « localhost » comme serveur.
Dès qu'un domaine existe, donner un domaine à Coolify lui-même (Settings → Instance's domain,
ex. `coolify.<domaine>`) puis fermer le port 8000.

Pour `deploy/publier_donnees.sh`, l'utilisateur SSH doit pouvoir lancer `docker` sans `sudo` :
`sudo usermod -aG docker ubuntu`, puis se reconnecter.

## 3. Base PostgreSQL

1. Coolify → projet → **New Resource → Database → PostgreSQL**, image **`postgres:18`** (même
   version majeure que la base locale : `pg_restore` refuse une sauvegarde d'une version plus
   récente que lui).
2. **Ne pas** cocher « Make it publicly available » : la base reste dans le réseau Docker.
3. Noter :
   - l'URL **interne** (« Postgres URL (internal) »), qui sera le `DATABASE_URL` de l'API ;
   - le **nom du conteneur** (identifiant affiché dans Coolify, aussi visible par `docker ps` sur
     le VPS), qui sera `PROD_DB_CONTAINER` ;
   - l'utilisateur et la base (`postgres` / `postgres` par défaut).
4. **Sauvegardes** (onglet Backups) : sauvegarde planifiée quotidienne vers un stockage S3, par
   exemple **OVH Object Storage** (compatible S3) déclaré dans Coolify → Storages. Une sauvegarde
   restée sur le VPS disparaît avec lui. La base locale fait foi pour les données, mais une
   sauvegarde évite de devoir tout republier en urgence.
5. Premier envoi des données, depuis la machine locale :
   ```bash
   PROD_SSH=ubuntu@<ip> PROD_DB_CONTAINER=<conteneur> deploy/publier_donnees.sh
   ```

## 4. API

Coolify → **New Resource → Application → dépôt GitHub** (application GitHub de Coolify, accès au
dépôt seulement), branche `main` :
- Build Pack : **Dockerfile**, Base Directory : **`/api`**, port exposé : **8000** ;
- domaine : `https://api.<domaine>` (ou l'adresse temporaire proposée par Coolify) ;
- variables d'environnement :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL interne de la base (étape 3) |
| `SENTRY_DSN` | DSN du projet Sentry FastAPI |
| `SENTRY_ENVIRONMENT` | facultatif, `production` par défaut |

Vérifier `https://api.<domaine>/health` : `{"status": "ok", "database": "ok"}`.

## 5. Front

Même démarche : Build Pack **Dockerfile**, Base Directory **`/triathlon-results`**, port **3000**,
domaine `https://<domaine>`. Variables :

| Variable | Build Variable ? | Valeur |
|---|---|---|
| `API_BASE_URL` | non | `https://api.<domaine>` |
| `SITE_URL` | **oui** | `https://<domaine>` (URL canoniques, Open Graph, sitemaps) |
| `SENTRY_DSN` | non | DSN du projet Sentry Next.js |
| `NEXT_PUBLIC_SENTRY_DSN` | **oui** | le même DSN |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | **oui** | identifiant du site dans Umami |

Les variables `NEXT_PUBLIC_*` et `SITE_URL` sont lues au build : après un changement, redéployer.
`SITE_URL` sert aussi à l'exécution : le déclarer comme variable de build **et** d'exécution.

## 6. Domaine

Quand le domaine est acheté : chez le registrar, enregistrements `A` de `<domaine>`, `api` (et
`coolify`) vers l'IP du VPS ; renseigner ces domaines dans Coolify, qui obtient les certificats
HTTPS (Let's Encrypt). Mettre à jour `API_BASE_URL` et `SITE_URL` puis redéployer le front, et
déclarer le domaine dans Umami.

## 7. Après la mise en ligne

- **UptimeRobot** (ou Better Stack) : surveiller `https://api.<domaine>/health` et
  `https://<domaine>/` toutes les minutes, alerte par e-mail.
- **Google Search Console** : déclarer le domaine et soumettre `https://<domaine>/sitemap.xml`.
- **Serveur** : surveiller disque et mémoire (alertes de Coolify, Settings → Notifications) et
  vérifier de temps en temps qu'une sauvegarde récente existe dans l'Object Storage.

## Mettre à jour

- **Code** : un push sur `main` redéploie l'API et le front (webhook GitHub de Coolify). Le nouveau
  conteneur de l'API doit répondre à `/health` (healthcheck du Dockerfile) avant que Coolify ne
  bascule dessus ; vérifier ce comportement au premier déploiement.
- **Données** : après un scraping et les transformations en local, lancer
  `deploy/publier_donnees.sh`. Il affiche les volumes local et production et demande confirmation,
  puis remplace les 4 tables en une seule transaction (environ 80 Mo, une quinzaine de secondes
  en local le 26/11/2026) : en cas d'erreur rien ne change, et pendant la copie les requêtes de
  l'API attendent au lieu d'échouer. Testé contre une base locale : les tests des routes de l'API
  passent sur la copie ; ceux qui vérifient les fonctions et tables du pipeline (`categorie_fftri`,
  `epreuve_format`, `sous_classements`…) échouent, normal puisque ces objets restent en local.
