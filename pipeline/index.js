// pipeline/index.js
import { collectAll } from './collect.js';
import { classifyAndScore, suggestArticleTitles } from './classify.js';
import { createArticleCard, createProjectCard, pickNextTopic } from './project.js';

const isDryRun = process.argv.includes('--dry-run');
const isPick = process.argv.includes('--pick');

async function main() {
  if (isPick) {
    const topic = await pickNextTopic();
    if (!topic) {
      process.stderr.write('Aucun sujet disponible.\n');
      process.exit(0);
    }
    process.stdout.write(JSON.stringify(topic));
    process.exit(0);
  }

  process.stderr.write('Collecte des sources...\n');
  const { items, trendScores, risingQueries } = await collectAll();
  process.stderr.write(`Items collectés : ${items.length}\n`);

  process.stderr.write('Classification et scoring...\n');
  const scored = classifyAndScore(items, trendScores, risingQueries);
  process.stderr.write(`Clusters au-dessus du seuil : ${scored.length}\n`);

  if (scored.length === 0) {
    process.stderr.write('Aucun cluster au-dessus du seuil.\n');
    return;
  }

  for (const group of scored) {
    process.stderr.write(
      `  ${group.cluster.label} — score ${group.score} (${group.itemCount} articles, trend ${group.trendScore})\n`
    );
  }

  if (isDryRun) {
    process.stderr.write('[DRY RUN] Pas de modification GitHub.\n');
    return;
  }

  process.stderr.write('Création des cartes article GitHub Projects...\n');
  for (const group of scored) {
    const titles = suggestArticleTitles(group);
    for (const title of titles) {
      try {
        const itemId = await createArticleCard(title, group);
        process.stderr.write(`  Article [${group.cluster.label}] : ${title.slice(0, 60)} (${itemId || 'existe'})\n`);
      } catch (err) {
        process.stderr.write(`  Erreur carte [${group.cluster.label}] "${title.slice(0, 40)}": ${err.message}\n`);
      }
    }
  }

  process.stderr.write('Scan terminé.\n');
}

main().catch(err => {
  process.stderr.write(`Erreur fatale : ${err.message}\n`);
  process.exit(1);
});
