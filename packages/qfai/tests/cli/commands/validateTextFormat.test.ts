/**
 * `assistant/catalog/cli-ux-guidelines.md` is shipped by `qfai init` and declares
 * the line grammar of `qfai validate --format text` (the default format). Nothing
 * else binds that document to the emitter, so this test rebuilds the expected
 * lines from the grammar the guideline actually ships and compares them against
 * real `emitText` output. Either side drifting fails here.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { captureStdout } from "../../helpers/stdout.js";
import { emitText } from "../../../src/cli/commands/validate.js";
import type { Issue, ValidationResult } from "../../../src/core/types.js";

const GUIDELINE_PATH = path.resolve(
  __dirname,
  "../../../assets/init/.qfai/assistant/catalog/cli-ux-guidelines.md",
);

const OPTIONAL_SLOTS = {
  file: "[ (<file>)]",
  refs: "[ refs=<refs>]",
  suppressed: "[ suppressed=true]",
} as const;

async function readGuideline(): Promise<string> {
  const content = await readFile(GUIDELINE_PATH, "utf-8");
  return content.replace(/\r\n/g, "\n");
}

/** Extracts the single-line grammar fenced right under `## Error Message Format`. */
function extractGrammar(guideline: string): string {
  const match = /## Error Message Format\n[\s\S]*?```text\n([^\n]+)\n```/.exec(guideline);
  const grammar = match?.[1];
  if (grammar === undefined) {
    throw new Error("cli-ux-guidelines.md no longer documents an Error Message Format grammar");
  }
  for (const slot of Object.values(OPTIONAL_SLOTS)) {
    if (!grammar.includes(slot)) {
      throw new Error(`documented grammar lost the optional slot ${slot}: ${grammar}`);
    }
  }
  return grammar;
}

/** Renders one issue by substituting it into the documented grammar. */
function renderFromGrammar(grammar: string, issue: Issue): string {
  return grammar
    .replace(OPTIONAL_SLOTS.file, issue.file === undefined ? "" : ` (${issue.file})`)
    .replace(
      OPTIONAL_SLOTS.refs,
      issue.refs !== undefined && issue.refs.length > 0 ? ` refs=${issue.refs.join(",")}` : "",
    )
    .replace(OPTIONAL_SLOTS.suppressed, issue.suppressed === true ? " suppressed=true" : "")
    .replace("[<severity>]", `[${issue.severity}]`)
    .replace("<CODE>", issue.code)
    .replace("<message>", issue.message);
}

function resultOf(issues: Issue[]): ValidationResult {
  return {
    toolVersion: "0.0.0-test",
    issues,
    counts: {
      info: issues.filter((i) => i.severity === "info").length,
      warning: issues.filter((i) => i.severity === "warning").length,
      error: issues.filter((i) => i.severity === "error").length,
    },
    traceability: {
      sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
      testFiles: {
        globs: [],
        excludeGlobs: [],
        matchedFileCount: 0,
        truncated: false,
        limit: 0,
      },
    },
  };
}

const SYNTHETIC_ISSUES: Issue[] = [
  {
    code: "QFAI-TEST-001",
    severity: "info",
    category: "canonical",
    message: "no location and no refs",
    rule: "test.plain",
  },
  {
    code: "QFAI-TEST-002",
    severity: "warning",
    category: "canonical",
    message: "location only",
    file: ".qfai/contracts/design/design-tokens.yaml",
    rule: "test.file",
  },
  {
    code: "QFAI-TEST-003",
    severity: "warning",
    category: "canonical",
    message: "location and refs",
    file: ".qfai/specs/spec-0001/01_Spec.md",
    refs: ["semantic.color.primary", "semantic.color.accent"],
    rule: "test.refs",
  },
  {
    code: "QFAI-TEST-004",
    severity: "warning",
    category: "canonical",
    message: "suppressed by a waiver",
    file: ".qfai/specs/spec-0001/01_Spec.md",
    suppressed: true,
    rule: "test.suppressed",
  },
];

describe("validate --format text matches the shipped CLI UX guideline", () => {
  it("emits every issue in the grammar documented by cli-ux-guidelines.md", async () => {
    const grammar = extractGrammar(await readGuideline());
    const output = await captureStdout(async () => {
      emitText(resultOf(SYNTHETIC_ISSUES));
    });
    const lines = output.split("\n");

    for (const issue of SYNTHETIC_ISSUES) {
      expect(lines, `issue ${issue.code} must render as documented`).toContain(
        renderFromGrammar(grammar, issue),
      );
    }
  });

  it("keeps the worked examples in the guideline renderable from its own grammar", async () => {
    const guideline = await readGuideline();
    const grammar = extractGrammar(guideline);

    const examples: Issue[] = [
      {
        code: "QFAI-DT-002",
        severity: "error",
        category: "canonical",
        message: "Circular reference detected: semantic.color.primary",
        file: ".qfai/contracts/design/design-tokens.yaml",
      },
      {
        code: "QFAI-MOCK-002",
        severity: "error",
        category: "canonical",
        message: "External URL reference in HTML Mock: https://cdn.example.com/style.css",
        file: ".qfai/specs/spec-0001/01_Spec.md",
      },
    ];

    for (const example of examples) {
      expect(guideline, `${example.code} example must use the documented shape`).toContain(
        `\`${renderFromGrammar(grammar, example)}\``,
      );
    }
  });

  it("closes the text output with the documented counts line", async () => {
    const guideline = await readGuideline();
    expect(guideline).toContain("counts: info=<n> warning=<n> error=<n>");

    const output = await captureStdout(async () => {
      emitText(resultOf(SYNTHETIC_ISSUES));
    });
    expect(output).toContain("counts: info=1 warning=3 error=0\n");
  });
});
