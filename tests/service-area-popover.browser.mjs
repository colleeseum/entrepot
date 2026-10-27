import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { I18N } from '../static/generated/website-text.generated.js';

const server = createServer(async (req, res) => {
  try {
    let path = resolve('_site', `.${new URL(req.url, 'http://localhost').pathname}`);
    if ((await stat(path)).isDirectory()) path += '/index.html';
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {});
await mkdir('test-results', { recursive: true });
try {
  for (const lang of ['en', 'fr']) for (const width of [1440, 390]) for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled, hasTouch: width === 390, viewport: { width, height: 1000 } });
    // Exercise this independent UI without Firebase, analytics or booking code.
    await context.route('**/static/site.js', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/${lang}/`);
    const trigger = page.locator('#service-area-label');
    const popover = page.locator('#service-area-popover');
    assert.equal((await trigger.innerText()).replace(/\s+i\s*$/, '').trim(), I18N['facility.serviceAreaSummary'][lang]);
    assert.equal(await popover.isVisible(), false);

    // Keep the trigger in view before testing keyboard activation; the page uses smooth scrolling.
    await trigger.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await trigger.focus();
    await page.keyboard.press('Enter');
    await popover.waitFor({ state: 'visible' });
    if (javaScriptEnabled) await page.waitForFunction(() => document.getElementById('service-area-popover').style.left !== '');
    const bounds = await popover.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, 'popover must fit horizontally');
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 1000, 'popover must fit vertically');
    assert.equal((await popover.innerText()).trim(), I18N['facility.serviceArea'][lang]);
    await page.screenshot({ path: `test-results/popover-${lang}-${width}-${javaScriptEnabled ? 'js' : 'nojs'}.png` });
    await page.keyboard.press('Escape');
    await popover.waitFor({ state: 'hidden' });
    assert.ok(await trigger.evaluate(el => el === document.activeElement));

    await page.keyboard.press('Space');
    await popover.waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await popover.waitFor({ state: 'hidden' });
    if (width === 390) await trigger.tap();
    else await trigger.click();
    await popover.waitFor({ state: 'visible' });
    if (width === 390) await page.touchscreen.tap(8, 8);
    else await page.mouse.click(8, 8);
    await popover.waitFor({ state: 'hidden' });
    assert.deepEqual(errors, []);
    console.log(`PASS ${lang}, ${width}px, JavaScript ${javaScriptEnabled ? 'on' : 'off'}: label, keyboard, click/tap, Escape, outside dismissal and bounds`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
