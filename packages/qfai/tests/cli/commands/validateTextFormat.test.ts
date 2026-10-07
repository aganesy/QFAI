/**
 * The validate contract's business rules declare the line grammar of
 * `qfai validate --format text` (the default format). Nothing else binds those
 * rules to the emitter, so this test rebuilds the expected lines from the
 * grammar the rules state and compares them against real `emitText` output.
 * Either side drifting fails here.
 *
 * The rules are used as a *complete* output contract, so the fixtures below
 * mirror production faithfully: counts skip suppressed issues (as `countIssues`
 * does), an error issue carries a multi-line `suggested_action` (as
 * a real finding does), and the trailing `run-log:` line is exercised through
 * `runValidate`, not through the emitter alone.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { captureStdout } from "../../helpers/stdout.js";
import { emitText, resolveIssueFix, runValidate } from "../../../src/cli/commands/validate.js";
import { loadConfig, type FailOn } from "../../../src/core/config.js";
import { parseContractRules } from "../../../src/core/storyTree/contractRules.js";
import { validateDesignToken } from "../../../src/core/validators/designToken.js";
import type { Issue, ValidationResult } from "../../../src/core/types.js";

const CONTRACT_PATH = path.resolve(
  __dirname,
  "../../../../../.qfai/spec/03_contract/cli/cli-0014-qfai-validate.md",
);

const OPTIONAL_SLOTS = {
  file: "[ (<file>)]",
  refs: "[ refs=<refs>]",
  suppressed: "[ suppressed=true]",
} as const;

/** The labels the old per-issue detail block printed; none of them is printed any more. */
const DROPPED_LABELS = /^ {2}(error_code|target|expected|current): /m;

// QFAI:EX-0001-0039-02
// QFAI:EX-0001-0039-03
it("directs agent routing repairs to package defaults or project config overrides", () => {
  for (const code of ["QFAI-AGENT-015", "QFAI-AGENT-017", "QFAI-AGENT-018", "QFAI-AGENT-019"]) {
    const fix = resolveIssueFix({ code, severity: "error", category: "canonical", message: code });
    expect(fix).toContain("packages/qfai/assets/defaults/");
    expect(fix).toContain("qfai.config.yaml");
    expect(fix).not.toContain(".qfai/assistant/manifest/");
  }
});

