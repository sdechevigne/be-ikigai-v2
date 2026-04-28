// pipeline/index.js
import { collectAll } from './collect.js';
import { classifyAndScore } from './classify.js';
import { createProjectCard, pickNextTopic } from './project.js';

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

  process.stderr.write('Création/mise à jour des cartes GitHub Projects...\n');
  for (const group of scored) {
    try {
      const itemId = await createProjectCard(group);
      process.stderr.write(`  Carte : ${group.cluster.label} (${itemId || 'maj'})\n`);
    } catch (err) {
      process.stderr.write(`  Erreur carte [${group.cluster.label}]: ${err.message}\n`);
    }
  }

  process.stderr.write('Scan terminé.\n');
}

main().catch(err => {
  process.stderr.write(`Erreur fatale : ${err.message}\n`);
  process.exit(1);
});
