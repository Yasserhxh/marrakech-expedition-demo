# Marrakech Expédition — maquette React statique

Prototype **statique** (aucun backend, données simulées en mémoire) de l'application d'expédition ciment de l'usine
de Marrakech (M102), utilisable pendant une indisponibilité SAP puis synchronisée. Même charte que le back-office
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
npm run format         # prettier
```

Stack : Vite 5, React 18, TypeScript strict, react-router-dom 6, zustand 5, react-icons (Feather), SCSS, clsx.

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
  services/       types.ts — interfaces CommandesService, PeseeService, SyncService, ReferentielsService
                  mock/     — implémentations en mémoire (adossées au store) ; index.ts = point de branchement
  data/mock.ts    jeu de données Marrakech : 6 clients, 10 chantiers, 4 produits (codes SAP 18 chiffres),
                  4 transporteurs, 10 camions (immatriculations 12345-A-6), 8 chauffeurs, 12 commandes du jour
  styles/         tokens.scss (seul fichier avec des couleurs), global.scss, components.scss, print.scss
  utils/          format.ts (fr-FR, poids BL « 43,160 », dates), useNow.ts
  types/          modèle métier (Commande, Pesee, BonDeLivraison, SyncOperation…)
```

## Brancher la vraie API

Les écrans ne parlent jamais à `fetch` : ils lisent l'état via `useAppStore` et déclenchent les actions via
`services.*`. Pour connecter l'API Marrakech (`src/Marrakech.Api`) :

1. Créer `src/services/http/` avec des classes qui implémentent les interfaces de `src/services/types.ts`
   (`CommandesService`, `PeseeService`, `SyncService`, `ReferentielsService`). Client HTTP unique avec en-tête
   `X-Correlation-Id`, erreurs RFC 7807 remontées en toast.
2. Remplacer les instances dans `src/services/index.ts`.
3. Alimenter le store depuis l'API (chargement initial + SignalR pour les pesées et la file de synchro) ;
   `useAppStore` n'expose que des mutateurs bas niveau (`upsertCommande`, `patchSyncOp`, `setPoids`…).
4. Supprimer la barre de démonstration (`src/app/DemoBar.tsx`) et le panneau « Simuler un camion » des pages de pesée.

Règles reproduites de la production : stabilité = 15 lectures identiques ≥ 2 000 kg à 5 Hz ; net = brut − tare ;
BC `BC-MRK-aaaa-nnnnnn` ; BL provisoire = ID commande, n° SAP (`0080…`) attribué à la synchro ;
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
   (poids `43,160`, mention « Document provisoire — en attente de synchronisation SAP »), commande `Livrée`,
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

Authentification réelle, SignalR, appels HTTP, persistance, impression pilotée (seul `window.print()` est utilisé).
