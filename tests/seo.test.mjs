import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseHTML, DOMParser } from 'linkedom';
import { I18N_FALLBACKS } from '../static/i18n-fallbacks.js';
import { I18N } from '../static/generated/website-text.generated.js';
import { withMarketingContent } from '../static/marketing-content.js';
const origin = 'https://entrepot.as-colle.com';
const translations = withMarketingContent({ ...I18N_FALLBACKS, ...I18N });
const read = path => readFile(new URL(`../_site/${path}`, import.meta.url), 'utf8');
for (const lang of ['en', 'fr']) test(`${lang}: initial HTML, metadata, schema and links`, async () => {
  const { document: doc } = parseHTML(await read(`${lang}/index.html`));
  assert.equal(doc.documentElement.lang, lang);
  assert.equal(doc.title, translations['seo.title'][lang]);
  assert.equal(doc.querySelector('meta[name="description"]').content, translations['seo.description'][lang]);
  assert.equal(doc.querySelectorAll('h1').length, 1);
  assert.match(doc.querySelector('h1').textContent, /Alfred/);
  for (const name of ['Alfred', 'Curran', 'Plantagenet', 'Ottawa', 'Montréal']) assert.ok(doc.querySelector('.hero__content').textContent.includes(name));
  assert.ok(doc.querySelector('#season-grid').textContent.length > 800);
  for (const el of doc.querySelectorAll('[data-i18n]')) {
    const text = translations[el.getAttribute('data-i18n')]?.[lang];
    assert.notEqual(text, undefined, `missing ${lang} translation: ${el.getAttribute('data-i18n')}`);
    if (el.getAttribute('data-i18n-attr')) for (const attr of el.getAttribute('data-i18n-attr').split(',')) assert.equal(el.getAttribute(attr.trim()), text);
    else if (el.getAttribute('data-i18n-html') !== 'true') assert.equal(el.textContent, text);
  }
  assert.equal(doc.querySelector('link[rel="canonical"]').href, `${origin}/${lang}/`);
  for (const code of ['en', 'fr', 'x-default']) assert.equal(doc.querySelector(`link[hreflang="${code}"]`).href, `${origin}/${code === 'x-default' ? 'en' : code}/`);
  const data = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(data['@type'], 'LocalBusiness');
  assert.equal(data.address.addressLocality, 'Alfred');
  assert.ok(doc.body.textContent.includes(data.email));
  assert.deepEqual(data.contactPoint.availableLanguage, ['en', 'fr']);
  assert.equal(data.availableLanguage, undefined);
  for (const a of doc.querySelectorAll('a[href], link[href], img[src], script[src]')) {
    const href = a.getAttribute('href') || a.getAttribute('src');
    if (href.startsWith('#')) assert.ok(doc.getElementById(href.slice(1)), `missing anchor ${href}`);
    else if (href.startsWith('/') && !href.startsWith('//')) {
      const path = href.endsWith('/') ? `${href}index.html` : href;
      assert.ok((await stat(resolve('_site', `.${path}`))).isFile(), `missing ${href}`);
    }
  }
  assert.ok(doc.querySelector('#contract-helper'));
  assert.ok(doc.querySelector('#contact-form'));
  assert.equal(doc.querySelector('[data-lang-toggle="fr"]').tagName, 'A');
});
test('root compatibility, sitemap XML, robots, staging and packaging', async () => {
  assert.equal(await read('index.html'), await read('en/index.html'));
  const xml = new DOMParser().parseFromString(await read('sitemap.xml'), 'text/xml');
  assert.equal(xml.documentElement.localName, 'urlset');
  assert.deepEqual([...xml.querySelectorAll('loc')].map(el => el.textContent), [`${origin}/en/`, `${origin}/fr/`]);
  assert.match(await read('robots.txt'), new RegExp(`Sitemap: ${origin}/sitemap.xml`));
  assert.match(await read('staging/index.html'), /name="robots" content="noindex, nofollow"/);
  await assert.rejects(stat('_site/templates'));
  await assert.rejects(stat('_site/docs'));
  await assert.rejects(stat('_site/tracker'));
});
