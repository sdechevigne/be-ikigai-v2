# Réorganisation des sections de la page d'accueil

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réordonner les sections de `src/components/Home.astro` pour optimiser le tunnel de conversion et le référencement sémantique (SEO/GEO).

**Architecture:** Le fichier `Home.astro` contient toutes les sections en ligne. La réorganisation consiste à déplacer des blocs HTML existants dans le bon ordre — aucun nouveau composant, aucune nouvelle logique. La structure finale suit le parcours : Hero → Douleur → Ikigai expliqué → Solution → Qui suis-je → Citation vedette → Avis Google → Blog → Contact.

**Tech Stack:** Astro 6, Tailwind CSS

---

## Ordre cible des sections

| Position | Section | id / repère |
|----------|---------|-------------|
| 1 | Hero | `id="accueil"` |
| 2 | Douleur | `id="douleur"` |
| 3 | L'Ikigai expliqué | fond `#2c3e50` |
| 4 | Solution & transformation | `id="solution"` |
| 5 | Qui suis-je ? | `id="qui-suis-je"` |
| 6 | Citation vedette (Hugues) | `bg-white` sans id |
| 7 | Avis Google | `<GoogleReviews>` |
| 8 | Blog | section blog sans id |
| 9 | Contact/CTA | `id="contact"` (footer) |

## Fichiers concernés

- Modifier : `src/components/Home.astro` (seul fichier touché)

---

## Task 1 : Identifier et extraire chaque bloc

**Files:**
- Modify: `src/components/Home.astro`

- [ ] **Step 1 : Repérer les délimiteurs de chaque section**

Ouvrir `src/components/Home.astro` et noter les numéros de lignes exacts de chaque section :

| Section | Début (commentaire ou tag ouvrant) | Fin (tag fermant `</section>` ou `</footer>`) |
|---------|-------------------------------------|-----------------------------------------------|
| Hero | `<!-- Section 1: Bannière d'Accueil -->` | `</section>` après la fermeture du `.container` |
| Douleur | `<!-- Section 2: Le Point de Douleur -->` | `</section>` |
| Solution | `<!-- Section 3: La Solution -->` | `</section>` |
| Citation vedette | `<section class="bg-white py-14 lg:py-32">` (sans id, contient "Hugues") | `</section>` |
| GoogleReviews | `<GoogleReviews lang={lang} />` | même ligne |
| Blog | `<!-- Nouvelle Section Blog -->` | `</section>` |
| Ikigai expliqué | `<!-- Section 5: L'Ikigai expliqué -->` | `</section>` |
| Qui suis-je | `<!-- Section 4: Qui suis-je ? -->` | `</section>` |
| Contact | `<!-- Section 5: L'Appel à l'Action Final -->` | `</footer>` |

- [ ] **Step 2 : Vérifier que le fichier compile sans erreur avant de toucher quoi que ce soit**

```bash
npm run astro check
```

Expected: zéro erreur TypeScript/Astro. Si des erreurs existent déjà, les noter — elles ne sont pas introduites par ce changement.

---

## Task 2 : Réorganiser les sections

**Files:**
- Modify: `src/components/Home.astro`

La méthode la plus sûre est de reconstruire le corps du template en copiant-collant les blocs dans le bon ordre. Voici la procédure exacte.

- [ ] **Step 1 : Copier le bloc "Ikigai expliqué" juste après la section Douleur**

Dans `Home.astro`, le bloc Ikigai expliqué commence par :
```html
    <!-- Section 5: L'Ikigai expliqué -->
    <section class="py-14 lg:py-32" style="background-color: #2c3e50;">
```
et se termine par le `</section>` correspondant (après `</div>` imbriqués).

**Action :** Couper ce bloc entier et le coller immédiatement après la balise `</section>` de la section Douleur (`id="douleur"`), avant la section Solution.

Le nouvel ordre dans le fichier sera :
```
[Hero]
[Douleur]
[Ikigai expliqué]  ← déplacé ici
[Solution]
...
```

- [ ] **Step 2 : Déplacer "Qui suis-je ?" avant la citation vedette**

Le bloc "Qui suis-je ?" commence par :
```html
    <!-- Section 4: Qui suis-je ? -->
    <section class="bg-white py-14 lg:py-32" id="qui-suis-je">
```

La citation vedette (Hugues) commence par :
```html
    <section class="bg-white py-14 lg:py-32">
        <div class="container mx-auto px-6">
            <div class="max-w-4xl mx-auto">
                <div class="text-center mb-16 fade-in">
                    <svg class="text-[#9333ea]
```
(section sans id, contient le blockquote "Un mois après notre séance...")

**Action :** S'assurer que dans le fichier, après la section Solution, l'ordre est :
```
[Solution]
[Qui suis-je ?]     ← doit précéder la citation
[Citation vedette]
[GoogleReviews]
[Blog]
[Contact]
```

Si "Qui suis-je ?" était déjà après la citation, le couper et le coller avant elle.

- [ ] **Step 3 : Ajouter `id="ikigai"` à la section Ikigai expliqué**

Localiser la balise ouvrante de la section Ikigai expliqué et ajouter l'id :

```html
    <section class="py-14 lg:py-32" id="ikigai" style="background-color: #2c3e50;">
```

Cela permet aux ancres de navigation et aux crawlers d'identifier la section.

- [ ] **Step 4 : Vérifier l'ordre final dans le fichier**

Utiliser grep pour confirmer l'ordre des marqueurs clés :

```bash
grep -n 'id="accueil"\|id="douleur"\|id="ikigai"\|id="solution"\|id="qui-suis-je"\|id="contact"\|GoogleReviews\|Section Blog\|Citation' src/components/Home.astro
```

L'output doit lister les numéros de ligne dans l'ordre croissant correspondant au tableau cible ci-dessus.

- [ ] **Step 5 : Compiler pour vérifier qu'il n'y a pas d'erreur introduite**

```bash
npm run astro check
```

Expected: même résultat qu'avant (zéro nouvelles erreurs).

- [ ] **Step 6 : Lancer le serveur de dev et vérifier visuellement**

```bash
npm run dev
```

Ouvrir `http://localhost:4321` et scroller de haut en bas. Vérifier :
1. Hero s'affiche en premier
2. Section douleur vient ensuite
3. L'Ikigai expliqué (fond bleu foncé + diagramme) vient avant la Solution
4. Solution vient après
5. Photo de Pierre-Louis + biographie vient avant la citation d'Hugues
6. Citation d'Hugues, puis avis Google, puis blog, puis contact

- [ ] **Step 7 : Vérifier la version anglaise**

Ouvrir `http://localhost:4321/en/` et vérifier le même ordre.

- [ ] **Step 8 : Commit**

```bash
git add src/components/Home.astro
git commit -m "refactor(home): reorder sections for conversion funnel and SEO

New order: Hero → Douleur → Ikigai expliqué → Solution → Qui suis-je
→ Citation → Avis Google → Blog → Contact

- Ikigai explanation now precedes the solution pitch (semantic SEO)
- Pierre-Louis bio now precedes social proof
- Blog moved just before CTA to avoid breaking conversion tunnel"
```
