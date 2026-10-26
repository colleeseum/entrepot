# Ferme Colle vehicle storage

Production: https://entrepot.as-colle.com

## Build and preview

Requires Node.js 22 or 24.

```sh
npm ci --ignore-scripts
npm run build
npm test
python3 -m http.server 8000 --directory _site
```

Open http://localhost:8000/en/ and http://localhost:8000/fr/.
Serve `_site`, not the repository root. Only `_site` is published.

For browser checks (no customer requests are sent):

```sh
npx playwright install chromium
npm run test:browser
```

Set `BROWSER_EXECUTABLE` to use an existing Chromium binary. Screenshots are written to ignored `test-results/`.

## Content sources and publishing

- `templates/home.html` owns the common HTML structure, stable section IDs and forms. Translated nodes are populated at build time, not maintained twice in HTML.
- `static/generated/website-text.generated.js` is exported from Tracker. Do not edit it manually. It remains the source for prices, vehicle types, seasons, conditions, services and existing translations.
- `static/i18n-fallbacks.js` holds existing application fallback translations, shared by browser and build.
- `static/marketing-content.js` contains reviewed bilingual marketing changes, overriding the corresponding Tracker keys in both browser and build. Edit these keys here until the reviewed copy is deliberately migrated to Tracker and the overrides removed. Staging edit links for these keys still open Tracker, but cannot override this file.
- `scripts/build-site.mjs` produces `/en/`, `/fr/`, the English root compatibility alias, discovery files, assets and staging in `_site/`. It reuses translations and seasonal data without contacting Firebase.
- The regular deploy workflow runs on `main` pushes or explicit manual dispatch. The Tracker publishing workflow rebuilds after exporting content. Feature-branch pushes and PR checks validate without publishing. Do not dispatch a deployment workflow on an incomplete branch.
- No hosting, DNS, Firebase endpoints, pricing calculations or request submission APIs were changed.

## URLs

`/en/` and `/fr/` are canonical public pages with reciprocal hreflang. `/` and `/index.html` continue serving English with the same anchors and an `/en/` canonical. There is no browser-language or saved-preference redirect. Explicit old root links such as `/?lang=fr#contact` and `/#fr` navigate to the corresponding language path when JavaScript is available, preserving ordinary fragments and other parameters. Without JavaScript these legacy URLs display the English root with working language links. Explicit `/en/` or `/fr/` paths take precedence over conflicting query parameters and saved preferences.

Language links perform ordinary page navigation and preserve the section when JavaScript is available. Unsaved form entries are not transferred between pages. The existing browser form-memory behavior remains in place.

`/staging/` retains noindex and the existing Firebase sign-in gate. Staging is excluded from the sitemap but allowed in robots.txt so crawlers can see noindex. This is not access control. Query-based staging can only receive a runtime noindex on static hosting; prefer `/staging/`. Tracker itself is hosted and maintained in a separate repository.

See [SEO review and owner setup](docs/seo-review.md) for findings, remaining factual questions, validation and actions requiring owner access.
