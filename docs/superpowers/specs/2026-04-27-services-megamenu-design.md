---
title: Mega-menu "Services" — be-ikigai
date: 2026-04-27
status: approved
---

# Mega-menu "Services"

## Objectif

Remplacer le lien "Services" (ancre `#solution`) dans la navbar par un mega-menu déroulant inspiré de meschasses.com, donnant accès à 6 pages dédiées de features. Les pages features sont des placeholders pour l'instant — le contenu réel sera fourni ultérieurement.

## Design de référence

meschasses.com > "Fonctionnalités" : dropdown blanc arrondi, grille 2 colonnes, icône colorée + titre gras + sous-titre gris, footer avec plateformes et lien "Toutes les fonctionnalités".

---

## Structure du dropdown

- Trigger : le label "Services" suivi d'une flèche chevron qui tourne à 180° au hover
- Panel : `position: absolute`, fond blanc, `border-radius: 1rem` (`rounded-2xl`), `box-shadow: shadow-xl`
- Grille intérieure : 2 colonnes × 3 lignes pour les 6 items
- Footer séparé par un `border-t` fin : "Web · iOS · Android" à gauche, "Tous les services >" à droite (lien vers `/services/`, couleur `#9333ea` — purple accent du site)
- Largeur du panel : ~520px, aligné à gauche du trigger

## Chaque item de feature

```
[ icône 48px arrondie ] | Titre en gras
                        | Sous-titre gris clair
```

- Icône : carré ~48px, `border-radius: 0.75rem`, fond pastel couleur unique par feature, icône SVG centré
- Titre : `font-semibold`, couleur `bleu-crepuscule`
- Sous-titre : `text-sm text-gray-500`
- Hover item : `hover:bg-gray-50 rounded-xl`
- Chaque item est un lien `<a>` vers `/services/[slug]/` (FR) ou `/en/services/[slug]/` (EN)

### Couleurs des icônes (palette be-ikigai)

Les 6 features reçoivent chacune une teinte distincte à assigner lors de l'ajout du vrai contenu. Palettes suggérées : vert sauge, doré clair, bleu pâle, beige chaleureux, lavande, terracotta — toutes en version pastel (bg-opacity-20 sur une couleur de base).

## Comportement hover desktop

- Approche : CSS pur Tailwind (`group` / `group-hover`)
- Transition : `opacity-0 invisible translate-y-1` → `opacity-100 visible translate-y-0`, durée 150ms, `ease-out`
- Le `group` englobe le trigger ET le panel pour éviter tout gap : la souris peut glisser du lien vers le panel sans fermeture
- Le chevron tourne de 0° → 180° au hover (`group-hover:rotate-180`, transition 150ms)

## Comportement mobile

- Le hover n'existe pas sur tactile → "Services" dans le menu mobile devient un accordéon
- Un bouton toggle ouvre/ferme une liste verticale des 6 features (sans icônes, juste le titre)
- Géré par le JS existant de la navbar mobile (extension du pattern actuel)

## Routing & pages

### Pattern FR
- `/services/` — page récapitulative (placeholder)
- `/services/[slug]/` — page dédiée par feature (placeholder × 6)

### Pattern EN
- `/en/services/` — même composant, langue EN
- `/en/services/[slug]/` — même composant, langue EN

### Fichiers à créer
```
src/pages/services/index.astro              → importe ServicesIndex.astro
src/pages/services/[slug].astro             → importe ServicesFeature.astro
src/pages/[lang]/services/index.astro       → importe ServicesIndex.astro
src/pages/[lang]/services/[slug].astro      → importe ServicesFeature.astro
src/components/ServicesIndex.astro          → placeholder récapitulatif
src/components/ServicesFeature.astro        → placeholder feature individuelle
```

### Données des 6 features

Stockées dans un fichier de données statique `src/data/services.ts` :

```ts
export const services = [
  {
    slug: 'feature-1',
    icon: '…',          // SVG path ou nom d'icône
    iconBg: '#…',       // couleur fond pastel
    fr: { title: 'Feature 1', subtitle: 'Description courte' },
    en: { title: 'Feature 1', subtitle: 'Short description' },
  },
  // × 6
];
```

Les slugs et contenus réels seront fournis par l'utilisateur et remplis dans ce fichier.

## Modifications de Navbar.astro

1. Supprimer le `<a href="${homeUrl}#solution">Services</a>` dans le menu desktop
2. Le remplacer par un `<div class="group relative">` contenant :
   - Le trigger (label + chevron)
   - Le panel dropdown (grille + footer)
3. Dans le menu mobile : remplacer le lien Services par un accordéon toggle
4. Aucune nouvelle dépendance JS — tout géré par Tailwind + le script inline existant étendu

## Ce qui n'est PAS dans ce scope

- Contenu réel des 6 features (fourni ultérieurement)
- Animations complexes (stagger, illustrations animées)
- Recherche dans le menu
- Analytics sur les clics du mega-menu
