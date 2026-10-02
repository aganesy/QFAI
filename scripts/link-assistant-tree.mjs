#!/usr/bin/env node
/* global console */
/**
 * link-assistant-tree.mjs
 *
 * Points `.qfai/assistant/**` at the assets the package ships, by symlink, so
 * the tree this repository's own agents read IS the tree `qfai init` writes
 * into a consuming project. An improvement to a shipped skill then reaches the
 * agents working here with no copy step, and a copy nobody made stops being a
 * way for the two to disagree.
 *
 * WHAT STAYS A REAL FILE is not a list kept here. Two things earn it:
 *
 *   1. The project owns the content. `ADOPTER_OWNED_CATALOG_FILES` in
 *      `packages/qfai/src/core/assistantAssetProvenance.ts` names those, and it
 *      is read from that file rather than restated — `qfai init --force` reads
 *      the same constant to decide what it must not overwrite, and two copies
 *      of that answer is how one of them silently stops matching the other.
 *   2. The path exists here and nowhere in the assets. This is reported as
 *      drift so the repository cannot silently use an unshipped instruction.
 *
 * A directory holding neither becomes ONE link. A directory holding either is
 * kept real and its shipped children are linked one at a time, which is the
 * shape `.claude/agents/*.md` already uses.
 *
 * Usage:
 *   node scripts/link-assistant-tree.mjs          # create and repair
 *   node scripts/link-assistant-tree.mjs --check  # verify, exit 1 on drift
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_REL = path.join("packages", "qfai", "assets", "init", ".qfai", "assistant");
const TARGET_REL = path.join(".qfai", "assistant");
const SOURCE = path.join(ROOT, SOURCE_REL);
const TARGET = path.join(ROOT, TARGET_REL);

const CHECK_ONLY = process.argv.includes("--check");

const toPosix = (p) => p.split(path.sep).join("/");

function entries(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
}

function lstatSafe(p) {
  try {
    return lstatSync(p);
  } catch {
    return undefined;
  }
}

/**
 * Paths under `rel` that this tree holds and the assets do not.
 *
 * Classified through `lstat`, so a path a previous run already linked counts as
 * shipped rather than as a local addition. Read any other way the first run
 * would link a directory and the second would find its own links and keep it
 * real.
 */
function localOnlyUnder(rel, adopterOwned) {
  const found = [];
  const walk = (relDir) => {
    for (const entry of entries(path.join(TARGET, relDir))) {
      const childRel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
      const stat = lstatSafe(path.join(TARGET, childRel));
      if (stat === undefined) continue;
      const inSource = existsSync(path.join(SOURCE, childRel));
      if (stat.isSymbolicLink()) {
        if (!inSource) found.push(childRel);
        continue;
      }
      if (stat.isDirectory()) {
        if (inSource) walk(childRel);
        else found.push(childRel);
        continue;
      }
      if (inSource || adopterOwned.has(childRel)) continue;
      // Untracked: a scratch file a suite left behind, not something a commit
      // holds. `TRACKED` is null when git cannot answer, and then every path
      // is considered, which is the stricter of the two.
      if (TRACKED !== null && !TRACKED.has(childRel)) continue;
      found.push(childRel);
    }
  };
  walk(rel);
  return found;
}

/**
 * Paths under `.qfai/assistant/` that git tracks, or `null` when git cannot say.
 *
 * Only a tracked regular file is this repository's to answer for. A suite that
 * writes an untracked file should not fail the lane. Symlinks and directories
 * with retired layer names are checked even when untracked: either one could
 * expose instructions the package does not ship.
 */
