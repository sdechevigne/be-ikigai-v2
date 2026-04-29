import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) =>
    data.lang === 'en' && data.status === 'published'
  );
  posts.sort((a, b) =>
    (b.data.publishedAt?.valueOf() ?? 0) - (a.data.publishedAt?.valueOf() ?? 0)
  );

  return rss({
    title: "be-ikigai — The Field Journal",
    description: "Articles on Ikigai, personal development, and finding your reason for being. By Pierre-Louis, Certified Ikigai Coach.",
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: `/en/blog/${post.id}/`,
      categories: post.data.category ? [post.data.category] : [],
      author: post.data.author ?? 'Pierre-Louis',
    })),
    customData: `<language>en-US</language>`,
    stylesheet: false,
  });
}
