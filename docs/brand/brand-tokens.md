# Charte Ecare / CIMAR — tokens extraits de `Ecare-FrontUi` (2026-11-11)

Source de vérité : `Ecare-FrontUi/src/styles/admin-theme.scss`, `src/app/theme/tokens.scss`, `src/app/layout/AdminSidebar.scss`,
`src/features/Kiosk/styles/kiosk-theme.css`. Le bleu Metronic `#1B84FF` n'est **jamais** utilisé.

## Couleurs

| Token | Hex | Rôle |
|---|---|---|
| `--cimar-sidebar` | `#063b2b` | fond de la barre latérale admin |
| `--cimar-brand` | `#004e2b` | vert marque (en-tête kiosque, logo, boutons kiosque) |
| `--cimar-brand-hover` | `#00331b` | survol marque |
| `--cimar-action` | `#0b6b3e` | boutons d'action, liens, focus, titres de section |
| `--cimar-action-hover` | `#0d7a47` | survol action |
| `--cimar-green` | `#5eac2c` | accent CIMAR (bouton primaire, pagination active) |
| `--cimar-green-hover` | `#4d9022` | |
| `--cimar-green-soft` | `rgba(94,172,44,.08)` | fond accent léger |
| `--cimar-spring` | `#00dd39` | poids STABLE, soulignement focus login |
| `--cimar-unstable` | `#ffaa00` | poids instable |
| `--cimar-orange` | `#f2a82c` | accent CIMAR (`::selection`) |
| `--cimar-gold` | `#f6c23e` | indicateur d'élément de menu actif |
| `--cimar-bg` | `#f5f6f8` | fond de page admin |
| `--cimar-card` | `#ffffff` | cartes |
| `--cimar-border` | `#e3e7ea` | bordures cartes |
| `--cimar-thead` | `#f4f7f6` | fond en-tête tableau (texte `#405249`) |
| `--cimar-ink` | `#1e293b` | titres (modales `#0f172a`) |
| `--cimar-text` | `#111827` | texte courant (`#374151` labels) |
| `--cimar-muted` | `#64748b` | texte secondaire (`#6b7280`, `#9ca3af`) |
| `--cimar-fill` | `#f3f4f6` | fonds neutres (`#f9fafb` en-têtes de panneaux) |
| `--cimar-danger` | `#dc2626` | erreurs, suppression (`#dc3545` boutons kiosque) |
| `--cimar-warning` | `#f59e0b` | avertissements (texte `#b45309`) |
| `--cimar-info` | `#3b82f6` | information (chip étape `#dbeafe` / `#1e40af`) |
| `--cimar-teal` | `#0f766e` | action « réimprimer » |

Badges de statut : fond `rgba(couleur, .12)` + texte plein. Livrée `rgba(11,107,62,.12)`/`#0b6b3e` ; En cours
`rgba(245,158,11,.14)`/`#b45309` ; En attente `rgba(234,88,12,.12)`/`#c2410c` ; Erreur `rgba(220,38,38,.12)`/`#dc2626` ;
Annulée `rgba(107,114,128,.14)`/`#374151`. Conditionnement : VRAC `#dbeafe`/`#1e40af`, SAC `#d1fae5`/`#065f46`, PAL `#fef3c7`/`#92400e`.
Affichage pont bascule : fond `#000`, rayon 20, valeur Courier 900 avec halo `0 0 25px rgba(94,172,44,.6)`.

## Typographie

- **Inter** 300–700 (Google Fonts) : `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`.
- Codes, matricules, n° SAP, poids : `'Courier New', monospace`, chiffres tabulaires.
- Titre de page 42px/900 `#1e293b` centré (32px < 992px) ; sous-titre 18px ; titre de carte 20px/900 ; titre de section 18px/600 `#0b6b3e` ;
  en-tête tableau 14px/700 MAJUSCULES espacement .5px ; cellules 14–15px ; labels 13px/600 `#374151`.

## Formes, ombres, espaces

- Rayons : contrôles 6–8px, tableaux/panneaux 12px, cartes 16px, modales 22px, pills 999px.
- Ombres : carte `0 2px 8px rgba(0,0,0,.03)` ; panneau `0 1px 3px rgba(0,0,0,.1)` ; KPI `0 12px 30px rgba(1,78,44,.05)` ;
  bouton primaire survol `0 4px 12px rgba(11,107,62,.3)` ; modale `0 24px 70px rgba(15,23,42,.28)` ; focus `0 0 0 3px rgba(11,107,62,.1)`.
- Espacement 4/8/16/24/32/40/48 ; page `1.5rem 1.75rem 2rem` ; corps de page `gap 1.25rem` ; cellule `16px 20px`.
- Transitions 0.2s, boutons `translateY(-1px)` au survol ; barre latérale 0.25s.

## Coque admin

Barre latérale fixe 280px (repliée 85px), fond `#063b2b`, logo `asment.png` sur tuile blanche (rayon 16, ombre), groupes avec
libellé 10px majuscules à 50 %, éléments `border-radius 999px 0 0 999px`, actif = fond `rgba(255,255,255,.15)` + bordure gauche
4px `#f6c23e`, pied = utilisateur + rôle + bouton déconnexion rond. Pas de barre supérieure. Contenu `margin-left 280px`, fond `#f5f6f8`.

## Actifs

`Ecare-FrontUi/public/media/asment.png` (logo), `cimar-icon.ico` (favicon), `CIMAR_LOGO_Horizontal.svg`, photos de connexion
`cimentsbg.png`, `betonbg.png`, `granulatsbg.png`. Copiés dans `web/public/media/`.

## Conventions de libellés (FR)

Commandes, Bon de livraison (BL), Bon de chargement (BC), Pont-bascule, Premier pesage / Second pesage, Poids brut / Tare / Net,
Matricule, Chauffeur, Transporteur, Chantier, Client, N° SAP. Statuts : Livrée / En cours / Annulée / En attente / Erreur.
Actions : Réinitialiser, Rechercher, Actualiser, Exporter CSV, Valider, Annuler, Enregistrer, Fermer, Réessayer, Déconnexion.
Valeur absente : « — ». Nombres `toLocaleString('fr-FR')`, « t » ou « kg ».
