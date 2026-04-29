#!/usr/bin/env node
/**
 * distill-client.js
 *
 * Lit un rapport client (PDF/DOCX/TXT) et en extrait via Gemini API
 * les éléments utiles pour la rédaction d'articles : situations vécues,
 * formulations distinctives, blocages, archétypes, verbatims.
 * Le résultat est appendé dans pipeline/context/client-examples.md.
 *
 * Usage :
 *   node pipeline/scripts/distill-client.js <fichier>
 *   node pipeline/scripts/distill-client.js pipeline/clients/rapport-marie.pdf
 *   node pipeline/scripts/distill-client.js --all          # traite tous les nouveaux fichiers dans pipeline/clients/
 *   node pipeline/scripts/distill-client.js --list         # liste les fichiers déjà traités
 *
 * Variables d'environnement requises :
 *   GEMINI_API_KEY
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIPELINE_DIR = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(PIPELINE_DIR, 'clients');
const OUTPUT_FILE = path.join(PIPELINE_DIR, 'context', 'client-examples.md');
const INDEX_FILE = path.join(PIPELINE_DIR, 'work', 'client-index.json');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERREUR : GEMINI_API_KEY non défini');
  process.exit(1);
}

// gemini-2.5-flash : suffisant pour l'extraction, 4x moins cher que pro
const MODEL = 'gemini-2.5-flash';

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md'];

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain',
  '.md': 'text/plain',
};

// ─── Prompt d'extraction ──────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `Tu reçois un rapport de coaching d'un client Be-Ikigai.

Ton objectif : extraire les éléments utiles pour rédiger des articles de blog crédibles et humains.
ANONYMISATION STRICTE : remplace tout prénom/nom par un prénom fictif cohérent (ex: "Sophie", "Marc"), toute entreprise par un secteur générique (ex: "une grande banque", "une PME industrielle"), toute ville identifiable par "une grande ville".

Extrais et structure en Markdown les sections suivantes (omet les sections vides) :

## Profil anonymisé
- Âge approximatif (tranche : "début 30s", "milieu 40s")
- Secteur professionnel (générique)
- Situation de départ (1-2 phrases : ce qui l'a amené au coaching)
- Archétype Be-Ikigai identifié (si applicable : Cage Dorée, Idéaliste Épuisé, Fragmenté, etc.)

## Formulations verbatim (anonymisées)
Citations directes ou quasi-directes du client, reformulées pour anonymisation.
Maximum 5 citations, entre guillemets français, qui sonnent vrai et pourraient figurer dans un article.
Privilégier les formulations surprenantes, imagées ou révélatrices.

## Situation / blocage central
Description en 3-5 phrases du blocage principal : ce que le client ressentait, pourquoi il était bloqué, ce qui l'empêchait d'avancer.

## Déclic ou prise de conscience
Le moment charnière du coaching : qu'est-ce qui a changé ? Quelle question, quel exercice, quelle réalisation a provoqué le tournant ?

## Résultat ou direction trouvée
Où en est le client après le coaching ? Pas forcément une reconversion spectaculaire — peut être une micro-clarté, une décision, un premier pas.

## Tags thématiques
Liste de 3-6 mots-clés (clusters Be-Ikigai) pertinents pour cet exemple :
ex: reconversion, cage-dorée, sens-au-travail, burn-out, ikigai, coaching

---

Format de sortie : Markdown pur, sans introduction ni conclusion. Commence directement par "## Profil anonymisé".`;

// ─── Helpers HTTP ─────────────────────────────────────────────────────────────

function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    const fileBytes = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';

    const boundary = `---boundary${Date.now()}`;
    const meta = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ file: { display_name: fileName } })}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const end = `\r\n--${boundary}--`;

    const metaBytes = Buffer.from(meta, 'utf8');
    const filePartBytes = Buffer.from(filePart, 'utf8');
    const endBytes = Buffer.from(end, 'utf8');
    const totalLength = metaBytes.length + filePartBytes.length + fileBytes.length + endBytes.length;

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/upload/v1beta/files?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': totalLength,
        'X-Goog-Upload-Protocol': 'multipart',
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Upload échoué (${res.statusCode}) : ${raw}`));
          }
        } catch {
          reject(new Error(`Réponse non-JSON (${res.statusCode}) : ${raw}`));
        }
      });
    });

    req.on('error', reject);
    req.write(metaBytes);
    req.write(filePartBytes);
    req.write(fileBytes);
    req.write(endBytes);
    req.end();
  });
}

function generateContent(fileUri, mimeType) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { file_data: { mime_type: mimeType, file_uri: fileUri } },
          { text: EXTRACTION_PROMPT },
        ],
      }],
      generation_config: {
        temperature: 0.3,
        max_output_tokens: 8192,
      },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Génération échouée (${res.statusCode}) : ${raw}`));
          }
        } catch {
          reject(new Error(`Réponse non-JSON (${res.statusCode}) : ${raw}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Index des fichiers traités ───────────────────────────────────────────────

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveIndex(index) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
}

function fileHash(filePath) {
  const stat = fs.statSync(filePath);
  return `${stat.size}-${stat.mtimeMs}`;
}

// ─── Append dans client-examples.md ──────────────────────────────────────────

function appendToOutput(fileName, extraction) {
  const separator = `\n---\n\n<!-- Source : ${fileName} — distillé le ${new Date().toISOString().slice(0, 10)} -->\n\n`;
  const content = fs.readFileSync(OUTPUT_FILE, 'utf8');

  // Insérer avant le commentaire de fermeture ou en fin de fichier
  const insertMarker = '<!-- ENTRIES -->';
  if (content.includes(insertMarker)) {
    const updated = content.replace(insertMarker, `${insertMarker}${separator}${extraction}`);
    fs.writeFileSync(OUTPUT_FILE, updated, 'utf8');
  } else {
    fs.appendFileSync(OUTPUT_FILE, `${separator}${extraction}\n`, 'utf8');
  }
}

// ─── Traitement d'un fichier ──────────────────────────────────────────────────

async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    console.error(`Format non supporté : ${ext} (supportés : ${SUPPORTED_EXTENSIONS.join(', ')})`);
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Fichier introuvable : ${filePath}`);
    process.exit(1);
  }

  const index = loadIndex();
  const hash = fileHash(filePath);

  if (index[fileName]?.hash === hash) {
    console.log(`⏭️  Déjà traité : ${fileName} (utiliser --force pour retraiter)`);
    return false;
  }

  const sizeMb = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
  console.log(`📄 Traitement : ${fileName} (${sizeMb} Mo)`);

  // 1. Upload
  console.log('   📤 Upload vers Gemini File API...');
  const uploadRes = await uploadFile(filePath);
  const fileUri = uploadRes.file?.uri;
  const mimeType = uploadRes.file?.mimeType || MIME_MAP[ext];

  if (!fileUri) {
    throw new Error(`Upload échoué — réponse : ${JSON.stringify(uploadRes)}`);
  }
  console.log(`   ✓ Uploadé : ${fileUri}`);

  // 2. Extraction
  console.log('   🤖 Extraction par Gemini...');
  const genRes = await generateContent(fileUri, mimeType);
  const extraction = genRes.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!extraction) {
    throw new Error(`Extraction vide — réponse : ${JSON.stringify(genRes)}`);
  }

  // 3. Append
  appendToOutput(fileName, extraction);
  console.log(`   ✓ Ajouté dans client-examples.md`);

  // 4. Mettre à jour l'index
  index[fileName] = {
    hash,
    processedAt: new Date().toISOString(),
    filePath: path.relative(path.join(__dirname, '..'), filePath),
  };
  saveIndex(index);

  // Tokens utilisés
  const usage = genRes.usageMetadata;
  if (usage) {
    console.log(`   Tokens : ${usage.promptTokenCount} input / ${usage.candidatesTokenCount} output`);
  }

  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const index = loadIndex();
    const entries = Object.entries(index);
    if (entries.length === 0) {
      console.log('Aucun rapport traité.');
    } else {
      console.log(`${entries.length} rapport(s) distillé(s) :\n`);
      for (const [name, info] of entries) {
        console.log(`  ✓ ${name} — ${info.processedAt.slice(0, 10)}`);
      }
    }
    return;
  }

  const forceReprocess = args.includes('--force');
  if (forceReprocess) {
    // En mode --force, vider l'index pour retraiter
    const targetArgs = args.filter(a => !a.startsWith('--'));
    if (targetArgs.length > 0) {
      const index = loadIndex();
      for (const a of targetArgs) {
        delete index[path.basename(a)];
      }
      saveIndex(index);
    }
  }

  if (args.includes('--all')) {
    // Traiter tous les fichiers dans pipeline/clients/
    if (!fs.existsSync(CLIENTS_DIR)) {
      fs.mkdirSync(CLIENTS_DIR, { recursive: true });
      console.log(`Dossier créé : pipeline/clients/`);
      console.log('Ajoute des rapports dans ce dossier puis relance.');
      return;
    }

    const files = fs.readdirSync(CLIENTS_DIR)
      .filter(f => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .map(f => path.join(CLIENTS_DIR, f));

    if (files.length === 0) {
      console.log('Aucun fichier dans pipeline/clients/');
      return;
    }

    console.log(`${files.length} fichier(s) trouvé(s) dans pipeline/clients/\n`);
    let processed = 0;
    for (const f of files) {
      const didProcess = await processFile(f);
      if (didProcess) processed++;
    }
    console.log(`\n✅ ${processed} nouveau(x) rapport(s) distillé(s).`);
    return;
  }

  // Fichier unique
  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    console.log(`Usage :
  node pipeline/distill-client.js <fichier>      Distiller un rapport
  node pipeline/distill-client.js --all          Distiller tous les nouveaux fichiers dans pipeline/clients/
  node pipeline/distill-client.js --list         Lister les rapports déjà traités
  node pipeline/distill-client.js --force <f>    Retraiter un fichier déjà distillé`);
    process.exit(1);
  }

  await processFile(path.resolve(filePath));
  console.log('\n✅ Distillation terminée.');
}

main().catch((err) => {
  console.error('ERREUR FATALE :', err.message);
  process.exit(1);
});
