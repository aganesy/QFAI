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
 * key-to-git-URL mapping, so npm installs this manifest to `node_modules/qfai`
 * whatever its `name` says. Measured with npm 11.16.0: the install completes
 * ("added 1 package"), `node_modules/qfai` exists, `node_modules/.bin/qfai`
 * does not — and the root `prepack` guard never fires, because git-dependency
 * preparation packs the clone without running `prepack`. The missing CLI then
 * surfaces only at the first `qfai <command>`.
 *
 * This guard makes that install fail where the mistake was made. It runs during
 * git-dependency preparation (npm runs the cloned package's `preinstall` before
 * building it), so a non-zero exit aborts the consumer's install with this
 * message attached.
 *
 * Detection is by package manager, not by path or by any cache-layout
 * heuristic. This repository is a pnpm workspace — `packageManager` pins
 * pnpm and every CI job runs `pnpm install --frozen-lockfile` — so a
 * legitimate install of this manifest is always a pnpm install. npm or yarn
 * reaching this file means it was pulled in as a git dependency.
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
