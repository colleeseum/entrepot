import { I18N } from '../static/generated/website-text.generated.js';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const server = createServer(async (req, res) => {
  try {
    let path = resolve('_site', `.${new URL(req.url, 'http://localhost').pathname}`);
    if ((await stat(path)).isDirectory()) path += '/index.html';
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml' })[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {});
await mkdir('test-results', { recursive: true });
let forbiddenRequests = 0;
try {
  // Public HTML and native language links must work with JavaScript disabled.
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const page = await nojs.newPage();
  for (const route of ['/', '/en/', '/fr/']) {
    assert.equal((await page.goto(`${base}${route}`)).status(), 200);
    assert.equal(await page.locator('h1').innerText(), I18N['hero.title'][route === '/fr/' ? 'fr' : 'en']);
    assert.ok((await page.locator('#season-grid').innerText()).length > 800);
  }
  await page.locator('[data-lang-toggle="en"]').click();
  assert.equal(new URL(page.url()).pathname, '/en/');
  for (const route of ['/sitemap.xml', '/robots.txt']) assert.equal((await page.request.get(`${base}${route}`)).status(), 200);
  await nojs.close();

  const context = await browser.newContext();
  await context.route(/cloudfunctions\.net|google-analytics\.com|firestore\.googleapis\.com/, route => {
    if (route.request().method() === 'POST' && /cloudfunctions/.test(route.request().url())) forbiddenRequests++;
    return route.abort();
  });
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', error => errors.push(error.message));
  for (const lang of ['en', 'fr']) {
    for (const width of [1440, 390]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.goto(`${base}/${lang}/`);
      await p.waitForFunction(() => document.querySelector('#contract-helper select[name="season"]').options.length > 1);
      assert.equal(await p.locator('html').getAttribute('lang'), lang);
      assert.equal(await p.locator('h1').innerText(), I18N['hero.title'][lang]);
      assert.equal(await p.locator('html').evaluate(el => el.scrollWidth <= window.innerWidth), true, `${lang} overflow at ${width}`);
      await p.screenshot({ path: `test-results/${lang}-${width}.png`, fullPage: true });
      await p.screenshot({ path: `test-results/${lang}-${width}-hero.png` });
      await p.locator('#seasons').screenshot({ path: `test-results/${lang}-${width}-seasons.png` });
      const form = p.locator('#contract-helper');
      await form.locator('[name="season"]').selectOption('winter');
      await form.locator('[name="tenantName"]').fill('SEO test, not submitted');
      await form.locator('[name="tenantPhone"]').fill('6135550100');
      await form.locator('[name="tenantAddress"]').fill('Test address');
      await form.locator('[name="email"]').fill('seo-test@example.invalid');
      await form.locator('[name="tenantCity"]').fill('Alfred');
      await form.locator('[name="tenantPostal"]').fill('K0B 1A0');
      await form.locator('[name="tenantProvince"]').selectOption('ON');
      await form.locator('[data-step-next]').click();
      await form.locator('[name="vehicleType"]').selectOption('motorcycle');
      await p.waitForFunction(() => document.querySelector('[name="leaseCost"]').value.includes('180'));
      assert.equal(await form.locator('[name="deposit"]').inputValue(), '50');
      await form.locator('[name="storageLocation"]').selectOption('outdoor');
      await form.locator('[name="vehicleType"]').selectOption('rv');
      await form.locator('[name="vehicleLength"]').fill('30');
      await p.waitForFunction(() => document.querySelector('[name="leaseCost"]').value.includes('390'));
      assert.equal(await form.locator('[name="deposit"]').inputValue(), '100');
      assert.ok((await p.locator('#season-grid table').count()) >= 2);
      assert.ok(await p.locator('#contact-form [name="email"]').isVisible());
      // Change section before switching; native links should retain the fragment.
      await p.evaluate(() => { location.hash = 'facility'; });
      await p.waitForFunction(() => document.querySelector('[data-lang-toggle="fr"]').hash === '#facility');
      const other = lang === 'en' ? 'fr' : 'en';
      await p.locator(`[data-lang-toggle="${other}"]`).click();
      await p.waitForURL(`**/${other}/#facility`);
      await p.waitForFunction(expected => document.documentElement.lang === expected, other);
      console.log(`PASS ${lang} ${width}px: layout, pricing, forms and language link`);
    }
  }
  await p.goto(`${base}/?lang=fr#contact`);
  await p.waitForURL('**/fr/#contact');
  await p.evaluate(() => localStorage.setItem('ferme-colle-language', 'en'));
  await p.goto(`${base}/fr/`);
  await p.waitForFunction(() => document.querySelector('#contract-helper select[name="season"]').options.length > 1);
  assert.equal(await p.locator('html').getAttribute('lang'), 'fr');
  await p.goto(`${base}/#fr`);
  await p.waitForURL('**/fr/');
  await p.goto(`${base}/staging/`);
  await p.waitForFunction(() => document.title === 'Ferme Colle Staging');
  assert.equal(await p.locator('meta[name="robots"]').last().getAttribute('content'), 'noindex, nofollow');
  assert.equal(await p.locator('link[rel="canonical"],link[rel="alternate"],script[type="application/ld+json"]').count(), 0);
  assert.deepEqual(errors, []);
  assert.equal(forbiddenRequests, 0);
  console.log('PASS no-JS HTTP content, legacy URLs, saved preference isolation, staging metadata, zero customer submissions');
  await context.close();
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
