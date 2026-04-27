# Services Mega-Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le lien "Services" dans la navbar par un mega-menu dropdown (style meschasses.com) avec 6 items et des pages placeholder dédiées.

**Architecture:** Les données des 6 features sont centralisées dans `src/data/services.ts`. La navbar utilise Tailwind `group`/`group-hover` (CSS pur, pas de JS supplémentaire) pour le dropdown desktop. Le menu mobile étend le JS inline existant avec un accordéon. Les pages FR/EN suivent le même pattern que `tarifs`/`pricing`.

**Tech Stack:** Astro 6, Tailwind CSS, TypeScript, inline JS (pattern existant navbar)

---

## File Map

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `src/data/services.ts` | Source de vérité des 6 features (slug, icône, couleur, copy FR/EN) |
| Créer | `src/components/ServicesIndex.astro` | Page récapitulative placeholder |
| Créer | `src/components/ServicesFeature.astro` | Page feature individuelle placeholder |
| Créer | `src/pages/services/index.astro` | Route FR `/services/` |
| Créer | `src/pages/services/[slug].astro` | Route FR `/services/[slug]/` |
| Créer | `src/pages/[lang]/services/index.astro` | Route EN `/en/services/` |
| Créer | `src/pages/[lang]/services/[slug].astro` | Route EN `/en/services/[slug]/` |
| Modifier | `src/components/Navbar.astro` | Mega-menu desktop + accordéon mobile |

---

### Task 1: Créer `src/data/services.ts`

**Files:**
- Create: `src/data/services.ts`

- [ ] **Step 1: Créer le fichier de données**

```typescript
// src/data/services.ts
export interface Service {
  slug: string;
  iconSvgPath: string;
  iconBg: string;
  fr: { title: string; subtitle: string };
  en: { title: string; subtitle: string };
}

export const services: Service[] = [
  {
    slug: 'bilan-ikigai',
    iconSvgPath: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z',
    iconBg: '#d1fae5',
    fr: { title: 'Bilan Ikigai', subtitle: 'Trouve ta raison d\'être profonde' },
    en: { title: 'Ikigai Assessment', subtitle: 'Find your deep reason for being' },
  },
  {
    slug: 'parcours-coaching',
    iconSvgPath: 'M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.72L13 18v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95zM11 2.05C5.95 2.55 2 6.82 2 12c0 3.76 2.09 7.07 5.22 8.78L6 22h5v-5l-2.28 1.72C6.81 17.01 5 14.21 5 12c0-4.08 3.05-7.44 7-7.93V2.05z',
    iconBg: '#fef3c7',
    fr: { title: 'Parcours coaching', subtitle: 'Accompagnement personnalisé en 3 phases' },
    en: { title: 'Coaching journey', subtitle: 'Personalised 3-phase accompaniment' },
  },
  {
    slug: 'bilan-famille',
    iconSvgPath: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    iconBg: '#ede9fe',
    fr: { title: 'Bilan famille', subtitle: 'Harmonie et liens familiaux renforcés' },
    en: { title: 'Family bond', subtitle: 'Harmony and stronger family ties' },
  },
  {
    slug: 'musique-bien-etre',
    iconSvgPath: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    iconBg: '#fce7f3',
    fr: { title: 'Musique & bien-être', subtitle: 'Sons et fréquences pour l\'équilibre' },
    en: { title: 'Music & wellbeing', subtitle: 'Sounds and frequencies for balance' },
  },
  {
    slug: 'ateliers-groupe',
    iconSvgPath: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    iconBg: '#ffedd5',
    fr: { title: 'Ateliers groupe', subtitle: 'Sessions collectives et dynamiques' },
    en: { title: 'Group workshops', subtitle: 'Collective and dynamic sessions' },
  },
  {
    slug: 'ressources-outils',
    iconSvgPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    iconBg: '#dbeafe',
    fr: { title: 'Ressources & outils', subtitle: 'Guides, exercices et méditations' },
    en: { title: 'Resources & tools', subtitle: 'Guides, exercises and meditations' },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/data/services.ts
git commit -m "feat: add services data file with 6 placeholder features"
```

---

### Task 2: Créer les composants placeholder

**Files:**
- Create: `src/components/ServicesIndex.astro`
- Create: `src/components/ServicesFeature.astro`

- [ ] **Step 1: Créer `ServicesIndex.astro`**

