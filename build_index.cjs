const fs = require('fs');

let body = fs.readFileSync('body_extracted.txt', 'utf8');

// Remove scripts and noscripts
body = body.replace(/<noscript>.*?<\/noscript>/gs, '');
body = body.replace(/<script.*?>.*?<\/script>/gs, '');
body = body.replace(/<script>.*?<\/script>/gs, '');

// Process Tally iframe
const tallyIframeRegex = /<iframe data-tally-[^>]*><\/iframe>/g;
body = body.replace(/<iframe data-tally-[^>]*>[\s\S]*?<\/iframe>/g, '<ContactForm lang="fr" />');

// Replace standard links
body = body.replace(/href="\.\/assets/g, 'href="/assets');
body = body.replace(/src="\.\/assets/g, 'src="/assets');

// Remove trailing Weglot scripts if any
body = body.replace(/<script[^>]*weglot[^>]*><\/script>/g, '');

const astroPage = `---
import Layout from '../layouts/Layout.astro';
import ContactForm from '../components/ContactForm.astro';
---

<Layout title="Ikigai : Trouvez Votre Raison d'Être avec un Coaching Personnalisé | be-ikigai" description="Découvrez votre Ikigai, la philosophie japonaise pour harmoniser passion, mission et vocation." lang="fr">
${body}
</Layout>
`;

fs.writeFileSync('src/pages/index.astro', astroPage);
