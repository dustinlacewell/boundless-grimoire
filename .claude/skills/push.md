---
description: Commit staged work, sync with remote, and push to dev.
user-invocable: true
arguments: "[commit message]"
---

# Push

Commit current work, pull any upstream changes, and push to dev.

## Usage

```
/push Fixed the card zoom regression
/push
```

If a commit message is provided, use it directly. If not, examine the staged diff and draft a concise message (1-2 sentences, focus on the "why").

## Steps

### 1. Verify branch

Run `git branch --show-current`. If on `master`, abort: "You're on master. Switch to dev or a feature branch first."

### 2. Check for changes

Run `git status --short`. If there are no staged or unstaged tracked changes, abort: "Nothing to push."

### 3. Stage

If there are unstaged tracked changes, stage them with `git add` for each changed file. Do NOT use `git add -A` — avoid accidentally staging untracked files (design docs, scratch scripts, .env). Only stage files that were already tracked and modified, plus any new files that are clearly part of the feature (source code in `packages/`, `extensions/`, `sites/`, `.claude/`).

Ask before staging untracked files outside those directories.

### 4. Commit

If the user provided a message, use it. Otherwise, read the staged diff and draft a message. Commit:

```bash
git commit -m "<message>"
```

### 5. Sync with remote

Pull and rebase over any upstream work so our commit sits on top:

```bash
git fetch origin dev
git rebase origin/dev
```

If the current branch is a feature branch (not dev), still rebase over origin/dev to stay current.

If rebase conflicts arise, abort the rebase (`git rebase --abort`) and tell the user to resolve manually. Do NOT force through.

### 6. Typecheck

Run typecheck on the app and extension packages:

```bash
cd packages/app && pnpm exec tsc --noEmit
cd extensions/boundless-grimoire && pnpm exec tsc --noEmit
```

Ignore pre-existing noise (`import.meta.env`, `AstroComponentFactory`). If there are NEW errors, abort: "Typecheck failed — fix before pushing." Leave the commit in place so the user can amend.

### 7. Push

```bash
git push origin <current-branch>
```

If push is rejected (remote moved again during our typecheck), pull-rebase once more and retry. If it fails a second time, abort.

### 8. Report

Print the branch name, short SHA, and commit message.
