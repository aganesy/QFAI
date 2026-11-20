#!/usr/bin/env node
/* global console, process */
/**
 * sync-init-to-root.mjs
 *
 * Brings `packages/qfai/assets/init/` to the repository root for the paths that
 * are still copies.
 *
 * `.qfai/assistant/**` is no longer among them. It is symlinked at the shipped
 * assets by `scripts/link-assistant-tree.mjs`, which also owns the question of
 * what under there stays a real file. A copy could disagree with its source;
 * a link cannot, so the drift check that guarded the copy went with it.
 *
 * What is left is two project-owned files, neither of them mirrored, and one
 * generated file:
 *
 *   `qfai.config.yaml`   seeded when absent, never overwritten. The init asset
 *                        is what a FRESH project starts from and deliberately
 *                        leaves `validation.traceability.testFileGlobs` empty,
 *                        so a non-TypeScript project cannot inherit a glob list
 *                        that matches nothing and silently disables the SC→test
 *                        gate. The root copy is this repository's live
 *                        configuration and does carry real globs: the CI
 *                        dogfooding step runs `validate --profile tdd --root .`,
 *                        and its test-file rules no-op when that list is empty.
 *                        Overwriting it from the template would switch off a
 *                        gate this repository relies on.
 *
 *   `.qfai/waivers.yml`  seeded when absent, never overwritten. A waiver list
 *                        names the findings THIS project has accepted and for
 *                        how long, so the shipped file is a starting point and
 *                        the root file is an answer.
 *
 *   `.qfai/assistant/VERSION`  written from `packages/qfai/package.json#version`
 *                        on every run. It is the version file `qfai init`
 *                        writes into an adopter's tree, so `qfai validate`
 *                        and `qfai doctor` compare this tree with the build
 *                        that runs them, as they do there.
 *
 * Usage:
 *   node scripts/sync-init-to-root.mjs          # seed and report
 *   node scripts/sync-init-to-root.mjs --check  # dry-run, exit 1 if missing or stale
 */

import { constants, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

/**
 * `fileURLToPath`, not `URL.pathname`: a checkout under a directory with a
 * space or a non-ASCII character gives a percent-encoded pathname, and joining
 * that yields a path no file lives at.
 */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INIT = join(ROOT, "packages", "qfai", "assets", "init");

/** Each entry is seeded from `from` to `to` only when `to` is absent. */
const SEEDED = [
  {
    from: join(INIT, "root", "qfai.config.yaml"),
    to: join(ROOT, "qfai.config.yaml"),
    shown: "qfai.config.yaml",
  },
  {
    from: join(INIT, ".qfai", "waivers.yml"),
    to: join(ROOT, ".qfai", "waivers.yml"),
    shown: ".qfai/waivers.yml",
  },
];

/**
 * Copy `from` to `to` unless `to` exists, and say which happened.
 *
 * The caller checked that `to` was absent, but that answered a question about a
 * moment that has passed: another process, or the maintainer's editor, can
 * create the file between the check and this copy, and a plain copy replaces
 * it. `COPYFILE_EXCL` makes the create itself the decision, and an `EEXIST`
 * means the file is already present, which is the outcome the check intended.
 *
 * @param {string} from
 * @param {string} to
 * @returns {"seeded" | "present"}
 */
export function seedAbsent(from, to) {
  try {
    copyFileSync(from, to, constants.COPYFILE_EXCL);
    return "seeded";
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") return "present";
    throw error;
  }
}

/** @returns {number} the exit code */
function main() {
  const checkOnly = process.argv.includes("--check");
  let missing = 0;
  let seeded = 0;

  for (const { from, to, shown } of SEEDED) {
    if (existsSync(to)) continue;
    if (!existsSync(from)) {
      console.error(`MISSING SOURCE: ${shown} has no init asset to seed from.`);
      missing += 1;
      continue;
    }
    if (checkOnly) {
      console.error(`MISSING: ${shown}`);
      missing += 1;
      continue;
    }
    if (seedAbsent(from, to) === "present") continue;
    console.log(`Seeded ${shown} from the init assets.`);
    seeded += 1;
  }

  const versionFile = join(ROOT, ".qfai", "assistant", "VERSION");
  const { version } = JSON.parse(
    readFileSync(join(ROOT, "packages", "qfai", "package.json"), "utf-8"),
  );
  const versionText = `${version}\n`;
  const recorded = existsSync(versionFile) ? readFileSync(versionFile, "utf-8") : undefined;
  if (recorded !== versionText) {
    if (checkOnly) {
      console.error(`STALE: .qfai/assistant/VERSION does not record ${version}`);
      missing += 1;
    } else {
      writeFileSync(versionFile, versionText, "utf-8");
      console.log(`Wrote .qfai/assistant/VERSION (${version}).`);
    }
  }

  if (missing > 0) {
    console.error(`\n${missing} file(s) missing or stale. Run: pnpm sync:ssot`);
    process.exit(1);
  }

  console.log(
    checkOnly
      ? "Seeded files are present."
      : `${seeded} file(s) seeded; the rest were already present.`,
  );
  return 0;
}

// `pathToFileURL`, not `file://` + the path, so the guard also fires on Windows.
// The test imports `seedAbsent` and must not seed this repository by doing so.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
