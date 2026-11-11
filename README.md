# Marrakech Expédition — maquette React statique

Application React de l'expédition ciment de l'usine de Marrakech (M102), utilisable pendant une indisponibilité SAP
puis synchronisée. Par défaut elle tourne en **mode mock** (aucun backend, données simulées en mémoire) ; le **mode api**
la branche sur l'API Marrakech avec Microsoft Entra ID (voir « Brancher la vraie API »). Même charte que le back-office
`Ecare-FrontUi` (tokens CIMAR, coque admin, tableaux, badges). Spécification : `docs/web-prototype-spec.md`,
charte : `docs/brand/brand-tokens.md`.

Objectif : démonstration client et base de travail pour les développeurs front. Un rechargement du navigateur
ramène les données à l'état initial.

## Commandes

```bash
npm install            # Node 24 / npm 11
npm run dev            # http://localhost:5174
npm run build          # tsc -b && vite build  → dist/
npm run preview        # sert dist/ sur http://localhost:4174
npm run lint           # eslint, 0 avertissement toléré
npm run typecheck      # tsc --noEmit
npm run test           # vitest (jsdom + Testing Library)
npm run format         # prettier
```

Stack : Vite 5, React 18, TypeScript strict, react-router-dom 6, zustand 5, react-icons (Feather), SCSS, clsx,
@azure/msal-browser + @azure/msal-react (mode api), Vitest + Testing Library (tests).

## Structure

```
src/
  app/            App (routes), AdminLayout, AdminSidebar (menu filtré par rôle), DemoBar, RequireAuth
  components/     PageShell, DataTable (tri + en-tête collant), StatusBadge, KpiCard, Modal, Drawer, ToastHost,
                  EmptyState, Notice, Combobox, WeightDisplay (afficheur pont-bascule), DocumentPreview (BC / BL A5),
                  SyncSteps, SapPill
  features/       un dossier par écran : connexion, commandes (+ nouvelle commande, panneau détail), pesee (entrée,
                  sortie), usine, synchronisation, referentiels, monitoring
  store/          useAppStore.ts — état zustand : commandes, référentiels, file de synchro, compteurs (BC, n° SAP,
                  n° BL), rôle, SAP en ligne/hors ligne, lecture du pont, toasts
  services/       types.ts — interfaces CommandesService, PeseeService, SyncService, ReferentielsService, SapService
                  mock/     — implémentations en mémoire (adossées au store)
                  http/     — apiClient, dto, mappers, HttpCommandesService, HttpReferentielsService, HttpSapService
                  index.ts  — fabrique mock | api selon VITE_DATA_MODE
  auth/           MSAL (config, instance, jeton), AuthProvider, useAuth (mock | Entra ID)
  monitoring/     clientLogs.ts — rapport d'erreurs front vers /api/client-logs (mode api)
  config.ts       lecture et validation des variables VITE_*
  data/mock.ts    jeu de données Marrakech : 6 clients, 10 chantiers, 4 produits (codes SAP 18 chiffres),
                  4 transporteurs, 10 camions (immatriculations 12345-A-6), 8 chauffeurs, 12 commandes du jour
  styles/         tokens.scss (seul fichier avec des couleurs), global.scss, components.scss, print.scss
  utils/          format.ts (fr-FR, poids BL « 43,160 », dates), useNow.ts
  types/          modèle métier (Commande, Pesee, BonDeLivraison, SyncOperation…)
```

## Brancher la vraie API

L'application a deux modes, choisis au build/démarrage par `VITE_DATA_MODE` (fichier `.env`, voir `.env.example`) :

| Mode | Données | Authentification | Usage |
|---|---|---|---|
| `mock` (défaut) | en mémoire (`src/data/mock.ts`) | simulée | démo client, développement front sans backend |
| `api` | API Marrakech (`src/Marrakech.Api`, contrat `docs/phase2-api-contract.md`) | Microsoft Entra ID (MSAL) | intégration, recette, production |

### Variables d'environnement

```bash
cp .env.example .env         # .env et .env.* sont ignorés par git (seul .env.example est versionné)
```

| Variable | Exemple | Rôle |
|---|---|---|
| `VITE_DATA_MODE` | `api` | `mock` ou `api` |
| `VITE_API_BASE_URL` | `https://localhost:7201` | origine de l'API (les routes sont préfixées `/api` par le client) |
| `VITE_AAD_CLIENT_ID` | `1111…` | client ID de l'app registration SPA |
| `VITE_AAD_TENANT_ID` | `2222…` | tenant Entra ID |
| `VITE_API_SCOPE` | `api://<clientId API>/.default` | scope demandé pour le jeton d'accès |

En mode `api`, `src/config.ts` valide ces variables au démarrage : toute valeur manquante ou mal formée bloque
l'application sur une page « Configuration invalide » (pas de démarrage silencieux en mode dégradé).

