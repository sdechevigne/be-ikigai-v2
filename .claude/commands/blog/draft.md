# /blog:draft — Lancer le pipeline de rédaction

Récupère le prochain sujet et lance le pipeline complet.

## Étapes

1. Récupère le prochain sujet :
   ```bash
   cd pipeline && node index.js --pick
   ```

2. Affiche le sujet sélectionné (titre, cluster, type de contenu) et demande confirmation avant de continuer.

3. Lance le pipeline :
   ```bash
   LLM=gemini bash pipeline/draft.sh
   ```

4. Surveille les marqueurs de phase dans stdout :
   - `::research-done::` — Phase 1 terminée
   - `::draft-path:src/content/blog/SLUG.md::` — Article FR créé
   - `::done::` — Humanisation terminée

5. À la fin, affiche :
   - Chemin des articles créés (FR + EN)
   - Rappel : relire avant publication avec `/blog:publish`

## Reprise en cas d'échec

```bash
RESUME_SLUG=2026-04-28-mon-article-fr bash pipeline/draft.sh
```

## Dépannage

- Logs dans `pipeline/.logs/`
- Vérifier `GEMINI_API_KEY` défini dans l'environnement
- Si GitHub Projects vide : lancer d'abord `node pipeline/index.js` pour scanner les tendances
