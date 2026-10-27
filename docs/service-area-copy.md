# Service-area and bilingual copy follow-up

This change is limited to the requested content and location disclosure. It does not repeat the SEO audit.

## Changes

- A single bilingual service-area paragraph identifies Alfred as the storage facility serving Alfred, Plantagenet, Curran, Hawkesbury, L’Orignal, Vankleek Hill, Wendover, Lefaivre, Rockland, Saint-Isidore, Ottawa and Montréal. The same database list populates JSON-LD `areaServed`.
- Meta descriptions use short, complete sentences about the Alfred facility and broader customer markets, without a town list.
- The facility is described publicly only as Alfred, Ontario. Its street address, postal code and coordinates are not emitted in the public location block or JSON-LD. No exact address or coordinates were requested or added. The separate St-Eustache mailing address remains visible.
- The St-Eustache label explicitly says “Mailing address only — no vehicle storage at this location.” The French label is “Adresse postale seulement — aucun entreposage de véhicules à cet endroit.”
- Corrected the incomplete battery-service sentence and price-dependent propane fragment, while preserving the existing dynamic price placeholders. Both paragraphs remain complete without JavaScript.
- Corrected French contact wording and accents, aligned the French request-form introduction with its existing behavior, and replaced the mixed-language offer label with “Voiture ou camion à l’intérieur.” Only the offer label and its audit timestamp changed.

## Database and publishing

Database copy remains authoritative. Both before/after change sets are committed for review. The copy and offer-label updates have been staged in the production database, with backups saved before application. Tracker’s existing exporter produced the updated generated module in this branch. No hardcoded marketing overlay was introduced.

No merge, publication request or deployment was performed. Review the diff in Tracker. Merge this PR before a separate Tracker publish, so the template and locality-only structured data are present. Merging uses the existing automatic main-branch deployment behavior.

## Focused validation

- `npm run build` and `node --test tests/service-area-copy.test.mjs` passed. Tests render the reviewed change-set fixtures to check all 12 communities, concise descriptions, locality-only facility information, the mailing disclaimer beside St-Eustache and complete service sentences with price placeholders. Separate English/French regression cases render alternate owner-edited communities, descriptions, mailing labels, service wording and offer labels. These tests do not read the mutable database export or require later Tracker edits to retain the reviewed copy.
- The before/after exports were compared. All pricing, availability, seasonal fields, contract conditions, vehicle types, add-ons and unrelated translations are identical. Only selected translations, one offer label and its audit timestamp changed. Contract PDFs and booking JavaScript are unchanged.
- Only the affected facility, services and footer sections were checked visually in English/French at 1440px and 390px with JavaScript disabled. No horizontal overflow was found. No form submissions were made.

## Regional summary and community information popover

A follow-up aligns the short introduction and facility heading around Prescott and Russell, with Ottawa and Montréal as broader customer origins. The full list remains in one native HTML `popover`, opened by a button labelled “Alfred and surrounding areas” / “Alfred et les environs” with an information icon. Visitors can open it by click, tap, Enter or Space and dismiss it with Escape or an outside click. Opening/closing works without JavaScript; a separate small script positions the card beside its button when JavaScript is available. The full paragraph remains in initial HTML. No text is concealed solely for search engines.

The regional database change set is `database/regional-service-copy.changes.json`. It updates six translation entries, including the disclosure label, and retains all twelve communities in `areaServed` while adding “United Counties of Prescott and Russell” / “Comtés unis de Prescott et Russell.” The English/French descriptions are 123/132 characters. Only these translations changed in the before/after database exports; pricing, offers, availability, conditions and other exported data are identical. Changes are staged for Tracker review and have not been published by this task.

Seven focused fixture checks pass. `npm run test:popover` checks native opening and closing by keyboard and click/tap, Escape and outside dismissal, focus restoration and viewport bounds in English/French at 1440px and 390px, both with and without JavaScript. The approved one-key label update is recorded in `database/service-area-popover.changes.json`, backed up and staged without publishing. Copy tests continue to use reviewed fixtures, allowing future Tracker wording changes.

[Google’s hidden-text policy](https://developers.google.com/search/docs/essentials/spam-policies#hidden-text-and-link-abuse) distinguishes search-manipulating concealed text from ordinary expandable content for visitors. [Alfred and Plantagenet’s township site](https://www.alfred-plantagenet.com/en/community-recreation/visit-alfred-plantagenet) identifies the municipality as part of the United Counties of Prescott and Russell; the [French county site](https://fr.prescott-russell.on.ca/) uses “Comtés unis de Prescott et Russell.”
