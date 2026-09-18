# Root Additions — This Repository

Read with `root-additions-policy.md`, which this file does not restate. Only
what is specific to this repository is here.

## Two shapes that turn up at this root

- A file named `report.<pid>.<timestamp>.<n>.<n>.<n>.json` is a Node.js
  diagnostic dump, not a production artifact. Find what produced it, then
  delete it or move it under `tmp/`.
- A review pack belongs at `.qfai/review/review-<timestamp>/`, never at the
  repository root.

## A README belongs where one is published

Two are tracked, and each is a page someone lands on: `README.md` is the
project's, and `packages/qfai/README.md` is the one npm publishes —
`package.json#files` names it, and `scripts/check-readme-alignment.mjs` holds it
line for line against the root copy.

Anywhere else, a `README.md` is a second place to say something, and the first
place stops being read. What a directory needs to say goes where the reader
already is:

| What it says                | Where it goes                                                               |
| --------------------------- | --------------------------------------------------------------------------- |
| A rule to follow            | A rule in `.agents/rules/`, which every entry point routes to               |
| How to do a thing correctly | The guard that fails when it is done wrong, in its message and its docblock |
| Where to look next          | The entry point that sent the reader — `AGENTS.md`, `CLAUDE.md`, the skill  |

`scripts/check-tracked-readmes.mjs` fails on a tracked `README.md` outside those
two, so the rule holds for a contributor who never read it.

## What else lives in `.agents/rules/`

`reminders.json` is not a rule. It holds the message each reminder hook in
`.claude/settings.json` prints, and it ships beside the rules those messages
restate, so `qfai init` refreshes the two together.

## Adding a rule to `.agents/rules/`

1. Write it. If it governs an adopter's repository too, write it in
   `packages/qfai/assets/init/root/.agents/rules/<name>.md` and link it here:

   ```sh
   MSYS=winsymlinks:nativestrict ln -s \
     ../../packages/qfai/assets/init/root/.agents/rules/<name>.md \
     .agents/rules/<name>.md
   ```

   A rule about this repository alone is a plain document in that directory.
   Either way it opens with a level-1 heading naming the rule: that heading is
   how the surface suite finds it, so there is no list to keep in step.

2. Link it from `.claude/rules/<name>.md`, and check what you got — `ln -s` in
   Git Bash copies the target unless the variable above is set, and a copy looks
   right until the master moves:

   ```sh
   git add .claude/rules/<name>.md
   git ls-files -s .claude/rules/<name>.md   # 120000 is a link, 100644 is a copy
   ```

   `scripts/check-tracked-symlinks.mjs` fails on the copy, and its output
   carries the rest of what a checkout without symlink support looks like.

3. Cite it from `AGENTS.md`, `CLAUDE.md` and `.github/copilot-instructions.md`.
   A shipped rule is cited from `root/AGENTS.md` and `root/CLAUDE.md` too, so an
   adopter's entry points name it.

4. Add a block to `agentsRulesSurface.test.ts` naming one token per clause, and
   each entry point that cites it. The link and the heading are held for every
   rule already; the clauses are held only by the block you write.
