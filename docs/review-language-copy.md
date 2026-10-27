# Review copy corrections

Two focused corrections are staged in the production database for Tracker diff review, backed up before writes, and exported with the existing Tracker exporter. No publishing request, merge or deployment was performed.

- Translate the English seasonal condition as: “Storage fees are based on the vehicle’s length, rounded up to the next whole foot.” The rule’s meaning, French text and tooltip are unchanged.
- Add “de véhicules” to the French title and meta description. English metadata is unchanged, and the French description remains under 160 characters.

The before/after records are `database/review-condition-copy.changes.json` and `database/review-metadata-copy.changes.json`. The migration tool now adds the `key` field only for `i18nEntries`, so migrating condition text does not add an unrelated translation-key field to that record.

Validation was limited to these changes: build, two fixture-based copy checks, actual generated-page inspection, and an export comparison. Only one English condition, its audit timestamp and the two French metadata fields changed. Prices, availability, French conditions, tooltips, contract PDFs and booking behavior are unchanged. The tests use reviewed fixtures so later valid Tracker edits do not need to retain this wording.
