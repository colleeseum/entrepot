import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { renderPage } from '../scripts/render-page.mjs';

const [template, metadataJson, conditionJson] = await Promise.all([
  readFile(new URL('../templates/home.html', import.meta.url), 'utf8'),
  readFile(new URL('../database/review-metadata-copy.changes.json', import.meta.url), 'utf8'),
  readFile(new URL('../database/review-condition-copy.changes.json', import.meta.url), 'utf8')
]);
const metadata = JSON.parse(metadataJson);
const condition = JSON.parse(conditionJson);
const i18n = Object.fromEntries(metadata.changes.map(change => [change.key, change.after]));
const render = lang => parseHTML(renderPage(template, lang, { i18n, conditions: condition.changes.map(change => ({ text: change.after })), seasons: [] })).document;

test('reviewed French metadata explicitly identifies vehicle storage', () => {
  const document = render('fr');
  assert.match(document.title, /entreposage.*de véhicules/i);
  assert.match(document.querySelector('meta[name="description"]').content, /entreposage.*de véhicules/i);
  assert.ok(document.querySelector('meta[name="description"]').content.length <= 160);
  for (const change of metadata.changes) assert.equal(change.after.en, change.before.en, 'English metadata is unchanged');
});

test('reviewed English condition translates the existing rounding rule only', () => {
  assert.equal(condition.collection, 'storageConditions');
  assert.equal(condition.changes.length, 1);
  const change = condition.changes[0];
  assert.match(change.after.en, /vehicle’s length, rounded up to the next whole foot/);
  assert.equal(change.after.fr, change.before.fr);
  const document = render('en');
  assert.ok(document.querySelector('#season-grid').textContent.includes(change.after.en));
  assert.ok(!document.querySelector('#season-grid').textContent.includes(change.before.en));
});
