import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { readImplementFlowSteps } from "../helpers/implementSteps.js";
import { removeTempTree } from "../helpers/tempTree.js";

async function readSkill(): Promise<string> {
  return readImplementFlowSteps(path.join(getInitAssetsDir(), ".qfai", "assistant"));
}

describe("implementation evidence contract", () => {
  it("does not accept an unevidenced status or reasoning as proof of a gate", async () => {
    const skill = await readSkill();
    expect(skill).toMatch(/Evidence without a command and result pair does not prove a\s+gate/);
    expect(skill).toMatch(/A failing or unrun gate cannot be reported as PASS/);
    expect(skill).toMatch(/when its RED, GREEN and Refactor results are\s+observed and recorded/);
  });
});

async function readGuide(relative: string): Promise<string> {
  return readFile(
    path.join(getInitAssetsDir(), ".qfai", "assistant", ...relative.split("/")),
    "utf-8",
  );
}

function sectionOf(text: string, heading: string): string {
  const lines = text.split(/\r?\n/);
  const start = lines.indexOf(heading);
  if (start < 0) throw new Error(`Missing evidence guidance section: ${heading}`);
  const following = lines.slice(start + 1);
  const end = following.findIndex((line) => /^#{1,3} /u.test(line));
  return (end < 0 ? following : following.slice(0, end)).join("\n");
}

type NativeReporter = "tap" | "spec" | "junit";

async function nativeObservation(
  root: string,
  reporter: NativeReporter,
  file: string,
  pattern: string,
  behavior = "ready",
) {
  await writeFile(path.join(root, "body.txt"), "");
  await writeFile(path.join(root, "version.txt"), "");
  const args = ["--test", `--test-reporter=${reporter}`, `--test-name-pattern=${pattern}`, file];
  const child = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf-8",
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0", NODE_DISABLE_COLORS: "1", RECEIPT_BEHAVIOR: behavior },
  });
  const observed = {
    executable: process.execPath,
    args,
    cwd: root,
    reporter,
    fixtureBehavior: behavior,
    runtime: await readFile(path.join(root, "version.txt"), "utf-8"),
    source: await readFile(path.join(root, file), "utf-8"),
    body: await readFile(path.join(root, "body.txt"), "utf-8"),
    stdout: child.stdout,
    stderr: child.stderr,
    exit: child.status,
    signal: child.signal,
    error: child.error?.message ?? null,
  };
  process.stdout.write(`Native focused execution ${JSON.stringify(observed)}\n`);
  expect(observed.error, JSON.stringify(observed)).toBeNull();
  expect(observed.signal, JSON.stringify(observed)).toBeNull();
  expect(observed.runtime, JSON.stringify(observed)).toBe(process.version);
  return observed;
}

function expectNamedTerminal(
  reporter: NativeReporter,
  output: string,
  title: string,
  success: boolean,
  diagnostic: string,
): void {
  if (reporter === "tap") {
    expect(output, diagnostic).toMatch(
      new RegExp(`^\\s*${success ? "ok" : "not ok"} \\d+ - ${title}(?:\\s|$)`, "m"),
    );
    return;
  }
  if (reporter === "spec") {
    expect(output, diagnostic).toMatch(
      new RegExp(`^\\s*${success ? "\\u2714" : "\\u2716"} ${title}(?:\\s|$)`, "m"),
    );
    return;
  }
  expect(output, diagnostic).toMatch(new RegExp(`<testcase\\b[^>]*name="${title}"`));
  if (success) expect(output, diagnostic).not.toContain("<failure");
  else expect(output, diagnostic).toContain("<failure");
}

