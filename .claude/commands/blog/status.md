# /blog:status — Dashboard pipeline

## Étapes

1. Récupère les cartes GitHub Projects :
   ```bash
   cd pipeline && node -e "
   import('./project.js').then(m => {
     const items = m.getProjectItems();
     const byStatus = {};
     for (const item of items) {
       const status = item.fieldValues?.nodes?.find(fv => fv.field?.name === 'Status')?.name || 'Inconnu';
       byStatus[status] = (byStatus[status] || 0) + 1;
     }
     console.log(JSON.stringify(byStatus, null, 2));
   })"
   ```

2. Compte les articles locaux :
   ```bash
   echo "Drafts FR:" $(grep -rl 'status: draft' src/content/blog/ | grep '\-fr\.md' | wc -l)
   echo "Drafts EN:" $(grep -rl 'status: draft' src/content/blog/ | grep '\-en\.md' | wc -l)
   echo "Publiés FR:" $(grep -rl 'status: published' src/content/blog/ | grep '\-fr\.md' | wc -l)
   echo "Publiés EN:" $(grep -rl 'status: published' src/content/blog/ | grep '\-en\.md' | wc -l)
   ```

3. Liste les 3 articles les plus récents :
   ```bash
   ls -t src/content/blog/*.md | head -6
   ```

4. Affiche un résumé structuré :
   ```
   ## Pipeline blog be-ikigai

   ### GitHub Projects
   - Detected : N
   - Researched : N
   - Drafting : N
   - Published : N

   ### Articles locaux
   - Drafts FR : N | EN : N
   - Publiés FR : N | EN : N

   ### Derniers articles créés
   - [slug] (FR + EN)
   ```
