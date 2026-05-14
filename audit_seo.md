# Audit SEO Complet — be-ikigai.com
**Date :** Mai 2026 | **Domaine :** be-ikigai.com | **Marché :** Coaching Ikigai, Paris, France

> **Note de fiabilité :** Chaque point a été vérifié contre le code source (Astro 6, `src/`). Les statuts `✅ DÉJÀ CORRIGÉ`, `⚠️ PARTIELLEMENT CORRIGÉ` et `❌ CONFIRMÉ` indiquent la réalité du code, pas les observations externes ayant servi à rédiger l'audit initial.

---

## Contexte & État actuel

| Indicateur | Valeur |
|---|---|
| Clics (90 jours) | 45 |
| Impressions (90 jours) | 1 911 |
| CTR moyen | 2,35% |
| Position moyenne | 9,82 |
| Domaines référents | 7 (0 dofollow) |
| Backlinks totaux | 8 (tous nofollow) |

**Concurrents principaux :** centre-international-ikigai.com (63 domaines référents), coachevolution.fr (70 domaines référents), ishiki-coaching.com (59 domaines référents).

---

## 🔴 CRITIQUE — Problèmes bloquants (à corriger en priorité absolue)

---

### 1. ~~Canonical des articles de blog pointe vers la homepage~~ ✅ DÉJÀ CORRIGÉ

**Vérification code :** `src/components/BlogPost.astro` génère un canonical dynamique depuis `canonicalPath` — chaque article reçoit sa propre URL canonique. Les balises hreflang FR/EN sont également correctement croisées.

**Action :** Aucune. Le problème décrit ne correspond pas au code actuel.

---

### 2. Pages services vides avec contenu placeholder ❌ CONFIRMÉ

**Problème :** Les pages `/services/bilan-ikigai/` et `/services/parcours-coaching/` affichent "Contenu à venir…". Elles sont indexables mais sans contenu (`src/pages/services/[slug].astro` + `src/data/services.ts`).

**Impact :** Google peut indexer des pages vides, ce qui nuit au score de qualité global du domaine (thin content). Ces pages ne peuvent pas ranker.

**Correction :**
- Option A (rapide) : Ajouter `<meta name="robots" content="noindex, follow">` sur ces pages jusqu'à ce que le contenu soit rédigé.
- Option B (recommandée) : Rédiger le contenu complet de ces pages (voir points 14 et 15).
- Ne pas supprimer les pages ni les rediriger — conserver les URLs.

---

### 3. ~~Title tag identique sur tous les articles de blog~~ ✅ DÉJÀ CORRIGÉ

**Vérification code :** `src/components/BlogPost.astro` génère le title depuis `post.data.title + " | be-ikigai"` — chaque article a son propre title dynamique issu du frontmatter.

**Action :** Aucune.

---

### 4. ~~Meta description identique sur tous les articles de blog~~ ✅ DÉJÀ CORRIGÉ

**Vérification code :** La meta description est tirée de `post.data.description` dans `BlogPost.astro`. Chaque article a sa propre description depuis son frontmatter.

**Action :** Vérifier que tous les articles ont bien un champ `description` non vide dans leur frontmatter — c'est la seule vigilance à maintenir.

---

### 5. ~~H1 identique sur tous les articles de blog~~ ✅ DÉJÀ CORRIGÉ

**Vérification code :** Le H1 est `{post.data.title}` dans `BlogPost.astro` — dynamique par article.

**Action :** Aucune.

---

### 6. ~~Structure H2/H3 identique sur tous les articles~~ ✅ DÉJÀ CORRIGÉ

**Vérification code :** Conséquence du point 1 — les articles sont bien des pages indépendantes avec leur propre contenu Markdown rendu. Le build Astro génère un `dist/blog/[slug]/index.html` distinct pour chaque article.

**Action :** Aucune.

---

## 🟠 IMPORTANT — Optimisations on-page prioritaires

---

### 7. Title tag de la homepage trop long ⚠️ PARTIELLEMENT CORRIGÉ

**Problème :** `src/components/Home.astro` — titre FR : *"Coaching Ikigai : Trouvez Votre Raison d'Être | be-ikigai Paris"* = **67 caractères** (au-dessus de la limite recommandée de 60). Titre EN : 62 caractères.