```bash
VITE_DATA_MODE=api npm run dev      # ou renseigner .env puis npm run dev
npm run test                        # Vitest : config, apiClient (ProblemDetails, X-Correlation-Id), mappers, validation, rapport d'erreurs, ErrorBoundary
```

### Enregistrement d'application Entra ID (à faire par l'administrateur du tenant)

1. **App registration « Marrakech Expédition — SPA »** : plateforme *Single-page application*, Redirect URIs =
   `http://localhost:5174` (dev), `http://localhost:4174` (preview) et l'URL publique de l'App Service / Static Web App.
   Pas de secret client (flux PKCE). Logout URL : `<origine>/connexion`.
2. **App registration de l'API** (ou la même) : *Expose an API* → scope `access_as_user` (URI `api://<clientId API>`),
   puis dans l'app SPA : *API permissions* → ajouter ce scope, consentement administrateur. Le front demande
   `api://<clientId API>/.default`.
3. **App roles** sur l'application de l'API : `Guichet`, `PontBascule`, `Admin` (type *Users/Groups*), puis affectation
   des utilisateurs/groupes dans *Enterprise applications*. Le claim `roles` du jeton alimente le rôle de l'interface
   (`Admin` > `Guichet` > `PontBascule` ; sans rôle : `PontBascule`, l'API répond 403 de toute façon).
4. Claims utilisés : `name` (pied de menu), `preferred_username` (info-bulle), `roles`.
5. Côté API : `AzureAd:ClientId` / `TenantId` identiques, CORS autorisant l'origine du front.

### Architecture du mode API

```
src/config.ts                 lecture + validation des variables VITE_*
src/auth/                     msalConfig (SessionStorage, jamais localStorage), msalInstance, token (acquireTokenSilent
                              → redirect), AuthProvider (MsalProvider en mode api uniquement), useAuth (mock | MSAL)
src/services/http/apiClient   fetch unique : base URL, Bearer, X-Correlation-Id (crypto.randomUUID) par requête,
                              JSON, délai 15 s (AbortController), ProblemDetails → ApiError { status, title, detail,
                              correlationId, errors }, 401 → login, 409 → toast avec le détail
src/services/http/dto.ts      DTO du contrat (camelCase)
src/services/http/mappers.ts  DTO ↔ modèle de l'app (codes = ids, CFR/EXW ↔ Rendu/Départ, Vrac/Sac, ErreurSync…)
src/services/http/Http*       CommandesService, ReferentielsService, SapService
src/services/index.ts         fabrique mock | api selon VITE_DATA_MODE
src/store/useAppStore.ts      refresh(), chargerCommandes/Detail/Referentiels/Chantiers, creerCommande, autoriser*,
                              annulerCommande, rafraichirSapStatut ; état chargement / erreurChargement / synthese
src/monitoring/clientLogs.ts  window.onerror + unhandledrejection + ErrorBoundary → POST /api/client-logs
                              (10 envois/min max, dédoublonnage, URL sans query) ; no-op en mode mock
```

Comportements propres au mode api : chargement initial + bouton « Actualiser » (liste, détail à l'ouverture du panneau,
synthèse KPI), sonde `/sap/statut` toutes les 30 s qui pilote la pastille « SAP en ligne » (la barre du haut devient un
bandeau d'état en lecture seule), erreurs réseau/délai/ProblemDetails affichées avec leur ID de corrélation, erreurs 400
de validation rendues champ par champ dans « Nouvelle commande ». Le formulaire applique les règles du contrat avant
l'envoi : quantité > 0 et ≤ 60 t (3 décimales), immatriculation `^\d{1,6}-[A-Z]{1,2}-\d{1,2}$` sauf « immatriculation
libre », transporteur obligatoire en Rendu (CFR), codes SAP `^\d{1,10}$`, chantier limité au client quand la liste vient de SAP.

**Recherche SAP à la création (phase 2b)** : client, chantier, transporteur et camion se saisissent par **code SAP**
(`CodeSapLookup`, 300 ms de debounce, 3 chiffres minimum pour un client) via `GET /api/sap/clients?prefixe=`,
`/api/sap/clients/{code}/chantiers`, `/api/sap/transporteurs/{code}`, `/api/sap/camions/{code}` ; la liste porte un badge
« SAP » ou « Cache local ». SAP hors ligne ou code inconnu : le code tapé est accepté tel quel (« Code non vérifié »),
sans nom, et l'API tranchera à la synchronisation.

**Pesée en direct (phase 3b)** : `HttpPeseeService` ouvre le hub SignalR `/hubs/weight` (`@microsoft/signalr`,
`SubscribeDevice`, reconnexion automatique), lit `GET /api/pesees/devices` au montage, puis `POST /api/commandes/{id}/pesees/entree|sortie`
avec le poids affiché et le `rowVersion`. Le bouton n'est actif que si la lecture est stable, récente (< 10 s) et le pont
connecté ; bandeau « Pont déconnecté » sinon ; un 409 (lecture différente, écart > 10 %, statut) est affiché en toast et la
commande relue.

### Limites actuelles (mode api)

- **Synchronisation** (`SyncService`) reste simulée en mémoire (phase 5) : bandeau « Démonstration » sur cet écran ;
  la file de synchro affichée est une projection en lecture seule de `commande.synchro`.
- **Monitoring** : données simulées (`buildMonitoring`), l'endpoint `/api/monitoring/summary` n'est pas encore consommé.
- **Chantiers** : pas d'endpoint global, ils sont chargés par client (formulaire, onglet Référentiels).
- **Pagination** : la liste demande `pageSize=200` sur le jour courant ; au-delà, seules les 200 premières sont affichées.
- **Détail de commande** : les sous-objets `pesees` / `bonDeChargement` / `bonDeLivraison` / `syncOperations` sont lus
  de façon tolérante (`src/services/http/dto.ts`) en attendant leur forme définitive dans le contrat.
- **Pont bascule** envoyé à `autoriser-entree` / `autoriser-sortie` : celui sélectionné dans l'écran de pesée (PB22 par défaut).
- **SignalR** : seul le hub poids est branché ; la file de synchro n'est pas poussée en temps réel.
- Pas de `.env.production` versionné : les variables sont injectées par la CI (`VITE_*` au build).

Règles reproduites de la production : stabilité = 15 lectures identiques ≥ 2 000 kg à 5 Hz ; net = brut − tare ;
BC `BC-MRK-aaaa-nnnnnn` ; BL imprimé sous le N° SAP s'il existe, sinon l'ID commande (même gabarit que le BL Ecare, aucune
mention « provisoire ») ; n° SAP (`0080…`) renseigné à la synchro ;
file `CreerCommande → Livraison → LireBL`.

## Parcours de démonstration

La barre noire en haut (repliable) permet de basculer **SAP En ligne / Hors ligne**, de changer de **rôle**
(Guichet, Pont bascule, Admin : filtre le menu) et de **réinitialiser les données**. La pastille rouge clignotante
« SAP hors ligne » est visible sur toutes les pages en mode dégradé. L'application démarre **SAP hors ligne**.

1. `/connexion` — « Se connecter avec Microsoft » (simulé).
2. `/commandes` — 12 commandes du jour (8 SAP, 4 locales), cartes À peser / Dans l'usine / Livrées / En attente
   de synchro (cliquables = filtre), recherche, filtres statut/origine. Cliquer une ligne ouvre le panneau détail.
3. **Créer une commande locale** : « Nouvelle commande (SAP indisponible) » → client (recherche) → chantier du client →
   produit (sacs calculés) → quantité → incoterm → transporteur → camion → chauffeur → récapitulatif → « Créer ».
   La commande apparaît `Locale / Créée / En attente`.
4. Ouvrir la commande → **« Autoriser la pesée d'entrée »** → « Ouvrir la pesée d'entrée ».
5. `/pesee/entree/:id` — choisir PB22/PB23, **« Simuler un camion »** : rampe 0 → tare, puis bandeau STABLE vert
   (~3 s). « Valider la tare et imprimer le Bon de chargement » → aperçu BC A5 (5 exemplaires, « Imprimer »
   = `window.print()`), commande passée `Dans l'usine`.
6. `/usine` — heure d'entrée, tare, temps passé (alerte rouge > 90 min). **« Autoriser le 2ᵉ pesage »** →
   « Ouvrir la pesée de sortie ».
7. `/pesee/sortie/:id` — brut en direct, tare rappelée, **net calculé** et écart (vert ±2 %, orange ±5 %, rouge
   au-delà : modifier le poids simulé pour le montrer). « Valider et imprimer le Bon de livraison » → aperçu BL
   (poids `43,160`, N° = ID commande tant que SAP n'a pas répondu), commande `Livrée`,
   synchro `En attente`.
8. Basculer **SAP En ligne** dans la barre de démo → `/synchronisation` : ping SAP, file des opérations,
   **« Tout synchroniser »** anime `Créer commande` (1,2 s) → `Livraison` (1,2 s) → `Lire n° BL` (0,8 s) par
   commande ; la commande d'ETS. EL OUAFI échoue avec « Client bloqué crédit (SAP: KI-123) » → « Simuler le
   déblocage » puis **« Réessayer »**. Succès = n° SAP `0001234xxx`, BL `0080xxxxxx`, bouton **« Réimprimer le BL »**.
9. `/referentiels` — onglets Clients / Chantiers / Produits / Transporteurs / Camions / Chauffeurs, recherche,
   « Ajouter » (mémoire).
10. Rôle **Admin** → `/monitoring` — santé API / Base / SAP / SignalR, taux d'erreur, latence p50/p95/p99,
    erreurs récentes avec ID de corrélation (recherche), liens vers les traces.

## Hors périmètre

SignalR, pesées et synchronisation réelles (phases 3 et 5), impression pilotée (seul `window.print()` est utilisé).