```astro
---
// src/components/ServicesIndex.astro
import Layout from '../layouts/Layout.astro';
import Navbar from './Navbar.astro';
import Footer from './Footer.astro';
import BookingModal from './BookingModal.astro';
import { getLangFromUrl } from '../i18n/utils';
import { services } from '../data/services';

const lang = getLangFromUrl(Astro.url);
const isFR = lang === 'fr';

const pageTitle = isFR ? 'Nos services | be-ikigai' : 'Our services | be-ikigai';
const pageDesc = isFR
  ? 'Découvrez tous les services be-ikigai : bilan Ikigai, coaching, ateliers et plus.'
  : 'Discover all be-ikigai services: Ikigai assessment, coaching, workshops and more.';

const servicesBaseUrl = isFR ? '/services/' : `/${lang}/services/`;
---

<Layout title={pageTitle} description={pageDesc} lang={lang}>
  <Navbar lang={lang} transparent={false} />
  <main class="pt-24 min-h-screen bg-beige-chaleureux">
    <div class="container mx-auto px-6 py-16 max-w-4xl">
      <h1 class="text-4xl font-comfortaa font-bold text-bleu-crepuscule mb-4">
        {isFR ? 'Nos services' : 'Our services'}
      </h1>
      <p class="text-gray-600 mb-12 text-lg">
        {isFR
          ? 'Tous les accompagnements be-ikigai pour trouver ta voie et t\'épanouir.'
          : 'All be-ikigai accompaniments to find your path and flourish.'}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {services.map((service) => {
          const copy = lang === 'fr' ? service.fr : service.en;
          return (
            <a
              href={`${servicesBaseUrl}${service.slug}/`}
              class="flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <span
                class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={`background-color: ${service.iconBg}`}
              >
                <svg class="w-6 h-6 text-bleu-crepuscule" viewBox="0 0 24 24" fill="currentColor">
                  <path d={service.iconSvgPath} />
                </svg>
              </span>
              <div>
                <p class="font-semibold text-bleu-crepuscule">{copy.title}</p>
                <p class="text-sm text-gray-500 mt-0.5">{copy.subtitle}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  </main>
  <Footer lang={lang} />
  <BookingModal lang={lang} />
</Layout>
```

- [ ] **Step 2: Créer `ServicesFeature.astro`**

```astro
---
// src/components/ServicesFeature.astro
import Layout from '../layouts/Layout.astro';
import Navbar from './Navbar.astro';
import Footer from './Footer.astro';
import BookingModal from './BookingModal.astro';
import { getLangFromUrl } from '../i18n/utils';
import { services } from '../data/services';

const lang = getLangFromUrl(Astro.url);
const { slug } = Astro.params as { slug: string };

const service = services.find((s) => s.slug === slug);
if (!service) return Astro.redirect('/404');

const copy = lang === 'fr' ? service.fr : service.en;
const pageTitle = `${copy.title} | be-ikigai`;
const pageDesc = copy.subtitle;
---

<Layout title={pageTitle} description={pageDesc} lang={lang}>
  <Navbar lang={lang} transparent={false} />
  <main class="pt-24 min-h-screen bg-beige-chaleureux">
    <div class="container mx-auto px-6 py-16 max-w-3xl">
      <div class="flex items-center gap-4 mb-8">
        <span
          class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={`background-color: ${service.iconBg}`}
        >
          <svg class="w-7 h-7 text-bleu-crepuscule" viewBox="0 0 24 24" fill="currentColor">
            <path d={service.iconSvgPath} />
          </svg>
        </span>
        <div>
          <h1 class="text-3xl font-comfortaa font-bold text-bleu-crepuscule">{copy.title}</h1>
          <p class="text-gray-500 mt-1">{copy.subtitle}</p>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-8 shadow-sm text-gray-400 italic text-center">
        {lang === 'fr' ? 'Contenu à venir…' : 'Content coming soon…'}
      </div>
    </div>
  </main>
  <Footer lang={lang} />
  <BookingModal lang={lang} />
</Layout>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ServicesIndex.astro src/components/ServicesFeature.astro
git commit -m "feat: add ServicesIndex and ServicesFeature placeholder components"
```

---

### Task 3: Créer les routes de pages

**Files:**
- Create: `src/pages/services/index.astro`
- Create: `src/pages/services/[slug].astro`
- Create: `src/pages/[lang]/services/index.astro`
- Create: `src/pages/[lang]/services/[slug].astro`

- [ ] **Step 1: Créer `src/pages/services/index.astro`**

```astro
---
import ServicesIndex from '../../components/ServicesIndex.astro';
---
<ServicesIndex />
```

- [ ] **Step 2: Créer `src/pages/services/[slug].astro`**

```astro
---
import ServicesFeature from '../../components/ServicesFeature.astro';
import { services } from '../../data/services';

export function getStaticPaths() {
  return services.map((s) => ({ params: { slug: s.slug } }));
}
---
<ServicesFeature />
```

