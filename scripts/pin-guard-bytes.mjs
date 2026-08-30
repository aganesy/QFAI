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
 * - the pre-flight's own digest AND the digests of `.github/pinned-bytes.txt`,
 *   `.github/lifecycle-manifests.txt` and `.github/command-files.txt`, held in its step in
 *   `.github/workflows/ci.yml` — the one place they cannot be held by the files they check.
 *
 * Editing a guard is expected to fail the lane. That is the point: a change to a program that
 * decides whether a pull request merges is a change a reviewer reads. Run this in the same commit
 * as the edit, and the new digests land in the diff beside it.
 *
 * Ordering matters and is why this is one tool rather than three. The workflow pins the pre-flight
 * script AND the three files it reads its expectations out of, so the list and the declaration are
 * written first and the workflow last, over files that are already final. `ci.yml` is not itself
 * pinned by bytes, so writing it invalidates nothing — and `pin-verification-bodies.mjs`, which
 * pins that step's BODY, runs after this one.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { argv, cwd, exit, stdout } from "node:process";
import { fileURLToPath } from "node:url";

import { LIFECYCLE_MANIFESTS_REL, lifecycleProjection } from "./check-lifecycle-manifests.mjs";

/** The roots whose every file is pinned, repo-relative and POSIX-separated. */
const PINNED_ROOTS = [".github/actions", "scripts"];

const LIST_REL = ".github/pinned-bytes.txt";
const DECLARATION_REL = ".github/required-status-contexts.json";
const WORKFLOW_REL = ".github/workflows/ci.yml";
const PREFLIGHT_REL = "scripts/check-toolchain-action.sh";

/**
 * The files whose digests are pinned in the workflow rather than in a file.
 *
 * The pre-flight script, and every file it reads its expectations out of. Review findings [117]
 * and [119]: the script's own bytes were pinned while `pinned-bytes.txt`,
 * `lifecycle-manifests.txt` and `command-files.txt` were not, and all of them ship in the same
 * checkout — so a pull request could rewrite a composite action and record its new digest in the
 * list, or add a hostile manifest's path to the allow-list, and the pre-flight would verify the
 * pull request's own expectations and pass. The composite action runs before the hygiene lane
 * that compares list against declaration, so nothing later would catch it.
 */
const WORKFLOW_PINNED = [
  PREFLIGHT_REL,
  LIST_REL,
  ".github/lifecycle-manifests.txt",
  ".github/command-files.txt",
];

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
  // The list first, over the roots as they now stand: the workflow pins its digest, so the file
  // has to be final before the workflow can be written. Nothing here is circular — `ci.yml` is
  // not itself pinned by bytes, so writing it changes none of the digests just computed.
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

  // THEN the lifecycle allow-list, whose entries pin what each listed manifest runs at install
  // time rather than merely naming it. Review finding [124]: being on the list permitted a
  // manifest to run code at install time AND permitted that code to change unseen, so the root
  // `preinstall` could become a step that neuters every later guard shell in the job.
  //
  // The digest is over the lifecycle PROJECTION, not the whole file, so a dependency bump or an
  // ordinary script edit is not a pre-flight edit and a change to what runs at install time is.
  // Paths are read from the file as it stands: which manifests are allowed is a human decision,
  // and this tool re-pins what they run, never widens who may run it.
  const listedPath = path.join(root, LIFECYCLE_MANIFESTS_REL);
  const listedText = readFileSync(listedPath, "utf-8");
  const listedLines = listedText.split(/\r?\n/);
  const rewritten = [];
  for (const line of listedLines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      rewritten.push(line);
      continue;
    }
    const rel = /^[0-9a-f]{64} {2}(.+)$/.exec(trimmed)?.[1] ?? trimmed;
    const projection = lifecycleProjection(path.join(root, rel));
    if (projection === undefined) {
      stdout.write(`${rel} is not readable as JSON, so its lifecycle cannot be pinned\n`);
      return 1;
    }
    rewritten.push(`${projection.digest}  ${rel}`);
    stdout.write(
      `${projection.digest}  ${rel} (lifecycle: ${projection.keys.length === 0 ? "none" : projection.keys.join(", ")})\n`,
    );
  }
  writeFileSync(listedPath, rewritten.join("\n"), "utf-8");

  // AND the workflow, last: the pre-flight and every file it reads its expectations out of.
  const workflowPath = path.join(root, WORKFLOW_REL);
  let workflow = readFileSync(workflowPath, "utf-8");
  for (const rel of WORKFLOW_PINNED) {
    const digest = digestOf(root, rel);
    const pin = new RegExp(`[0-9a-f]{64}( {2}${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$)`, "m");
    const matches = workflow.match(new RegExp(pin, "gm"));
    if (matches === null || matches.length !== 1) {
      stdout.write(
        `${WORKFLOW_REL} holds ${String(matches === null ? 0 : matches.length)} pin line(s) for ${rel}; it must hold exactly one\n`,
      );
      return 1;
    }
    workflow = workflow.replace(pin, `${digest}$1`);
    stdout.write(`${digest}  ${rel} (pinned in ${WORKFLOW_REL})\n`);
  }
  writeFileSync(workflowPath, workflow, "utf-8");
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
