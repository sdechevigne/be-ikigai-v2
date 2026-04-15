import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

import react from "@astrojs/react";

export default defineConfig({
  site: 'https://be-ikigai.com',
  integrations: [tailwind(), react(), sitemap({
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