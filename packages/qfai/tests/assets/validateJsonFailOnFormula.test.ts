/**
 * The validate JSON guide tells a consumer how to turn `counts` into a
 * pass/fail decision. Under `--fail-on warning` the CLI fails when
 * `counts.error + counts.warning > 0`, so a guide that names `counts.warning`
 * alone leads a consumer to pass an error-only result the CLI fails.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { shouldFail } from "../../src/cli/lib/failOn.js";
import type { ValidationResult } from "../../src/core/types.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const GUIDE = "assistant/skill/qfai-verify/references/validate-json-schema.md";

const WARNING_FORMULA = "`counts.error + counts.warning > 0`";

describe.each(QFAI_TREES)("%s", (tree) => {
  it("states the --fail-on warning decision as errors plus warnings", async () => {
    const guide = await readFile(path.join(repoRoot, tree, GUIDE), "utf-8");
    // Collapse line wrapping so the check reads the sentence, not its layout.
    const prose = guide.replace(/\s+/g, " ");
    expect(prose).toContain(`${WARNING_FORMULA} under \`--fail-on warning\``);
  });
});

it("fails an error-only result under --fail-on warning, as the guide says", () => {
  const errorOnly: ValidationResult = {
    toolVersion: "0.0.0",
    issues: [],
    counts: { info: 0, warning: 0, error: 1 },
  };
  expect(shouldFail(errorOnly, "warning")).toBe(true);
});
