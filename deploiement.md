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
2. Ajouter sa clé SSH à la commande, puis se connecter : `ssh ubuntu@<ip>`. Clé à créer au besoin
   (`ssh-keygen -t ed25519`). OVH ne copie la clé qu'à l'installation du VPS : si `ssh` demande un
   mot de passe, la clé n'y est pas ; l'ajouter avec `ssh-copy-id ubuntu@<ip>` (mot de passe reçu
   par e-mail) ou réinstaller le VPS avec la clé.
3. Sécuriser :
   - mises à jour : `sudo apt update && sudo apt upgrade -y`, puis
     `sudo apt install -y unattended-upgrades` (correctifs de sécurité automatiques) ;
   - SSH par clé seulement. Sur Ubuntu 24.04, un fichier de `/etc/ssh/sshd_config.d/` peut
     réactiver les mots de passe : écrire les réglages dans un fichier lu en premier.
     ```bash
     printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' \
       | sudo tee /etc/ssh/sshd_config.d/00-securite.conf
     sudo mkdir -p /run/sshd && sudo sshd -t && sudo systemctl restart ssh
     ```
     `PermitRootLogin prohibit-password` et non `no` : Coolify gère le serveur en SSH en tant que
     root, avec sa propre clé (sinon « Server is not reachable »). `/run/sshd` manque tant que SSH
     n'a pas démarré (activation à la connexion) et `sshd -t` le réclame. Garder la session
     ouverte et tester une nouvelle connexion avant de la fermer ;
   - pare-feu (ports en « port de destination », « port source » vide ; une règle TCP
     « established » sans port pour les réponses) : utiliser le **pare-feu réseau OVH** (Edge
     Network Firewall, espace client) plutôt que
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
4. **Sauvegardes : pas pour l'instant** (choix du 27/11/2026). La production n'est qu'une copie de
   la base locale, que personne d'autre n'écrit : si le VPS disparaît, recréer la base et relancer
   `deploy/publier_donnees.sh`. C'est la base locale qui est sauvegardée
   (`deploy/sauvegarder_base_locale.sh`, voir `backend.md`). À mettre en place dès que la
   production contient des données qui n'existent pas ailleurs (comptes, contributions…) :
   onglet Backups, sauvegarde quotidienne vers **OVH Object Storage** (S3, Coolify → Storages),
   une sauvegarde restée sur le VPS disparaissant avec lui. Garder aussi les variables
   d'environnement de Coolify dans un gestionnaire de mots de passe.
5. Premier envoi des données, depuis la machine locale :
   ```bash
   PROD_SSH=ubuntu@<ip> PROD_DB_CONTAINER=<conteneur> deploy/publier_donnees.sh
   ```

## 4. API

Coolify → **New Resource → Application → dépôt GitHub** (application GitHub de Coolify, accès au
dépôt seulement), branche `main` :
- Build Pack : **Dockerfile**, Base Directory : **`/api`**, port exposé : **8000** ;
- domaine : `https://api.<domaine>` (ou l'adresse temporaire `http://….sslip.io` proposée par
  Coolify) ;
- **Advanced → Custom Container Name : `api`**. Coolify ajoute au nom du conteneur l'heure du
  déploiement (`<uuid>-20261126T212109`) : seul ce nom fixe permet au front de joindre l'API par
  le réseau Docker interne (`http://api:8000`). Ne pas activer « Consistent Container Name » à la
  place : l'API serait coupée pendant chaque déploiement ;
- **Health Checks** : activer, chemin `/health`, port `8000`, pour que Coolify n'envoie le trafic
  au nouveau conteneur qu'une fois prêt (sinon Traefik répond 503 le temps du démarrage) ;
- variables d'environnement :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL interne de la base (étape 3), préfixe `postgres://` remplacé par `postgresql://` (SQLAlchemy refuse le premier) |
| `SENTRY_DSN` | DSN du projet Sentry FastAPI |
| `SENTRY_ENVIRONMENT` | facultatif, `production` par défaut |

Vérifier `https://api.<domaine>/health` : `{"status": "ok", "database": "ok"}`.

## 5. Front

Même démarche : Build Pack **Dockerfile**, Base Directory **`/triathlon-results`**, port **3000**,
domaine `https://<domaine>`. Variables :

| Variable | Build Variable ? | Valeur |
|---|---|---|
| `API_BASE_URL` | non | `http://api:8000` : adresse interne de l'API (étape 4), pas son domaine public |
| `SITE_URL` | **oui** | `https://<domaine>` (URL canoniques, Open Graph, sitemaps) |
| `SENTRY_DSN` | non | DSN du projet Sentry Next.js |
| `NEXT_PUBLIC_SENTRY_DSN` | **oui** | le même DSN |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | **oui** | identifiant du site dans Umami |
| `BREVO_API_KEY` | non | clé API Brevo (SMTP & API → API Keys), pour les retours des utilisateurs |
| `FEEDBACK_TO` | non | adresse qui reçoit les retours (« Un avis ? Un bug ? ») |
| `FEEDBACK_FROM` | non | expéditeur des retours, validé dans Brevo (Senders, domains & dedicated IPs) |