- [ ] **Step 3: Créer `src/pages/[lang]/services/index.astro`**

```astro
---
import ServicesIndex from '../../../components/ServicesIndex.astro';

export function getStaticPaths() {
  return [{ params: { lang: 'en' } }];
}
---
<ServicesIndex />
```

- [ ] **Step 4: Créer `src/pages/[lang]/services/[slug].astro`**

```astro
---
import ServicesFeature from '../../../components/ServicesFeature.astro';
import { services } from '../../../data/services';

export function getStaticPaths() {
  return services.map((s) => ({ params: { lang: 'en', slug: s.slug } }));
}
---
<ServicesFeature />
```

- [ ] **Step 5: Vérifier que le build passe**

```bash
npm run build
```

Expected : build réussi sans erreur. Si une erreur "Cannot find module", vérifier les chemins d'import relatifs.

- [ ] **Step 6: Commit**

```bash
git add src/pages/services/ src/pages/[lang]/services/
git commit -m "feat: add services pages routes (FR and EN)"
```

---

### Task 4: Modifier Navbar.astro — mega-menu desktop

**Files:**
- Modify: `src/components/Navbar.astro`

- [ ] **Step 1: Calculer les URLs services en haut du frontmatter**

Ouvrir `src/components/Navbar.astro`. Après la ligne `const pricingUrl = ...`, ajouter :

```astro
const servicesUrl = lang === 'fr' ? '/services/' : `/${lang}/services/`;
```

- [ ] **Step 2: Remplacer le lien Services desktop**

Localiser dans le menu desktop (ligne ~55) :
```astro
<a href={`${homeUrl}#solution`} class="nav-text font-comfortaa font-semibold hover:text-dore-serein transition-colors drop-shadow-md tracking-wide">
  Services
</a>
```

Remplacer par le mega-menu complet :

```astro
<!-- Mega-menu Services -->
<div class="group relative">
  <!-- Trigger -->
  <button
    type="button"
    class="flex items-center gap-1 nav-text font-comfortaa font-semibold hover:text-dore-serein transition-colors drop-shadow-md tracking-wide"
  >
    Services
    <svg
      class="w-4 h-4 transition-transform duration-150 group-hover:rotate-180"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Dropdown panel -->
  <div
    class="absolute left-0 top-full pt-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-150 ease-out z-50"
  >
    <div class="bg-white rounded-2xl shadow-xl p-4 w-[520px]">
      <!-- Grid 2 cols x 3 rows -->
      <div class="grid grid-cols-2 gap-1" id="services-menu-grid">
      </div>

      <!-- Footer -->
      <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between px-2">
        <span class="text-xs text-gray-400">Web · iOS · Android</span>
        <a
          href={servicesUrl}
          class="text-sm font-semibold text-[#9333ea] hover:underline flex items-center gap-1"
        >
          {lang === 'fr' ? 'Tous les services' : 'All services'}
          <span aria-hidden="true">›</span>
        </a>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Importer et rendre les items via un script inline Astro**

Juste après la fermeture du `<div class="hidden lg:flex ...">` du menu desktop, mais avant la balise `</nav>`, ajouter ce bloc Astro pour injecter les items dans la grille (cela évite de dupliquer le template item dans le HTML) :

En réalité, pour un composant Astro statique, le plus simple est de rendre les items directement dans le template. Remplacer `<div class="grid grid-cols-2 gap-1" id="services-menu-grid"></div>` par :

```astro
<div class="grid grid-cols-2 gap-1">
  {services.map((service) => {
    const copy = lang === 'fr' ? service.fr : service.en;
    const href = `${servicesUrl}${service.slug}/`;
    return (
      <a
        href={href}
        class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <span
          class="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={`background-color: ${service.iconBg}`}
        >
          <svg class="w-5 h-5 text-bleu-crepuscule" viewBox="0 0 24 24" fill="currentColor">
            <path d={service.iconSvgPath} />
          </svg>
        </span>
        <span class="flex flex-col">
          <span class="text-sm font-semibold text-bleu-crepuscule leading-tight">{copy.title}</span>
          <span class="text-xs text-gray-500 mt-0.5 leading-snug">{copy.subtitle}</span>
        </span>
      </a>
    );
  })}
</div>
```

- [ ] **Step 4: Ajouter l'import services dans le frontmatter**

En haut du frontmatter de `Navbar.astro`, après les imports existants :

```astro
import { services } from '../data/services';
```

- [ ] **Step 5: Vérifier visuellement en dev**

```bash
npm run dev
```

