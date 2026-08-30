/**
 * Refuse a manifest that runs code at install time and is not pinned — BEFORE `pnpm install`.
 *
 * `pnpm install --frozen-lockfile` runs the lifecycle hooks of every manifest in the workspace, in
 * every job, inside the composite action, before every verification in that job. A hook that
 * appends `BASH_ENV` to the file a step may write turns every later `shell: bash` guard in the job
 * into a no-op that exits 0 — so this question has to be settled before the toolchain is set up.
 *
 * Three review findings shaped what it asks:
 *
 * - **[110]** — the lane compared the declaration against a FIXED array of manifests, and
 *   `pnpm-workspace.yaml` is not that array. A pull request adding a package with a `prepare` hook
 *   had it run before every verification in a manifest nothing examined. So the tree is walked.
 * - **[118]** — the refusal matched a lifecycle key at the start of a line, and a valid one-line
 *   manifest matches no such pattern. So the JSON is parsed, and an unparseable manifest is
 *   reported rather than read as hookless.
 * - **[124]** — a manifest already on the allow-list had its hook CONTENTS unchecked, so changing
 *   the root `preinstall` to a hostile body passed. Being on the list permits a manifest to run
 *   code at install time; it does not permit that code to change unseen. So the list pins a digest
 *   of each manifest's lifecycle projection, and the list itself is pinned in the pre-flight step.
 *
 * The trust chain: this file lives under `scripts/`, every byte of which
 * `.github/pinned-bytes.txt` pins; `scripts/check-toolchain-action.sh` verifies that list with
 * `sha256sum -c` and compares the path sets BEFORE invoking this; and the pre-flight step in
 * `.github/workflows/ci.yml` pins the digests of that script, that list, and the allow-list this
 * one reads. Each link is a separate, visible edit.
 *
 * Usage: `node scripts/check-lifecycle-manifests.mjs [<root>]`. Exits 1 on any finding.
 */
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { argv, cwd, exit, stdout } from "node:process";
import { fileURLToPath } from "node:url";

/** Where the manifests allowed to run code at install time are pinned. */
export const LIFECYCLE_MANIFESTS_REL = ".github/lifecycle-manifests.txt";

/**
 * Every lifecycle key that runs code during the commands this repository executes.
 *
 * `pnpm install --frozen-lockfile` runs `preinstall` / `install` / `postinstall`, and then
 * `preprepare` / `prepare` / `postprepare`. The second trio is review finding [125], measured by
 * the reviewer against pnpm 10.28.1 and absent from the first version of this list — so a package
 * declaring only `preprepare` was read as hookless and passed. `prepublish` is npm's legacy
 * install-time hook, kept because an adopter's pnpm is not the only thing that ever reads these.
 *
 * The pack and publish family is here because this repository packs in the build job and publishes
 * from `release.yml`. The question is whether a manifest runs code nobody reviewed, and the answer
 * does not change with which command happens to trigger it.
 */
export const LIFECYCLE_HOOKS = [
  "preinstall",
  "install",
  "postinstall",
  "preprepare",
  "prepare",
  "postprepare",
  "prepublish",
  "prepublishOnly",
  "prepack",
  "postpack",
  "postpublish",
];

/** Directory names never walked: not ours, or not installed from. */
const SKIP_DIRS = new Set(["node_modules", "tmp", ".git"]);

/**
 * The lifecycle projection of one manifest: its hook keys and bodies, canonically ordered.
 *
 * A digest of the projection rather than of the whole file, so that a dependency bump or an
 * ordinary script edit is not a pre-flight edit, and a change to what runs at install time is.
 *
 * @param {string} file absolute path to a `package.json`
 * @returns {{ keys: string[], digest: string } | undefined} `undefined` when it is not readable
 *   as JSON, which the caller reports rather than treating as hookless
 */
export function lifecycleProjection(file) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return undefined;
  }
  const scripts =
    parsed !== null && typeof parsed === "object" && typeof parsed.scripts === "object"
      ? parsed.scripts
      : undefined;
  const pairs =
    scripts === null || scripts === undefined
      ? []
      : LIFECYCLE_HOOKS.filter((hook) => Object.prototype.hasOwnProperty.call(scripts, hook)).map(
          (hook) => [hook, String(scripts[hook])],
        );
  return {
    keys: pairs.map(([hook]) => hook),
    digest: createHash("sha256").update(JSON.stringify(pairs)).digest("hex"),
  };
}

/**
 * Every `package.json` in the tree, repo-relative and POSIX-separated.
 *
 * Symlinks are not followed — a link is not this tree's file, and following one is how a walk
 * leaves the repository.
 *
 * @param {string} root repository root
 * @returns {string[]} the manifests, in walk order
 */
export function manifestsUnder(root) {
  /** @type {string[]} */
  const found = [];
  /** @param {string} dir @param {string} rel */
  const walk = (dir, rel) => {
    /** @type {import("node:fs").Dirent[]} */
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name), childRel);
      } else if (entry.isFile() && entry.name === "package.json") {
        found.push(childRel);
      }
    }
  };
  walk(root, "");
  return found;
}

/**
 * Read the allow-list as `path -> pinned projection digest`.
 *
 * @param {string} listPath absolute path to the allow-list
 * @returns {{ pins: Map<string, string> } | { error: string }} the pins, or why it cannot be read
 */
