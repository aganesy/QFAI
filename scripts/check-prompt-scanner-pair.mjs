#!/usr/bin/env node
/**
 * Pair-changed CI lane guard (REQ-0102).
 *
 * The SSOT-sync pair tracked here is:
 *   - scanner: packages/qfai/src/core/prototyping/designMdViolations.ts
 *   - prompt:  packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md
 *
 * A PR that touches exactly ONE half of the pair without the other is
 * rejected with R-PROMPT-SCANNER-DRIFT. A PR that touches BOTH halves
 * or NEITHER half passes silently.
 *
 * ## The other lane, and why both exist
 *
 * `core/validators/reviewerGate.ts#detectPromptScannerDrift` reports the
 * SAME code from the same manifest, and is not a duplicate of this. The
 * two catch opposite halves of one contract:
 *
 *   - that one reads the CURRENT TREE and fails when a clause's tokens
 *     are present on one side and absent on the other. It runs on every
 *     validate, so a drift nobody's diff touched is still caught, and it
 *     names the clause and the missing tokens.
 *   - this one reads the DIFF and fails when one half was edited and the
 *     other was not, whatever the tokens did. A clause whose wording
 *     changes while its tokens survive is invisible to a token check and
 *     visible here.
 *
 * Neither subsumes the other, so removing either leaves a real gap.
 *
 * ## The prompt half is scoped to one heading
 *
 * The prompt file is around 430 lines and only one of its sections states
 * the compliance contract: `## Hard constraints (enforced by the
 * compliance gate)`. Pairing on the whole path asked for a scanner edit
 * from any edit to the file — a read-order entry, an output-layout note —
 * and the only way to satisfy that demand is to touch the scanner without
 * a reason to, which is how a guard teaches people to route around it.
 *
 * So the prompt counts as changed when the text under that heading
 * changed, and the heading states its own scope. Losing or renaming the
 * heading counts as changed too: the contract is then somewhere this
 * guard cannot see, and that is the case it should be loudest about.
 *
 * The scanner half stays pinned to its path. That file is the compliance
 * clauses and nothing else, so every edit to it is in scope already.
 *
 * Invocation modes:
 *   - `--base <ref>`     compare HEAD against <ref> via `git diff
 *                        --numstat <ref>...HEAD`, scoped to the files
 *                        whose text changed. Defaults to `origin/main`.
 *                        Overridable through the `BASE_REF` environment
 *                        variable.
 *   - `--changed <list>` accept a comma-separated path list directly.
 *                        Used by integration / e2e tests that build
 *                        fixtures without spinning up a git repo.
 *
 * Exit codes:
 *   0 — pair is in sync (both changed or neither changed).
 *   1 — exactly one half changed; R-PROMPT-SCANNER-DRIFT printed.
 *   2 — invalid invocation (unknown flags etc.).
 */

import { execFileSync } from "node:child_process";
import { argv, env, exit, stdout, stderr } from "node:process";

const SCANNER_REL = "packages/qfai/src/core/prototyping/designMdViolations.ts";
const PROMPT_REL =
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md";

/** The one section of the prompt that states the compliance contract. */
const PROMPT_SCOPE_HEADING = "## Hard constraints (enforced by the compliance gate)";

/**
 * Manifest of the contract clauses that must drift-sync together. Kept
 * in lock-step with `packages/qfai/src/core/validators/promptScannerPairs.ts`
 * (PROMPT_SCANNER_PAIRS). The script does not require the source file
 * at runtime — it just names the clauses for the operator. The pair
 * tracks every compliance clause the scanner applies to a capture
 * (color / font / radius / shadow / contrast); this guard is
 * clause-agnostic within its scope — the scanner file and the prompt's
 * compliance section — so a change inside either, without the other, is
 * drift regardless of which clause the diff actually modifies.
 */
const TRACKED_CLAUSES =
  "color-literal-ban|font-family-ban|radius-literal-ban|shadow-rgba-ban|contrast-floor";

function parseArgs(argv) {
  const out = { base: undefined, changed: undefined };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--base") {
      out.base = argv[i + 1];
      i += 1;
    } else if (a === "--changed") {
      out.changed = argv[i + 1];
      i += 1;
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    } else {
      stderr.write(`check-prompt-scanner-pair: unknown argument ${JSON.stringify(a)}\n`);
      return null;
    }
  }
  return out;
}