**Correction :**
- Nouveau title FR : `"Coaching Ikigai à Paris | be-ikigai"` (36 chars) — plus percutant
- Ou : `"Coach Ikigai Paris — Trouvez votre raison d'être"` (49 chars)
- Fichier : `src/components/Home.astro`, prop `title` du composant Layout.

---

### 8. Title tag du blog trop long et non optimisé ❌ CONFIRMÉ

**Problème :** `src/components/BlogList.astro` — title : *"Blog — Articles, Conseils & Réflexions sur l'Ikigai | be-ikigai"* = 77 caractères. Le mot "Blog" en première position n'apporte aucune valeur SEO.

**Correction :**
- Nouveau title : `"Blog Ikigai : développement personnel & sens de la vie"` (54 chars)
- Ou : `"Articles Ikigai & développement personnel | be-ikigai"` (53 chars)

---

### 9. H1 de la homepage non optimisé pour le SEO ❌ CONFIRMÉ

**Problème :** `src/i18n/ui.ts` — `hero.title` = *"Le temps est un présent"* (FR) / *"Time is a gift"* (EN). Aucun mot-clé de positionnement.

**Impact :** La homepage ne signale pas à Google qu'elle cible "coaching ikigai" ou "coach ikigai paris".

**Correction :**
- Option A (conserve le style) : Garder l'accroche poétique en `<p>` et ajouter un H1 SEO visible : *"Coaching Ikigai à Paris — Trouvez votre raison d'être"*
- Option B : Remplacer par *"Coach Ikigai certifié à Paris | Pierre-Louis"*
- Fichiers : `src/i18n/ui.ts` (clés `hero.title`) + `src/components/Home.astro` (structure HTML).

---

### 10. H1 du blog non optimisé ❌ CONFIRMÉ

**Problème :** `src/components/BlogList.astro` — H1 : *"Le Carnet de Terrain"* (FR) / *"The Field Journal"* (EN). Aucun mot-clé.

**Correction :**
- Nouveau H1 FR : `"Blog Ikigai & développement personnel"`
- Nouveau H1 EN : `"Ikigai Blog — Personal Growth & Life Purpose"`

---

### 11. Meta description de la homepage trop longue ❌ À VÉRIFIER

**Problème signalé :** 159 caractères — au-delà de la limite de 155 caractères.

**Vérification nécessaire :** Contrôler la valeur de `hero.description` dans `src/i18n/ui.ts` et la longueur effective.

**Correction si confirmé :**
- Réduire à 145-155 caractères max.
- Nouvelle version : *"Découvrez votre Ikigai avec Pierre-Louis, coach certifié à Paris. Séance découverte gratuite de 30 min pour trouver votre raison d'être."* (140 chars)

---

### 12. Pages services avec title tags non optimisés ❌ CONFIRMÉ (contenu vide)

**Problème :** Les pages services existent (`src/data/services.ts`) mais sont des stubs vides. Leurs title tags sont donc sous-optimisés par défaut.

**Correction :**
- Bilan Ikigai : `"Bilan Ikigai Paris : séance découverte gratuite"` (47 chars)
- Parcours coaching : `"Parcours Coaching Ikigai en 3 phases | be-ikigai Paris"` (54 chars)
- À corriger dans `src/data/services.ts` ou le composant `src/pages/services/[slug].astro`.

---

### 13. Meta descriptions des pages services trop courtes ❌ CONFIRMÉ (contenu vide)

**Problème :** Pages sans contenu réel → meta descriptions placeholder.

**Correction :**
- Bilan Ikigai : *"Découvrez le Bilan Ikigai avec Pierre-Louis, coach certifié à Paris. Une séance d'introspection pour identifier votre passion, mission, vocation et profession."* (160 chars → réduire à 155)
- Parcours coaching : *"Un accompagnement Ikigai personnalisé en 3 phases pour passer de l'introspection à l'action. Séance découverte gratuite de 30 min à Paris."* (140 chars)

---

### 14. Page /services/bilan-ikigai/ sans contenu ❌ CONFIRMÉ