export function readPins(listPath) {
  let text;
  try {
    text = readFileSync(listPath, "utf-8");
  } catch {
    return {
      error: `${LIFECYCLE_MANIFESTS_REL} is missing, so which manifests may run code at install time is decided by nothing.`,
    };
  }
  /** @type {Map<string, string>} */
  const pins = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const match = /^([0-9a-f]{64}) {2}(.+)$/.exec(trimmed);
    if (match === null) {
      return {
        error:
          `${LIFECYCLE_MANIFESTS_REL} holds a line this guard cannot read: ${trimmed}. Every entry ` +
          "must be `<sha256>  <path>` — the digest of that manifest's lifecycle projection, so that " +
          "changing a hook body is a visible edit to a pinned file.",
      };
    }
    const [, digest, rel] = match;
    if (pins.has(rel)) {
      return {
        error:
          `${LIFECYCLE_MANIFESTS_REL} names ${rel} more than once. A path pinned twice is two ` +
          "answers to one question, and `sha256sum -c` would accept either.",
      };
    }
    pins.set(rel, digest);
  }
  if (pins.size === 0) {
    return {
      error: `${LIFECYCLE_MANIFESTS_REL} names no manifest, so which manifests may run code at install time is decided by nothing.`,
    };
  }
  return { pins };
}

/**
 * Every finding against this tree, as workflow-command lines.
 *
 * @param {string} root repository root
 * @returns {string[]} the findings; empty means the tree is as the list pins it
 */
export function lifecycleFindings(root) {
  const read = readPins(path.join(root, LIFECYCLE_MANIFESTS_REL));
  if ("error" in read) return [read.error];
  const { pins } = read;

  /** @type {string[]} */
  const findings = [];

  // A pin naming a path the tree does not hold protects nothing, and hides the rename that
  // removed it.
  for (const rel of pins.keys()) {
    let stat;
    try {
      stat = lstatSync(path.join(root, rel));
    } catch {
      stat = undefined;
    }
    if (stat === undefined || !stat.isFile()) {
      findings.push(
        `${LIFECYCLE_MANIFESTS_REL} pins ${rel}, which is not a regular file in this tree. A pin ` +
          "protecting nothing hides the rename that removed it.",
      );
    }
  }

  for (const rel of manifestsUnder(root)) {
    const projection = lifecycleProjection(path.join(root, rel));
    if (projection === undefined) {
      findings.push(
        `${rel} is not readable as JSON, so whether it runs code at install time cannot be ` +
          "decided. A manifest pnpm will parse and this guard will not is the gap the guard " +
          "exists to close.",
      );
      continue;
    }

    const pinned = pins.get(rel);
    if (pinned === undefined) {
      if (projection.keys.length === 0) continue;
      findings.push(
        `${rel} declares the package-manager lifecycle hook(s) ${projection.keys.join(", ")} and ` +
          `is not listed in ${LIFECYCLE_MANIFESTS_REL}. pnpm runs those hooks in every job before ` +
          "every verification; a manifest that runs code at install time is one a reviewer reads.",
      );
      continue;
    }

    if (pinned !== projection.digest) {
      findings.push(
        `the lifecycle hooks of ${rel} are not the ones ${LIFECYCLE_MANIFESTS_REL} pins. ` +
          `Declared: ${projection.keys.length === 0 ? "(none)" : projection.keys.join(", ")}. ` +
          "Being on the allow-list permits a manifest to run code at install time; it does not " +
          "permit that code to change without a reviewer seeing it. Reseal with `node " +
          "scripts/pin-guard-bytes.mjs` in the same commit as the edit.",
      );
    }
  }

  // A pnpmfile is executable configuration, and `--ignore-scripts` does not stop it.
  //
  // Review finding [140]: pnpm evaluates `.pnpmfile.cjs` — its top level and its hooks —
  // during the install, and the flag that stops that is `--ignore-pnpmfile`, a separate
  // capability. Both installs now pass it, and this is the other half: a file whose whole
  // purpose is to run during installation should not be able to appear unremarked. The refusal
  // is unconditional because this repository has none and wants none; a project that needs one
  // is asking for a decision, and a failing guard is how a decision gets asked for.
  for (const rel of pnpmfilesUnder(root)) {
    findings.push(
      `${rel} is executable configuration that pnpm evaluates during installation, which --ignore-scripts does not stop. Both installs pass --ignore-pnpmfile, so it would not run today — but nothing should be able to add one unremarked.`,
    );
  }

  return findings;
}

/**
 * Every pnpmfile in the tree, repo-relative and POSIX-separated.
 *
 * Both spellings pnpm accepts, in any package as well as at the workspace root.
 *
 * @param {string} root repository root
 * @returns {string[]} the pnpmfiles found
 */
function pnpmfilesUnder(root) {
  /** @type {string[]} */
  const found = [];
  /** @param {string} dir @param {string} rel */
  const walk = (dir, rel) => {
    /** @type {import("node:fs").Dirent[]} */
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name), childRel);
        continue;
      }
      if (entry.isFile() && (entry.name === ".pnpmfile.cjs" || entry.name === "pnpmfile.cjs")) {
        found.push(childRel);
      }
    }
  };
  walk(root, "");
  return found;
}

function main(root) {
  const findings = lifecycleFindings(root);
  for (const finding of findings) {
    stdout.write(`::error::check-lifecycle-manifests: ${finding}\n`);
  }
  if (findings.length > 0) return 1;
  stdout.write(
    `check-lifecycle-manifests: every manifest that runs code at install time is pinned in ${LIFECYCLE_MANIFESTS_REL}\n`,
  );
  return 0;
}

const invokedDirectly = fileURLToPath(import.meta.url) === path.resolve(argv[1] ?? "");
if (invokedDirectly) {
  exit(main(argv[2] === undefined ? cwd() : path.resolve(argv[2])));
}
