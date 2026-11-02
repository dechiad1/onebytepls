/**
 * Generates /llms.txt (https://llmstxt.org) from the articles collection at build time.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../../config/site';

export const GET: APIRoute = async () => {
  const articles = (await getCollection('articles')).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  const articleLines = articles.map(
    (article) =>
      `- [${article.data.title}](${site.url}/articles/${article.id}/): ${article.data.description}`
  );

  const body = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `Personal site of ${site.author.name}. Essays on software engineering in organizations, developer experience, and lessons learned from real-world projects.`,
    '',
    '## Articles',
    '',
    ...articleLines,
    '',
    '## About',
    '',
    `- [About ${site.author.name}](${site.url}/about/): Background, experience, and projects`,
    `- [All articles](${site.url}/articles/): Searchable index of every article`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