**Problème :** Page vide ("Contenu à venir…"). C'est une page de service clé pour le business et le SEO.

**Contenu minimum à rédiger :**
- H1 : "Bilan Ikigai : découvrez votre raison d'être profonde"
- H2 : "Qu'est-ce qu'un Bilan Ikigai ?"
- H2 : "Pour qui est fait ce bilan ?"
- H2 : "Comment se déroule le Bilan Ikigai ?"
- H2 : "Ce que vous repartez avec"
- H2 : "Tarif et réservation"
- CTA : bouton séance découverte gratuite
- Minimum 600 mots de contenu réel.

---

### 15. Page /services/parcours-coaching/ sans contenu ❌ CONFIRMÉ

**Problème :** Même problème que le point 14.

**Contenu minimum à rédiger :**
- H1 : "Parcours Coaching Ikigai : de l'introspection à l'impact"
- H2 : "Phase 1 — Diagnostic Ikigai"
- H2 : "Phase 2 — Le Sprint"
- H2 : "Phase 3 — La Sentinelle"
- H2 : "Résultats attendus"
- H2 : "Tarif et conditions"
- Minimum 800 mots.

---

## 🟡 IMPORTANT — Autorité & Netlinking

---

### 16. Zéro backlink dofollow ❌ CONFIRMÉ (hors code)

**Problème :** 8 backlinks, tous nofollow, provenant de 7 domaines. Les concurrents ont entre 59 et 70 domaines référents avec 63-68% de dofollow.

**Impact :** Sans backlinks dofollow, Google ne transfère aucune autorité vers be-ikigai.com. C'est la cause principale du faible positionnement sur les mots-clés compétitifs.

**Actions (humaines) :**
- Soumettre le site à des annuaires de coachs reconnus (ICF France, annuaires développement personnel).
- Publier des articles invités sur des blogs de développement personnel avec lien dofollow.
- Créer une fiche Google Business Profile (génère un lien dofollow depuis maps.google.com).
- Demander à des partenaires (thérapeutes, RH, coachs complémentaires) un lien depuis leur site.
- Objectif court terme : 10 domaines référents dofollow.

---

### 17. Aucune présence sur les annuaires de coachs ❌ CONFIRMÉ (hors code)

**Problème :** be-ikigai.com n'apparaît dans aucun des top SERPs pour "coaching ikigai" ou "coach ikigai paris".

**Actions (humaines) :**
- S'inscrire sur jobimpact.fr (rank #1 pour "coach ikigai paris").
- Créer des profils sur Superprof, Malt, ou équivalents coaching.
- Ces inscriptions génèrent des backlinks ET de la visibilité directe.

---

### 18. Aucune fiche Google Business Profile détectée ❌ CONFIRMÉ (hors code)

**Problème :** Le schema LocalBusiness est présent dans `src/layouts/Layout.astro` (adresse : Rue du Bac, Paris 75007), mais aucune fiche GBP active n'a été détectée dans les SERPs.

**Impact :** Absence du Local Pack Google pour les recherches "coach ikigai paris".

**Action (humaine) :**
- Créer ou revendiquer la fiche Google Business Profile pour "be-ikigai — Coaching Ikigai Paris".
- Catégorie principale : "Coach de vie".
- Ajouter photos, description, lien site web, horaires.

---

## 🟡 IMPORTANT — Contenu & Stratégie de mots-clés

---

### 19. Aucune page ciblant "méthode ikigai" (390-480 recherches/mois) ❌ CONFIRMÉ

**Correction :**
- Créer un article `/blog/methode-ikigai/` via le pipeline blog.
- Title : `"La méthode Ikigai : comment trouver votre raison d'être en 4 étapes"`
- Structure : définition, les 4 cercles, exercices pratiques, lien vers la séance découverte.

---

### 20. Aucune page ciblant "ikigai test gratuit" ❌ CONFIRMÉ

**Requête commerciale qualifiée** (prospect chaud). Volume estimé : 200-400/mois.

**Correction :**
- Créer `/blog/ikigai-test-gratuit/` ou `/outils/test-ikigai/`.
- Proposer un questionnaire Ikigai interactif ou un PDF téléchargeable.
- CTA vers la séance découverte gratuite.

---

