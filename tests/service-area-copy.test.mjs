import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { planContentChanges } from '../scripts/migrate-seo-content.mjs';
import { renderPage } from '../scripts/render-page.mjs';

const [template, copyJson, labelsJson, regionalJson, popoverJson] = await Promise.all([
  readFile(new URL('../templates/home.html', import.meta.url), 'utf8'),
  readFile(new URL('../database/service-area-copy.changes.json', import.meta.url), 'utf8'),
  readFile(new URL('../database/service-area-offer-label.changes.json', import.meta.url), 'utf8'),
  readFile(new URL('../database/regional-service-copy.changes.json', import.meta.url), 'utf8'),
  readFile(new URL('../database/service-area-popover.changes.json', import.meta.url), 'utf8')
]);
const copyProposal = JSON.parse(copyJson);
const labelProposal = JSON.parse(labelsJson);
const regionalProposal = JSON.parse(regionalJson);
const popoverProposal = JSON.parse(popoverJson);
// Reviewed copy is a fixture, not a requirement imposed on future Tracker exports.
const reviewedCopy = {
  'seo.title': { en: 'Storage fixture', fr: 'Entreposage fictif' },
  ...Object.fromEntries([...copyProposal.changes, ...regionalProposal.changes, ...popoverProposal.changes].map(change => [change.key, change.after]))
};
const reviewedSeasons = [{
  name: { en: 'Reviewed season', fr: 'Saison révisée' },
  offers: labelProposal.changes.map(change => ({ id: change.key, label: change.after }))
}];
const renderFixture = (lang, i18n = reviewedCopy, seasons = reviewedSeasons) =>
  parseHTML(renderPage(template, lang, { i18n, seasons, conditions: [] })).document;

const communities = ['Alfred', 'Plantagenet', 'Curran', 'Hawkesbury', 'L’Orignal', 'Vankleek Hill', 'Wendover', 'Lefaivre', 'Rockland', 'Saint-Isidore', 'Ottawa', 'Montréal'];
for (const lang of ['en', 'fr']) test(`${lang}: reviewed service-area copy, location privacy, mailing label and complete sentences`, () => {
  const document = renderFixture(lang);
  const serviceArea = document.querySelector('[data-i18n="facility.serviceArea"]').textContent;
  for (const name of communities) assert.ok(serviceArea.includes(name), `missing ${name}`);
  assert.equal(serviceArea, reviewedCopy['facility.serviceArea'][lang]);
  const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  assert.deepEqual(schema.areaServed, reviewedCopy['seo.areaServed'][lang].split(';').map(name => name.trim()).filter(Boolean));
  for (const name of communities) assert.ok(schema.areaServed.includes(name));
  assert.deepEqual(Object.keys(schema.address).sort(), ['@type', 'addressCountry', 'addressLocality', 'addressRegion']);
  assert.equal(schema.address.addressLocality, 'Alfred');
  assert.equal(schema.geo, undefined);
  assert.equal(schema.hasMap, undefined);
  assert.doesNotMatch(document.body.textContent, /Conc 4|K0B 1A0/);
  const mailingLabel = document.querySelector('[data-i18n="footer.office"]');
  assert.equal(mailingLabel.textContent, reviewedCopy['footer.office'][lang]);
  assert.match(mailingLabel.parentElement.textContent, /St-Eustache/);
  assert.match(mailingLabel.textContent, lang === 'en' ? /Mailing address only.*no vehicle storage/ : /Adresse postale seulement.*aucun entreposage/);
  const description = document.querySelector('meta[name="description"]').content;
  assert.ok(description.length <= 160);
  for (const name of communities.slice(3, 10)) assert.ok(!description.includes(name));
  for (const service of ['battery', 'propane']) {
    const paragraph = document.querySelector(`[data-i18n="services.${service}.body"]`);
    assert.ok(paragraph.textContent.trim().endsWith('.'), 'sentence must remain complete before price JavaScript runs');
    assert.equal(paragraph.querySelectorAll(`[data-service-price="${service}"]`).length, 1);
  }
  if (lang === 'fr') {
    assert.doesNotMatch(document.querySelector('#season-grid').textContent, /truck/i);
    assert.doesNotMatch(document.querySelector('[data-i18n="services.battery.body"]').textContent, /service de déconnexion et de charge\s*$/i);
    assert.match(document.querySelector('[data-i18n="contractHelper.intro"]').textContent, /formulaire.*demander un espace/);
  }
});

