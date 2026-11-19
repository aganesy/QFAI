/**
 * A tracked `README.md` that is not a page anyone lands on.
 *
 * Two are: the project's own, and the one npm publishes —
 * `packages/qfai/package.json#files` names the second, and
 * `scripts/check-readme-alignment.mjs` holds it line for line against the first,
 * so that duplication is guarded rather than loose.
 *
 * Anywhere else a `README.md` is a second place to say something, and the first
 * place stops being read. It drifts silently, because nothing compares the two,
 * and the copy is what the next reader finds. This repository has cleaned them
 * out before and they came back, which is why a rule alone is not the answer.
 *
 * What a directory needs to say has somewhere better to go:
 *
 * | What it says                | Where it goes                                     |
 * | --------------------------- | ------------------------------------------------- |
 * | A rule to follow            | A rule in `.agents/rules/`                        |
 * | How to do a thing correctly | The guard that fails when it is done wrong        |
 * | Where to look next          | The entry point that sent the reader              |
 *
 * `.agents/rules/root-additions-policy.local.md` states that, and this is what
 * makes it hold for a contributor who never read it.
 *
 * Usage:
 *   node scripts/check-tracked-readmes.mjs
 *
 * Exit codes: 0 clean, 1 an unlisted README, 2 the index could not be read.
 */
/* global console, process */
import { execFileSync } from "node:child_process";

import { escapeCommandMessage, escapeCommandProperty } from "./lib/workflow-command.mjs";

/**
 * The two paths a README may be tracked at, each with the reason it is there.
 *
 * Adding a third is an edit a reviewer reads, with the reason beside it. That
 * is the point of holding the list here rather than inferring it: a rule that
 * admits "wherever one seems useful" admits every one that came back last time.
 */
const PUBLISHED = new Map([
  ["README.md", "the project's own page"],
  ["packages/qfai/README.md", "the page npm publishes, named by package.json#files"],
]);

/** Every tracked path whose basename is `README.md`, case-insensitively. */
function trackedReadmes() {
  const out = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\u0000")
    .filter((line) => line !== "")
    .filter((line) => /(^|\/)readme\.md$/i.test(line));
}

/**
 * One error annotation on `file`. The path comes from the index, so a pull request chooses it,
 * and it is escaped as the field it lands in rather than interpolated as command syntax.
 */
function annotate(file, message) {
  console.error(`::error file=${escapeCommandProperty(file)}::${escapeCommandMessage(message)}`);
}

function main() {
  let readmes;
  try {
    readmes = trackedReadmes();
  } catch (error) {
    console.error(`check-tracked-readmes: cannot read the index: ${String(error)}`);
    return 2;
  }

  const unlisted = readmes.filter((file) => !PUBLISHED.has(file)).sort();
  // A listed path that has gone is the other way the list can be wrong, and it
  // is silent: the guard would keep passing over a page nobody publishes.
  const missing = [...PUBLISHED.keys()].filter((file) => !readmes.includes(file)).sort();

  for (const file of unlisted) {
    annotate(
      file,
      `${file} is a README outside the two this repository publishes. ` +
        `A rule belongs in .agents/rules/, how to do a thing correctly belongs in the guard that ` +
        `fails when it is done wrong, and where to look next belongs in the entry point that sent ` +
        `the reader. See .agents/rules/root-additions-policy.local.md.`,
    );
  }
  for (const file of missing) {
    annotate(
      file,
      `${file} is listed as a published page and is not tracked. ` +
        `Restore it, or strike the entry from check-tracked-readmes.mjs in the change that ` +
        `stopped publishing it.`,
    );
  }

  if (unlisted.length > 0 || missing.length > 0) return 1;

  console.log(`check-tracked-readmes: ${String(readmes.length)} README(s), each one published:`);
  for (const [file, why] of PUBLISHED) console.log(`  ${file} — ${why}`);
  return 0;
}

process.exitCode = main();
