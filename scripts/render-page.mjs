import { parseHTML } from 'linkedom';
import { I18N_FALLBACKS } from '../static/i18n-fallbacks.js';
export const ORIGIN = 'https://entrepot.as-colle.com';

export function renderPage(template, lang, { i18n, seasons, conditions }) {
  const translations = { ...I18N_FALLBACKS, ...i18n };
  const { document } = parseHTML(template);
  const t = key => translations[key]?.[lang];
  const title = t('seo.title') || t('hero.title');
  const description = t('seo.description') || t('hero.description');
  if (!title || !description) throw new Error(`Missing database title or description for ${lang}`);
  const localized = value => typeof value === 'string' ? value : value?.[lang] || '';
  document.documentElement.lang = lang;
  document.title = title;
  document.querySelector('meta[name="description"]').content = description;
  for (const section of document.querySelectorAll('[data-content-requires]')) {
    if (section.getAttribute('data-content-requires').split(',').some(key => !t(key))) section.remove();
  }
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const text = t(element.getAttribute('data-i18n')) || t(element.getAttribute('data-i18n-fallback-key'));
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
    description, telephone: '+1-514-627-5377',
    email: lang === 'fr' ? 'entrepot@as-colle.com' : 'warehouse@as-colle.com',
    image: `${ORIGIN}/static/images/exterior.jpg`,
    address: { '@type': 'PostalAddress', streetAddress: 'Conc 4', addressLocality: 'Alfred', addressRegion: 'ON', postalCode: 'K0B 1A0', addressCountry: 'CA' },
    ...(t('seo.areaServed') ? { areaServed: t('seo.areaServed').split(';').map(name => name.trim()).filter(Boolean) } : {}),
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
  for (const season of seasons.filter(s => s.active !== false)) {
    const card = document.createElement('article'); card.className = 'season-card';
    appendText(card, 'h3', localized(season.name));
    appendText(card, 'p', localized(season.seasonLabel));
    appendText(card, 'p', localized(season.timeframe));
    const list = document.createElement('ul');
    for (const offer of season.offers.filter(o => !o.hideInTable)) appendText(list, 'li', localized(offer.label));
    card.append(list); grid.append(card);
  }
  const policies = document.createElement('article'); policies.className = 'season-card season-card--full';
  appendText(policies, 'h3', t('sharedPolicies.name'));
  const list = document.createElement('ul');
  for (const policy of conditions) {
    const text = policy.text ? localized(policy.text) : t(policy.translationKey);
    if (text) appendText(list, 'li', text);
  }
  policies.append(list); grid.append(policies);
  return '<!doctype html>\n' + document.documentElement.outerHTML + '\n';
}
