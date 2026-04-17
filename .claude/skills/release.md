---
description: Cut a release. Bumps versions, merges dev to master, tags, and pushes.
user-invocable: true
arguments: "major | minor | point"
---

# Release

Cut a new release of Boundless Grimoire.

## Usage

```
/release minor
/release point
/release major
```

The argument is the bump level:
- `major` — 0.5.1 → 1.0.0
- `minor` — 0.5.1 → 0.6.0
- `point` (or `patch`) — 0.5.1 → 0.5.2

## Steps

Execute these steps **in order**. Stop immediately and report clearly on any failure.

### 1. Preflight

- Confirm a bump level argument was provided (`major`, `minor`, `point`, or `patch`). If not, print usage and stop.
- Run `git status --short` on dev. If there are **staged or unstaged tracked changes**, abort: "Uncommitted changes on dev. Commit or stash first."
- Untracked files are OK.
- Check Chrome Web Store status by running `npx ws ext_cws_status`. If the output does NOT contain "Ready for a new release", abort: "Chrome Web Store is not ready — previous version is still in review. Wait and retry."

### 2. Sync dev with remote

```bash
git checkout dev
git pull --rebase origin dev
```

This catches any collaborator work that landed since the last local commit. If the rebase has conflicts, abort and tell the user to resolve manually.

### 3. Compute the new version

Read the current version from `packages/app/src/version.ts` (the `APP_VERSION` constant). Parse as `major.minor.patch`. Apply the bump:

- `major` → increment major, reset minor and patch to 0
- `minor` → increment minor, reset patch to 0
- `point` or `patch` → increment patch

Print: `Releasing X.Y.Z → A.B.C`

### 4. Typecheck

Run typecheck on the app and extension packages (ignore pre-existing `import.meta` / `AstroComponent` noise):

```bash
cd packages/app && pnpm exec tsc --noEmit 2>&1 | grep -v "'env' does not exist"
cd extensions/boundless-grimoire && pnpm exec tsc --noEmit
```

If either produces errors (other than the known pre-existing ones), abort: "Typecheck failed — fix before releasing."

### 5. Bump version in all 6 locations

The version string lives in exactly these files:

1. `packages/app/src/version.ts` — `APP_VERSION = "X.Y.Z"`
2. `packages/app/package.json` — `"version": "X.Y.Z"`
3. `packages/ui/package.json` — `"version": "X.Y.Z"`
4. `extensions/boundless-grimoire/package.json` — `"version": "X.Y.Z"`
5. `extensions/boundless-grimoire/public/manifest.json` — `"version": "X.Y.Z"`
6. `sites/homepage/package.json` — `"version": "X.Y.Z"`

Use `sed` for the 5 JSON files (replace the old version string with the new one) and Edit for `version.ts`. Verify all 6 match afterward with a grep.

### 6. Commit the release on dev

```bash
git add <all 6 files>
git commit -m "Release A.B.C"
```

### 7. Merge dev into master

```bash
git checkout master
git merge --no-ff dev -m "Merge dev for A.B.C release"
```

If there are merge conflicts (typically version fields from a prior release), resolve by taking the dev (theirs) side for version files, then commit the merge.

### 8. Tag

```bash
git tag -a vA.B.C -m "Release A.B.C"
```

### 9. Push everything

```bash
git push origin dev master vA.B.C
```

If dev push is rejected (remote has new commits), do NOT force-push. Abort and tell the user to pull and retry.

### 10. Switch back to dev

```bash
git checkout dev
```

### 11. Report

Print:
```
Released vA.B.C
  master: <short sha>
  dev:    <short sha>
  tag:    vA.B.C
```
