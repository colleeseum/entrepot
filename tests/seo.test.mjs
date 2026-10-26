import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseHTML, DOMParser } from 'linkedom';
import { I18N_FALLBACKS } from '../static/i18n-fallbacks.js';
import { renderPage } from '../scripts/render-page.mjs';
import { planContentChanges } from '../scripts/migrate-seo-content.mjs';
import { I18N, STORAGE_SEASONS, STORAGE_CONDITIONS } from '../static/generated/website-text.generated.js';
const origin = 'https://entrepot.as-colle.com';
const translations = { ...I18N_FALLBACKS, ...I18N };
const read = path => readFile(new URL(`../_site/${path}`, import.meta.url), 'utf8');
for (const lang of ['en', 'fr']) test(`${lang}: initial HTML, metadata, schema and links`, async () => {
  const { document: doc } = parseHTML(await read(`${lang}/index.html`));
  assert.equal(doc.documentElement.lang, lang);
  assert.equal(doc.title, (translations['seo.title'] || translations['hero.title'])[lang]);
  assert.equal(doc.querySelector('meta[name="description"]').content, (translations['seo.description'] || translations['hero.description'])[lang]);
  assert.equal(doc.querySelectorAll('h1').length, 1);
  assert.equal(doc.querySelector('h1').textContent, I18N['hero.title'][lang]);
  assert.ok(doc.querySelector('#season-grid').textContent.length > 800);
  for (const el of doc.querySelectorAll('[data-i18n]')) {
    const text = translations[el.getAttribute('data-i18n')]?.[lang] || translations[el.getAttribute('data-i18n-fallback-key')]?.[lang];
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
  await assert.rejects(stat('_site/database'));
  await assert.rejects(stat('_site/scripts'));
  await assert.rejects(stat('_site/static/marketing-content.js'));
});

test('database translations remain authoritative, including new SEO fields', async () => {
  const template = await readFile(new URL('../templates/home.html', import.meta.url), 'utf8');
  for (const lang of ['en', 'fr']) {
    const updated = { ...I18N, 'hero.title': { [lang]: 'Owner edited title' }, 'hero.description': { [lang]: 'Owner edited introduction' }, 'seo.title': { [lang]: 'Owner edited search title' }, 'seo.description': { [lang]: 'Owner edited search description' } };
    const { document } = parseHTML(renderPage(template, lang, { i18n: updated, seasons: STORAGE_SEASONS, conditions: STORAGE_CONDITIONS }));
    assert.equal(document.querySelector('h1').textContent, 'Owner edited title');
    assert.equal(document.querySelector('[data-i18n="hero.description"]').textContent, 'Owner edited introduction');
    assert.equal(document.title, 'Owner edited search title');
    assert.equal(document.querySelector('meta[name="description"]').content, 'Owner edited search description');
    assert.equal(document.getElementById('arrival'), null);
  }
});
test('reviewed database changes render after export and refuse conflicting edits', async () => {
  const { changes } = JSON.parse(await readFile(new URL('../database/seo-content.changes.json', import.meta.url), 'utf8'));
  const docs = Object.entries(I18N).map(([key, text]) => ({ id: key, key, text }));
  assert.equal(planContentChanges(changes, docs).length, changes.length);
  const updated = { ...I18N, ...Object.fromEntries(changes.map(change => [change.key, change.after])) };
  const template = await readFile(new URL('../templates/home.html', import.meta.url), 'utf8');
  for (const lang of ['en', 'fr']) {
    const { document } = parseHTML(renderPage(template, lang, { i18n: updated, seasons: STORAGE_SEASONS, conditions: STORAGE_CONDITIONS }));
    assert.ok(document.getElementById('arrival'));
    for (const name of ['Alfred', 'Curran', 'Plantagenet', 'Ottawa', 'Montréal']) assert.ok(document.querySelector('.hero__content').textContent.includes(name));
    assert.equal(document.querySelector('h1').textContent, updated['hero.title'][lang]);
  }
  const applied = Object.entries(updated).map(([key, text]) => ({ id: key, key, text }));
  assert.ok(planContentChanges(changes, applied).every(change => change.status === 'unchanged'));
  assert.throws(() => planContentChanges(changes, docs.map(doc => doc.key === 'hero.title' ? { ...doc, text: { en: 'Concurrent edit', fr: 'Modification' } } : doc)), /changed since review/);
  assert.throws(() => planContentChanges(changes, [...docs, docs[0]]), /Duplicate database key/);
});
