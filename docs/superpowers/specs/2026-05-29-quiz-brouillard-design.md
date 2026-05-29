# Quiz « Dans quel brouillard es-tu ? » — Design (MVP lean)

**Date :** 2026-05-29
**Source :** `cahier-des-charges-quiz-be-ikigai.md` (v0.1)
**Périmètre validé :** MVP lean. Hors périmètre : diagnostic IA Claude, double opt-in/Brevo, pages privées tokenisées (70%), OG dynamiques, Calendly, séquences email, relance J+90.

## Objectif

Quiz de diagnostic gratuit, porte d'entrée de l'écosystème Be-ikigai. 8 questions → 1 des 4 profils de « brouillard ». Page résultat flatteuse et partageable + capture email. Les réponses sont stockées en base et consultables dans le back-office `admin`.

## Architecture (3 morceaux)

### 1. Front du quiz — `be-ikigai-landing` (Astro 6)

- **Pages Astro** (convention i18n du projet, `prefixDefaultLocale: false`) :
  - `src/pages/quiz.astro` (FR) + `src/pages/[lang]/quiz.astro` (EN) → rendent un composant partagé `src/components/Quiz.astro`.
  - Pages résultat partageables (objectif viralité) : `src/pages/quiz/resultat/[profil].astro` (FR) + `src/pages/[lang]/quiz/result/[profil].astro` (EN). `getStaticPaths` sur les 4 slugs : `cage-doree | idealiste-epuise | page-blanche | fragmente`.
- **OG images statiques** : 1 image préfabriquée par profil (PNG pour compat crawlers sociaux, cf. convention images du projet), référencées dans le `<head>` des pages résultat. Pas de génération à la volée.
- **Île React** `src/components/quiz/QuizApp.tsx` (`client:load`) :
  - 8 questions, 1 par écran, barre de progression, navigation arrière.
  - Ordre des réponses **randomisé à l'affichage**, mapping A/B/C/D mémorisé en interne.
  - **Reprise de session** : réponses persistées en `localStorage` (`bk_quiz_v1`), restaurées au montage, purgées à la complétion.
  - Scoring instantané côté client (cf. §Scoring).
  - Écran résultat : nom du brouillard, tagline, mini-portrait (2-3 phrases), **mini-diagramme SVG des 4 cercles** (forts/faibles mis en évidence), boutons de partage (WhatsApp, LinkedIn, copier le lien, Web Share API mobile) avec copy pré-rempli par profil, puis bloc capture email.
  - Bloc capture : email (requis) + prénom (optionnel) + case **consentement non précochée** + lien politique de confidentialité. POST vers l'edge function `quiz-submit`.
- **Contenu** : `src/data/quiz.ts` — source unique bilingue (`fr`/`en`) : 8 questions × 4 réponses mappées, 4 profils (slug, code A-D, nom, tagline, mini-portrait, cercles forts/faibles, copy de partage, accentColor). Pattern calqué sur `src/data/services.ts`.
- **Diagramme** : `src/components/quiz/FourCircles.tsx` (SVG), props = profil → met en évidence cercles forts/faibles.
- **Footer** : ajouter le mapping switch langue `/quiz` ↔ `/en/quiz` et `/quiz/resultat/[profil]` ↔ `/en/quiz/result/[profil]`.

### 2. Scoring (cahier §6)

- Compteurs `scoreA/B/C/D`, +1 par réponse choisie.
- Profil dominant = score max.
- Égalité stricte entre **2** profils → résultat « en transition » nommant les deux (dominant présenté en premier).
- Égalité entre **3-4** profils → fallback **C (Page Blanche)**, mention « plusieurs brouillards se mélangent ».
- Si **C domine ET scoreC ≥ 5/8** → flag `tonDoux = true` (page résultat déculpabilisante, pas d'injonction).
- Réponses brutes conservées pour analytics.
- Logique pure et testée : `src/components/quiz/scoring.ts` + tests Vitest (le projet landing n'a pas de runner ; tests unitaires de scoring portés dans `admin` n'ont pas de sens — la fonction de scoring sera testée côté landing si un runner existe, sinon validée par revue. **Décision : pas de test runner ajouté au landing ; scoring gardé en fonction pure simple et revue manuellement.**).

### 3. Capture → Supabase → admin

- **Edge function** `quiz-submit` (Supabase, projet `aeobrpxjmecbvdeqjbvc`) :
  - Reçoit `{ email, prenom?, profil, scores, reponses, consent, lang, utm? }`.
  - Valide email + consent requis. Insère dans `public.quiz_responses` via service_role (bypass RLS). CORS comme `contact-form`.
  - Fichier : `admin/supabase/functions/quiz-submit/index.ts`.
- **Table** `public.quiz_responses` :
  ```
  id            uuid pk default gen_random_uuid()
  created_at    timestamptz default now()
  email         text not null
  prenom        text
  profil        text not null      -- cage_doree | idealiste_epuise | page_blanche | fragmente | transition_XY
  scores        jsonb not null     -- { A, B, C, D }
  reponses      jsonb not null     -- [{ q, choix }]
  ton_doux      boolean default false
  consent       boolean not null default false
  consent_at    timestamptz
  lang          text default 'fr'
  source        text               -- utm / provenance
  ```
  - RLS : lecture/écriture gated par `public.is_admin()` ; insert public via service_role uniquement (l'edge function).
  - Migration miroir : `admin/supabase/migrations/20260529_quiz_responses.sql` + `..._quiz_responses_rls.sql`. Convention : préfixe `public.` partout, guard idempotent.
- **Admin** (`admin/`) : nouvelle feature `src/features/quiz/` calquée sur `leads/` :
  - `hooks.ts` (TanStack Query, `quizKeys`), `QuizListPage.tsx`, `QuizTable.tsx`, `QuizDetailPage.tsx`.
  - Route dans `src/router.tsx` + entrée `Sidebar.tsx`.
  - MAJ manuelle de `src/types/database.ts` (table `quiz_responses`).

## Données (RGPD / minimisation)

Stocké : email, prénom (option), profil, scores, réponses, consentement+timestamp, lang, source. Hébergement UE (Supabase). Pas de diagnostic IA ni token en MVP. Lien désinscription : hors périmètre MVP (pas d'envoi email automatisé).

## Déploiement

- Migration + RLS appliquées en prod via Supabase MCP/CLI (mêmes conventions que les migrations existantes — fichiers = miroir).
- Edge function `quiz-submit` déployée via `supabase functions deploy quiz-submit`.
- Front : build Astro statique habituel.

## Tracking (allégé)

Événements front a minima (si Plausible/GA présent) : `quiz_start`, `quiz_complete`, `result_view`, `share_click`, `email_submit`. Branchement complet déféré.

## Tests / vérification

- `admin` : tests Vitest pour les hooks `quiz` (mock Supabase, pattern `leads/hooks.test.ts`).
- Scoring : fonction pure, revue + cas limites (égalités, ton doux) couverts par assertions inline si runner dispo côté landing.
- Build : `npm run build` (landing) et `npm run build` (admin, inclut typecheck) doivent passer.
