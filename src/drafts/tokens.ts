// Fiches de tokens des drafts (séparées des composants pour le fast refresh)
import type { Tokens } from './TokenSheet'

export const TOKENS_A: Tokens = {
  name: 'A — Terminal',
  intent: "Un écran de trading pour parieurs : quasi noir, un seul accent vert acide réservé à l'action et au gain, titres en grotesque condensée très grasse, tous les chiffres en mono tabulaire. Les cotes sont des boutons de bookmaker, la saisie est un ticket de pari.",
  colors: [
    { name: 'bg', value: '#0a0b09', role: 'Fond de page' },
    { name: 'surface', value: '#121410', role: 'Panneaux, ticket' },
    { name: 'surface-2', value: '#1a1d17', role: 'Boutons de cote, champs' },
    { name: 'grid', value: '#262a21', role: 'Traits, séparateurs, grille' },
    { name: 'ink', value: '#eef0e8', role: 'Texte principal, chiffres' },
    { name: 'muted', value: '#8b9184', role: 'Libellés, axes' },
    { name: 'accent', value: '#c8f031', role: 'Action, sélection, gain (+ signe)' },
    { name: 'loss', value: '#ff5d47', role: 'Perte (toujours avec −)' },
  ],
  fonts: [
    { role: 'Titres, gros chiffres de titre', family: 'Big Shoulders Display 900', sample: 'BILAN 2026', cssVar: '--d-font-display' },
    { role: 'Chiffres, cotes, tableaux', family: 'IBM Plex Mono', sample: '+8 592,53 €  1.76', cssVar: '--d-font-num' },
    { role: 'Texte courant', family: 'IBM Plex Sans', sample: 'Nordlys vs Halcyon', cssVar: '--d-font-body' },
  ],
  sizes: [
    { name: 'Héros', px: 72, use: 'Bénéfice' },
    { name: 'Titre', px: 44, use: 'Titre d’écran' },
    { name: 'KPI', px: 30, use: 'Indicateurs' },
    { name: 'Cote', px: 18, use: 'Boutons de cote' },
    { name: 'Texte', px: 14, use: 'Tableaux, formulaire' },
    { name: 'Libellé', px: 11, use: 'Majuscules espacées' },
  ],
  spacing: [4, 8, 12, 16, 24, 32, 48],
  radii: [{ name: 'champ', px: 10 }, { name: 'panneau', px: 14 }, { name: 'ticket', px: 18 }, { name: 'pilule', px: 999 }],
  strokes: [{ name: 'trait', px: 1, use: 'bordures, grille' }, { name: 'courbe', px: 2, use: 'séries' }, { name: 'perforation', px: 2, use: 'ticket (tirets)' }],
}

export const TOKENS_B: Tokens = {
  name: 'B — Back-office',
  intent: "Un outil de gestion qu'on lit vite : bleu encre, menu latéral, raccourcis de période, une bande d'indicateurs sans icônes et des tableaux denses (colonnes, filtres, densité, export). L'ambre ne sert qu'à montrer ce qui est sélectionné ; le gain et la perte gardent leur signe.",
  colors: [
    { name: 'bg', value: '#0c1220', role: 'Fond, menu latéral' },
    { name: 'surface', value: '#121a2b', role: 'Panneaux, tableaux' },
    { name: 'surface-2', value: '#18223a', role: 'Ligne survolée, entrée de menu active' },
    { name: 'grid', value: '#222c44', role: 'Séparateurs, grille' },
    { name: 'ink', value: '#e4e8f1', role: 'Texte, chiffres, courbe' },
    { name: 'muted', value: '#8a93a8', role: 'Libellés, en-têtes de colonnes' },
    { name: 'accent', value: '#e9b949', role: 'Sélection uniquement (période, ligne, cote)' },
    { name: 'win / loss', value: '#4fd08f', role: 'Gain (+) — perte #f2756b (−)' },
  ],
  fonts: [
    { role: 'Titres et texte', family: 'Instrument Sans', sample: 'Bilan commun', cssVar: '--d-font-body' },
    { role: 'Chiffres, cotes, tableaux', family: 'Spline Sans Mono', sample: '+8 592 €  1.76', cssVar: '--d-font-num' },
  ],
  sizes: [
    { name: 'Titre', px: 24, use: 'Titre de page' },
    { name: 'KPI', px: 26, use: 'Bande d’indicateurs' },
    { name: 'Section', px: 14, use: 'Titres de panneaux' },
    { name: 'Tableau', px: 13, use: 'Lignes denses' },
    { name: 'Libellé', px: 12, use: 'En-têtes, menus' },
  ],
  spacing: [4, 6, 8, 12, 16, 24],
  radii: [{ name: 'champ', px: 6 }, { name: 'panneau', px: 8 }],
  strokes: [{ name: 'séparateur', px: 1, use: 'tableaux, panneaux' }, { name: 'sélection', px: 2, use: 'menu actif (filet ambre)' }, { name: 'courbe', px: 2, use: 'séries' }],
}