function trackedUnderTarget() {
  try {
    const out = execFileSync("git", ["ls-files", "-z", "--", TARGET_REL], {
      cwd: ROOT,
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const prefix = `${toPosix(TARGET_REL)}/`;
    return new Set(
      out
        .split("\u0000")
        .filter((line) => line.startsWith(prefix))
        .map((line) => line.slice(prefix.length)),
    );
  } catch {
    return null;
  }
}

/** Set once, so the walk does not shell out per directory. */
const TRACKED = trackedUnderTarget();

/**
 * Nothing under `.qfai/assistant/` may exist only in this repository.
 * Everything that exists here and nowhere in the assets is REPORTED, and
 * the reason is the incident the previous mechanism was built around: a
 * root-only `assistant/steering/test-layers.md` made `loadLayerPolicy` succeed
 * in this tree and throw in every `qfai init` project, so a consumer-only
 * failure outlived a full minor release. A link cannot drift from its source,
 * but a file the assets never had is still invisible to every adopter — and
 * this tree is the only place the shipped assets are exercised end to end.
 */
const RETIRED_LAYERS = ["skills", "agents", "prompts", "constitution", "manifest", "process"];

const isAllowedLocalOnly = (rel, adopterOwned) => adopterOwned.has(rel);

/** `true` when any adopter-owned path sits under `rel`. */
function ownsSomethingUnder(rel, adopterOwned) {
  const prefix = rel === "" ? "" : `${rel}/`;
  for (const owned of adopterOwned) {
    if (owned.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * The plan: which paths are links, which directories stay real, and which paths
 * are left alone.
 *
 * `kept` is reported on every run for the reason the mdschema lane reports its
 * own exclusions — an exclusion nobody sees is one nobody reviews.
 */
function plan(adopterOwned) {
  const links = new Map();
  const realDirs = [];
  const kept = [];
  const unexpected = [];

  const visit = (rel) => {
    const mustStayReal =
      rel === "" ||
      ownsSomethingUnder(rel, adopterOwned) ||
      localOnlyUnder(rel, adopterOwned).length > 0;

    if (!mustStayReal) {
      links.set(rel, path.join(SOURCE_REL, rel));
      return;
    }

    if (rel !== "") realDirs.push(rel);
    for (const entry of entries(path.join(SOURCE, rel))) {
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        visit(childRel);
        continue;
      }
      if (adopterOwned.has(childRel)) {
        kept.push(childRel);
        continue;
      }
      links.set(childRel, path.join(SOURCE_REL, childRel));
    }
    for (const localRel of localOnlyUnder(rel, adopterOwned)) {
      if (isAllowedLocalOnly(localRel, adopterOwned)) kept.push(localRel);
      else unexpected.push(localRel);
    }
  };

  visit("");
  for (const layer of RETIRED_LAYERS) {
    if (lstatSafe(path.join(TARGET, layer)) !== undefined) unexpected.push(layer);
  }
  return {
    links,
    realDirs: [...new Set(realDirs)].sort(),
    kept: [...new Set(kept)].sort(),
    unexpected: [...new Set(unexpected)].sort(),
  };
}

/** The link text: relative and posix, so it resolves in any checkout. */
function linkTarget(rel, sourceRel) {
  const fromDir = path.dirname(path.join(TARGET_REL, rel));
  return toPosix(path.relative(fromDir, sourceRel));
}

function verify(links, realDirs, unexpected) {
  const problems = [];

  for (const rel of unexpected) {
    problems.push(
      `${toPosix(TARGET_REL)}/${rel} exists here and nowhere in the shipped assets. ` +
        `Add it to the assets, delete it, or allow-list it in link-assistant-tree.mjs.`,
    );
  }

  for (const rel of realDirs) {
    const stat = lstatSafe(path.join(TARGET, rel));
    if (stat === undefined || stat.isSymbolicLink() || !stat.isDirectory()) {
      problems.push(`${toPosix(TARGET_REL)}/${rel} must be a real directory`);
    }
  }

  for (const [rel, sourceRel] of links) {
    const shown = `${toPosix(TARGET_REL)}/${rel}`;
    const want = linkTarget(rel, sourceRel);
    if (!existsSync(path.join(ROOT, sourceRel))) {
      problems.push(`${shown} would point at ${want}, which does not exist`);
      continue;
    }
    const stat = lstatSafe(path.join(TARGET, rel));
    if (stat === undefined) {
      problems.push(`${shown} is missing; it must be a symlink to ${want}`);
      continue;
    }
    if (!stat.isSymbolicLink()) {
      problems.push(
        `${shown} is a ${stat.isDirectory() ? "directory" : "file"}, not a symlink to ${want}`,
      );
      continue;
    }
    const got = toPosix(readlinkSync(path.join(TARGET, rel)));
    if (got !== want) problems.push(`${shown} points at ${got}, not ${want}`);
  }

  return problems;
}

function apply(links, realDirs) {
  for (const rel of realDirs) mkdirSync(path.join(TARGET, rel), { recursive: true });

  let written = 0;
  for (const [rel, sourceRel] of links) {
    const abs = path.join(TARGET, rel);
    const want = linkTarget(rel, sourceRel);
    const stat = lstatSafe(abs);
    if (stat?.isSymbolicLink() && toPosix(readlinkSync(abs)) === want) continue;
    if (stat !== undefined) rmSync(abs, { recursive: true, force: true });
    mkdirSync(path.dirname(abs), { recursive: true });
    const isDir = lstatSync(path.join(ROOT, sourceRel)).isDirectory();
    symlinkSync(want, abs, isDir ? "dir" : "file");
    written += 1;
  }
  return written;
}

/**
 * `ADOPTER_OWNED_CATALOG_FILES`, read out of the TypeScript source.
 *
 * Read as text rather than imported. Importing it would run a `.ts` module,
 * which needs the type stripping Node gained after the floor this package
 * supports — so the lane that runs on that floor could not execute this script
 * at all. The constant is a list of string literals, and parsing it keeps the
 * single source the alternative was for.
 *
 * A rename or a reshape stops the pattern matching and throws. An explicitly
 * empty list is valid once the story tree replaces the four catalog seeds.
 */
function adopterOwnedAssets() {
  const source = readFileSync(
    path.join(ROOT, "packages", "qfai", "src", "core", "assistantAssetProvenance.ts"),
    "utf-8",
  );
  const block = /ADOPTER_OWNED_CATALOG_FILES\s*=\s*\[([^\]]*)\]/.exec(source);
  if (block === null) {
    throw new Error(
      "link-assistant-tree: ADOPTER_OWNED_CATALOG_FILES is not where this script reads it, in " +
        "packages/qfai/src/core/assistantAssetProvenance.ts. Update this reader in the change " +
        "that moved it.",
    );
  }
  const list = block[1] ?? "";
  if (!/^\s*(?:"[^"]+"\s*,\s*)*(?:"[^"]+"\s*)?$/.test(list)) {
    throw new Error(
      "link-assistant-tree: ADOPTER_OWNED_CATALOG_FILES is not a literal string list.",
    );
  }
  const names = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  return new Set(names.map((name) => `catalog/${name}`));
}

async function main() {
  const ADOPTER_OWNED_ASSETS = adopterOwnedAssets();

  const { links, realDirs, kept, unexpected } = plan(ADOPTER_OWNED_ASSETS);

  if (CHECK_ONLY) {
    const problems = verify(links, realDirs, unexpected);
    for (const problem of problems) console.error(`DRIFT: ${problem}`);
    if (problems.length > 0) {
      console.error(`\n${problems.length} problem(s). Run: node scripts/link-assistant-tree.mjs`);
      return 1;
    }
    console.log(`${links.size} link(s) verified. Kept as real files:`);
    for (const rel of kept) console.log(`  ${toPosix(TARGET_REL)}/${rel}`);
    return 0;
  }

  const written = apply(links, realDirs);
  console.log(`${written} link(s) written, ${links.size} in the plan. Kept as real files:`);
  for (const rel of kept) console.log(`  ${toPosix(TARGET_REL)}/${rel}`);
  // Reported, never deleted: an unexpected path may be work in progress, and
  // this script is run by hand as well as by the gate.
  for (const rel of unexpected) console.warn(`UNACCOUNTED: ${toPosix(TARGET_REL)}/${rel}`);
  return unexpected.length > 0 ? 1 : 0;
}

process.exitCode = await main();
