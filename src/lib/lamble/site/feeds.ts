/**
 * RSS 2.0 and Atom feeds for research articles. Text is escaped; nothing from an article is emitted as markup.
 */
import type { ArticleSummary } from "../service.ts";

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export function rss(site: string, articles: ArticleSummary[]): string {
  const items = articles
    .map(
      (a) => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(`${site}/research/${a.slug}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${site}/research/${a.slug}`)}</guid>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(a.dek)}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LAMBLE research</title>
    <link>${escapeXml(`${site}/research`)}</link>
    <atom:link href="${escapeXml(`${site}/research/feed.xml`)}" rel="self" type="application/rss+xml"/>
    <description>Trenches research from published LAMBLE releases. Powered by Frames.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
}

export function atom(site: string, articles: ArticleSummary[]): string {
  const updated = articles[0]?.updatedAt ?? new Date(0).toISOString();
  const entries = articles
    .map(
      (a) => `  <entry>
    <title>${escapeXml(a.title)}</title>
    <link href="${escapeXml(`${site}/research/${a.slug}`)}"/>
    <id>${escapeXml(`${site}/research/${a.slug}`)}</id>
    <published>${a.publishedAt}</published>
    <updated>${a.updatedAt}</updated>
    <summary>${escapeXml(a.dek)}</summary>
    <author><name>LAMBLE research pipeline</name></author>
  </entry>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>LAMBLE research</title>
  <link href="${escapeXml(`${site}/research`)}"/>
  <link rel="self" href="${escapeXml(`${site}/research/atom.xml`)}"/>
  <id>${escapeXml(`${site}/research`)}</id>
  <updated>${updated}</updated>
${entries}
</feed>
`;
}