for (const lang of ['en', 'fr']) test(`${lang}: regional introduction and information popover stay consistent`, () => {
  const document = renderFixture(lang);
  const region = lang === 'en' ? 'Prescott and Russell' : 'Prescott et Russell';
  const intro = document.querySelector('[data-i18n="hero.description"]').textContent;
  assert.equal(intro, reviewedCopy['hero.description'][lang]);
  assert.ok(intro.includes(region));
  assert.ok(document.querySelector('[data-i18n="facility.heading"]').textContent.includes(region));
  for (const community of communities.slice(1, 10)) assert.ok(!intro.includes(community), 'keep the full community list in one place');
  const trigger = document.querySelector('.service-area__trigger');
  const popover = document.getElementById(trigger.getAttribute('popovertarget'));
  assert.equal(trigger.tagName, 'BUTTON');
  assert.equal(trigger.getAttribute('type'), 'button');
  assert.equal(trigger.getAttribute('aria-controls'), popover.id);
  assert.equal(trigger.querySelector('[data-i18n]').textContent, reviewedCopy['facility.serviceAreaSummary'][lang]);
  assert.equal(trigger.querySelector('.service-area__icon').getAttribute('aria-hidden'), 'true');
  assert.equal(popover.getAttribute('popover'), 'auto');
  assert.equal(popover.getAttribute('aria-labelledby'), trigger.id);
  assert.ok(popover.querySelector('[data-i18n="facility.serviceArea"]').textContent.includes(region));
  assert.equal(trigger.hasAttribute('hidden'), false);
  const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  assert.ok(schema.areaServed.includes(lang === 'en' ? 'United Counties of Prescott and Russell' : 'Comtés unis de Prescott et Russell'));
});

for (const lang of ['en', 'fr']) test(`${lang}: owner edits render without retaining the reviewed wording or communities`, () => {
  const alternate = {
    ...reviewedCopy,
    'facility.serviceArea': { [lang]: 'Owner edited service-area paragraph' },
    'seo.areaServed': { [lang]: 'Village A; Village B' },
    'seo.description': { [lang]: 'Owner edited search description' },
    'footer.office': { [lang]: 'Owner edited mailing label' },
    'facility.serviceAreaSummary': { [lang]: 'Owner edited service-area label' },
    'services.battery.body': { [lang]: 'Owner edited battery details! <span data-service-price="battery"></span>' },
    'services.propane.body': { [lang]: 'Owner edited propane details! <span data-service-price="propane"></span>' }
  };
  const seasons = [{ name: { [lang]: 'Owner edited season' }, offers: [{ label: { [lang]: 'Owner edited offer label' } }] }];
  const document = renderFixture(lang, alternate, seasons);
  assert.equal(document.querySelector('[data-i18n="facility.serviceArea"]').textContent, alternate['facility.serviceArea'][lang]);
  assert.equal(document.querySelector('[data-i18n="footer.office"]').textContent, alternate['footer.office'][lang]);
  assert.equal(document.querySelector('meta[name="description"]').content, alternate['seo.description'][lang]);
  assert.equal(document.querySelector('[data-i18n="facility.serviceAreaSummary"]').textContent, alternate['facility.serviceAreaSummary'][lang]);
  const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  assert.deepEqual(schema.areaServed, ['Village A', 'Village B']);
  assert.match(document.querySelector('#season-grid').textContent, /Owner edited offer label/);
  for (const service of ['battery', 'propane']) {
    const paragraph = document.querySelector(`[data-i18n="services.${service}.body"]`);
    assert.equal(paragraph.textContent.trim(), `Owner edited ${service} details!`);
    assert.ok(paragraph.querySelector(`[data-service-price="${service}"]`));
  }
});

test('reviewed change sets write translations and an existing offer label only', async () => {
  for (const [file, collection, field] of [
    ['service-area-copy.changes.json', 'i18nEntries', 'text'],
    ['regional-service-copy.changes.json', 'i18nEntries', 'text'],
    ['service-area-popover.changes.json', 'i18nEntries', 'text'],
    ['service-area-offer-label.changes.json', 'storageOffers', 'label']
  ]) {
    const proposal = JSON.parse(await readFile(new URL(`../database/${file}`, import.meta.url), 'utf8'));
    assert.equal(proposal.collection, collection);
    assert.equal(proposal.field || 'text', field);
    for (const change of proposal.changes) {
      assert.deepEqual(Object.keys(change).sort(), ['after', 'before', 'key']);
      assert.deepEqual(Object.keys(change.after).sort(), ['en', 'fr']);
      if (field === 'label') assert.notEqual(change.before, null);
    }
    // Keep migration fixtures independent of mutable exported database copy.
    const before = proposal.changes.filter(change => change.before !== null).map(change => ({ id: change.key, key: change.key, text: change.before }));
    assert.equal(planContentChanges(proposal.changes, before).length, proposal.changes.length);
    const applied = proposal.changes.map(change => ({ id: change.key, key: change.key, text: change.after }));
    assert.ok(planContentChanges(proposal.changes, applied).every(change => change.status === 'unchanged'));
  }
});