export const TOKENS_C: Tokens = {
  name: 'C — Carnet',
  intent: "Le registre de paris tenu à la main, version propre : papier blanc cassé, encre noire, titres dans une serif à fort contraste, chiffres en machine à écrire, lignes de registre et marge rouge. Un seul accent corail en aplat pour l'action ; le gain et la perte sont des encres (vert, rouge) toujours avec leur signe.",
  colors: [
    { name: 'paper', value: '#f3efe4', role: 'Fond de page' },
    { name: 'sheet', value: '#faf7ef', role: 'Feuillets, tableaux' },
    { name: 'sheet-2', value: '#ece6d6', role: 'Zones de saisie, pastilles' },
    { name: 'rule', value: '#d8d0bd', role: 'Lignes du registre, grille' },
    { name: 'ink', value: '#1b1915', role: 'Texte, chiffres, courbe, filets forts' },
    { name: 'pencil', value: '#6e675a', role: 'Libellés, notes' },
    { name: 'accent', value: '#d9643a', role: 'Action et onglet actif (aplat)' },
    { name: 'win / loss', value: '#2f6b45', role: 'Encre verte (+) — rouge #b8322a (−)' },
  ],
  fonts: [
    { role: 'Titres', family: 'Gloock', sample: 'Le registre', cssVar: '--d-font-display' },
    { role: 'Texte courant', family: 'Newsreader', sample: 'Depuis janvier 2024, 576 paris…', cssVar: '--d-font-body' },
    { role: 'Chiffres, cotes', family: 'Courier Prime', sample: '+8 592,53 €  1.76', cssVar: '--d-font-num' },
  ],
  sizes: [
    { name: 'Manchette', px: 64, use: 'Titre d’écran' },
    { name: 'Chiffre clé', px: 44, use: 'Bénéfice' },
    { name: 'Sous-titre', px: 22, use: 'Sections' },
    { name: 'Chapeau', px: 19, use: 'Phrase de synthèse' },
    { name: 'Registre', px: 15, use: 'Lignes de paris' },
    { name: 'Note', px: 12, use: 'Libellés en petites capitales' },
  ],
  spacing: [4, 8, 12, 18, 24, 36, 56],
  radii: [{ name: 'tampon', px: 2 }, { name: 'feuillet', px: 3 }],
  strokes: [{ name: 'ligne', px: 1, use: 'registre (rule)' }, { name: 'filet', px: 1, use: 'séparations fortes (ink)' }, { name: 'marge', px: 1, use: 'marge corail' }, { name: 'courbe', px: 2, use: 'séries' }],
}

export const TOKENS_D: Tokens = {
  name: 'D — Artifact',
  intent: "Dans l'esprit des artifacts Claude : un document calme et lisible plutôt qu'une interface. Fond ivoire, cartes blanches à filet fin, beaucoup d'air, les indicateurs en serif, des tableaux denses et des pastilles douces pour les résultats. Courbe et barres en bleu (rouge sous zéro), texte gain/perte en vert/rouge avec signe. Le terracotta ne sert qu'à l'action.",
  colors: [
    { name: 'bg', value: '#f7f6f2', role: 'Fond ivoire' },
    { name: 'surface', value: '#ffffff', role: 'Cartes, tableaux' },
    { name: 'surface-2', value: '#f1efe8', role: 'Ligne survolée, pastille neutre' },
    { name: 'grid', value: '#e5e2d9', role: 'Filets, grille' },
    { name: 'ink', value: '#1f1e1b', role: 'Texte, sélection' },
    { name: 'muted', value: '#74716a', role: 'Libellés, notes' },
    { name: 'series', value: '#2f6fd6', role: 'Courbe et barres positives (barres négatives #d9443a)' },
    { name: 'accent', value: '#c4633f', role: 'Action (+ Pari, enregistrer)' },
  ],
  fonts: [
    { role: 'Titres et indicateurs', family: 'Source Serif 4', sample: '+15 €  43,8 %', cssVar: '--d-font-display' },
    { role: 'Interface, tableaux', family: 'Hanken Grotesk', sample: 'Par sport · Historique', cssVar: '--d-font-body' },
  ],
  sizes: [
    { name: 'Titre', px: 30, use: 'Titre de page (serif)' },
    { name: 'Indicateur', px: 28, use: 'Valeur des cartes (serif)' },
    { name: 'Section', px: 15, use: 'Titres de sections' },
    { name: 'Tableau', px: 13, use: 'Lignes' },
    { name: 'Note', px: 12, use: 'Libellés, sous-titres' },
  ],
  spacing: [4, 8, 12, 16, 24, 32, 40],
  radii: [{ name: 'champ', px: 8 }, { name: 'carte', px: 10 }, { name: 'pastille', px: 999 }],
  strokes: [{ name: 'filet', px: 1, use: 'cartes, tableaux' }, { name: 'courbe', px: 2, use: 'série' }],
}
