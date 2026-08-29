/**
 * Reseal the pinned guard bytes: the data file, the declaration, and the pre-flight's self-digest.
 *
 * Every local composite action and every guard program under `scripts/` is pinned by sha256, in
 * three places that must agree:
 *
 * - `.github/pinned-bytes.txt`, which `scripts/check-toolchain-action.sh` verifies with
 *   `sha256sum -c` before anything else in the lint job runs;
 * - `pinnedBytes` in `.github/required-status-contexts.json`, which the hygiene lane compares
 *   against both that file and the bytes on disk;
 * - the pre-flight's own digest, held in its step in `.github/workflows/ci.yml` — the one place it
 *   cannot be held by the file it checks.
 *
 * Editing a guard is expected to fail the lane. That is the point: a change to a program that
 * decides whether a pull request merges is a change a reviewer reads. Run this in the same commit
 * as the edit, and the new digests land in the diff beside it.
 *
 * Ordering matters and is why this is one tool rather than three: the pre-flight script's own bytes
 * are pinned in the workflow, and the workflow step's body is pinned by `verificationBodies`. So the
 * self-digest is written first, then the list, then the declaration — and
 * `pin-verification-bodies.mjs` runs after this one.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { argv, cwd, exit, stdout } from "node:process";
import { fileURLToPath } from "node:url";

/** The roots whose every file is pinned, repo-relative and POSIX-separated. */
const PINNED_ROOTS = [".github/actions", "scripts"];

const LIST_REL = ".github/pinned-bytes.txt";
const DECLARATION_REL = ".github/required-status-contexts.json";
const WORKFLOW_REL = ".github/workflows/ci.yml";
const PREFLIGHT_REL = "scripts/check-toolchain-action.sh";

/** Every file under `rel`, repo-relative and POSIX-separated, in a stable order. */
function filesUnder(root, rel) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(path.relative(root, full).replace(/\\/g, "/"));
    }
  };
  walk(path.join(root, rel));
  return out;
}

function digestOf(root, rel) {
  return createHash("sha256")
    .update(readFileSync(path.join(root, rel)))
    .digest("hex");
}

function main(root) {
  // FIRST: the pre-flight's own digest, in the workflow. Written before the list, because writing
  // it changes no pinned file — the pre-flight script is unchanged by this step, and the workflow
  // is not itself pinned by bytes.
  const preflightDigest = digestOf(root, PREFLIGHT_REL);
  const workflowPath = path.join(root, WORKFLOW_REL);
  const workflow = readFileSync(workflowPath, "utf-8");
  const selfPin = new RegExp(
    `[0-9a-f]{64}( {2}${PREFLIGHT_REL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
  );
  if (!selfPin.test(workflow)) {
    stdout.write(`no self-digest for ${PREFLIGHT_REL} in ${WORKFLOW_REL}\n`);
    return 1;
  }
  writeFileSync(workflowPath, workflow.replace(selfPin, `${preflightDigest}$1`), "utf-8");
  stdout.write(`${preflightDigest}  ${PREFLIGHT_REL} (self-digest in ${WORKFLOW_REL})\n`);

  // THEN the list, over the roots as they now stand.
  const entries = [];
  for (const pinnedRoot of PINNED_ROOTS) {
    for (const rel of filesUnder(root, pinnedRoot)) {
      entries.push([digestOf(root, rel), rel]);
    }
  }

  const listPath = path.join(root, LIST_REL);
  const existing = readFileSync(listPath, "utf-8");
  const header = existing
    .split(/\r?\n/)
    .filter((line) => line.startsWith("#"))
    .join("\n");
  writeFileSync(
    listPath,
    `${header}\n${entries.map(([digest, rel]) => `${digest}  ${rel}`).join("\n")}\n`,
    "utf-8",
  );
  stdout.write(`pinned ${String(entries.length)} file(s) into ${LIST_REL}\n`);

  // AND the declaration, from the same computation, so the two cannot disagree.
  const declarationPath = path.join(root, DECLARATION_REL);
  const declaration = JSON.parse(readFileSync(declarationPath, "utf-8"));
  for (const context of Array.isArray(declaration.contexts) ? declaration.contexts : []) {
    context.pinnedBytes = Object.fromEntries(entries.map(([digest, rel]) => [rel, digest]));
  }
  writeFileSync(declarationPath, `${JSON.stringify(declaration, null, 2)}\n`, "utf-8");
  stdout.write(`pinned into ${DECLARATION_REL}\n`);
  stdout.write("now run `node scripts/pin-verification-bodies.mjs`\n");
  return 0;
}

const invokedDirectly = fileURLToPath(import.meta.url) === path.resolve(argv[1] ?? "");
if (invokedDirectly) {
  const rootFlag = argv.indexOf("--root");
  exit(
    main(
      rootFlag >= 0 && argv[rootFlag + 1] !== undefined ? path.resolve(argv[rootFlag + 1]) : cwd(),
    ),
  );
}