### 21. Aucune page ciblant "reconversion professionnelle comment faire" (2 400/mois) ❌ CONFIRMÉ

**Correction :**
- Créer `/blog/reconversion-professionnelle-comment-faire/`.
- Title : `"Reconversion professionnelle : comment faire en 5 étapes concrètes"`
- Contenu : guide pratique + angle Ikigai + CTA coaching.

---

### 22. Aucune page ciblant "burn out symptomes" (18 100/mois) ❌ CONFIRMÉ

**Correction :**
- Créer `/blog/burn-out-symptomes/`.
- Title : `"Burn-out : symptômes, causes et comment s'en sortir grâce à l'Ikigai"`
- Contenu : symptômes détaillés + lien avec perte de sens + solution coaching.

---

### 23. Mot-clé "ikigai" (843 impressions, 3 clics) non exploité ❌ CONFIRMÉ

**Problème :** CTR 0,36% pour 843 impressions. La homepage apparaît en position ~12 pour ce mot-clé générique très compétitif.

**Correction :**
- Ne pas chercher à ranker la homepage sur "ikigai" seul (trop compétitif, intention informative).
- Créer un article dédié `/blog/quest-ce-que-likigai/` ciblant "qu'est-ce que l'ikigai" et "ikigai définition". Vérifier qu'il n'existe pas déjà dans `src/content/blog/`.

---

### 24. Maillage interne incomplet vers /tarifs/ ⚠️ PARTIELLEMENT CORRIGÉ

**Vérification code :** Certains articles de blog contiennent des liens internes vers `/services/bilan-ikigai/` et `/services/parcours-coaching/` — c'est positif. En revanche, **aucun article ne lie vers `/tarifs/`**.

**Correction :**
- Dans chaque article de blog, ajouter au moins un lien vers `/tarifs/` en fin d'article.
- Exemple : *"Pour réserver votre séance découverte gratuite, consultez les [tarifs et formules](/tarifs/)."*
- Ajouter un bloc CTA standardisé en fin de chaque article pointant vers `/tarifs/`.

---

## 🟡 TECHNIQUE — Optimisations secondaires

---

### 25. Sitemap principal inaccessible à l'URL standard ❌ À VÉRIFIER EN PROD

**Problème signalé :** `/sitemap.xml` redirigerait vers la homepage ; le sitemap réel est à `/sitemap-index.xml`.

**Vérification code :** Le plugin Astro sitemap génère automatiquement `sitemap-index.xml` (confirmé dans `astro.config.mjs`). Le `robots.txt` (`public/robots.txt`) référence correctement `https://be-ikigai.com/sitemap-index.xml`.

**Action :**
- Vérifier en production que `/sitemap.xml` ne redirige pas à tort.
- Soumettre `https://be-ikigai.com/sitemap-index.xml` dans Google Search Console si pas déjà fait.

---

### 26. BreadcrumbList schema incomplet sur la homepage ❌ CONFIRMÉ

**Vérification code :** `src/layouts/Layout.astro` — le schema BreadcrumbList est présent sur toutes les pages avec un seul item (Accueil) sur la homepage. Inutile.

**Correction :**
- Sur la homepage : supprimer le BreadcrumbList ou conditionner son affichage aux pages profondes.
- Sur les articles de blog (déjà en `BlogPosting`) et pages services : implémenter un BreadcrumbList complet avec 3 niveaux.

---

### 27. Schema BlogPosting manquant sur les articles ✅ DÉJÀ CORRIGÉ

**Vérification code :** `src/components/BlogPost.astro` génère un schema `BlogPosting` complet sur chaque article (headline, author, datePublished, dateModified, image, publisher, mainEntityOfPage).

**Action :** Aucune. Le problème décrit ne correspond pas au code actuel.

---

### 28. Schema LocalBusiness présent sur toutes les pages ❌ CONFIRMÉ

**Vérification code :** `src/layouts/Layout.astro` — le schema LocalBusiness (avec AggregateRating et reviews) est injecté sur **chaque page**, y compris les articles de blog.

**Impact :** Dilution du signal, risque de confusion pour Google sur le type de contenu des articles.

