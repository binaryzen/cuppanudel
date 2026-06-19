# Version Management

## Format

```
major.minor.build
```

Examples: `0.1.1`, `0.1.124`, `0.2.1`, `1.1.1`

- **major** and **minor** are managed explicitly (edit `poc/version.js` by hand before committing the change).
- **build** is auto-incremented by the pre-commit hook on every commit.

## Version File

`poc/version.js` — ES module, single export:

```js
export const VERSION = '0.1.1';
```

Imported by `main.js` and displayed in the app header as `cuppanudel 0.1.1`.

## Pre-commit Hook

`.git/hooks/pre-commit` calls `node scripts/bump-version.js` before each commit.

`scripts/bump-version.js` algorithm:

1. Read `poc/version.js` → current `major.minor.build`.
2. Read `git show HEAD:poc/version.js` → HEAD `major.minor` (skips if no HEAD, e.g. first commit).
3. If `major` or `minor` differs from HEAD → set `newBuild = 1`.
4. Otherwise → set `newBuild = currentBuild + 1`.
5. Write the new version back to `poc/version.js`.
6. `git add poc/version.js` so the bumped version is included in the commit.

## Increment Examples

| Before commit | Manually changed `major.minor`? | After commit |
|---|---|---|
| `0.1.123` | No | `0.1.124` |
| `0.1.124` | Yes → `0.2.1` in file | `0.2.1` |
| `0.2.1` | No | `0.2.2` |
| `0.2.5` | Yes → `1.1.1` in file | `1.1.1` |

## Rules

- **Never** manually increment the build number; the hook owns it.
- To bump major or minor: edit `poc/version.js` directly, set build to any value (the hook resets it to `1` if `major.minor` changed).
- The hook is idempotent within a single commit: it reads the staged file, not the working tree.
- Starting version: `0.1.1`.
