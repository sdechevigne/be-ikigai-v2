#!/usr/bin/env node
/**
 * setup-book-cache.js
 *
 * Upload le livre (PDF ou DOCX) + les rapports clients (optionnel) vers
 * l'API Gemini File API, puis crée un cachedContent persistant.
 * Le cache ID est sauvegardé dans pipeline/gemini-cache.json pour draft.sh.
 *
 * Usage :
 *   node pipeline/setup-book-cache.js
 *   node pipeline/setup-book-cache.js --force    # recrée même si cache valide
 *   node pipeline/setup-book-cache.js --check    # vérifie validité sans recréer
 *
 * Variables d'environnement requises :
 *   GEMINI_API_KEY
 *
 * Fichiers sources configurables ci-dessous (BOOK_PATH, REPORTS_DIR).
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(__dirname, 'gemini-cache.json');

// Fichiers sources — adapter si le nom ou l'emplacement change
const BOOK_PATH = path.join(REPO_ROOT, 'livre-be-ikigai-sans-chap-10 (1).docx');
const REPORTS_DIR = null; // ex: path.join(REPO_ROOT, 'rapports-clients') — null = désactivé

// Modèle : doit supporter le context caching
// gemini-2.5-pro ou gemini-2.5-flash (plus économique)
const MODEL = 'models/gemini-2.5-flash-preview-04-17';

// TTL du cache : 7 jours (604800s). Min = 60s, max = pas de limite documentée.
const TTL = '604800s';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERREUR : GEMINI_API_KEY non défini');
  process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const CHECK_ONLY = args.includes('--check');

// ─── Helpers HTTP ────────────────────────────────────────────────────────────

function apiRequest(method, urlPath, { body, headers = {}, isUpload = false } = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `${urlPath}${urlPath.includes('?') ? '&' : '?'}key=${API_KEY}`,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    if (body && !isUpload) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      if (isUpload) {
        req.write(body);
      } else {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
    }
    req.end();
  });
}

// Upload multipart pour la File API
function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    const fileBytes = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeMap = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.md': 'text/plain',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    const boundary = `---boundary${Date.now()}`;
    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ file: { display_name: fileName } })}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const endPart = `\r\n--${boundary}--`;

    const metaBytes = Buffer.from(metadataPart, 'utf8');
    const filePartBytes = Buffer.from(filePart, 'utf8');
    const endBytes = Buffer.from(endPart, 'utf8');
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

// ─── Gestion du cache local ───────────────────────────────────────────────────

function loadCacheState() {
  if (!fs.existsSync(CACHE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveCacheState(state) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function isCacheValid(state) {
  if (!state?.cacheId || !state?.expiresAt) return false;
  // Marge de sécurité : invalider 1h avant expiration réelle
  return new Date(state.expiresAt).getTime() - 3600_000 > Date.now();
}

// ─── Vérification côté API ────────────────────────────────────────────────────

async function verifyCacheExists(cacheId) {
  const res = await apiRequest('GET', `/v1beta/${cacheId}`);
  return res.status === 200;
}

// ─── Upload et création du cache ──────────────────────────────────────────────

async function uploadAndCache() {
  // 1. Vérifier que le livre existe
  if (!fs.existsSync(BOOK_PATH)) {
    console.error(`ERREUR : livre introuvable : ${BOOK_PATH}`);
    console.error('Placer le fichier à cet emplacement ou ajuster BOOK_PATH dans setup-book-cache.js');
    process.exit(1);
  }

  // 2. Upload du livre
  console.log(`📤 Upload du livre : ${path.basename(BOOK_PATH)} (${(fs.statSync(BOOK_PATH).size / 1024).toFixed(0)} Ko)...`);
  const bookUpload = await uploadFile(BOOK_PATH);
  const bookUri = bookUpload.file?.uri;
  const bookMime = bookUpload.file?.mimeType;
  if (!bookUri) {
    throw new Error(`Upload livre échoué — réponse : ${JSON.stringify(bookUpload)}`);
  }
  console.log(`   ✓ Livre uploadé : ${bookUri}`);

  // 3. Upload des rapports clients (si dossier configuré)
  const reportParts = [];
  if (REPORTS_DIR && fs.existsSync(REPORTS_DIR)) {
    const reportFiles = fs.readdirSync(REPORTS_DIR)
      .filter(f => /\.(pdf|docx|txt|md)$/i.test(f))
      .map(f => path.join(REPORTS_DIR, f));

    console.log(`📤 Upload de ${reportFiles.length} rapport(s) client...`);
    for (const reportPath of reportFiles) {
      const res = await uploadFile(reportPath);
      const uri = res.file?.uri;
      const mime = res.file?.mimeType;
      if (uri) {
        reportParts.push({ file_data: { mime_type: mime, file_uri: uri } });
        console.log(`   ✓ ${path.basename(reportPath)}`);
      }
    }
  }

  // 4. Construire le payload du cache
  const contents = [
    {
      role: 'user',
      parts: [
        { file_data: { mime_type: bookMime, file_uri: bookUri } },
        ...reportParts,
        {
          text: [
            'Ce fichier est le livre "Be-Ikigai" de Pierre-Louis.',
            reportParts.length > 0 ? 'Les fichiers suivants sont des rapports de coaching anonymisés de clients réels.' : '',
            'Tu y trouveras : la vision de Pierre-Louis sur l\'ikigai (GPS occidental + Boussole japonaise), les 4 sphères, les 8 scénarios de blocage, les 7 archétypes, des témoignages réels anonymisés, et des exercices pratiques.',
            'Utilise ce contenu comme référence pour enrichir les articles de blog : exemples concrets, formulations distinctives, témoignages anonymisés. Ne pas plagier — s\'en inspirer pour donner de la crédibilité et de la profondeur.'
          ].filter(Boolean).join(' '),
        },
      ],
    },
  ];

  const systemInstruction = {
    parts: [{
      text: 'Tu es Pierre-Louis, fondateur de Be-Ikigai. Tu as accès à ton livre complet et à des rapports clients anonymisés. Utilise-les pour enrichir les articles avec des exemples authentiques, des formulations distinctives et des témoignages crédibles — sans jamais copier mot pour mot.',
    }],
  };

  // 5. Créer le cache
  console.log('🔄 Création du cache Gemini (TTL 7 jours)...');
  const cacheRes = await apiRequest('POST', '/v1beta/cachedContents', {
    body: {
      model: MODEL,
      display_name: 'be-ikigai-livre-et-clients',
      contents,
      system_instruction: systemInstruction,
      ttl: TTL,
    },
  });

  if (cacheRes.status !== 200) {
    throw new Error(`Création cache échouée (${cacheRes.status}) : ${JSON.stringify(cacheRes.data)}`);
  }

  const cacheId = cacheRes.data.name;
  const expireTime = cacheRes.data.expireTime;

  if (!cacheId) {
    throw new Error(`Cache créé mais name absent : ${JSON.stringify(cacheRes.data)}`);
  }

  // 6. Sauvegarder
  const state = {
    cacheId,
    model: MODEL,
    expiresAt: expireTime,
    createdAt: new Date().toISOString(),
    bookFile: path.basename(BOOK_PATH),
    reportsCount: reportParts.length,
  };
  saveCacheState(state);

  console.log(`✅ Cache créé : ${cacheId}`);
  console.log(`   Expire le  : ${expireTime}`);
  console.log(`   Sauvegardé : pipeline/gemini-cache.json`);

  return state;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const existing = loadCacheState();

  if (CHECK_ONLY) {
    if (isCacheValid(existing)) {
      console.log(`✅ Cache valide jusqu'au ${existing.expiresAt}`);
      console.log(`   ID : ${existing.cacheId}`);
    } else {
      console.log('⚠️  Cache absent ou expiré — relancer sans --check pour recréer');
      process.exit(1);
    }
    return;
  }

  if (!FORCE && isCacheValid(existing)) {
    // Vérification côté API pour s'assurer que le cache existe encore
    const aliveOnApi = await verifyCacheExists(existing.cacheId).catch(() => false);
    if (aliveOnApi) {
      console.log(`✅ Cache déjà valide jusqu'au ${existing.expiresAt} — rien à faire`);
      console.log(`   (Utiliser --force pour recréer)`);
      return;
    }
    console.log('⚠️  Cache expiré côté API — recréation...');
  }

  await uploadAndCache();
}

main().catch((err) => {
  console.error('ERREUR FATALE :', err.message);
  process.exit(1);
});
