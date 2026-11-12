# Squawo & Kelicful — modèles LoL et suivi des paris

Site privé de notre duo de parieurs (Squawo et Kelicful) : modèles Elo LoL, journal de paris commun,
bilans, partage des bénéfices et compta entre nous, espace perso de Kelicful (bilan, Elo tennis), calculateurs.

React 19 · Vite · TypeScript · Tailwind 4 · Supabase · déployé sur GitHub Pages.

> **Le dépôt est public.** Aucune donnée de paris, aucun export Excel, aucune clé secrète ne doit y entrer.
> Les données vivent uniquement dans Supabase, derrière la connexion. `data/`, `design/`, `*.xlsx` et `.env.local` sont ignorés par git.

## Sections

| Section | Contenu |
|---|---|
| **Paris** | Bilan · Récap du commun (paris en cours, résultat en un clic) · Partage & compta · Calculateurs |
| **Modèles** | Ligues LoL (Classement, GDM, Matchs, Équipes) |
| **Kelicful** | Bilan · Récap · Vu pas pris · Elo tennis ATP · Elo tennis WTA |
| **Réglages** | Partage, bankroll, remises à zéro, saisons masquées, sports, paramètres des modèles, sauvegarde |

Le bouton **+ Pari** est accessible partout (en-tête sur ordinateur, bouton flottant sur mobile). Thème clair / sombre en haut à droite.

## Installation locale

```bash
npm install
cp .env.example .env      # puis renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (clé publique)
npm run dev               # http://localhost:5173/lol-stats/
```

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | vérification TypeScript + build de production |
| `npm run lint` | ESLint |
| `npm test` | tests Vitest (calculs de bilan, tennis, calculateurs) |
| `npm run import:excel -- "<fichier.xlsx>" [--dry-run]` | import unique de l'historique Excel (voir plus bas) |

Les maquettes de direction artistique restent consultables sur `#/drafts` (données fictives).

## Base de données

Le schéma complet est dans `supabase/schema.sql`. Chaque évolution passe par une migration versionnée dans
`supabase/migrations/`, à coller dans **Supabase → SQL Editor** (elles peuvent être relancées sans risque) :

| Migration | Contenu |
|---|---|
| `20261110_01_paris.sql` | tables du côté parieur : `bets`, `money_moves`, `compta_legacy`, `app_settings`, `user_prefs`, `tennis_elo`, `profiles` |
| `20261110_02_historique.sql` | nom du match facultatif ; `data_history` : copie de chaque ajout / modification / suppression |
| `20261111_03_reglement.sql` | mouvement « Règlement » (paiement entre nous) |
| `20261111_04_poids_tennis.sql` | répartition Elo / Elo surface par surface |
| `20261111_05_apparence.sql` | style et mode mémorisés par utilisateur |
| `20261112_06_onglets.sql` | onglets personnalisés par utilisateur (ordre, masqués) |
| `20261112_07_live.sql` | case « Live » sur les paris (reprise de la mention live de l'import) |

Toutes les tables ont la RLS activée (accès aux utilisateurs connectés). **Les inscriptions sont fermées** dans Supabase :
les comptes se créent par invitation. La table `profiles` relie chaque compte à Squawo ou Kelicful (remplie hors dépôt).

## Import de l'historique Excel

Fait une seule fois le 10/11/2026 (1 698 paris, 19 mouvements, 131 lignes de compta, 1 075 joueurs Elo tennis).
Pour le refaire sur une base vide :

1. Créer `.env.local` (jamais commité) :
   ```
   SUPABASE_URL=https://<projet>.supabase.co
   SUPABASE_SERVICE_KEY=sb_secret_…
   ```
2. `npm run import:excel -- "C:/chemin/LoL 2026.xlsx" --dry-run` : rapport de contrôle (chiffres attendus du cahier des charges), rien n'est écrit.
3. Même commande sans `--dry-run`. Le script refuse de tourner si un import existe déjà, s'arrête sans écrire si un contrôle est en écart,
   et annule tout ce qu'il a écrit si une insertion échoue.

## Sauvegardes et sécurité des données

- **Enregistrement immédiat** : chaque action est écrite dans Supabase sur-le-champ ; un échec est toujours signalé avec « Réessayer ».
- **Brouillon** : le pari en cours de saisie est gardé dans le navigateur tant qu'il n'est pas enregistré.
- **Historique** : `data_history` garde chaque version des paris, mouvements, réglages et lignes de compta (non modifiable depuis le site).
- **Sauvegarde nocturne** : le dépôt privé `BPB1317/bpb-sauvegardes` exporte toutes les tables chaque nuit (GitHub Actions) ;
  chaque commit est une photo complète de la base. Secrets requis dans ce dépôt : `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
- **Sauvegarde manuelle** : Réglages → « Télécharger une sauvegarde » (JSON de toutes les tables).

## Déploiement

Un push sur `main` déclenche `.github/workflows/deploy.yml` : build avec les secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
du dépôt, puis publication sur GitHub Pages (https://bpb1317.github.io/lol-stats/). La navigation passe par `#/…`,
ce qui fonctionne sans configuration particulière de GitHub Pages.
