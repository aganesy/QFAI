#!/usr/bin/env node
/**
 * Checks the spec tree's markdownlint configuration against markdownlint's own
 * strict JSON Schema.
 *
 * markdownlint-cli2 accepts an unknown rule name, a misspelt option or a value
 * of the wrong type without a word, and the rule the entry meant to change
 * keeps its default. The strict schema rejects all three.
 *
 * The schema and the JSONC reader come from the markdownlint-cli2 the
 * repository already installs, so the check follows the linter's own version.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process, { stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** The configuration files checked, repository-root-relative. */
export const CONFIG_FILES = [".qfai/spec/.markdownlint.jsonc"];

const cli2Require = createRequire(
  createRequire(path.join(REPO_ROOT, "package.json")).resolve("markdownlint-cli2"),
);
const jsonc = cli2Require("jsonc-parser");
const SCHEMA_PATH = path.join(
  path.dirname(cli2Require.resolve("markdownlint")),
  "..",
  "schema",
  "markdownlint-config-schema-strict.json",
);
const validate = new Ajv({ strict: false, allErrors: true }).compile(
  JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")),
);

/**
 * The problems in one configuration's text, or an empty list when it is valid.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function findConfigProblems(text) {
  const parseErrors = [];
  const config = jsonc.parse(text, parseErrors, { allowTrailingComma: true });
  if (parseErrors.length > 0) {
    return parseErrors.map(
      (e) => `unparsable JSONC at offset ${e.offset}: ${jsonc.printParseErrorCode(e.error)}`,
    );
  }
  if (validate(config)) return [];
  return (validate.errors ?? []).map((e) => {
    const extra = e.params?.additionalProperty;
    const named = typeof extra === "string" ? `: ${extra}` : "";
    return `${e.instancePath || "/"} ${e.message ?? ""}${named}`.trim();
  });
}

function main() {
  let failed = false;
  for (const file of CONFIG_FILES) {
    const problems = findConfigProblems(readFileSync(path.join(REPO_ROOT, file), "utf-8"));
    for (const problem of problems) stderr.write(`${file}: ${problem}\n`);
    failed ||= problems.length > 0;
  }
  if (failed) {
    stderr.write(
      "check-markdownlint-config: fix the entries above; markdownlint ignores them silently.\n",
    );
    return 1;
  }
  stdout.write(`check-markdownlint-config: ${CONFIG_FILES.length} file(s) valid.\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
