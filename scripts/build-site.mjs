import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { I18N, STORAGE_SEASONS, STORAGE_CONDITIONS } from '../static/generated/website-text.generated.js';
import { renderPage, ORIGIN } from './render-page.mjs';

const content = { i18n: I18N, seasons: STORAGE_SEASONS, conditions: STORAGE_CONDITIONS };
const template = await readFile(new URL('../templates/home.html', import.meta.url), 'utf8');
const output = new URL('../_site/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../static/', import.meta.url), new URL('static/', output), { recursive: true });
await mkdir(new URL('staging/', output), { recursive: true });
await cp(new URL('../staging/index.html', import.meta.url), new URL('staging/index.html', output));
await cp(new URL('../CNAME', import.meta.url), new URL('CNAME', output));

for (const lang of ['en', 'fr']) {
  await mkdir(new URL(`${lang}/`, output), { recursive: true });
  await writeFile(new URL(`${lang}/index.html`, output), renderPage(template, lang, content));
}
// Root is an English compatibility alias, with all existing section IDs intact.
await writeFile(new URL('index.html', output), renderPage(template, 'en', content));
await writeFile(new URL('sitemap.xml', output), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['en', 'fr'].map(lang => `  <url><loc>${ORIGIN}/${lang}/</loc></url>`).join('\n')}\n</urlset>\n`);
// Staging must remain crawlable for its noindex directive to be seen.
await writeFile(new URL('robots.txt', output), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
console.log('Built /, /en/, /fr/, /staging/, sitemap.xml and robots.txt in _site/');
