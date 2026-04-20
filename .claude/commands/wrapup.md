# Wrapup ANF

Fin de session : refactoring, mise à jour CLAUDE.md, commit et push sur main.

**IMPORTANT:** Exécute toutes les étapes dans l'ordre sans demander d'approbation entre les étapes.

**NOTE:** Cette commande fait un `git push origin master` en étape finale — c'est le deploy.

## Étape 1 : Refactoring

Lance la commande `/refactor` :
- Détecte les fichiers modifiés (non-commités + dernier commit)
- Lance jscpd (doublons) et knip (code mort) filtrés à ces fichiers
- Lance le skill simplify sur ces fichiers
- Commit les changements si nécessaire (`refactor: code quality cleanup`)

## Étape 2 : Mise à jour CLAUDE.md

Lance la commande `/revise-claude-md` :
- Capture les apprentissages et découvertes de la session
- Met à jour CLAUDE.md en conséquence
- Commit les changements si nécessaire

## Étape 3 : Commit final

S'il reste des fichiers modifiés non-commités après les étapes 1 et 2 :

```bash
git status
git add -A
git commit -m "chore: wrapup session"
```

## Étape 4 : Push (deploy)

```bash
git push origin master
```

## Étape 5 : Résumé

Affiche un résumé structuré :

```
## Wrapup terminé

- **Refactoring** : {ce qui a été nettoyé, ou "Aucun changement nécessaire"}
- **CLAUDE.md** : {ce qui a été mis à jour, ou "Aucune mise à jour"}
- **Push** : OK — master à jour
```
