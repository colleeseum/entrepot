import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { planContentChanges } from '../scripts/migrate-seo-content.mjs';
import { I18N } from '../static/generated/website-text.generated.js';

const communities = ['Alfred', 'Plantagenet', 'Curran', 'Hawkesbury', 'L’Orignal', 'Vankleek Hill', 'Wendover', 'Lefaivre', 'Rockland', 'Saint-Isidore', 'Ottawa', 'Montréal'];
for (const lang of ['en', 'fr']) test(`${lang}: service-area copy, location privacy, mailing label and complete sentences`, async () => {
  const { document } = parseHTML(await readFile(new URL(`../_site/${lang}/index.html`, import.meta.url), 'utf8'));
  const serviceArea = document.querySelector('[data-i18n="facility.serviceArea"]').textContent;
  for (const name of communities) assert.ok(serviceArea.includes(name), `missing ${name}`);
  assert.equal(serviceArea, I18N['facility.serviceArea'][lang]);
  const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  assert.deepEqual(schema.areaServed, I18N['seo.areaServed'][lang].split(';').map(name => name.trim()).filter(Boolean));
  for (const name of communities) assert.ok(schema.areaServed.includes(name));
  assert.deepEqual(Object.keys(schema.address).sort(), ['@type', 'addressCountry', 'addressLocality', 'addressRegion']);
  assert.equal(schema.address.addressLocality, 'Alfred');
  assert.equal(schema.geo, undefined);
  assert.equal(schema.hasMap, undefined);
  assert.doesNotMatch(document.body.textContent, /Conc 4|K0B 1A0/);
  const mailingLabel = document.querySelector('[data-i18n="footer.office"]');
  assert.equal(mailingLabel.textContent, I18N['footer.office'][lang]);
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

test('reviewed change sets write translations and an existing offer label only', async () => {
  for (const [file, collection, field] of [
    ['service-area-copy.changes.json', 'i18nEntries', 'text'],
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