Retours des utilisateurs : créer un compte Brevo (offre gratuite, 300 mails par jour), valider
l'adresse expéditrice (`FEEDBACK_FROM`), puis, une fois le domaine acheté, authentifier le domaine
dans Brevo (enregistrements DKIM et DMARC chez le registrar) pour que les mails n'arrivent pas en
indésirables. Sans ces trois variables, le formulaire répond « Envoi indisponible ».

Les variables `NEXT_PUBLIC_*` et `SITE_URL` sont lues au build : après un changement, redéployer.
`SITE_URL` sert aussi à l'exécution : le déclarer comme variable de build **et** d'exécution. Les
autres ne sont lues qu'à l'exécution, mais ne s'appliquent qu'après **Restart** du conteneur.

`API_BASE_URL` ne sert que côté serveur (`lib/api.ts`, `proxy.ts`) : le navigateur n'appelle jamais
l'API directement. L'adresse interne évite Traefik et l'aller-retour par l'IP publique ; avec
l'adresse publique, une faute (`https` au lieu de `http`, ancienne adresse) donne une page d'erreur
503 de Traefik et aucune trace dans les logs de l'API. Pour vérifier depuis le VPS :
```bash
docker exec $(docker ps -qf name=<uuid-du-front>) sh -c 'echo "[$API_BASE_URL]"; wget -qO- "$API_BASE_URL/health"'
```
Un « / » final dans `API_BASE_URL` est retiré par le front.

## 6. Domaine

Quand le domaine est acheté : chez le registrar, enregistrements `A` de `<domaine>`, `api` (et
`coolify`) vers l'IP du VPS ; renseigner ces domaines dans Coolify, qui obtient les certificats
HTTPS (Let's Encrypt). Front : `https://<domaine>,https://www.<domaine>` (le front redirige www
vers `SITE_URL`, `next.config.ts`) ; API : `https://api.<domaine>` seul, sans la variante `www.api`
que Coolify ajoute (aucun DNS : certificat impossible). Supprimer les enregistrements `A` et `AAAA`
créés par défaut par OVH pour `<domaine>` et `www` (page d'attente, `213.186.33.5`) ; vérifier sur
le serveur DNS d'OVH (`dig +short A <domaine> @ns17.ovh.net`), le cache local garde l'ancienne
réponse jusqu'à 30 minutes. Une fois les sondes UptimeRobot mises à jour, retirer les adresses
sslip.io. Mettre à jour `SITE_URL` puis redéployer le front (`API_BASE_URL`, interne,
ne change pas), et déclarer le domaine dans Umami.

## 7. Après la mise en ligne

- **UptimeRobot** (en place le 27/11/2026, offre gratuite, toutes les 5 minutes, alerte par
  e-mail) : trois sondes, à mettre à jour au passage au domaine.
  - `https://api.<domaine>/health` (HTTP) : API arrêtée ou base injoignable (503) ;
  - `https://<domaine>/` (HTTP) : front arrêté ;
  - `https://<domaine>/races` (Keyword, alerte si « Impossible de charger » est présent) : front
    en ligne mais qui ne joint plus l'API (page affichée avec un message d'erreur).
- **Google Search Console** : déclarer le domaine et soumettre `https://<domaine>/sitemap.xml`.
- **Serveur** : surveiller disque et mémoire (alertes de Coolify, Settings → Notifications) et
  vérifier de temps en temps qu'une sauvegarde récente existe dans l'Object Storage.

## Mettre à jour

- **Code** : un push sur `main` redéploie l'API et le front (webhook GitHub de Coolify). Pour ne
  redéployer que ce qui a changé, Watch Paths (onglet General) : `api/**` pour l'API,
  `triathlon-results/**` pour le front. Le nouveau
  conteneur de l'API doit répondre à `/health` avant que Coolify ne bascule dessus (Health Checks
  de l'étape 4) : sans ce réglage, l'API et le front, redéployés ensemble, renvoient des 503
  pendant quelques secondes.
- **Données** : après un scraping et les transformations en local, lancer
  `deploy/sauvegarder_base_locale.sh` puis `deploy/publier_donnees.sh`. Il affiche les volumes local et production et demande confirmation,
  puis remplace les 4 tables en une seule transaction (environ 80 Mo, une quinzaine de secondes
  en local le 26/11/2026) : en cas d'erreur rien ne change, et pendant la copie les requêtes de
  l'API attendent au lieu d'échouer. Testé contre une base locale : les tests des routes de l'API
  passent sur la copie ; ceux qui vérifient les fonctions et tables du pipeline (`categorie_fftri`,
  `epreuve_format`, `sous_classements`…) échouent, normal puisque ces objets restent en local.
