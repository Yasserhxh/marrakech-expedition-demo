# Prototype React « Marrakech Expédition » — spécification fonctionnelle (maquette statique)

Date : 2026-11-11. Objectif : une application React **statique** (données simulées, aucun backend) qui montre le parcours
complet aux clients et sert de base aux développeurs front. Même charte que `Ecare-FrontUi` (Metronic / Bootstrap 5,
tokens dans `Ecare-FrontUi/src/app/theme/tokens.scss`). Dossier : `Marrakech-Offline/web/` (Vite + React 18 + TypeScript).
Langue de l'interface : **français**. Toutes les actions fonctionnent en mémoire (store), rechargement = retour à l'état initial.

## Acteurs et contexte
- **Guichet** (agent commercial) : voit les commandes SAP, crée des commandes locales quand SAP est hors ligne, autorise les pesées.
- **Pont bascule** : écran de pesée (entrée = tare, sortie = brut), impression Bon de chargement puis Bon de livraison.
- **Admin** : synchronisation SAP, référentiels, monitoring.
Usage sur PC de bureau (1366×768 minimum) ; l'écran de pesée doit rester lisible à 2 m (poids en très grand).

## Barre de démo (visible en haut, repliable)
- Interrupteur **SAP : En ligne / Hors ligne** (change le bandeau d'état global et active « Nouvelle commande (SAP indisponible) »).
- Bouton **Simuler un camion** sur l'écran de pesée (rampe de poids 0 → valeur cible, puis STABLE après ~3 s).
- Bouton **Réinitialiser les données**.
- Sélecteur de rôle (Guichet / Pont bascule / Admin) qui filtre le menu.

## Écrans (routes)
1. `/connexion` — page de connexion Ecare (logo, bouton « Se connecter avec Microsoft » simulé).
2. `/commandes` — **Commandes du jour** : tableau (N°, Origine `SAP`/`Locale`, Client, Chantier, Produit, Quantité (t), Incoterm
   `Départ`/`Rendu`, Camion, Chauffeur, Statut, Synchro). Filtres : recherche, statut, origine. Cartes de synthèse en haut :
   À peser / Dans l'usine / Livrées aujourd'hui / En attente de synchro. Bouton « Nouvelle commande (SAP indisponible) »
   (désactivé + info-bulle quand SAP est en ligne). Clic ligne → panneau latéral détail avec actions selon statut :
   « Autoriser la pesée » (Créée), « Autoriser le 2ᵉ pesage » (Dans l'usine), « Réimprimer », « Annuler ».
3. `/commandes/nouvelle` — formulaire : Client (recherche) → Chantier (uniquement ceux du client) → Produit (vrac/sac,
   sacs calculés automatiquement) → Quantité (t) → Incoterm Départ/Rendu → Transporteur → Camion (immatriculation) →
   Chauffeur (nom + CIN). Validation inline, récapitulatif avant « Créer la commande ». La commande créée apparaît
   `Locale`, statut `Créée`, synchro `En attente`.
4. `/pesee/entree/:id` — **Pesée d'entrée** : en-tête commande (client, produit, camion), choix du pont (PB22 / PB23),
   poids en direct très grand (ex. `16 240 kg`), indicateur de connexion au pont et horodatage, bandeau **STABLE** vert
   quand stable, bouton « Valider la tare et imprimer le Bon de chargement » (actif seulement si stable). Après validation :
   aperçu du **Bon de chargement** (A5 paysage : n° `BC-MRK-2026-000123`, date, client, chantier, produit, quantité
   commandée, camion, chauffeur, tare, 5 exemplaires : Client, Pont bascule, Expédition, Commercial, Souche) + bouton
   « Imprimer » (window.print sur l'aperçu) → commande passe à `Dans l'usine`.
5. `/usine` — **Dans l'usine** : commandes avec tare (heure d'entrée, tare, temps passé, alerte si > 90 min).
   Action « Autoriser le 2ᵉ pesage ».
6. `/pesee/sortie/:id` — **Pesée de sortie** : brut en direct, tare rappelée, **net calculé** (brut − tare) avec écart par
   rapport à la quantité commandée (vert ±2 %, orange ±5 %, rouge au-delà), bouton « Valider et imprimer le Bon de
   livraison » → aperçu du **BL** (même gabarit que Temara : n° provisoire = ID commande si SAP hors ligne, sinon n° SAP ;
   poids brut/tare/net au format `43,160`) → commande `Livrée`, synchro `En attente` si SAP hors ligne.
7. `/synchronisation` — **Synchronisation SAP** : état SAP (ping simulé), file des opérations (commande, étape
   `Créer commande` → `Livraison` → `Lire n° BL`, statut `En attente` / `En cours` / `Erreur` / `Synchronisée`, tentatives,
   message d'erreur lisible), boutons « Tout synchroniser » et par ligne, progression animée, puis « Réimprimer le BL »
   avec le vrai numéro SAP.
8. `/referentiels` — onglets Clients, Chantiers, Produits, Transporteurs, Camions, Chauffeurs (tableaux, recherche,
   bouton « Ajouter » ouvrant un formulaire simple en mémoire).
9. `/monitoring` (Admin) — cartes Santé API / Base / SAP / SignalR, taux d'erreur, latence p50/p95/p99, erreurs
   récentes avec ID de corrélation (recherche), connexions temps réel, liens vers les traces.

## Statuts et couleurs (sémantique, pas décoratif)
`Créée` (neutre) → `Entrée autorisée` (info) → `Dans l'usine` (bleu) → `Sortie autorisée` (info) → `Livrée` (succès)
→ `Synchronisée` (succès foncé) ; `Annulée` (gris barré) ; `Erreur de synchro` (danger). Synchro : `—` (SAP), `En attente`
(orange), `En cours` (animé), `Synchronisée` (vert), `Erreur` (rouge).

## Données simulées (Marrakech)
- Usine M102 Marrakech. Produits : `CPJ 45 vrac`, `CPJ 35 sac 50 kg`, `CPA 55 vrac`, `CPJ 45 sac 50 kg` (codes SAP 18 chiffres).
- 12 commandes du jour : 8 SAP (statuts variés), 4 locales (dont 1 en erreur de synchro « Client bloqué crédit »).
- Clients marocains plausibles (ex. « SOCIÉTÉ ATLAS BÉTON », « BENJELLOUN TRAVAUX », « BTP TENSIFT ») avec chantiers à
  Marrakech, Chichaoua, Benguerir, Essaouira ; transporteurs ; camions immatriculés `12345-A-6` ; chauffeurs avec CIN.
- Ponts : PB22 et PB23 (ciment, lecture fichier Databridge), PB21/PB24 (matière, affichés mais non utilisés).

## Impression
Les aperçus BC/BL sont des composants React imprimables (CSS `@media print`, format A5 paysage) ; le bouton « Imprimer »
appelle `window.print()`. Logo Cimar + mention « Document provisoire — en attente de synchronisation SAP » quand hors ligne.

## Hors périmètre de la maquette
Authentification réelle, SignalR, appels API, persistance. Les points d'intégration sont isolés dans `src/services/*`
(interfaces `CommandesService`, `PeseeService`, `SyncService`) avec une implémentation `mock` pour faciliter le branchement.
