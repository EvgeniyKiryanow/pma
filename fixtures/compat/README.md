# Compatibility fixtures

One folder per release that introduced or changed a data format. Each holds what that release
wrote, with synthetic people only:

- `backup.pmb` — a full backup made by the release (password in `expected.json`);
- `data/` — its data folder: encrypted `users.db`, `keystore.json` (no Windows copy of the key,
  so it opens on any computer with the account password) and an encrypted attachment;
- `expected.json` — what must come back: people, positions, the account, the document text.

`tests/integration/compatibility.test.ts` restores every backup and opens every data folder
here with the current code. A failure means an update would break data written by that
release — fix the code, never the fixture.

Add a folder when a release changes a format (never rewrite an existing one):

```bash
PMA_MAKE_FIXTURES=v2.1.0 npx vitest run tests/compat/make-fixtures.test.ts
```
