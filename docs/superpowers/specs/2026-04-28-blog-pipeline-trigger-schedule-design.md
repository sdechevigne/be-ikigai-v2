# Design : Déclenchement manuel + calendrier automatique du pipeline blog

Date : 2026-04-28

## Contexte

Le pipeline blog be-ikigai génère des articles en 3 phases (recherche → rédaction FR+EN → humanisation) via GitHub Actions. Aujourd'hui :
- `blog-trend-scan.yml` détecte des sujets et crée des cards GitHub Projects (statut `Detected`)
- `blog-draft.yml` rédige le prochain article en mode auto, ou reprend un slug existant
- `blog-publish.yml` bascule `status: draft → published` sur un slug donné — déclenché manuellement

**Besoins identifiés :**
1. Déclencher un draft depuis une idée libre (titre, texte, extrait) sans passer par l'UI GitHub Actions
2. Publier automatiquement 2 articles/semaine, avec fallback sur les tendances si le backlog est vide

---

## Composant 1 — `pipeline/trigger-draft.sh`

Script local (exécuté depuis le poste de dev) pour déclencher `blog-draft.yml` depuis la CLI.

### Usage

```bash
# Depuis une idée libre
bash pipeline/trigger-draft.sh "L'ikigai et le burnout : comment retrouver son équilibre"

# Depuis un fichier ou un long texte (stdin)
cat mon-idee.txt | bash pipeline/trigger-draft.sh

# Mode auto (pique la prochaine card GitHub Projects en Detected)
bash pipeline/trigger-draft.sh

# Reprendre un draft en cours
RESUME_SLUG=2026-04-28-ikigai-burnout-fr bash pipeline/trigger-draft.sh
```

### Comportement

- Si `RESUME_SLUG` est défini → passe `-f resume_slug=$RESUME_SLUG` à `gh workflow run`, ignore l'argument texte
- Si un argument positionnel ou stdin est fourni → passe `-f free_text="..."` à `gh workflow run`
- Sinon → déclenche sans input (mode auto)
- Affiche l'URL du run lancé via `gh run list` après le trigger

### Dépendances

- `gh` CLI authentifié avec accès `sdechevigne/be-ikigai-v2`
- Repo : `sdechevigne/be-ikigai-v2`
- Workflow : `blog-draft.yml`

---

## Composant 2 — Modification `blog-draft.yml`

Ajout d'un input `workflow_dispatch` :

```yaml
free_text:
  description: "Idée, titre ou extrait d'article (texte libre)"
  required: false
  default: ''
```

Le job expose `FREE_TEXT: ${{ inputs.free_text }}` comme variable d'environnement dans le step `Run draft pipeline`.

---

## Composant 3 — Modification `draft.sh`

En début de script, après la section "Mode reprise", ajouter un **mode texte libre** :

```
si FREE_TEXT est défini et non vide :
  écrire FREE_TEXT dans pipeline/card-body.md
  forcer DRAFT_FROM_URL=true
```

Priorité des modes (du plus au moins prioritaire) :
1. `RESUME_SLUG` → mode reprise (inchangé)
2. `FREE_TEXT` → mode texte libre (nouveau)
3. `DRAFT_FROM_URL=true` + `card-body.md` existant → mode URL (inchangé)
4. Mode auto → `node index.js --pick` (inchangé)

Le contenu de `card-body.md` en mode texte libre est le texte brut tel quel. La phase 1 (recherche LLM) est conçue pour structurer des sujets vagues — pas besoin de pré-traitement.

---

## Composant 4 — `blog-schedule.yml` (nouveau workflow)

Workflow cron qui maintient le rythme de 2 publications/semaine et remplit le backlog si vide.

### Déclencheurs

```yaml
on:
  schedule:
    - cron: '0 8 * * 1'   # Lundi 08h00 UTC
    - cron: '0 8 * * 4'   # Jeudi 08h00 UTC
  workflow_dispatch: {}    # Déclenchement manuel possible
```

### Logique

```
1. Lister tous les fichiers src/content/blog/*-fr.md avec status: draft
2. Trier par publishedAt croissant
3. Trouver le premier dont publishedAt <= aujourd'hui
   - Trouvé → déclencher blog-publish.yml avec ce slug
   - Non trouvé → déclencher blog-draft.yml sans input (mode auto)
4. Fin
```

Le workflow ne publie qu'**un seul article par run**. Deux runs/semaine = deux publications max.

### Implémentation

- Scan des fichiers `.md` via `grep` + `python3` (déjà disponibles dans le runner ubuntu)
- Déclenchement des sous-workflows via `gh workflow run` (nécessite `GH_TOKEN: ${{ secrets.GH_PAT }}`)
- Pas de création de card GitHub Projects — le mode auto de `blog-draft.yml` s'en charge

### Secrets requis

Identiques aux autres workflows : `GH_PAT` suffit (déjà présent).

---

## Ce qui ne change pas

- `blog-trend-scan.yml` — inchangé, continue à créer les cards
- `blog-publish.yml` — inchangé, toujours utilisable manuellement
- GitHub Projects — reste le tableau de bord éditorial (Kanban par statut, tri par score)
- Contrôle éditorial via `publishedAt` dans le frontmatter — retarder = changer la date

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `pipeline/trigger-draft.sh` | Nouveau |
| `.github/workflows/blog-draft.yml` | Modifier — ajout input `free_text` |
| `pipeline/draft.sh` | Modifier — mode `FREE_TEXT` |
| `.github/workflows/blog-schedule.yml` | Nouveau |
