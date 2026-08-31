/**
 * `assistant/catalog/cli-ux-guidelines.md` is shipped by `qfai init` and declares
 * the line grammar of `qfai validate --format text` (the default format). Nothing
 * else binds that document to the emitter, so this test rebuilds the expected
 * lines from the grammar the guideline actually ships and compares them against
 * real `emitText` output. Either side drifting fails here.
 *
 * The guideline is used as a *complete* output contract, so the fixtures below
 * mirror production faithfully: counts skip suppressed issues (as `countIssues`
 * does), an error issue carries a multi-line `suggested_action` (as
 * `QFAI-SKILLS-001` does), and the trailing `run-log:` line is exercised through
 * `runValidate`, not through the emitter alone.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { captureStdout } from "../../helpers/stdout.js";
import { emitText, runValidate } from "../../../src/cli/commands/validate.js";
import { warnIfTruncated } from "../../../src/cli/lib/warnings.js";
import { loadConfig, type FailOn } from "../../../src/core/config.js";
import { validateBpApDb } from "../../../src/core/validators/bpApDb.js";
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

const DETAIL_LABELS = ["error_code", "target", "expected", "current", "fix"] as const;

async function readGuideline(): Promise<string> {
  const content = await readFile(GUIDELINE_PATH, "utf-8");
  return content.replace(/\r\n/g, "\n");
}

/** Every ```text fence in the guideline, in document order. */
function fences(guideline: string): string[] {
  return [...guideline.matchAll(/```text\n([\s\S]*?)```/g)].map((match) => match[1] ?? "");
}

function fenceWith(guideline: string, needle: string): string {
  const found = fences(guideline).find((fence) => fence.includes(needle));
  if (found === undefined) {
    throw new Error(`cli-ux-guidelines.md no longer documents a block containing ${needle}`);
  }
  return found;
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

/** Labels of the indented detail block documented for `error` issues, in order. */
function extractDetailLabels(guideline: string): string[] {
  return fenceWith(guideline, "error_code:")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trim().split(":")[0] ?? "");
}

/**
 * Leading-space count of the continuation line in the guideline's worked
 * multi-line example. Binding the example to the rule is what keeps the
 * documented indent honest.
 */
