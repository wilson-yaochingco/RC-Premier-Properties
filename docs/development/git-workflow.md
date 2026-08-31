# Git & GitHub Workflow

How every contributor gets code into RC Premier Properties.

---

## > MAIN IS NOT A DEVELOPMENT BRANCH

**Never start, commit, or push feature work directly from `main`.**

Create a branch **before** you begin editing — not after you have changes to deal with.

```text
main
 ↓
create branch
 ↓
make changes
 ↓
review changes
 ↓
commit
 ↓
push branch
 ↓
Pull Request
 ↓
review
 ↓
merge into main
```

This applies to every kind of work: features, fixes, refactors, chores — **and
documentation**. There is no change small enough to justify committing on `main`.

> **Current status:** branch protection is **not yet enabled** on GitHub, so `main`
> will technically accept a direct push. The rule above is enforced by agreement, not
> by the platform. Enabling protection requires repository admin access — see
> [Repository settings](#repository-settings-still-to-do).

---

## 1. Clone the repository

First time setting up:

```bash
git clone <repository-url>
cd RC-Premier-Properties
```

Then follow [`setup.md`](setup.md) for dependencies, environment files and MongoDB.

**Environment files are not in the repository.** `.env` and `.env.local` are
git-ignored by design. The repository contains only `.env.example` templates with
variable names and no real values. Get actual values from the team through a secure
channel — never from a chat message, screenshot, issue, or commit.

## 2. Before starting ANY new task

Always begin from an up-to-date `main`:

```bash
git checkout main
git pull origin main
```

Then check where you stand:

```bash
git status
```

You want `nothing to commit, working tree clean`. If it isn't clean, deal with those
changes first — see [If you already started working on main](#if-you-already-started-working-on-main).

## 3. Create a branch BEFORE editing code

**This step is mandatory and comes first.**

```bash
git checkout -b <branch-name>
```

### Branch naming

| Prefix      | Use for                                |
| ----------- | -------------------------------------- |
| `feature/`  | New functionality                      |
| `fix/`      | Bug fixes                              |
| `docs/`     | Documentation changes                  |
| `refactor/` | Restructuring without behaviour change |
| `chore/`    | Dependencies, config, tooling          |

Examples:

```text
feature/property-listings
feature/admin-dashboard
feature/authentication
fix/property-search
docs/update-setup-guide
refactor/property-service
chore/update-dependencies
```

Branch names should be **lowercase**, use **hyphens between words**, be **short but
descriptive**, and describe **one logical piece of work**.

## 4. Make the changes

Only now do you start editing files.

Keep the branch focused on one task. If you notice an unrelated problem while working,
note it down and fix it on its own branch. A branch that fixes a bug _and_ upgrades a
dependency _and_ renames some files is hard to review and hard to revert.

## 5. Check your changes before committing

```bash
git status
git diff
```

Read the diff properly. You are looking for anything that should not be there:

- `.env`, `.env.local`, or any file containing credentials
- `node_modules/`, `.next/`, `dist/`, or other generated output
- Debugging leftovers — `console.log`, commented-out blocks, temporary files
- Changes unrelated to this branch's task

## 6. Stage changes

Prefer naming files explicitly, so nothing sneaks in:

```bash
git add backend/src/modules/properties/property.service.ts
git add docs/features/properties.md
```

When everything in the working tree genuinely belongs to this commit:

```bash
git add .
```

Then confirm what is staged:

```bash
git status
```

## 7. Commit

```bash
git commit -m "feat: add property listing filters"
```

### Commit message prefixes

| Prefix      | For                                    |
| ----------- | -------------------------------------- |
| `feat:`     | New functionality                      |
| `fix:`      | Bug fix                                |
| `docs:`     | Documentation                          |
| `refactor:` | Restructuring without behaviour change |
| `chore:`    | Dependencies, config, tooling          |
| `test:`     | Tests                                  |
| `style:`    | Formatting only, no logic change       |

Examples:

```bash
git commit -m "feat: add property listing filters"
git commit -m "fix: correct property search query"
git commit -m "docs: update MongoDB setup guide"
git commit -m "refactor: simplify property service"
```

A commit should be a meaningful checkpoint — something you could describe in one
sentence — and should not mix unrelated changes.

## 8. Sync with main before pushing

If `main` moved while you were working, bring those changes into your branch:

```bash
git fetch origin
git merge origin/main
```

Resolve any conflicts **locally**, before opening or merging the PR. See
[Merge conflicts](#merge-conflicts).

**Do not force push** as part of normal work. If you think you need `--force`, stop and
ask — force pushing can destroy a teammate's commits.

## 9. Push your branch

Push **your branch only**:

```bash
git push -u origin <branch-name>
```

For example:

```bash
git push -u origin feature/property-listings
```

The `-u` sets the upstream, so afterwards a plain `git push` is enough.

**Do not run:**

```bash
git push origin main      # ← not for feature development
```

## 10. Open a Pull Request

```text
feature branch
      ↓
 Pull Request
      ↓
   Review
      ↓
    main
```

On GitHub, open a PR from your branch into `main`. A good PR includes:

- A descriptive title — the commit-message style works well
- **What changed** and why
- **Important implementation decisions**, especially anything a reviewer would question
- **How to test it** — the steps you actually ran
- **Screenshots** for meaningful UI changes
- **Known limitations** or follow-up work

CI runs `format:check`, `lint`, `typecheck` and `build` on every PR. Run those locally
first — a green local run means a green PR:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run build
```

## 11. Review and merge

**All changes reach `main` through a Pull Request.**

The team reviews the PR, and requested changes are resolved before it merges. Push
follow-up commits to the same branch — the PR updates automatically.

Do not merge your own PR unless you are authorised to manage the repository.

## 12. After the PR is merged

Update your local repository:

```bash
git checkout main
git pull origin main
```

Delete the local branch once you no longer need it:

```bash
git branch -d feature/property-listings
```

GitHub usually deletes the remote branch on merge. If it did not:

```bash
git push origin --delete feature/property-listings
```

Your next task starts from step 2 — updated `main`, brand new branch.

---

## If you already started working on main

It happens. **Do not commit to `main` to "fix" it.**

If your changes are **not yet committed**, you can carry them onto a new branch. Git
keeps uncommitted work in the working tree when you switch branches:

```bash
git switch -c feature/appropriate-name
```

or equivalently:

```bash
git checkout -b feature/appropriate-name
```

Then confirm your work came with you:

```bash
git status
```

Your changes are still there — they now belong to work on the new branch. Review, stage
and commit normally from step 5.

**If you already committed to `main`, or you are unsure what state things are in: stop
and ask.** Do not run `git reset --hard`, `git checkout -- .`, `git clean`, or anything
else that discards work. Uncommitted changes deleted by those commands are usually gone
for good. Asking costs a few minutes; guessing can cost a day's work.

---

## Merge conflicts

A conflict happens when two people change overlapping lines. It is normal, not a
failure.

```bash
git fetch origin
git merge origin/main
```

Git marks conflicted files with markers:

```text
<<<<<<< HEAD
your version
=======
the version from main
>>>>>>> origin/main
```

Open each file, decide what the code **should** be, and remove the markers entirely.
Then:

```bash
git add <resolved-files>
git commit
```

**Understand both sides before choosing.** Never blindly take "ours" or "theirs" — the
correct result is often a combination, and sometimes neither version is right on its
own. If a conflict is in code you did not write, ask the person who did.

Verify the result actually works before pushing:

```bash
npm run lint && npm run typecheck && npm run build
```

---

## Secrets and environment variables

**NEVER commit:**

- `.env` or `.env.local`
- Database passwords
- MongoDB connection strings containing credentials
- API keys
- Authentication secrets
- Production credentials of any kind

The repository contains `.env.example` files listing variable **names** with no real
values:

```ini
MONGODB_URI=
```

Every developer keeps their real values locally, in files git ignores.

**If you do commit a secret**, changing the file in a later commit is not enough — it
stays in git history. Rotate the credential immediately, then tell the team. The same
applies to pasting a credential into a chat, an issue, or a screenshot: once it has left
your machine, treat it as compromised and rotate it.

---

## MongoDB for team development

Developers connect to the team's shared MongoDB Atlas development database using the
approved application credentials, **supplied privately by the team**. They are not in
this repository and must never be added to it.

Two things to expect:

- Atlas **Network Access** may need to allow your IP address before you can connect.
  Ask whoever administers the Atlas project.
- The application user is scoped to the project's database only. If a query is rejected
  on a different database, that is the restriction working correctly.

Setup steps are in [`setup.md`](setup.md).

---

## Quick reference

```bash
# start every task from an updated main
git checkout main
git pull origin main
git checkout -b feature/my-feature

# ... make changes ...

git status
git diff
git add .
git commit -m "feat: implement my feature"

# bring in anything that landed on main meanwhile
git fetch origin
git merge origin/main

git push -u origin feature/my-feature
```

Then: **Open PR → Review → Merge to main**

After the merge:

```bash
git checkout main
git pull origin main
git branch -d feature/my-feature
```

---

## Repository settings (still to do)

These require repository admin access and are not yet configured:

- [ ] Enable branch protection on `main`
- [ ] Require a Pull Request before merging
- [ ] Require the CI check to pass before merging
- [ ] Add a pull request template

Until branch protection is enabled, `main` will accept a direct push. Follow the
workflow anyway — the convention only works if everyone keeps to it before the
platform enforces it.
