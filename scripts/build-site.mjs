import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { I18N, STORAGE_SEASONS, STORAGE_CONDITIONS } from '../static/generated/website-text.generated.js';
import { I18N_FALLBACKS } from '../static/i18n-fallbacks.js';
import { withMarketingContent } from '../static/marketing-content.js';

export const ORIGIN = 'https://entrepot.as-colle.com';
const translations = withMarketingContent({ ...I18N_FALLBACKS, ...I18N });
const template = await readFile(new URL('../templates/home.html', import.meta.url), 'utf8');
const output = new URL('../_site/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../static/', import.meta.url), new URL('static/', output), { recursive: true });
await mkdir(new URL('staging/', output), { recursive: true });
await cp(new URL('../staging/index.html', import.meta.url), new URL('staging/index.html', output));
await cp(new URL('../CNAME', import.meta.url), new URL('CNAME', output));

function render(lang) {
  const { document } = parseHTML(template);
  const t = key => translations[key]?.[lang];
  const localized = value => typeof value === 'string' ? value : value?.[lang] || '';
  document.documentElement.lang = lang;
  document.title = t('seo.title');
  document.querySelector('meta[name="description"]').content = t('seo.description');
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const text = t(element.getAttribute('data-i18n'));
    // Legacy form fallback labels remain until the browser fills its dynamic controls.
    if (text === undefined) continue;
    if (element.getAttribute('data-i18n-attr')) {
      for (const attr of element.getAttribute('data-i18n-attr').split(',')) element.setAttribute(attr.trim(), text);
    } else if (element.getAttribute('data-i18n-html') === 'true') element.innerHTML = text;
    else element.textContent = text;
  }
  for (const element of document.querySelectorAll('[data-contact-email]')) {
    const email = lang === 'fr' ? 'entrepot@as-colle.com' : 'warehouse@as-colle.com';
    element.textContent = email;
    element.setAttribute('href', `mailto:${email}`);
  }
  for (const link of document.querySelectorAll('[data-lang-toggle]')) {
    const active = link.dataset.langToggle === lang;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
  }
  const addLink = attributes => {
    const link = document.createElement('link');
    for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
    document.head.append(link);
  };
  addLink({ rel: 'canonical', href: `${ORIGIN}/${lang}/` });
  for (const code of ['en', 'fr']) addLink({ rel: 'alternate', hreflang: code, href: `${ORIGIN}/${code}/` });
  addLink({ rel: 'alternate', hreflang: 'x-default', href: `${ORIGIN}/en/` });
  const structured = document.createElement('script');
  structured.type = 'application/ld+json';
  structured.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'LocalBusiness',
    '@id': `${ORIGIN}/#business`, name: 'Ferme Colle', url: `${ORIGIN}/${lang}/`,
    description: t('seo.description'), telephone: '+1-514-627-5377',
    email: lang === 'fr' ? 'entrepot@as-colle.com' : 'warehouse@as-colle.com',
    image: `${ORIGIN}/static/images/exterior.jpg`,
    address: { '@type': 'PostalAddress', streetAddress: 'Conc 4', addressLocality: 'Alfred', addressRegion: 'ON', postalCode: 'K0B 1A0', addressCountry: 'CA' },
    areaServed: ['Alfred', 'Plantagenet', 'Curran', 'Ottawa', 'Montréal'],
    contactPoint: { '@type': 'ContactPoint', telephone: '+1-514-627-5377', contactType: 'reservations', availableLanguage: ['en', 'fr'] }
  }, null, 2).replace(/</g, '\\u003c');
  document.head.append(structured);
  const routing = document.createElement('script');
  routing.type = 'module';
  routing.src = '/static/language-routing.js';
  document.head.append(routing);

  // Initial HTML contains seasonal dates and conditions from the same Tracker export.
  // Interactive pricing replaces these summaries using the existing browser renderer.
  const grid = document.getElementById('season-grid');
  const appendText = (parent, tag, text) => {
    const el = document.createElement(tag); el.textContent = text; parent.append(el); return el;
  };
  for (const season of STORAGE_SEASONS.filter(s => s.active !== false)) {
    const card = document.createElement('article'); card.className = 'season-card';
    appendText(card, 'h3', localized(season.name));
    appendText(card, 'p', localized(season.seasonLabel));
    appendText(card, 'p', localized(season.timeframe));
    const list = document.createElement('ul');
    for (const offer of season.offers.filter(o => !o.hideInTable)) appendText(list, 'li', localized(offer.label));
    card.append(list); grid.append(card);
  }
  const policies = document.createElement('article'); policies.className = 'season-card season-card--full';
  appendText(policies, 'h3', lang === 'fr' ? 'Conditions d’entreposage' : 'Storage conditions');
  const list = document.createElement('ul');
  for (const policy of STORAGE_CONDITIONS) {
    const text = policy.text ? localized(policy.text) : t(policy.translationKey);
    if (text) appendText(list, 'li', text);
  }
  policies.append(list); grid.append(policies);
  return '<!doctype html>\n' + document.documentElement.outerHTML + '\n';
}
for (const lang of ['en', 'fr']) {
  await mkdir(new URL(`${lang}/`, output), { recursive: true });
  await writeFile(new URL(`${lang}/index.html`, output), render(lang));
}
// Root is an English compatibility alias, with all existing section IDs intact.
await writeFile(new URL('index.html', output), render('en'));
await writeFile(new URL('sitemap.xml', output), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['en', 'fr'].map(lang => `  <url><loc>${ORIGIN}/${lang}/</loc></url>`).join('\n')}\n</urlset>\n`);
// Staging must remain crawlable for its noindex directive to be seen.
await writeFile(new URL('robots.txt', output), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
console.log('Built /, /en/, /fr/, /staging/, sitemap.xml and robots.txt in _site/');
