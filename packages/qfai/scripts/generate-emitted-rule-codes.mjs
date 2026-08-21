#!/usr/bin/env node
/**
 * Generator for `src/core/emittedRuleCodes.ts`.
 *
 * `.qfai/waivers.yml` names a rule by its finding `code`. The waiver engine used
 * to decide whether that code exists by looking at the findings the current run
 * produced, plus a hand-written table of nine entries. Every other code — the
 * overwhelming majority — read as an unknown rule on any run where it stayed
 * quiet, which is precisely the state a project reaches after it fixes the
 * defect the waiver was written for.
 *
 * This script replaces the hand-maintained half of that answer: it scans the
 * package source for every `Issue` code literal the package can emit and writes
 * them to a generated module, so "does this rule exist?" is answered by the
 * emitters themselves rather than by whoever remembered to extend a list.
 *
 * Only the code is captured, never a severity. Severity is per-call-site and
 * frequently a variable, so a scanned value would be a guess; the run that
 * actually produces the finding supplies the real severity, and that is the only
 * run where severity decides anything (`QFAI-WAIVER-002`).
 *
 * Two literal shapes are recognised, matching how findings are constructed
 * across `src/`:
 *   - `issue("CODE", …)`  — first argument of the `issue()` helper.
 *   - `code: "CODE"`      — object-literal field on an `Issue`.
 *
 * Invocation modes:
 *   - default        rewrite the output module in place.
 *   - `--check`      compare only; exit 1 when the committed module is stale.
 *   - `--src <dir>`  scan a different tree. Test hook.
 *   - `--out <file>` write (or compare) a different file. Test hook.
 *
 * Exit codes:
 *   0 — module written, or already in sync under `--check`.
 *   1 — `--check` found drift, or the output file could not be read/written.
 *   2 — invalid invocation.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, "..");
const DEFAULT_SRC_DIR = path.join(PACKAGE_ROOT, "src");
const DEFAULT_OUTPUT_FILE = path.join(DEFAULT_SRC_DIR, "core", "emittedRuleCodes.ts");
const OUTPUT_LABEL = "src/core/emittedRuleCodes.ts";

/** The `issue()` helper's first argument. */
const ISSUE_CALL_RE = /\bissue\(\s*"([^"\\]+)"/g;
/** An `Issue` object literal's `code` field. */
const CODE_FIELD_RE = /\bcode:\s*"([^"\\]+)"/g;

/**
 * The shape a rule id may take, kept identical to `RULE_ID_RE` in
 * `src/core/waivers.ts`. Anything a waiver could not name is not worth
 * registering, and the filter keeps interpolated or lowercase literals that
 * happen to sit in one of the two positions out of the generated module.
 */
const RULE_ID_RE = /^[A-Z][A-Z0-9]*(?:[-_][A-Z0-9]+)*$/;

/**
 * Collect every `Issue` code literal under `srcDir`.
 *
 * @param {string} srcDir directory to walk; every `.ts` file below it is read.
 * @param {string} outputFile skipped while scanning — it holds the codes as
 *   plain array members, but skipping it keeps the generator idempotent no
 *   matter how the module is later reformatted.
 * @returns {Promise<string[]>} sorted, de-duplicated codes.
 */
async function collectEmittedRuleCodes(srcDir, outputFile) {
  const codes = new Set();
  const skip = path.resolve(outputFile);
  for (const file of await listTypeScriptFiles(srcDir)) {
    if (path.resolve(file) === skip) {
      continue;
    }
    let text;
    try {
      text = await readFile(file, "utf-8");
    } catch (error) {
      throw new Error(`failed to read ${file}: ${toMessage(error)}`);
    }
    for (const pattern of [ISSUE_CALL_RE, CODE_FIELD_RE]) {
      pattern.lastIndex = 0;
      let match = pattern.exec(text);
      while (match) {
        const candidate = match[1];
        if (RULE_ID_RE.test(candidate)) {
          codes.add(candidate);
        }
        match = pattern.exec(text);
      }
    }
  }
  return [...codes].sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listTypeScriptFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`failed to list ${dir}: ${toMessage(error)}`);
  }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Render the generated module. Formatting matches Prettier's output for this
 * shape so `prettier --check` stays green on a freshly generated file.
 *
 * @param {readonly string[]} codes
 * @returns {string}
 */
function renderEmittedRuleCodesModule(codes) {
  const body = codes.map((code) => `  "${code}",`).join("\n");
  return `/**
 * Every \`Issue\` code this package can emit.
 *
 * GENERATED FILE — do not edit by hand. Run \`npm run generate:rule-codes\`
 * from \`packages/qfai\` to refresh it; the scripts test slice fails on drift.
 *
 * The waiver engine reads this to tell a mistyped rule id apart from a real
 * rule that simply did not fire on this run. Without it, a waiver kept on file
 * after its defect was fixed is reported as naming a rule that does not exist.
 */
export const EMITTED_RULE_CODES: readonly string[] = [
${body}
];
`;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function toMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @param {readonly string[]} args
 * @returns {{ checkOnly: boolean, srcDir: string, outputFile: string } | { error: string }}
 */
function parseArgs(args) {
  let checkOnly = false;
  let srcDir = DEFAULT_SRC_DIR;
  let outputFile = DEFAULT_OUTPUT_FILE;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--check") {
      checkOnly = true;
      continue;
    }
    if (arg === "--src" || arg === "--out") {
      const value = args[index + 1];
      if (!value) {
        return { error: `${arg} requires a path` };
      }
      if (arg === "--src") {
        srcDir = path.resolve(value);
      } else {
        outputFile = path.resolve(value);
      }
      index += 1;
      continue;
    }
    return { error: `unknown argument: ${arg}` };
  }
  return { checkOnly, srcDir, outputFile };
}

async function main() {
  const parsed = parseArgs(argv.slice(2));
  if ("error" in parsed) {
    stderr.write(`${parsed.error}\n`);
    return 2;
  }

  const codes = await collectEmittedRuleCodes(parsed.srcDir, parsed.outputFile);
  const rendered = renderEmittedRuleCodesModule(codes);

  if (parsed.checkOnly) {
    let current;
    try {
      current = await readFile(parsed.outputFile, "utf-8");
    } catch (error) {
      stderr.write(`cannot read ${parsed.outputFile}: ${toMessage(error)}\n`);
      return 1;
    }
    if (current.replace(/\r\n/g, "\n") !== rendered) {
      stderr.write(`${OUTPUT_LABEL} is stale. Run \`npm run generate:rule-codes\`.\n`);
      return 1;
    }
    stdout.write(`${OUTPUT_LABEL} is in sync (${codes.length} codes).\n`);
    return 0;
  }

  try {
    await writeFile(parsed.outputFile, rendered, "utf-8");
  } catch (error) {
    stderr.write(`cannot write ${parsed.outputFile}: ${toMessage(error)}\n`);
    return 1;
  }
  stdout.write(`wrote ${OUTPUT_LABEL} (${codes.length} codes).\n`);
  return 0;
}

main()
  .then((code) => exit(code))
  .catch((error) => {
    stderr.write(`generate-emitted-rule-codes failed: ${toMessage(error)}\n`);
    exit(1);
  });