function printHelp() {
  stdout.write(
    [
      "Usage: check-prompt-scanner-pair.mjs [--base <ref> | --changed <csv-paths>]",
      "",
      "Modes:",
      "  --base <ref>      diff HEAD against <ref> (default: $BASE_REF or origin/main)",
      "  --changed <csv>   accept a comma-separated changed-file list (test mode)",
      "",
      "Emits R-PROMPT-SCANNER-DRIFT and exits non-zero when exactly one of:",
      `  - ${SCANNER_REL}`,
      `  - ${PROMPT_REL}`,
      "is in the changed set without the other.",
      "",
    ].join("\n"),
  );
}

function isBaseRefReachable(base) {
  try {
    execFileSync("git", ["rev-parse", "--verify", `${base}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function tryFetchBase(base) {
  // Best-effort fetch of `origin/<branch>` when the ref isn't already
  // present in the local clone (shallow CI checkouts). Failure is
  // tolerated; the caller will soft-pass if the ref still can't be
  // resolved after this call.
  if (!base.startsWith("origin/")) return;
  const branch = base.slice("origin/".length);
  if (branch.length === 0) return;
  try {
    execFileSync("git", ["fetch", "--no-tags", "--depth=1", "origin", branch], { stdio: "ignore" });
  } catch {
    // ignore; the rev-parse retry below decides the outcome.
  }
}

/**
 * The path a `--numstat` line names.
 *
 * A line is `<added>\t<deleted>\t<path>`, so the path begins after the
 * second tab and may itself contain one. `--no-renames` keeps that shape:
 * with rename detection on, numstat writes `{old => new}` inside the path
 * instead of a plain one.
 */
function numstatPath(line) {
  const first = line.indexOf("\t");
  if (first < 0) return "";
  const second = line.indexOf("\t", first + 1);
  if (second < 0) return "";
  return line.slice(second + 1).trim();
}

function computeChangedSetFromGit(base) {
  // The `...` form yields the changes reachable from HEAD that are not
  // reachable from base, which is the "what did this PR change" view.
  //
  // `--numstat`, not `--name-only`. The question is whether this branch
  // changed the prompt or the scanner, and `--name-only` answers a
  // different one: it selects by blob identity and ignores the whitespace
  // flags entirely, so a commit that re-normalises line endings lists
  // every file and asks for a pairing edit nobody owes.
  //
  // `--ignore-cr-at-eol` rather than `--ignore-all-space`, which would
  // reach too far: it also hides an indentation change, and indentation
  // carries meaning in the Markdown these lanes read.
  if (!isBaseRefReachable(base)) {
    tryFetchBase(base);
  }
  if (!isBaseRefReachable(base)) {
    // Base ref still unreachable (e.g., shallow checkout in a fork PR
    // where the runner cannot fetch origin/main). Soft-pass with a
    // warning rather than hard-failing the lint gate; the canonical
    // PR-level check on the merge target will re-run with full history.
    stderr.write(
      `check-prompt-scanner-pair: base ref '${base}' is not reachable in this clone; ` +
        "skipping pair-changed drift check (soft-pass).\n",
    );
    return [];
  }
  try {
    const out = execFileSync(
      "git",
      ["diff", "--numstat", "--ignore-cr-at-eol", "--no-renames", `${base}...HEAD`],
      { encoding: "utf-8" },
    );
    const paths = out
      .split("\n")
      .map((line) => numstatPath(line))
      .filter((p) => p.length > 0);
    // The prompt is in scope only where its compliance section moved. Every
    // other edit to that file owes the scanner nothing.
    if (paths.includes(PROMPT_REL) && !promptContractChanged(base)) {
      return paths.filter((p) => p !== PROMPT_REL);
    }
    return paths;
  } catch (err) {
    stderr.write(
      `check-prompt-scanner-pair: failed to compute git diff against ${base}: ` +
        `${err && err.message ? err.message : String(err)}\n`,
    );
    return null;
  }
}

/**
 * The text under every `PROMPT_SCOPE_HEADING`, or `null` when there is none.
 * A section runs to the next heading of the same level; a deeper one belongs
 * to it.
 *
 * Every one, not the first. A second section under the same heading is valid
 * Markdown and a reader takes both as the contract, so stopping at the first
 * would let a branch append contradictory rules beside the original and report
 * no change at all. Two sections are also a different text from one, which is
 * what makes appending one count as the change it is.
 */
/**
 * Which lines sit inside a fenced code block, fence lines included.
 *
 * A prompt is a document about writing, so it quotes what it forbids. An
 * example carrying this guard's own heading would otherwise read as the live
 * contract, and renaming the real one would then look like no change at all.
 *
 * A fence closes on the same character, at least as long as the one that
 * opened it, which is what lets a longer fence quote a shorter one.
 */
function fencedLines(lines) {
  const inside = new Array(lines.length).fill(false);
  let open = null;
  for (let i = 0; i < lines.length; i += 1) {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if (open === null) {
      // An opening fence may carry an info string; a backtick fence may not
      // carry a backtick in it, which is how CommonMark keeps inline code from
      // opening one.
      if (fence && !(fence[1].startsWith("`") && fence[2].includes("`"))) {
        open = fence[1];
        inside[i] = true;
      }
      continue;
    }
    inside[i] = true;
    if (
      fence &&
      fence[1][0] === open[0] &&
      fence[1].length >= open.length &&
      fence[2].trim().length === 0
    ) {
      open = null;
    }
  }
  return inside;
}

function scopedSections(text) {
  const lines = text.split("\n");
  const fenced = fencedLines(lines);
  const isHeading = (i) => !fenced[i] && /^## (?!#)/.test(lines[i]);
  const found = [];
  for (let start = 0; start < lines.length; start += 1) {
    if (fenced[start] || lines[start].trim() !== PROMPT_SCOPE_HEADING) continue;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
      if (isHeading(i)) {
        end = i;
        break;
      }
    }
    found.push(lines.slice(start, end).join("\n"));
    start = end - 1;
  }
  return found.length === 0 ? null : found.join("\n");
}

/** A file's content at a ref, or `null` when the ref does not carry it. */
function blobAt(ref, relativePath) {
  try {
    return execFileSync("git", ["show", `${ref}:${relativePath}`], { encoding: "utf-8" });
  } catch {
    return null;
  }
}

/**
 * Whether this branch changed the prompt's compliance contract.
 *
 * Compared as text between the merge base and HEAD rather than by line
 * number, so a section that moved down the file because something was
 * inserted above it did not change.
 *
 * Unknowable answers resolve to `true`. A missing blob is a file this
 * branch added or removed, and a missing heading is a contract this guard
 * can no longer see — both are cases to pair on, not to wave through.
 */
function promptContractChanged(base) {
  let mergeBase;
  try {
    mergeBase = execFileSync("git", ["merge-base", base, "HEAD"], { encoding: "utf-8" }).trim();
  } catch {
    return true;
  }
  const before = blobAt(mergeBase, PROMPT_REL);
  const after = blobAt("HEAD", PROMPT_REL);
  if (before === null || after === null) return true;
  const beforeSection = scopedSections(before);
  const afterSection = scopedSections(after);
  if (beforeSection === null || afterSection === null) return true;
  return beforeSection !== afterSection;
}

function normalizeCsvSet(csv) {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function main() {
  const args = parseArgs(argv);
  if (args === null) {
    return 2;
  }
  if (args.help) {
    printHelp();
    return 0;
  }

  let changed;
  if (typeof args.changed === "string" && args.changed.length > 0) {
    changed = normalizeCsvSet(args.changed);
  } else {
    const base = args.base ?? env.BASE_REF ?? "origin/main";
    const computed = computeChangedSetFromGit(base);
    if (computed === null) {
      return 2;
    }
    changed = computed;
  }

  const normalized = changed.map((p) => p.replace(/\\/g, "/"));
  const scannerTouched = normalized.includes(SCANNER_REL);
  const promptTouched = normalized.includes(PROMPT_REL);

  if (scannerTouched === promptTouched) {
    // Both or neither — pair is in sync (or out-of-scope for this PR).
    return 0;
  }

  const modified = scannerTouched ? SCANNER_REL : PROMPT_REL;
  const unpaired = scannerTouched ? PROMPT_REL : SCANNER_REL;
  const message =
    `R-PROMPT-SCANNER-DRIFT: SSOT-sync pair drift detected — only ${modified} ` +
    `was modified without the matching counterpart. justification: modified=${modified}, ` +
    `un-paired=${unpaired}, clause=${TRACKED_CLAUSES} (Tailwind compliance contract; ` +
    "see packages/qfai/src/core/validators/promptScannerPairs.ts for the manifest).\n";
  stdout.write(message);
  return 1;
}

const code = main();
exit(code);
