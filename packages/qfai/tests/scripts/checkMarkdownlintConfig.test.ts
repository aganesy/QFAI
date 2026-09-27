/**
 * Tests for `packages/qfai/scripts/check-markdownlint-config.mjs`.
 *
 * markdownlint-cli2 ignores a configuration entry it does not understand, so
 * each case below is one that the linter itself would accept in silence.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { findConfigProblems } from "../../scripts/check-markdownlint-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, "../../scripts/check-markdownlint-config.mjs");

describe("check-markdownlint-config", () => {
  it("accepts a valid configuration with comments", () => {
    const text = '{\n  // why\n  "MD013": { "line_length": 1200, "tables": false }\n}\n';
    expect(findConfigProblems(text)).toEqual([]);
  });

  it("rejects an unknown rule name", () => {
    expect(findConfigProblems('{ "MD999": false }')).toContain(
      "/ must NOT have additional properties: MD999",
    );
  });

  it("rejects an option value of the wrong type", () => {
    expect(findConfigProblems('{ "MD013": { "line_length": "long" } }')).not.toEqual([]);
  });

  it("rejects a misspelt option name", () => {
    expect(findConfigProblems('{ "MD013": { "lineLength": 10 } }')).toContain(
      "/MD013 must NOT have additional properties: lineLength",
    );
  });

  it("rejects text that is not JSONC", () => {
    expect(findConfigProblems('{ "MD013": ')).toContain(
      "unparsable JSONC at offset 11: ValueExpected",
    );
  });

  it("passes on the repository's own configuration", () => {
    const child = spawnSync(process.execPath, [SCRIPT], { encoding: "utf-8" });
    expect(child.stderr).toBe("");
    expect(child.status).toBe(0);
  });
});