function documentedContinuationIndent(guideline: string): number {
  const example = fences(guideline).find(
    (fence) => fence.startsWith("  fix: ") && !fence.includes("error_code:"),
  );
  if (example === undefined) {
    throw new Error("cli-ux-guidelines.md no longer shows a multi-line detail-field example");
  }
  const continuation = example.split("\n")[1];
  if (continuation === undefined || continuation.trim().length === 0) {
    throw new Error("the multi-line detail-field example lost its continuation line");
  }
  return continuation.length - continuation.trimStart().length;
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

/**
 * Mirrors production `countIssues` (`src/core/validate.ts`): a waiver-suppressed
 * issue still prints its line but is never counted. Counting by severity alone
 * would validate the guideline against a counts line the CLI never emits.
 */
function resultOf(issues: Issue[]): ValidationResult {
  const counted = issues.filter((issue) => issue.suppressed !== true);
  return {
    toolVersion: "0.0.0-test",
    issues,
    counts: {
      info: counted.filter((i) => i.severity === "info").length,
      warning: counted.filter((i) => i.severity === "warning").length,
      error: counted.filter((i) => i.severity === "error").length,
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

type LineKind =
  | "warn"
  | "header"
  | "counts"
  | "run-log"
  | "detail"
  | "detail-continuation"
  | "message-continuation";

/**
 * The precedence documented under `### 行の判定順序`, implemented literally:
 * structural lines are recognised before the "anything else continues the
 * previous message" fallback. A guideline whose rules only worked in this
 * order on paper would still leave `counts:` swallowed by a multi-line message.
 *
 * Rule 5 keys on the run's `--fail-on` threshold, not on `error` alone: the
 * emitter prints a detail block for every severity that can fail the run, so a
 * `--fail-on warning` run puts one under its warnings too and a classifier
 * pinned to `error` would read that block as more message text.
 */
function classifyByGuideline(lines: string[], failOn: FailOn): { kind: LineKind; line: string }[] {
  const carriesDetail = (value: string | undefined): boolean =>
    value === "error" || (failOn === "warning" && value === "warning");
  let section: "none" | "message" | "detail" = "none";
  let severity: string | undefined;
  return lines.map((line) => {
    if (line.startsWith("[warn] ")) {
      return { kind: "warn" as const, line };
    }
    const header = /^\[(info|warning|error)\] /.exec(line);
    if (header) {
      section = "message";
      severity = header[1];
      return { kind: "header" as const, line };
    }
    if (line.startsWith("counts: ")) {
      section = "none";
      severity = undefined;
      return { kind: "counts" as const, line };
    }
    if (line.startsWith("run-log: ")) {
      section = "none";
      severity = undefined;
      return { kind: "run-log" as const, line };
    }
    if (carriesDetail(severity) && section === "message" && line.startsWith("  error_code: ")) {
      section = "detail";
      return { kind: "detail" as const, line };
    }
    if (section === "detail") {
      return {
        kind: /^ {2}\S+: /.test(line) ? ("detail" as const) : ("detail-continuation" as const),
        line,
      };
    }
    return { kind: "message-continuation" as const, line };
  });
}

/** The ordered rules listed under `### 行の判定順序`, in document order. */
function extractPrecedenceRules(guideline: string): string[] {
  const section = /### 行の判定順序\n([\s\S]*?)\n\n>/.exec(guideline)?.[1];
  if (section === undefined) {
    throw new Error("cli-ux-guidelines.md no longer documents a line-classification precedence");
  }
  return section
    .split("\n")
    .filter((line) => /^\d+\. /.test(line))
    .map((line) => line.replace(/^\d+\. /, ""));
}

const MULTILINE_FIX = [
  "標準資産の直編集は非推奨です。",
  "標準状態へ戻してから validate を再実行してください。",
] as const;

/**
 * The `--fail-on` threshold a plain `qfai validate` runs at
 * (`validation.failOn: "error"` in `core/config.ts`). `emitText` takes it to
 * decide which issues get the detail block, so the synthetic renders below have
 * to use the same threshold the real run this guideline documents does.
 */
const DEFAULT_FAIL_ON: FailOn = "error";

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
  {
    code: "QFAI-TEST-005",
    severity: "error",
    category: "change",
    message: "multi-line suggested action",
    file: ".qfai/assistant/skills/qfai-verify/SKILL.md",
    suggested_action: MULTILINE_FIX.join("\n"),
    rule: "test.multiline",
  },
];

describe("validate --format text matches the shipped CLI UX guideline", () => {
  it("emits every issue in the grammar documented by cli-ux-guidelines.md", async () => {
    const grammar = extractGrammar(await readGuideline());
    const output = await captureStdout(() => {
      emitText(resultOf(SYNTHETIC_ISSUES), DEFAULT_FAIL_ON);
      return Promise.resolve();
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
        // `validateDesignTokens` forwards `parseDesignToken`'s `error.path` as
        // the issue's refs, so the real line for this finding carries a
        // `refs=` slot. Dropping it here would let the example drift.
        message: "Circular reference detected: semantic.color.primary",
        file: ".qfai/contracts/design/design-tokens.yaml",
        refs: ["semantic.color.primary"],
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

  it("renders a multi-line detail field as the documented continuation lines", async () => {
    const guideline = await readGuideline();
    const labels = extractDetailLabels(guideline);
    expect(labels).toEqual([...DETAIL_LABELS]);

    const indent = documentedContinuationIndent(guideline);
    // The documented rule: `2 + <label> + 2`, i.e. the continuation aligns
    // under the first character of the value.
    expect(indent).toBe(2 + "fix".length + 2);

    const multiline = SYNTHETIC_ISSUES.find((issue) => issue.code === "QFAI-TEST-005");
    expect(multiline).toBeDefined();
    if (multiline === undefined) return;

    const output = await captureStdout(() => {
      emitText(resultOf([multiline]), DEFAULT_FAIL_ON);
      return Promise.resolve();
    });
    const lines = output.split("\n");
    const headerIndex = lines.findIndex((line) => line.startsWith(`[error] ${multiline.code} `));
    expect(headerIndex).toBeGreaterThanOrEqual(0);

    const detail = lines.slice(headerIndex + 1, headerIndex + labels.length + MULTILINE_FIX.length);
    expect(
      detail.filter((line) => /^ {2}\S+: /.test(line)).map((line) => line.trim().split(":")[0]),
    ).toEqual(labels);
    expect(detail.at(-2)).toBe(`  fix: ${MULTILINE_FIX[0]}`);
    expect(detail.at(-1)).toBe(`${" ".repeat(indent)}${MULTILINE_FIX[1]}`);
  });

  /**
   * The detail block follows the run's `--fail-on` threshold, not the literal
   * severity `error`: under `--fail-on warning` a warning is what fails the
   * run, so it gets the same block. The guideline says so in both places it
   * describes the block, and this is what holds the two together.
   */
  it("gives warnings the detail block under --fail-on warning, as documented", async () => {
    const guideline = await readGuideline();
    expect(guideline).toContain("`--fail-on warning`");

    const warning = SYNTHETIC_ISSUES.find((issue) => issue.code === "QFAI-TEST-002");
    expect(warning).toBeDefined();
    if (warning === undefined) return;

    const atThreshold = await captureStdout(() => {
      emitText(resultOf([warning]), "warning");
      return Promise.resolve();
    });
    expect(classifyByGuideline(atThreshold.trimEnd().split("\n"), "warning")).toContainEqual({
      kind: "detail",
      line: `  error_code: ${warning.code}`,
    });

    const belowThreshold = await captureStdout(() => {
      emitText(resultOf([warning]), DEFAULT_FAIL_ON);
      return Promise.resolve();
    });
    expect(belowThreshold).not.toContain("  error_code: ");
  });

  it("closes the text output with the documented counts line", async () => {
    const guideline = await readGuideline();
    expect(guideline).toContain("counts: info=<n> warning=<n> error=<n>");

    const output = await captureStdout(() => {
      emitText(resultOf(SYNTHETIC_ISSUES), DEFAULT_FAIL_ON);
      return Promise.resolve();
    });
    // QFAI-TEST-004 prints but is not counted — same rule as `countIssues`.
    expect(output).toContain("counts: info=1 warning=2 error=1\n");
  });

  it("ends the real `--format text` run with the documented run-log line", async () => {
    const guideline = await readGuideline();
    expect(fenceWith(guideline, "run-log:").trim()).toBe("run-log: <path>");

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-text-format-"));
    try {
      await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });
      const output = await captureStdout(async () => {
        await runValidate({ root, strict: false, format: "text" });
      });
      const lines = output.trimEnd().split("\n");

      expect(lines.at(-2)).toMatch(/^counts: info=\d+ warning=\d+ error=\d+$/);
      expect(lines.at(-1)).toMatch(/^run-log: \S/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  /**
   * `QFAI-BPAP-002` forwards the YAML parser's `error.message` verbatim, and that
   * message carries position information and a source excerpt across several
   * lines. `emitText` does not normalize it, so one issue prints as several
   * physical lines — the guideline has to say so or a line-oriented parser
   * breaks on the first malformed input.
   */
  it("keeps a real multi-line issue message renderable from the documented grammar", async () => {
    const guideline = await readGuideline();
    const grammar = extractGrammar(guideline);
    expect(guideline).toContain("`<message>` は改行を含むことがある");

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-text-multiline-"));
    try {
      const designDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(designDir, { recursive: true });
      await writeFile(
        path.join(designDir, "anti-patterns.yaml"),
        "- id: AP-0001\n  title: [unclosed\n",
        "utf-8",
      );

      const { config } = await loadConfig(root);
      const issues = await validateBpApDb(root, config);
      const parseError = issues.find((item) => item.code === "QFAI-BPAP-002");
      expect(parseError, "the fixture must produce a real YAML parse error").toBeDefined();
      if (parseError === undefined) return;
      expect(parseError.message).toContain("\n");

      const output = await captureStdout(() => {
        emitText(resultOf([parseError]), DEFAULT_FAIL_ON);
        return Promise.resolve();
      });
      // The whole (multi-line) header block is exactly what the grammar renders,
      // trailing slots included — they land on the last physical line.
      expect(output.startsWith(`${renderFromGrammar(grammar, parseError)}\n`)).toBe(true);
      const header = output.split("\n")[0] ?? "";
      expect(header.startsWith(`[error] ${parseError.code} `)).toBe(true);
      expect(header).not.toContain(`(${parseError.file})`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  /**
   * `runValidate` calls `warnIfTruncated` before `emitText`, and that warning
   * goes to stdout. A guideline claiming to be the complete stdout contract has
   * to declare it, or a conforming parser meets an undeclared line on any repo
   * whose test-file scan hits the limit.
   */
  it("declares the scan-truncation warning line the CLI prints before the issues", async () => {
    const guideline = await readGuideline();
    expect(fenceWith(guideline, "file scan truncated").trim()).toBe(
      "[warn] <command>: file scan truncated: collected <n> files (limit <n>)",
    );

    const truncated = await captureStdout(() => {
      warnIfTruncated(
        { globs: [], excludeGlobs: [], matchedFileCount: 20001, truncated: true, limit: 20000 },
        "validate",
      );
      return Promise.resolve();
    });
    expect(truncated).toBe(
      "[warn] validate: file scan truncated: collected 20001 files (limit 20000)\n",
    );

    const complete = await captureStdout(() => {
      warnIfTruncated(
        { globs: [], excludeGlobs: [], matchedFileCount: 12, truncated: false, limit: 20000 },
        "validate",
      );
      return Promise.resolve();
    });
    expect(complete).toBe("");
  });

  /**
   * "Anything that does not start with `[<severity>] ` continues the previous
   * message" is only safe once the structural lines are matched first. This
   * runs the documented precedence over one real run that carries all of them
   * at once: a truncation warning, a multi-line `QFAI-BPAP-002` message, an
   * error detail block, `counts:` and `run-log:`.
   */
  it("classifies every structural line ahead of the message-continuation fallback", async () => {
    const guideline = await readGuideline();
    const rules = extractPrecedenceRules(guideline);
    expect(rules).toHaveLength(6);
    const anchors = ["[warn] ", "[info] ", "counts: ", "run-log: ", "error_code:"];
    for (const [index, anchor] of anchors.entries()) {
      expect(rules[index], `precedence rule ${index + 1} must key on ${anchor}`).toContain(anchor);
    }

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-text-classify-"));
    try {
      const designDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(designDir, { recursive: true });
      await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });
      await writeFile(
        path.join(designDir, "anti-patterns.yaml"),
        "- id: AP-0001\n  title: [unclosed\n",
        "utf-8",
      );

      const output = await captureStdout(async () => {
        warnIfTruncated(
          { globs: [], excludeGlobs: [], matchedFileCount: 20001, truncated: true, limit: 20000 },
          "validate",
        );
        await runValidate({ root, strict: false, format: "text" });
      });
      const classified = classifyByGuideline(output.trimEnd().split("\n"), DEFAULT_FAIL_ON);

      expect(classified[0]?.kind).toBe("warn");
      expect(classified.at(-1)?.kind).toBe("run-log");
      expect(classified.at(-2)?.kind).toBe("counts");
      expect(classified.filter((entry) => entry.kind === "counts")).toHaveLength(1);

      const header = classified.findIndex(
        (entry) => entry.kind === "header" && entry.line.startsWith("[error] QFAI-BPAP-002 "),
      );
      expect(header, "the fixture must produce a real YAML parse error").toBeGreaterThanOrEqual(0);
      // The parser message spans physical lines, and the detail block that
      // follows is recognised as structure rather than more message.
      expect(classified[header + 1]?.kind).toBe("message-continuation");
      const detail = classified.findIndex(
        (entry, index) => index > header && entry.kind === "detail",
      );
      expect(classified[detail]?.line.startsWith("  error_code: QFAI-BPAP-002")).toBe(true);

      for (const entry of classified.filter((item) => item.kind === "message-continuation")) {
        expect(entry.line.startsWith("counts: "), `structural line absorbed: ${entry.line}`).toBe(
          false,
        );
        expect(entry.line.startsWith("run-log: "), `structural line absorbed: ${entry.line}`).toBe(
          false,
        );
        expect(
          entry.line.startsWith("  error_code: "),
          `structural line absorbed: ${entry.line}`,
        ).toBe(false);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