/** The business rules that state the text output grammar, one statement per line. */
async function readGuideline(): Promise<string> {
  const content = await readFile(CONTRACT_PATH, "utf-8");
  const statements = parseContractRules(CONTRACT_PATH, content)
    .rules.map((rule) => rule.statement)
    .filter((statement) => /text output|--format text|`fix: /.test(statement));
  if (statements.length === 0) {
    throw new Error("cli-0014-qfai-validate.md no longer states the text output grammar");
  }
  return statements.join("\n");
}

/** Extracts the one-issue line grammar the rules state as a code span. */
function extractGrammar(guideline: string): string {
  const grammar = /`(\[<severity>\] <CODE> <message>[^`]*)`/.exec(guideline)?.[1];
  if (grammar === undefined) {
    throw new Error("the text output grammar no longer documents a one-issue line");
  }
  for (const slot of Object.values(OPTIONAL_SLOTS)) {
    if (!grammar.includes(slot)) {
      throw new Error(`documented grammar lost the optional slot ${slot}: ${grammar}`);
    }
  }
  return grammar;
}

/** Extracts the line that closes a group the rules state as a code span. */
function extractGroupTail(guideline: string): string {
  const tail = /`(\[<severity>\] <CODE> and <n> more)`/.exec(guideline)?.[1];
  if (tail === undefined) {
    throw new Error("the text output grammar no longer documents the line that closes a group");
  }
  return tail;
}

/** The label of the one remedy line the rules document. */
function extractRemedyLabel(guideline: string): string {
  const label = /`([a-z_]+): <suggested action>`/.exec(guideline)?.[1];
  if (label === undefined) {
    throw new Error("the text output grammar no longer documents the remedy line");
  }
  return label;
}

/**
 * The continuation indent for `label`, from the arithmetic the rules state in
 * words: two spaces, plus the label's length, plus two.
 */
function documentedContinuationIndent(guideline: string, label: string): number {
  if (!guideline.includes("two spaces, plus the label's length, plus two")) {
    throw new Error("the text output grammar no longer states the continuation indent");
  }
  return 2 + label.length + 2;
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
  };
}

type LineKind =
  | "header"
  | "counts"
  | "fail-on"
  | "timings"
  | "run-log"
  | "fix"
  | "fix-continuation"
  | "message-continuation";

/**
 * The precedence the line-classification rule states, implemented literally:
 * structural lines are recognised before the "anything else continues the
 * previous message" fallback. A guideline whose rules only worked in this
 * order on paper would still leave `counts:` swallowed by a multi-line message.
 *
 * Rule 6 keys on the run's `--fail-on` threshold, not on `error` alone: the
 * emitter prints `fix` lines for every severity that can fail the run, so a
 * `--fail-on warning` run puts them under its warnings too and a classifier
 * pinned to `error` would read them as more message text.
 */
function classifyByGuideline(lines: string[], failOn: FailOn): { kind: LineKind; line: string }[] {
  const carriesFix = (value: string | undefined): boolean =>
    value === "error" || (failOn === "warning" && value === "warning");
  let section: "none" | "message" | "fix" = "none";
  let severity: string | undefined;
  return lines.map((line) => {
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
    if (line.startsWith("timings: ")) {
      section = "none";
      severity = undefined;
      return { kind: "timings" as const, line };
    }
    if (line.startsWith("fail-on: ")) {
      section = "none";
      severity = undefined;
      return { kind: "fail-on" as const, line };
    }
    if (line.startsWith("run-log: ")) {
      section = "none";
      severity = undefined;
      return { kind: "run-log" as const, line };
    }
    if (carriesFix(severity) && section !== "none" && line.startsWith("  fix: ")) {
      section = "fix";
      return { kind: "fix" as const, line };
    }
    if (section === "fix") {
      return { kind: "fix-continuation" as const, line };
    }
    return { kind: "message-continuation" as const, line };
  });
}

/**
 * The numbered tests of the line-classification rule, in the order it states
 * them: `(1) …; (2) …; … (7) ….` Each test ends at the next number, and the
 * last at the end of its sentence.
 */
function extractPrecedenceRules(guideline: string): string[] {
  const statement = guideline.split("\n").find((line) => line.includes("classifies each line"));
  if (statement === undefined) {
    throw new Error("the text output grammar no longer documents a line-classification precedence");
  }
  return [...statement.matchAll(/\((\d)\) (.*?)(?=; \(\d\) |\. [A-Z]|\.?$)/g)].map(
    (match) => match[2] ?? "",
  );
}

const MULTILINE_FIX = [
  "Editing standard assets directly is deprecated.",
  "Restore the standard state, then rerun validate.",
] as const;

/**
 * The `--fail-on` threshold a plain `qfai validate` runs at
 * (`validation.failOn: "error"` in `core/config.ts`). `emitText` takes it to
 * decide which issues get their `fix` lines, so the synthetic renders below
 * have to use the same threshold the real run this guideline documents does.
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
    file: "tokens/design-tokens.yaml",
    rule: "test.file",
  },
  {
    code: "QFAI-TEST-003",
    severity: "warning",
    category: "canonical",
    message: "location and refs",
    file: ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
    refs: ["semantic.color.primary", "semantic.color.accent"],
    rule: "test.refs",
  },
  {
    code: "QFAI-TEST-004",
    severity: "warning",
    category: "canonical",
    message: "suppressed by a waiver",
    file: ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
    suppressed: true,
    rule: "test.suppressed",
  },
  {
    code: "QFAI-TEST-005",
    severity: "error",
    category: "change",
    message: "multi-line suggested action",
    file: ".qfai/assistant/skill/qfai-verify/SKILL.md",
    suggested_action: MULTILINE_FIX.join("\n"),
    rule: "test.multiline",
  },
];

/** `count` issues of one code and severity, each in its own file and with the same fix. */
function manyOfOneCode(
  code: string,
  severity: Issue["severity"],
  count: number,
  suppressed = false,
): Issue[] {
  return Array.from({ length: count }, (_, index) => ({
    code,
    severity,
    category: "canonical" as const,
    message: `finding ${index + 1}`,
    file: `docs/file-${index + 1}.md`,
    suggested_action: `repair ${code}`,
    rule: "test.group",
    ...(suppressed ? { suppressed: true } : {}),
  }));
}

describe("validate --format text matches the validate contract's text output grammar", () => {
  it("emits every issue in the documented grammar", async () => {
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
        file: "tokens/design-tokens.yaml",
        refs: ["semantic.color.primary"],
      },
      {
        code: "QFAI-MOCK-002",
        severity: "error",
        category: "canonical",
        message: "External URL reference in HTML Mock: https://cdn.example.com/style.css",
        file: ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
      },
    ];

    for (const example of examples) {
      expect(guideline, `${example.code} example must use the documented shape`).toContain(
        `\`${renderFromGrammar(grammar, example)}\``,
      );
    }
  });

  it("renders a multi-line fix as the documented continuation lines", async () => {
    const guideline = await readGuideline();
    const label = extractRemedyLabel(guideline);
    expect(label).toBe("fix");

    const indent = documentedContinuationIndent(guideline, label);
    // The documented rule: `2 + <label> + 2`, i.e. the continuation aligns
    // under the first character of the value.
    expect(indent).toBe(2 + label.length + 2);

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

    expect(lines.slice(headerIndex + 1, headerIndex + 3)).toEqual([
      `  fix: ${MULTILINE_FIX[0]}`,
      `${" ".repeat(indent)}${MULTILINE_FIX[1]}`,
    ]);
    // The lines the old detail block repeated from the issue's own line are gone.
    expect(output).not.toMatch(DROPPED_LABELS);
  });

  /**
   * The `fix` lines follow the run's `--fail-on` threshold, not the literal
   * severity `error`: under `--fail-on warning` a warning is what fails the
   * run, so it gets the same lines. The guideline says so in both places it
   * describes them, and this is what holds the two together.
   */
  it("gives warnings their fix line under --fail-on warning, as documented", async () => {
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
      kind: "fix",
      line: `  fix: ${resolveIssueFix(warning)}`,
    });

    const belowThreshold = await captureStdout(() => {
      emitText(resultOf([warning]), DEFAULT_FAIL_ON);
      return Promise.resolve();
    });
    expect(belowThreshold).not.toContain("  fix: ");
  });

  /**
   * `--fail-on never` fails on nothing, and the guide used to describe the
   * remedy as belonging to "issues at a severity that can fail this run" —
   * which reads as "no fix lines at all" in that mode. `emitText` keeps
   * emitting them for every `error`, so a parser built on the old wording read
   * `  fix: …` as more message text.
   */
  it("keeps the error fix line under --fail-on never, as documented", async () => {
    const guideline = await readGuideline();
    expect(guideline).toContain("`--fail-on never`");

    const error = SYNTHETIC_ISSUES.find((issue) => issue.severity === "error");
    expect(error).toBeDefined();
    if (error === undefined) return;

    const output = await captureStdout(() => {
      emitText(resultOf([error]), "never");
      return Promise.resolve();
    });
    const classified = classifyByGuideline(output.trimEnd().split("\n"), "never");
    expect(classified).toContainEqual({ kind: "fix", line: `  fix: ${MULTILINE_FIX[0]}` });
    // …and the structural lines are still structural, not swallowed as message.
    expect(classified.filter((entry) => entry.kind === "message-continuation")).toEqual([]);

    // Over-correction pin: a warning still gets nothing in this mode.
    const warning = SYNTHETIC_ISSUES.find((issue) => issue.code === "QFAI-TEST-002");
    expect(warning).toBeDefined();
    if (warning === undefined) return;
    const warningOutput = await captureStdout(() => {
      emitText(resultOf([warning]), "never");
      return Promise.resolve();
    });
    expect(warningOutput).not.toContain("  fix: ");
  });

  // QFAI:EX-0001-0039-15
  it("prints at most five issues of one code and counts the rest, as documented", async () => {
    const guideline = await readGuideline();
    const grammar = extractGrammar(guideline);
    const tail = extractGroupTail(guideline);
    expect(guideline).toContain("at most five issues");

    const group = manyOfOneCode("QFAI-TEST-010", "error", 7);
    const other = manyOfOneCode("QFAI-TEST-011", "error", 1)[0];
    expect(other).toBeDefined();
    if (other === undefined) return;
    // The other code sits between the second and third issue of the group.
    const issues = [...group.slice(0, 2), other, ...group.slice(2)];

    const output = await captureStdout(() => {
      emitText(resultOf(issues), DEFAULT_FAIL_ON);
      return Promise.resolve();
    });
    const lines = output.split("\n");

    expect(lines.slice(0, 5)).toEqual(group.slice(0, 5).map((i) => renderFromGrammar(grammar, i)));
    expect(lines[5]).toBe(
      tail
        .replace("[<severity>]", "[error]")
        .replace("<CODE>", "QFAI-TEST-010")
        .replace("<n>", "2"),
    );
    expect(lines[6]).toBe("  fix: repair QFAI-TEST-010");
    expect(lines[7]).toBe(renderFromGrammar(grammar, other));
    expect(lines[8]).toBe("  fix: repair QFAI-TEST-011");
    expect(output).not.toMatch(DROPPED_LABELS);
    // The counts line still counts every issue, printed or not.
    expect(output).toContain("counts: info=0 warning=0 error=8\n");
  });

  // QFAI:EX-0001-0039-15
  it("prints a group of exactly five without a line counting the rest", async () => {
    const output = await captureStdout(() => {
      emitText(resultOf(manyOfOneCode("QFAI-TEST-012", "warning", 5)), "warning");
      return Promise.resolve();
    });
    expect(output.split("\n").filter((line) => line.startsWith("[warning] "))).toHaveLength(5);
    expect(output).not.toContain(" more");
  });

  // QFAI:EX-0001-0039-15
  it("keeps suppressed and unsuppressed issues of one code in separate groups", async () => {
    const suppressed = manyOfOneCode("QFAI-TEST-013", "warning", 6, true);
    const live = manyOfOneCode("QFAI-TEST-013", "warning", 1);

    const output = await captureStdout(() => {
      emitText(resultOf([...suppressed, ...live]), DEFAULT_FAIL_ON);
      return Promise.resolve();
    });
    const lines = output.split("\n");

    expect(lines).toContain("[warning] QFAI-TEST-013 and 1 more suppressed=true");
    expect(lines.filter((line) => line.includes(" suppressed=true"))).toHaveLength(6);
    expect(lines).toContain("[warning] QFAI-TEST-013 finding 1 (docs/file-1.md)");
    // Only the unsuppressed warning is counted.
    expect(output).toContain("counts: info=0 warning=1 error=0\n");
  });

  // QFAI:EX-0001-0039-15
  it("prints each distinct fix of a group once, in the order they first appear", async () => {
    const issues = manyOfOneCode("QFAI-TEST-014", "error", 4).map((issue, index) => ({
      ...issue,
      suggested_action: index === 1 ? "second repair" : "first repair",
    }));

    const output = await captureStdout(() => {
      emitText(resultOf(issues), DEFAULT_FAIL_ON);
      return Promise.resolve();
    });
    const fixes = output.split("\n").filter((line) => line.startsWith("  fix: "));

    expect(fixes).toEqual(["  fix: first repair", "  fix: second repair"]);
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

  it("reports an incomplete story test scan as a counted error issue", async () => {
    const guideline = await readGuideline();
    expect(guideline).toContain("`QFAI-SCAN-002` as an `error` issue");
    expect(guideline).not.toContain("[warn]");

    const output = await captureStdout(() => {
      emitText(
        resultOf([
          {
            code: "QFAI-SCAN-002",
            severity: "error",
            category: "canonical",
            message: "Story-tree test scan stopped at the 20000 file limit; coverage is incomplete",
          },
        ]),
        DEFAULT_FAIL_ON,
      );
      return Promise.resolve();
    });
    expect(output).toContain("[error] QFAI-SCAN-002 Story-tree test scan stopped");
    expect(output).toContain("counts: info=0 warning=0 error=1");
    expect(output).not.toContain("[warn] ");
  });

  it("ends the real `--format text` run with the documented run-log line", async () => {
    const guideline = await readGuideline();
    expect(guideline).toContain("`run-log: <path>`, always, as the last line");

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-text-format-"));
    try {
      await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
      const output = await captureStdout(async () => {
        await runValidate({ root, strict: false, format: "text" });
      });
      const lines = output.trimEnd().split("\n");

      expect(lines.at(-3)).toMatch(/^counts: info=\d+ warning=\d+ error=\d+$/);
      expect(lines.at(-2)).toMatch(/^fail-on: \S/);
      expect(lines.at(-1)).toMatch(/^run-log: \S/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  /**
   * `QFAI-DT-002` forwards the YAML parser's `error.message` verbatim, and that
   * message carries position information and a source excerpt across several
   * lines. `emitText` does not normalize it, so one issue prints as several
   * physical lines — the guideline has to say so or a line-oriented parser
   * breaks on the first malformed input.
   */
  it("keeps a real multi-line issue message renderable from the documented grammar", async () => {
    const guideline = await readGuideline();
    const grammar = extractGrammar(guideline);
    expect(guideline).toContain("`<message>` may contain line breaks");

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-text-multiline-"));
    try {
      await writeMalformedDesignTokens(root);

      const { config } = await loadConfig(root);
      const issues = await validateDesignToken(root, config);
      const parseError = issues.find(
        (item) => item.code === "QFAI-DT-002" && item.message.startsWith("YAML parse error"),
      );
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
   * "Anything that does not start with `[<severity>] ` continues the previous
   * message" is only safe once the structural lines are matched first. This
   * runs the documented precedence over one real run that carries all of them
   * at once: a multi-line `QFAI-DT-002` message, an error's `fix` line,
   * `counts:` and `run-log:`.
   */
  it("classifies every structural line ahead of the message-continuation fallback", async () => {
    const guideline = await readGuideline();
    const rules = extractPrecedenceRules(guideline);
    expect(rules).toHaveLength(7);
    const anchors = ["`[info]`", "`counts:`", "`fail-on:`", "`timings:`", "`run-log:`", "`fix:`"];
    for (const [index, anchor] of anchors.entries()) {
      expect(rules[index], `precedence rule ${index + 1} must key on ${anchor}`).toContain(anchor);
    }
    expect(rules[0], "the first precedence rule must name the line that closes a group").toContain(
      "and <n> more",
    );
    expect(rules[6], "the last precedence rule must be the message-continuation fallback").toBe(
      "anything else continues the previous issue's message",
    );

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-text-classify-"));
    try {
      await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
      await writeMalformedDesignTokens(root);

      const output = await captureStdout(() =>
        runValidate({ root, strict: false, format: "text" }).then(() => undefined),
      );
      const classified = classifyByGuideline(output.trimEnd().split("\n"), DEFAULT_FAIL_ON);

      expect(classified.at(-1)?.kind).toBe("run-log");
      expect(classified.at(-2)?.kind).toBe("fail-on");
      expect(classified.at(-3)?.kind).toBe("counts");
      expect(classified.filter((entry) => entry.kind === "counts")).toHaveLength(1);

      const header = classified.findIndex(
        (entry) =>
          entry.kind === "header" && entry.line.startsWith("[error] QFAI-DT-002 YAML parse error"),
      );
      expect(header, "the fixture must produce a real YAML parse error").toBeGreaterThanOrEqual(0);
      // The parser message spans physical lines, and the `fix` line that
      // follows is recognised as structure rather than more message.
      expect(classified[header + 1]?.kind).toBe("message-continuation");
      const fix = classified.findIndex((entry, index) => index > header && entry.kind === "fix");
      expect(classified[fix]?.line.startsWith("  fix: ")).toBe(true);

      for (const entry of classified.filter((item) => item.kind === "message-continuation")) {
        expect(entry.line.startsWith("counts: "), `structural line absorbed: ${entry.line}`).toBe(
          false,
        );
        expect(entry.line.startsWith("fail-on: "), `structural line absorbed: ${entry.line}`).toBe(
          false,
        );
        expect(entry.line.startsWith("timings: "), `structural line absorbed: ${entry.line}`).toBe(
          false,
        );
        expect(entry.line.startsWith("run-log: "), `structural line absorbed: ${entry.line}`).toBe(
          false,
        );
        expect(entry.line.startsWith("  fix: "), `structural line absorbed: ${entry.line}`).toBe(
          false,
        );
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

/** A design token file that does not parse, in the directory `uiux.designTokensDir` names. */
async function writeMalformedDesignTokens(root: string): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "uiux:\n  designTokensDir: tokens\n",
    "utf-8",
  );
  await mkdir(path.join(root, "tokens"), { recursive: true });
  await writeFile(
    path.join(root, "tokens", "design-tokens.yaml"),
    "primitive:\n  color: [unclosed\n",
    "utf-8",
  );
}