describe("native focused execution observations", () => {
  // QFAI:AC-0001-0091-01
  // QFAI:EX-0001-0091-08 QFAI:EX-0001-0091-09 QFAI:EX-0001-0091-10
  // QFAI:EX-0001-0091-11 QFAI:EX-0001-0091-12 QFAI:EX-0001-0091-14
  it.each(["tap", "spec", "junit"] as const)(
    "%s distinguishes real selected bodies from file, inactive and other-parent results",
    async (reporter) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-node-receipt-"));
      try {
        const preamble =
          [
            'import assert from "node:assert/strict";',
            'import { appendFileSync, writeFileSync } from "node:fs";',
            'import { describe, test } from "node:test";',
            'writeFileSync("version.txt", process.version);',
          ].join("\n") + "\n";
        await writeFile(path.join(root, "wrong.test.mjs"), preamble);
        await writeFile(
          path.join(root, "target.test.mjs"),
          preamble +
            'test("receipt target", () => { appendFileSync("body.txt", "target\\n"); assert.equal(process.env.RECEIPT_BEHAVIOR, "ready", "INTENDED_ASSERTION"); });\n',
        );
        await writeFile(
          path.join(root, "inactive.test.mjs"),
          preamble +
            'test.skip("receipt skip", () => { appendFileSync("body.txt", "skip\\n"); });\ntest.todo("receipt todo");\n',
        );
        await writeFile(
          path.join(root, "broken.test.mjs"),
          preamble +
            'await import("./absent.mjs");\ntest("receipt target", () => { appendFileSync("body.txt", "target\\n"); });\n',
        );
        await writeFile(
          path.join(root, "parents.test.mjs"),
          preamble +
            'describe("target parent", () => { test("receipt shared", () => { appendFileSync("body.txt", "target-parent\\n"); }); });\ndescribe("other parent", () => { test("receipt shared", () => { appendFileSync("body.txt", "other-parent\\n"); }); });\n',
        );

        const wrong = await nativeObservation(root, reporter, "wrong.test.mjs", "^receipt target$");
        expect(wrong.exit, JSON.stringify(wrong)).toBe(0);
        expect(wrong.body, JSON.stringify(wrong)).toBe("");
        expect(wrong.stdout, JSON.stringify(wrong)).toContain("wrong.test.mjs");
        expect(wrong.stdout, JSON.stringify(wrong)).not.toContain("receipt target");
        if (reporter === "junit") expect(wrong.stdout).toMatch(/<testcase\b/);

        const zero = await nativeObservation(root, reporter, "target.test.mjs", "^absent case$");
        expect(zero.exit, JSON.stringify(zero)).toBe(0);
        expect(zero.body, JSON.stringify(zero)).toBe("");
        // Node 20 reports filtered declarations as skips; later versions may omit them.
        if (zero.stdout.includes("receipt target")) {
          if (reporter === "tap") expect(zero.stdout).toMatch(/receipt target[^\n]*# SKIP/);
          else if (reporter === "spec") expect(zero.stdout).toMatch(/receipt target[^\n]*# /);
          else expect(zero.stdout).toMatch(/name="receipt target"[\s\S]*?<skipped\b/);
        }

        const pass = await nativeObservation(root, reporter, "target.test.mjs", "^receipt target$");
        expect(pass.exit, JSON.stringify(pass)).toBe(0);
        expect(pass.body, JSON.stringify(pass)).toBe("target\n");
        expectNamedTerminal(reporter, pass.stdout, "receipt target", true, JSON.stringify(pass));

        const fail = await nativeObservation(
          root,
          reporter,
          "target.test.mjs",
          "^receipt target$",
          "broken",
        );
        expect(fail.exit, JSON.stringify(fail)).toBe(1);
        expect(fail.body, JSON.stringify(fail)).toBe("target\n");
        expectNamedTerminal(reporter, fail.stdout, "receipt target", false, JSON.stringify(fail));
        expect(fail.stdout + fail.stderr, JSON.stringify(fail)).toContain("INTENDED_ASSERTION");
        expect(fail.args).toEqual(pass.args);
        expect(fail.source).toBe(pass.source);

        const inactive = await nativeObservation(
          root,
          reporter,
          "inactive.test.mjs",
          "^receipt (skip|todo)$",
        );
        expect(inactive.exit, JSON.stringify(inactive)).toBe(0);
        expect(inactive.body, JSON.stringify(inactive)).toBe("");
        expect(inactive.stdout, JSON.stringify(inactive)).toContain("receipt skip");
        expect(inactive.stdout, JSON.stringify(inactive)).toContain("receipt todo");
        if (reporter === "junit") {
          expect(inactive.stdout).toMatch(
            /name="receipt skip"[\s\S]*?<skipped\b[^>]*type="skipped"/,
          );
          expect(inactive.stdout).toMatch(/name="receipt todo"[\s\S]*?<skipped\b[^>]*type="todo"/);
        } else {
          expect(inactive.stdout).toMatch(/receipt skip[^\n]*# SKIP/);
          expect(inactive.stdout).toMatch(/receipt todo[^\n]*# TODO/);
        }

        const imported = await nativeObservation(
          root,
          reporter,
          "broken.test.mjs",
          "^receipt target$",
        );
        expect(imported.exit, JSON.stringify(imported)).toBe(1);
        expect(imported.body, JSON.stringify(imported)).toBe("");
        if (reporter === "junit") {
          expect(imported.stdout, JSON.stringify(imported)).toMatch(
            /<testcase\b[^>]*name="(?:[^"]*[/\\])?broken\.test\.mjs"/,
          );
          expect(imported.stdout, JSON.stringify(imported)).toMatch(
            /<failure\b[^>]*type="testCodeFailure"/,
          );
          expect(imported.stdout, JSON.stringify(imported)).toContain("ERR_TEST_FAILURE");
          expect(imported.stdout).not.toMatch(/<testcase\b[^>]*name="receipt target"/);
        } else {
          expect(imported.stdout + imported.stderr, JSON.stringify(imported)).toContain(
            "ERR_MODULE_NOT_FOUND",
          );
        }
        expect(imported.stdout + imported.stderr).not.toContain("INTENDED_ASSERTION");

        const other = await nativeObservation(
          root,
          reporter,
          "parents.test.mjs",
          "^other parent(?: |$)",
        );
        expect(other.exit, JSON.stringify(other)).toBe(0);
        expect(other.body, JSON.stringify(other)).toBe("other-parent\n");
        expect(other.stdout, JSON.stringify(other)).toContain("other parent");
        expectNamedTerminal(reporter, other.stdout, "receipt shared", true, JSON.stringify(other));
        expect(other.source).toContain('describe("target parent"');
        expect(other.source).toContain('describe("other parent"');
      } finally {
        await removeTempTree(root);
      }
    },
  );
});

describe("focused evidence guidance", () => {
  // QFAI:AC-0001-0091-01
  // QFAI:EX-0001-0091-08 QFAI:EX-0001-0091-09
  it("requires a selected body and complete receipt apart from zero-exit wrapper success", async () => {
    const record = sectionOf(
      await readGuide("skill/qfai-implement/references/red-admissibility.md"),
      "### Selected-case execution",
    );
    expect(record).toMatch(
      /focused Red, Green and Refactor[\s\S]*target example[\s\S]*stage report/,
    );
    for (const field of [
      /argument boundaries/,
      /cwd/,
      /file selection/,
      /case\s+selector/,
      /runtime version/,
      /reporter/,
      /input revision/,
      /raw output\/log/,
      /source declaration/,
      /file\/parent\/case identity/,
    ]) {
      expect(record).toMatch(field);
    }
    expect(record).toMatch(/Explain intentional input changes between invocations/);
    expect(record).toMatch(/selected case's body executed[\s\S]*terminal result/);
    expect(record).toMatch(/Process exit, aggregate counts[\s\S]*apart from[\s\S]*case evidence/);
    expect(record).toMatch(
      /Zero selected executions[\s\S]*cannot close a phase[\s\S]*exit zero[\s\S]*passing file\/container/,
    );
    expect(record).toMatch(/Correct selection[\s\S]*repeat[\s\S]*focused invocation/);
    expect(record).toMatch(/name\s+pattern does not select files/);
  });

  // QFAI:AC-0001-0091-01
  // QFAI:EX-0001-0091-10 QFAI:EX-0001-0091-11
  it("keeps intended assertion RED and same-input success separate from inactive and unrelated results", async () => {
    const record = sectionOf(
      await readGuide("skill/qfai-implement/references/red-admissibility.md"),
      "### Selected-case execution",
    );
    const refusal =
      record.split(/\n\s*\n/).find((paragraph) => /Zero selected executions/.test(paragraph)) ?? "";
    for (const excluded of [
      /skip/,
      /TODO/,
      /cancellation/,
      /interruption/,
      /parent/,
      /another case/,
      /import/,
      /unconditional throw/,
    ]) {
      expect(refusal).toMatch(excluded);
    }
    expect(refusal).toMatch(/cannot close a phase/);
    expect(refusal).toMatch(/not the selected assertion's ordinary RED/);
    expect(refusal).toMatch(
      /expected-failure inversion[\s\S]*recorded separately[\s\S]*not[\s\S]*ordinary behavior success/,
    );
    expect(refusal).toMatch(/approved alternative RED routes[\s\S]*available/);
    const ordinary =
      record.split(/\n\s*\n/).find((paragraph) => /Ordinary RED/.test(paragraph)) ?? "";
    expect(ordinary).toMatch(/selected intended assertion or expected\s+exception/);
    expect(ordinary).toMatch(
      /GREEN and Refactor[\s\S]*same[\s\S]*selected behavior[\s\S]*intended input/,
    );
    expect(ordinary).toMatch(
      /Do not reuse another[\s\S]*case's result[\s\S]*prior input revision's result[\s\S]*proof for this invocation/,
    );
  });

  // QFAI:AC-0001-0091-01
  // QFAI:EX-0001-0091-12 QFAI:EX-0001-0091-13 QFAI:EX-0001-0091-14
  it("links full source identity to native terminal states without treating annotations or reporter containers as bodies", async () => {
    const record = sectionOf(
      await readGuide("skill/qfai-implement/references/red-admissibility.md"),
      "### Selected-case execution",
    );
    expect(record).toMatch(/duplicate short names[\s\S]*full hierarchy/);
    expect(record).toMatch(
      /actual parent selection[\s\S]*rather than assuming a leaf-only pattern/,
    );
    const linkage =
      record.split(/\n\s*\n/).find((paragraph) => /static scanner linkage/.test(paragraph)) ?? "";
    expect(linkage).toMatch(
      /annotation[\s\S]*static scanner linkage[\s\S]*declaration,[\s\S]*not runtime execution[\s\S]*behavioral result/,
    );
    const formats = record.split(/\n\s*\n/).find((paragraph) => /TAP start/.test(paragraph)) ?? "";
    for (const native of [
      /TAP[\s\S]*terminal/,
      /spec[\s\S]*named results/,
      /JUnit/,
      /declared target[\s\S]*full hierarchy/,
    ])
      expect(formats).toMatch(native);
    expect(formats).toMatch(/JUnit testcase[\s\S]*container[\s\S]*none alone[\s\S]*leaf body/);
    expect(formats).toMatch(/Dots, coverage and summaries[\s\S]*insufficient/);
    expect(formats).toMatch(
      /unfamiliar, incomplete[\s\S]*retain[\s\S]*missing observation[\s\S]*case-level evidence/,
    );
    expect(formats).toMatch(/Do not guess a parser or invent a receipt format/);
  });

  // QFAI:AC-0001-0091-01
  // QFAI:EX-0001-0091-15
  it("keeps focused receipts scoped and reconciles actual normal verify membership with quoted selection", async () => {
    const [implement, common, verify] = await Promise.all([
      readGuide("step/implement-tdd/STEP.md"),
      readGuide("step/common-gate-run/STEP.md"),
      readGuide("step/verify-repo-gate/STEP.md"),
    ]);
    for (const pointer of [implement, common]) {
      const focused = sectionOf(pointer, "### Selected-case execution");
      expect(focused).toContain("red-admissibility.md#selected-case-execution");
      expect(focused).toMatch(/body[\s\S]*terminal result/);
      expect(focused).toMatch(/exit[\s\S]*counts[\s\S]*static/);
      expect(focused).toMatch(/zero selected|Zero selected/);
      expect(focused).toMatch(/cannot close/);
      expect(focused).toMatch(/retain the output|Retain the output/);
    }
    const collection = sectionOf(verify, "### Full collection evidence");
    expect(collection).toMatch(
      /existing normal verify run[\s\S]*intended collection[\s\S]*actual collection and execution/,
    );
    expect(collection).toMatch(/Reconcile omitted cases[\s\S]*membership/);
    for (const comparable of [
      /same revision/,
      /command\/filter/,
      /runner/,
      /environment/,
      /intentional differences/,
    ])
      expect(collection).toMatch(comparable);
    expect(collection).toMatch(
      /Standard Test[\s\S]*quoted arguments[\s\S]*shell expansion[\s\S]*collection depth/,
    );
    expect(collection).toMatch(/Equal aggregate counts do not prove equal membership/);
    expect(collection).toMatch(
      /unknown expected[\s\S]*counts unknown[\s\S]*unexplained omissions prevent a full-scope/,
    );
    expect(collection).toMatch(/focused target pass[\s\S]*proves no full collection/);
    expect(collection).toMatch(/No extra full run[\s\S]*required during each focused cycle/);
    expect(collection).toMatch(
      /existing human[\s\S]*report[\s\S]*no permanent inventory, ledger, JSON field, gate status, runtime[\s\S]*parser or runner/,
    );
  });
});
