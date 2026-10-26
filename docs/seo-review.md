# SEO review and owner setup

Reviewed 26 October 2026. Website and separate database changes are proposed for review on a feature branch. No database changes have been applied. Nothing has been merged or manually deployed. No search-engine submissions, business registrations, account verification or customer requests were performed.

## Verified findings

Read repository README and both deployment workflows before editing. No repository AGENTS.md file exists; followed the instructions supplied in the task. GitHub Pages API reports workflow deployment, custom domain `entrepot.as-colle.com`, HTTPS enforced, and source `main`. The regular deployment workflow runs on main pushes/manual dispatch. Tracker data publishing runs on manual/repository dispatch. Feature-branch pushes do not deploy; new PR checks only build and test. Do not manually dispatch deployment on this branch.

Live read-only HTTP checks found:

| URL / feature | Before change |
| --- | --- |
| Primary homepage | HTTP 200, English initial HTML; French selected by JavaScript |
| JSON-LD | JSON parser failed at missing comma after business name |
| Canonical | Missing |
| Curran and Plantagenet | Absent from initial homepage HTML |
| Facility address | Only `Conc 4, Alfred, ON K0B 1A0`; no civic number |
| `/robots.txt`, `/sitemap.xml` | Both HTTP 404 |
| `/staging/` | HTTP 200; initial noindex exists; runtime copies homepage metadata |
| `https://colleeseum.github.io/entrepot/` | HTTP 301 to primary domain |
| `https://warehouse.as-colle.com/` | HTTP 200 redirect document with meta-refresh/JavaScript to `/?lang=en` |
| `https://tracker-187c5.web.app/` | HTTP 200 application shell; no robots meta in initial HTML |

Public search visibility was reported by the owner. This review does not claim the site is wholly unindexed. Search-engine account data was unavailable.

## Implemented changes

- Static `/en/` and `/fr/` pages share a template and consume the existing Tracker export directly. Database copy is authoritative in both the build and browser, including staging refreshes. There is no marketing overlay. Generated Tracker data remains unedited. Proposed copy is isolated in `database/seo-content.changes.json`, which is never loaded by the site or build.
- Translated titles, descriptions, H1, introduction, image descriptions, and full core content are present before JavaScript executes. Metadata uses database `seo.title`/`seo.description` when present, otherwise existing database hero title/description; image descriptions similarly use database captions until dedicated keys exist. The new arrival section is omitted until its database copy exists. Seasonal summaries and conditions come from the existing export. Interactive pricing continues to use its original implementation and data.
- Self-referencing canonicals, reciprocal `en` / `fr` hreflang and `x-default` pointing to `/en/`.
- Root remains an English compatibility alias, canonicalized to `/en/`, with existing anchors intact. Explicit legacy `?lang=` and language fragments are handled separately from Firebase and navigate to canonical language paths. No automatic redirects based on browser language, hostname or saved preference. Legacy query URLs remain English without JavaScript; ordinary language links always work.
- Language selectors are normal anchors. JavaScript preserves equivalent sections and staging context. Full navigation does not transfer unsaved form entries; the existing browser memory remains unchanged.
- Proposed database copy identifies the actual Alfred facility and nearby Plantagenet/Curran. Ottawa and Montréal are clearly customer origins, not additional facilities. French copy includes entreposage intérieur, entreposage saisonnier, VR, roulottes, voitures and motos. This copy is prepared for review only, not applied.
- The proposed database changes add suitability, directions, appointments, seasonal-access and booking guidance, and replace unsupported monitoring/20-foot-clearance/travel-time promises with conservative wording. Existing database wording stays in generated pages until these changes are approved, applied and exported. Detailed offers, add-ons and contractual policies are unchanged.
- JSON-LD is serialized programmatically. `LocalBusiness` is used conservatively because the material describes managed seasonal vehicle storage, while Schema.org defines `SelfStorage` as a self-storage facility. Owner confirmation of the operating model can justify a more specific type later. `availableLanguage` was moved to `ContactPoint`, where Schema.org supports it. Email matches the visible language-specific booking contact. Service areas are included only when `seo.areaServed` is present in the database export; no additional city list is hardcoded in the renderer. Partial existing address is preserved exactly, not completed by inference. No coordinates, opening hours, ratings, reviews or business-profile links were invented.
- Canonical marketing pages only in sitemap; robots.txt references it. Root alias, staging, Tracker and documents are excluded from the sitemap. Staging retains noindex after copying the generated shell and does not copy public canonical/hreflang/JSON-LD. Query staging receives runtime noindex only, so `/staging/` is preferred.
- Deployment workflows now build and validate the same artifact after normal code updates and Tracker content exports. Only the allowlisted `_site/` output is uploaded, keeping source, tests, documentation and the checked-out Tracker exporter out of the public artifact. Pricing, Firebase configuration and submission APIs remain unchanged.
- Browser QA uncovered pre-existing CSS hiding the request form on mobile and a CAPTCHA overflow. The form is now available on mobile, with single-column fields and compact CAPTCHA rendering. Responsive seasonal grids, price wrapping and tooltip positioning also prevent horizontal overflow.

Structured data describes the business. It is not a ranking guarantee. JSON syntax/property checks do not certify rich-result eligibility; the incomplete address still needs owner confirmation.

## Remaining factual questions for the owner