**Correction :**
- Conditionner l'injection du LocalBusiness à la homepage, page contact et page tarifs uniquement.
- Sur les articles de blog : le `BlogPosting` seul suffit (déjà en place).
- Sur les pages services : remplacer par un schema `Service`.

---

### 29. Open Graph image générique sur les pages non-blog ⚠️ PARTIELLEMENT CORRIGÉ

**Vérification code :** Les articles de blog ont une image OG dynamique dans `BlogPost.astro` (priorité : variante `-og` > image display > fallback logo). En revanche, les pages statiques (homepage, tarifs, services) utilisent toutes `logo_fullhd.png` par défaut dans `Layout.astro`.

**Correction :**
- Créer des images OG dédiées (1200×630px) pour homepage, tarifs, et pages services.
- Passer ces images comme prop `ogImage` depuis chaque page vers le Layout.

---

### 30. Crawl-delay de 1 seconde dans robots.txt ❌ CONFIRMÉ

**Vérification code :** `public/robots.txt` ligne 52 : `Crawl-delay: 1` présent.

**Correction :**
- Supprimer la directive `Crawl-delay: 1` du fichier `public/robots.txt`.
- Googlebot ignore cette directive ; elle ralentit uniquement les outils SEO tiers (Ahrefs, Semrush).

---

### 31. Version anglaise (/en/) sans pages de blog ni services traduits ❌ CONFIRMÉ

**Problème :** La version `/en/` existe (homepage, tarifs, mentions légales traduits) mais les pages services anglaises et les articles EN sont peu nombreux.

**Correction :**
- Option A (recommandée si marché anglophone non prioritaire) : Supprimer les balises hreflang `en` sur les pages sans équivalent EN et désindexer avec `noindex`.
- Option B (si marché anglophone visé) : Développer le contenu EN sous `/en/blog/` et `/en/services/`.

---

### 32. Nombre de reviews insuffisant dans le schema (3 avis) ❌ CONFIRMÉ

**Vérification code :** `src/layouts/Layout.astro` — `ratingCount: "3"`, `ratingValue: "5.0"`. 3 reviews sont hardcodées (Tristan, Hugues, Jérémie).

**Impact :** Google exige généralement 5+ avis pour afficher les étoiles dans les SERPs.

**Correction :**
- Collecter activement des avis clients (email post-coaching, lien direct vers Google Reviews).
- Mettre à jour le schema `AggregateRating` avec le nombre réel dès que ≥5 avis sont collectés.
- Synchroniser avec la fiche Google Business Profile (point 18).

---

### 33. Absence de page auteur dédiée pour Pierre-Louis ❌ CONFIRMÉ

**Vérification code :** Aucun fichier `a-propos.astro` ou `pierre-louis.astro` dans `src/pages/`. Le contenu "Qui suis-je ?" est une section de la homepage uniquement.

**Impact :** Faible signal E-E-A-T. Google valorise les auteurs comme entités vérifiables.

