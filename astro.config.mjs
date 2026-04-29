import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from "@astrojs/react";

/** Preload non-inlined Astro CSS to break the critical-chain waterfall. */
function preloadAstroCss() {
  return {
    name: 'preload-astro-css',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const { readdir, readFile, writeFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const root = fileURLToPath(dir);

        async function processDir(dirPath) {
          const entries = await readdir(dirPath, { withFileTypes: true });
          await Promise.all(entries.map(async (entry) => {
            const full = join(dirPath, entry.name);
            if (entry.isDirectory()) {
              await processDir(full);
            } else if (entry.name === 'index.html') {
              let html = await readFile(full, 'utf8');
              // Add <link rel="preload"> immediately before each external Astro stylesheet
              html = html.replace(
                /(<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)"[^>]*>)/g,
                '<link rel="preload" as="style" href="$2">$1'
              );
              await writeFile(full, html, 'utf8');
            }
          }));
        }

        await processDir(root);
      }
    }
  };
}

export default defineConfig({
  site: 'https://be-ikigai.com',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
  integrations: [tailwind(), react(), preloadAstroCss(), sitemap({
    i18n: {
      defaultLocale: 'fr',
      locales: {
        fr: 'fr-FR',
        en: 'en-US',
      },
    },
    filter: (page) => !page.includes('/api/'),
  })],
  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en"],
    routing: {
      prefixDefaultLocale: false
    }
  }
});