1. What is the complete civic facility address, official road spelling and correct entrance/map pin? Confirm which address belongs in customer directions versus the St-Eustache office. No civic number or map pin was inferred.
2. Confirm the business name used on signage and invoices, the exact storage operating model, and the primary contact email/phone for consistent listings. Existing English/French booking emails are retained.
3. Confirm indoor floor surfaces, heating status, actual usable door height/width and bay clearance. The prior 20-foot claim is not treated as verified clearance.
4. Confirm physical security, access control and monitoring arrangements before advertising them. No enhanced security claims were added.
5. Confirm outdoor surfaces, vehicle size restrictions and current availability, plus battery disconnect/charging and propane services. Existing offers remain in the exported data; their presence is source evidence, not an independent site inspection.
6. Confirm winter access, snow clearance and appointment notice. Existing conditions say no vehicle access during storage and seven days' notice; do these apply to every season? Do not advertise on-demand pickup.
7. Resolve inconsistent seasonal dates in Tracker. Winter timeframe begins 17 October 2026 while duration/policy begins 16 October. Winter pickup deadline is 25 April 2027 while one policy says 15 April to 25 October 2027. Summer 2026 is still listed after its end date, and some fields differ between 9 and 11 October. These were not silently rewritten.
8. Resolve deposit wording: facility copy/calculator use a $250 threshold, while one shared condition says $400. Calculations and existing policy source remain unchanged.
9. Confirm routes and travel times from actual customer origins before adding any numerical claims. The proposed database changes remove Ottawa and Montréal travel-time promises; current database wording is preserved until those changes are applied.

## Owner setup checklist

These tasks require owner access and have not been completed by this change.

### Google Search Console

- Verify ownership of the domain property using DNS, or verify the appropriate URL-prefix property using an available supported method. Keep existing verification records.
- After the reviewed change is deployed, submit `https://entrepot.as-colle.com/sitemap.xml`.
- Use URL Inspection for `/en/` and `/fr/`; check fetched HTML, crawl permission, selected canonical and indexing status. Request indexing where appropriate after deployment.
- Record a baseline of impressions, clicks and queries. Monitor English/French storage queries and local terms over time, along with indexing/crawl errors. Do not infer failure from a short period without traffic.

### Bing Webmaster Tools

- Add and verify the actual site, or use the supported Search Console import if suitable for the owner's accounts.
- Submit the same canonical sitemap after deployment. Inspect indexing/crawl reports and monitor queries/impressions.

### Google Business Profile and Bing Places

- Find and claim an existing listing before creating another. Verify the actual Alfred facility with the owner. Use the complete confirmed facility address and accurate map pin, not an office address or an invented Ottawa/Montréal branch.
- Choose the closest accurate category supported by each service and the actual business model. Keep real-world name, address, phone and website consistent across listings.
- Add the primary website, current facility/entrance photos, vehicle suitability information and accurate appointment/access details. Publish hours only when confirmed; explain seasonal restrictions and appointment requirements accurately.
- Ask actual customers for honest reviews. Offer no incentives, do not filter requests to only happy customers, and do not create reviews on customers' behalf.

### Separate hosting and access follow-up

- The alternate warehouse hostname is maintained outside this repository. Propose an owner-approved permanent server redirect directly to `/en/`, preserving useful sections/parameters, rather than assuming this PR changes that host.
- Tracker is a separate application/repository. Add appropriate noindex controls there and verify server-side authorization independently. Inspect its Firebase default hostnames and any admin routes before choosing broader indexing rules. No Tracker changes were made here.
- Robots.txt and noindex are discovery instructions, not confidentiality or authorization controls. Keep backend access rules and authentication in place.

## Validation

Final local results: build succeeded; all five static test groups passed; independent Python JSON and XML parsers passed; browser checks passed in English and French at 1440px and 390px, including flat-rate ($180, $50 deposit) and per-foot (30 ft at $13 = $390, $100 deposit) examples. JavaScript-disabled public pages and discovery files returned HTTP 200 locally. Language navigation, legacy links and staging metadata passed; no callable customer submission was attempted. Desktop and mobile screenshots were visually reviewed. JavaScript syntax and whitespace checks passed.

Reproducible checks:

- `npm run build` generates the full public artifact without contacting Firebase.
- `npm test` also checks that edited database translations control generated content and metadata, that the proposed database changes render correctly after export, and that the migration refuses concurrent edits and duplicate keys. It parses JSON-LD and sitemap XML; checks initial bilingual content, every translated template node, titles/descriptions, canonicals, reciprocal hreflang, local assets/anchors, forms, staging noindex, and exclusion of source/docs/Tracker from the artifact.
- `npm run test:browser` serves the built artifact locally and checks HTTP 200 responses, JavaScript-disabled marketing content and language links, desktop/mobile overflow, flat-rate and per-foot pricing and deposits, form progression, language links with sections, old language URLs, saved-preference isolation, and staging metadata. Outbound callable endpoints are blocked and customer submission count must remain zero. Screenshots are saved under ignored `test-results/`.
- Independent Python XML/JSON parsing and manual inspection of desktop/mobile screenshots supplement these checks.

Live `/en/` and `/fr/` responses cannot be verified until this PR is merged and deployed through the normal pipeline. Local HTTP results validate the proposed artifact, not the unchanged production site. CAPTCHA completion, real submission/email delivery and authenticated staging edits are deliberately not exercised. The local-content improvements and new dedicated SEO metadata remain pending database approval, application and normal export. Existing unverified database claims remain visible until then. There are no ranking or timing promises.

## Documentation checked

- [Google language variants](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Schema.org SelfStorage](https://schema.org/SelfStorage), [LocalBusiness](https://schema.org/LocalBusiness), and [availableLanguage](https://schema.org/availableLanguage)
- [Google LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Getting started with Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start)
- [Bing Webmaster Tools](https://www.bing.com/webmasters/) and [Bing Places](https://www.bingplaces.com/)

- [Bing sitemap documentation](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed)
- [Google Business Profile verification](https://support.google.com/business/answer/7107242?hl=en)
- [Bing Places listing help](https://www.bing.com/forbusiness/help/modernExperience?setlang=en)
