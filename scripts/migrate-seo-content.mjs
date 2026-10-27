// Explicit, separately reviewed database operation. Neither build nor CI imports this script.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export function planContentChanges(changes, documents) {
  const byKey = new Map();
  for (const doc of documents) {
    const key = doc.key || doc.id;
    if (byKey.has(key)) throw new Error(`Duplicate database key: ${key}`);
    byKey.set(key, doc);
  }
  return changes.map(change => {
    if (!change.key || !change.after?.en || !change.after?.fr) throw new Error('Every change needs a key and both translations');
    const doc = byKey.get(change.key);
    const current = doc?.text ? { en: doc.text.en || '', fr: doc.text.fr || '' } : null;
    if (isDeepStrictEqual(current, change.after)) return { ...change, id: doc.id, status: 'unchanged' };
    if (!isDeepStrictEqual(current, change.before)) throw new Error(`Database content changed since review: ${change.key}. Review a fresh export before applying.`);
    return { ...change, id: doc?.id || change.key, status: doc ? 'update' : 'create' };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const option = flag => args[args.indexOf(flag) + 1];
  const changesPath = args.includes('--changes') ? resolve(option('--changes')) : new URL('../database/seo-content.changes.json', import.meta.url);
  const proposal = JSON.parse(await readFile(changesPath, 'utf8'));
  const contentField = proposal.field || 'text';
  if (!['text', 'label'].includes(contentField)) throw new Error('Only text or label fields may be migrated');
  if (contentField === 'label' && proposal.changes.some(change => change.before === null)) throw new Error('Label migrations cannot create offers');
  if (!args.includes('--apply')) {
    console.log('REVIEW ONLY. No database connection, write, export or publication performed.');
    console.log(JSON.stringify(proposal, null, 2));
    return;
  }
  for (const flag of ['--tracker-root', '--profile', '--project', '--backup']) {
    if (!args.includes(flag) || !option(flag) || option(flag).startsWith('--')) throw new Error(`--apply requires ${flag}`);
  }
  const trackerRoot = resolve(option('--tracker-root'));
  const requireTracker = createRequire(pathToFileURL(resolve(trackerRoot, 'functions/package.json')));
  const admin = requireTracker('firebase-admin');
  const { loadActiveProfile } = await import(pathToFileURL(resolve(trackerRoot, 'lib/profile-config.js')));
  const { projectId, useEmulators } = await loadActiveProfile({ profileName: option('--profile') });
  if (projectId !== option('--project')) throw new Error(`Selected project ${projectId} does not match explicit --project`);
  const app = admin.initializeApp({ projectId }, 'seo-content-migration');
  const db = app.firestore();
  if (!useEmulators) db.settings({ preferRest: true });
  const backupPath = resolve(option('--backup'));
  try {
    // Transaction prevents overwriting an owner's concurrent edits. Preserve all other fields.
    const snapshot = await db.collection(proposal.collection).get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), text: doc.data()[contentField] }));
    const preview = planContentChanges(proposal.changes, docs);
    const backup = preview.filter(change => change.status !== 'unchanged').map(change => ({
      path: `${proposal.collection}/${change.id}`, field: contentField, existed: change.status !== 'create', key: change.key, text: change.before
    }));
    await writeFile(backupPath, JSON.stringify({ projectId, collection: proposal.collection, documents: backup }, null, 2) + '\n', { flag: 'wx' });
    await db.runTransaction(async transaction => {
      const current = await transaction.get(db.collection(proposal.collection));
      const plan = planContentChanges(proposal.changes, current.docs.map(doc => ({ id: doc.id, ...doc.data(), text: doc.data()[contentField] })));
      // A concurrent create must not escape the saved backup's document paths.
      if (!isDeepStrictEqual(plan, preview)) throw new Error('Database changed after backup; no writes performed. Review and retry with a fresh backup.');
      for (const change of plan.filter(change => change.status !== 'unchanged')) {
        const fields = { [contentField]: change.after, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (contentField === 'text' && proposal.collection === 'i18nEntries') fields.key = change.key;
        if (change.status === 'create') Object.assign(fields, { category: change.key.split('.')[0], hint: '', createdAt: admin.firestore.FieldValue.serverTimestamp() });
        transaction.set(db.collection(proposal.collection).doc(change.id), fields, { merge: true });
      }
    });
    console.log(`Applied reviewed content to ${projectId}. Backup: ${backupPath}. No website export or publication was triggered.`);
  } finally { await app.delete(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
