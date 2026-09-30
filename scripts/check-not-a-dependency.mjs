#!/usr/bin/env node
/* global process */
/**
 * check-not-a-dependency.mjs — root `preinstall` guard.
 *
 * The published package is `packages/qfai` (npm name `qfai`). This manifest is
 * the private monorepo root: it ships no `bin` and no built `dist`.
 *
 * Renaming it to `qfai-monorepo` stops it answering to the *package name*
 * `qfai`, but not to a dependency *key*. `"qfai": "github:aganesy/QFAI"` is a
 * key-to-git-URL mapping that points at this manifest whatever its `name`
 * says. The manifest ships no CLI, so such an install would leave the consumer
 * with no `qfai` command.
 *
 * npm does not reach this guard. The root declares `"qfai": "workspace:*"`, and
 * npm stops at that protocol (`EUNSUPPORTEDPROTOCOL`) before the install starts
 * — for a git dependency too, because npm installs the clone's devDependencies
 * when it prepares it. The guard is the refusal for yarn, and for npm if the
 * root stops declaring a `workspace:` dependency. It runs as `preinstall`, so a
 * non-zero exit aborts the install with this message attached.
 *
 * Detection is by package manager, not by path or by any cache-layout
 * heuristic. This repository is a pnpm workspace — `packageManager` pins
 * pnpm and every CI job runs `pnpm install --frozen-lockfile` — so a
 * legitimate install of this manifest is always a pnpm install. npm or yarn
 * reaching this file therefore means one of two mistakes: the repository was
 * pulled in as a git dependency, or someone is developing the monorepo itself
 * with an unsupported package manager. Both are refused, and the message below
 * addresses both.
 *
 * The check is deliberately fail-open: only a positive `npm/` or `yarn/`
 * signal refuses. An unrecognised or absent user agent proceeds, so a future
 * package-manager release that stops exporting `npm_config_user_agent` cannot
 * brick the repository's own install.
 */

const userAgent = process.env.npm_config_user_agent ?? "";
const client = userAgent.split("/")[0]?.toLowerCase() ?? "";

if (client !== "npm" && client !== "yarn") {
  process.exit(0);
}

process.exitCode = 1;
process.stderr.write(
  [
    "",
    "qfai: this is the private monorepo root (qfai-monorepo), not the published package.",
    "",
    `Detected package manager: ${userAgent || "(unknown)"}.`,
    "",
    "If you meant to add qfai to your project, install the npm package:",
    "",
    "  npm i -D qfai        # or: pnpm add -D qfai / yarn add -D qfai",
    "",
    'A git specifier such as `"qfai": "github:aganesy/QFAI"` maps the dependency',
    "key `qfai` to this repository root. It ships no `bin` and no built `dist`, so",
    "the install would finish cleanly and leave you with no `qfai` command and",
    "nothing importable. This guard stops it here instead.",
    "",
    "If you are developing the monorepo itself, use pnpm:",
    "",
    "  corepack enable && pnpm install --frozen-lockfile",
    "",
  ].join("\n"),
);
