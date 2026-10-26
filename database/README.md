# Proposed database copy changes

The initial SEO copy was later applied at the owner’s request. The service-area follow-up is staged in production for Tracker review; no publication was triggered by that follow-up. See [the focused change notes](../docs/service-area-copy.md).

`seo-content.changes.json` records the proposed before/after English/French values for `i18nEntries` in Tracker. It replaces the previous hardcoded marketing overlay. The browser, build and deployment workflows never read this file. The proposal contains no pricing, policy, availability, address or contact changes. It adds metadata, image descriptions and arrival guidance, and revises existing marketing wording.

The database stays the source of truth. The site uses `static/generated/website-text.generated.js`, produced by Tracker's existing exporter. Until the proposed changes are applied to the database and exported, the site renders current database copy. There is no hidden application of the proposal during builds. New dedicated SEO fields fall back to existing database hero text; the arrival section waits for its database keys.

## Review without connecting to a database

```sh
node scripts/migrate-seo-content.mjs
```

Default behavior only prints the proposal. It does not load Firebase, use credentials, connect to a database, modify the export or trigger publishing. The proposal's expected `before` values come from the committed database export. Review the factual questions in [the SEO review](../docs/seo-review.md) before approving copy.

## Later application, outside this PR's review-only scope

An authorized owner can edit/create the listed keys through Tracker's existing Website copy editor. Keep both translations and use the existing records for updates. This is sufficient; the migration tool is optional.

For a reproducible application, the tool uses the existing Tracker checkout, its Firebase Admin dependency and profile loader. It requires all target options explicitly:

```sh
node scripts/migrate-seo-content.mjs --apply \
  --tracker-root ../tracker \
  --profile prod \
  --project tracker-187c5 \
  --backup /absolute/path/to/seo-copy-before.json
```

This command is documentation for later use. It was not executed. Use the owner's normal credentials; do not commit credentials or backups. Review the selected Tracker profile and project before running it. Emulator/local profiles can be used for a separate rehearsal with their explicit project ID.

The tool locates records by their actual `key`, so it preserves nonstandard document IDs. Duplicate keys or content changed since the reviewed snapshot stop the operation rather than overwrite owner edits. Updates preserve unrelated document fields, including other languages. Already-applied values are skipped. A backup of affected text and record paths is created with exclusive file creation before writes. A transaction rechecks the content before committing. The backup records whether a document existed, for a separately reviewed text restoration or removal of newly created records if needed.

Applying database changes does not publish the website. Afterwards, use Tracker's normal review/export/publish flow, which regenerates `static/generated/website-text.generated.js` and rebuilds the bilingual pages. Do not manually edit the generated export. Review generated `/en/` and `/fr/` and rerun the checks after export.

## Validation performed

- Offline proposal printing ran without a database connection.
- Unit checks verify database edits win over all application content, proposed translations render correctly, already-applied changes are skipped, and concurrent edits/duplicate keys are rejected.
- The production build uses only the committed database export and existing application fallbacks.
- The `--apply` path and actual Firebase writes have not been exercised. No database changes or publish requests were made.

## Service-area follow-up

`service-area-copy.changes.json` records the bilingual `i18nEntries` updates. `service-area-offer-label.changes.json` records a label-only update to an existing `storageOffers` document. The generated website snapshot was refreshed through Tracker’s exporter, not edited manually.

Use `--changes <path>` to select a change set for offline review or explicit application. The default remains the initial SEO proposal. A change set may specify `field: "label"` for an existing offer; only that field and its audit timestamp are written. Label migrations cannot create offers. Backup entries record which field changed. All existing target checks, expected-value conflict checks and transactional writes remain in place.

Do not reapply the initial proposal to undo later owner edits. Application remains separate from merging and publishing.
