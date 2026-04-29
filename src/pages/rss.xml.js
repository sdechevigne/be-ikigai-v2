import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) =>
    data.lang === 'fr' && data.status === 'published'
  );
  posts.sort((a, b) =>
    (b.data.publishedAt?.valueOf() ?? 0) - (a.data.publishedAt?.valueOf() ?? 0)
  );

  return rss({
    title: "be-ikigai — Le Carnet de Terrain",
    description: "Articles sur l'Ikigai, le développement personnel et la quête de sens. Par Pierre-Louis, Coach Ikigai Certifié.",
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: `/blog/${post.id}/`,
      categories: post.data.category ? [post.data.category] : [],
      author: post.data.author ?? 'Pierre-Louis',
    })),
    customData: `<language>fr-FR</language>`,
    stylesheet: false,
  });
}