Ouvrir `http://localhost:4321`. Survoler "Services" dans la navbar → le dropdown doit apparaître avec la grille 2×3. Vérifier que le menu reste ouvert quand la souris glisse du trigger vers les items.

- [ ] **Step 6: Commit**

```bash
git add src/components/Navbar.astro
git commit -m "feat: add services mega-menu dropdown (desktop, CSS-only hover)"
```

---

### Task 5: Modifier Navbar.astro — accordéon mobile

**Files:**
- Modify: `src/components/Navbar.astro`

- [ ] **Step 1: Remplacer le lien Services dans le menu mobile**

Localiser dans le menu mobile (ligne ~89) :
```astro
<a href={`${homeUrl}#solution`} class="mobile-link text-white text-2xl font-comfortaa font-semibold hover:text-dore-serein py-4 min-w-[48px] min-h-[48px] transition-colors w-full border-b border-white/10">
  Services
</a>
```

Remplacer par :

```astro
<!-- Accordéon mobile Services -->
<div class="w-full border-b border-white/10">
  <button
    id="mobile-services-toggle"
    class="flex items-center justify-between w-full text-white text-2xl font-comfortaa font-semibold hover:text-dore-serein py-4 min-h-[48px] transition-colors"
  >
    Services
    <svg
      id="mobile-services-chevron"
      class="w-5 h-5 transition-transform duration-200"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  <div id="mobile-services-list" class="hidden flex-col gap-0 pb-2">
    {services.map((service) => {
      const copy = lang === 'fr' ? service.fr : service.en;
      const href = `${servicesUrl}${service.slug}/`;
      return (
        <a
          href={href}
          class="mobile-link text-white/80 text-lg font-comfortaa py-2 pl-4 hover:text-dore-serein transition-colors block"
        >
          {copy.title}
        </a>
      );
    })}
    <a
      href={servicesUrl}
      class="mobile-link text-[#c084fc] text-base font-comfortaa font-semibold py-2 pl-4 hover:text-dore-serein transition-colors block"
    >
      {lang === 'fr' ? 'Tous les services →' : 'All services →'}
    </a>
  </div>
</div>
```

- [ ] **Step 2: Ajouter le JS de l'accordéon dans le bloc `<script>` existant**

Dans le `<script>` existant de Navbar.astro, après la ligne `mobileLinks.forEach(...)`, ajouter :

```js
const mobileServicesToggle = document.getElementById('mobile-services-toggle');
const mobileServicesList = document.getElementById('mobile-services-list');
const mobileServicesChevron = document.getElementById('mobile-services-chevron');

mobileServicesToggle?.addEventListener('click', () => {
  const isOpen = !mobileServicesList?.classList.contains('hidden');
  if (isOpen) {
    mobileServicesList?.classList.add('hidden');
    mobileServicesList?.classList.remove('flex');
    mobileServicesChevron?.classList.remove('rotate-180');
  } else {
    mobileServicesList?.classList.remove('hidden');
    mobileServicesList?.classList.add('flex');
    mobileServicesChevron?.classList.add('rotate-180');
  }
});
```

- [ ] **Step 3: Vérifier visuellement sur mobile en dev**

```bash
npm run dev
```

Ouvrir `http://localhost:4321` sur une fenêtre <1024px (ou DevTools mobile). Ouvrir le menu hamburger → "Services" doit afficher un chevron. Cliquer → la liste des 6 features se déplie. Cliquer sur un item → navigue vers la page feature.

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.astro
git commit -m "feat: add services accordion in mobile menu"
```

---

### Task 6: Vérification finale

**Files:** aucune modification

- [ ] **Step 1: Build de production**

```bash
npm run build
```

Expected : `dist/` généré sans erreur. Vérifier dans la sortie que les routes suivantes existent :
- `dist/services/index.html`
- `dist/services/bilan-ikigai/index.html`
- `dist/en/services/index.html`
- `dist/en/services/bilan-ikigai/index.html`
(et ainsi de suite pour les 5 autres slugs)

- [ ] **Step 2: Preview production**

```bash
npm run preview
```

Tester :
1. Desktop : hover "Services" → dropdown avec 6 items en grille 2×3 ✓
2. Desktop : cliquer un item → page feature placeholder ✓
3. Desktop : cliquer "Tous les services" → page index placeholder ✓
4. Mobile : menu hamburger → "Services" accordéon fonctionne ✓
5. Route EN : `http://localhost:4321/en/` → même mega-menu en anglais ✓

- [ ] **Step 3: Type-check**

```bash
npm run astro check
```

Expected : aucune erreur TypeScript.

- [ ] **Step 4: Commit final si tout passe**

```bash
git add -A
git commit -m "chore: services mega-menu — final verification pass"
```
