# Refactor ANF

Refactoring scopé aux fichiers modifiés dans la session courante : fichiers non-commités + fichiers du dernier commit.

**IMPORTANT:** Exécute toutes les étapes dans l'ordre sans demander d'approbation entre les étapes.

## Étape 1 : Détecter les fichiers concernés

Récupère les fichiers non-commités et ceux du dernier commit, filtrés aux extensions `.astro`, `.ts`, `.tsx`, `.mjs`, `.css` :

```bash
# Fichiers non-commités
git diff HEAD --name-only

# Fichiers du dernier commit
git diff HEAD~1 HEAD --name-only
```

Dédoublonne les deux listes. Filtre pour ne garder que les fichiers existants (pas les fichiers supprimés).

Si aucun fichier trouvé, affiche "Aucun fichier à refactoriser." et arrête.

## Étape 2 : Détecter les doublons avec jscpd

Lance jscpd sur le répertoire `src/` :

```bash
npx jscpd src/ --min-lines 5 --reporters console
```

Ne rapporte que les doublons qui impliquent **au moins un fichier de la liste détectée à l'étape 1**. Ignore les doublons entre fichiers qui n'ont pas été touchés.

Si aucun doublon pertinent, passe à l'étape suivante.

Pour chaque doublon trouvé dans un fichier modifié : extraire vers un utilitaire partagé ou composant, en suivant les patterns existants du projet (`src/lib/`, `src/components/`, `src/i18n/`).

## Étape 3 : Détecter le code mort avec knip

```bash
npx knip --reporter compact 2>/dev/null
```

Filtre la sortie pour ne garder que les problèmes dans les fichiers de la liste de l'étape 1. Ignore tout le reste.

Types de problèmes à corriger dans les fichiers modifiés :
- **Exports inutilisés** : supprimer l'export (ou le symbole si vraiment inutile)
- **Imports inutilisés** : supprimer l'import
- **Fichiers non référencés** ajoutés dans cette session : supprimer

Ne touche **jamais** aux fichiers qui ne sont pas dans la liste de l'étape 1.

## Étape 4 : Simplifier le code

Lance le skill `simplify` en lui passant la liste des fichiers changés comme contexte, pour qu'il ne simplifie que ces fichiers.

## Étape 5 : Commit si des changements ont été faits

Si des modifications ont été apportées aux étapes 2, 3 ou 4 :

```bash
git add -A
git commit -m "refactor: code quality cleanup"
```

Si aucune modification : affiche "Code propre — aucun refactoring nécessaire." et arrête.