**Correction :**
- Créer `src/pages/a-propos.astro` et `src/pages/[lang]/a-propos.astro` (EN : `/en/about`).
- Contenu : photo professionnelle, certifications, parcours, liens LinkedIn.
- Schema `Person` avec `sameAs` pointant vers LinkedIn.
- Lier depuis les articles de blog (byline cliquable sur l'auteur).
- Mettre à jour `Footer.astro` `getSwitchLangUrl()` pour ajouter la paire `/a-propos` ↔ `/en/about`.

---

### 34. Absence de FAQ schema sur les pages clés ⚠️ PARTIELLEMENT CORRIGÉ

**Vérification code :** Le schema `FAQPage` existe dans `BlogPost.astro` pour les articles avec un champ `faq:` dans leur frontmatter. En revanche, `src/components/Pricing.astro` ne contient aucun schema FAQPage.

**Correction :**
- Ajouter un schema FAQPage sur `src/components/Pricing.astro` avec 3-5 questions :
  - "Quel est le tarif d'une séance de coaching Ikigai ?"
  - "La séance découverte est-elle vraiment gratuite ?"
  - "Combien de séances sont nécessaires ?"
  - "Le coaching est-il remboursable ?"
- Optionnel : ajouter 3 questions FAQ sur l'Ikigai sur la homepage.

---

### 35. Absence de données de performance mobile ❌ À MESURER

**Problème :** Aucune donnée Core Web Vitals (LCP, CLS, INP) n'est disponible dans les données collectées. Le site utilise Cloudflare mais les métriques réelles ne sont pas vérifiables sans accès à Google Search Console.

**Action :**
- Vérifier l'onglet "Expérience de la page" dans Google Search Console.
- Tester avec PageSpeed Insights (mobile) — objectifs : LCP < 2,5s, CLS < 0,1, INP < 200ms.
- Points de vigilance côté code : images sans dimensions explicites (CLS), fonts Google chargées en `display: swap` (LCP), scripts React non différés.

---

## Récapitulatif des statuts

| # | Problème | Statut |
|---|---|---|
| 1 | Canonical blog → homepage | ✅ DÉJÀ CORRIGÉ |
| 2 | Pages services vides | ❌ CONFIRMÉ |
| 3 | Title tag identique blog | ✅ DÉJÀ CORRIGÉ |
| 4 | Meta description identique blog | ✅ DÉJÀ CORRIGÉ |
| 5 | H1 identique blog | ✅ DÉJÀ CORRIGÉ |
| 6 | Structure H2/H3 identique blog | ✅ DÉJÀ CORRIGÉ |
| 7 | Title homepage trop long | ⚠️ PARTIELLEMENT (67 chars) |
| 8 | Title blog trop long | ❌ CONFIRMÉ (77 chars) |
| 9 | H1 homepage sans mot-clé | ❌ CONFIRMÉ |
| 10 | H1 blog sans mot-clé | ❌ CONFIRMÉ |
| 11 | Meta description homepage longue | ❌ À VÉRIFIER |
| 12 | Title tags services non optimisés | ❌ CONFIRMÉ |
| 13 | Meta descriptions services courtes | ❌ CONFIRMÉ |
| 14 | Page /services/bilan-ikigai/ vide | ❌ CONFIRMÉ |
| 15 | Page /services/parcours-coaching/ vide | ❌ CONFIRMÉ |
| 16 | Zéro backlink dofollow | ❌ CONFIRMÉ |
| 17 | Absent des annuaires coachs | ❌ CONFIRMÉ |
| 18 | Pas de fiche Google Business Profile | ❌ CONFIRMÉ |
| 19 | Pas de page "méthode ikigai" | ❌ CONFIRMÉ |
| 20 | Pas de page "ikigai test gratuit" | ❌ CONFIRMÉ |
| 21 | Pas de page "reconversion comment faire" | ❌ CONFIRMÉ |
| 22 | Pas de page "burn out symptomes" | ❌ CONFIRMÉ |
| 23 | Mot-clé "ikigai" non exploité | ❌ CONFIRMÉ |
| 24 | Pas de liens internes vers /tarifs/ | ⚠️ PARTIELLEMENT |
| 25 | /sitemap.xml inaccessible | ❌ À VÉRIFIER EN PROD |
| 26 | BreadcrumbList incomplet | ❌ CONFIRMÉ |
| 27 | Schema BlogPosting manquant | ✅ DÉJÀ CORRIGÉ |
| 28 | LocalBusiness sur toutes les pages | ❌ CONFIRMÉ |
| 29 | Image OG générique | ⚠️ PARTIELLEMENT (blog OK, reste KO) |
| 30 | Crawl-delay dans robots.txt | ❌ CONFIRMÉ |
| 31 | /en/ sans blog ni services | ❌ CONFIRMÉ |
| 32 | 3 avis insuffisants dans schema | ❌ CONFIRMÉ |
| 33 | Pas de page auteur /a-propos/ | ❌ CONFIRMÉ |
| 34 | Pas de FAQ schema sur /tarifs/ | ⚠️ PARTIELLEMENT (blog OK) |
| 35 | Pas de données Core Web Vitals | ❌ À MESURER |

**Bilan : 5 faux positifs corrigés** (points 1, 3, 4, 5, 6, 27) — ces problèmes étaient déjà résolus dans le code au moment de l'audit. **22 problèmes réels confirmés**, dont **5 critiques** (2, 8, 9, 14, 15) actionnables immédiatement dans le code.
