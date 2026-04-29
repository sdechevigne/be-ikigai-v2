// resize-cover.mjs — Lit base64 depuis stdin, resize et sauvegarde via sharp
// Usage : echo "<base64>" | node pipeline/scripts/resize-cover.mjs <slug> <out_dir>
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import * as path from 'path';

const slug = process.argv[2];
const outDir = process.argv[3];

if (!slug || !outDir) {
  process.stderr.write('Usage: resize-cover.mjs <slug> <out_dir>\n');
  process.exit(1);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { buf += d; });
process.stdin.on('end', async () => {
  try {
    const b64 = buf.trim();
    if (!b64) { process.stdout.write('NO_IMAGE'); process.exit(0); }

    const srcBuf = Buffer.from(b64, 'base64');
    if (srcBuf.length < 10240) { process.stdout.write('TOO_SMALL'); process.exit(0); }

    mkdirSync(outDir, { recursive: true });

    await sharp(srcBuf)
      .resize(1424, 752, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toFile(path.join(outDir, slug + '.webp'));

    await sharp(srcBuf)
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toFile(path.join(outDir, slug + '-og.webp'));

    process.stdout.write('OK');
  } catch (e) {
    process.stderr.write('ERROR: ' + e.message + '\n');
    process.stdout.write('ERROR');
  }
});
