/**
 * Spawn-based tests for `scripts/generate-emitted-rule-codes.mjs`.
 *
 * The generator's contract:
 *   - `--check` with the committed module in sync -> exit 0
 *   - `--check` with a stale module               -> exit 1
 *   - unknown flag                                -> exit 2
 *
 * The first case is the one that matters in CI: `src/core/emittedRuleCodes.ts`
 * is what the waiver engine consults to tell a mistyped rule id apart from a
 * real rule that stayed quiet, so a new validator whose code never reaches the
 * generated module would make waivers for that code read as unknown. Running
 * the generator in `--check` mode here fails the moment the two drift apart.
 *
 * The scanning cases use `--src` / `--out` against synthetic fixtures so they
 * assert the extraction rules without depending on the real source tree.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai
const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(PACKAGE_ROOT, "scripts", "generate-emitted-rule-codes.mjs");
// packages/qfai → packages → repository root. `tmp/` there is the only staging
// area this repository sanctions for scratch files, tests included.
const TEMP_ROOT = path.resolve(PACKAGE_ROOT, "../..", "tmp");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGenerator(args: string[]): RunResult {
  const child = spawnSync("node", [SCRIPT, ...args], { encoding: "utf-8" });
  return {
    status: child.status,
    stdout: child.stdout ?? "",
    stderr: child.stderr ?? "",
  };
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  await mkdir(TEMP_ROOT, { recursive: true });
  const dir = await mkdtemp(path.join(TEMP_ROOT, "qfai-rule-codes-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("generate-emitted-rule-codes.mjs", () => {
  it("reports the committed emittedRuleCodes.ts as in sync", () => {
    const result = runGenerator(["--check"]);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("exits 1 when the generated module is stale", async () => {
    const dir = await newTempDir();
    const source = path.join(dir, "validator.ts");
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(source, 'issue("QFAI-EXAMPLE-001", "msg");\n', "utf-8");
    await writeFile(output, "export const EMITTED_RULE_CODES = [];\n", "utf-8");

    const result = runGenerator(["--check", "--src", dir, "--out", output]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("stale");
  });

  it("collects both the issue() call and the code: field spellings", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "a.ts"),
      [
        'issue("QFAI-EXAMPLE-001", "msg", "warning");',
        'const x = { code: "E_EXAMPLE_ORPHAN", category: "canonical" };',
      ].join("\n"),
      "utf-8",
    );
    // Neither literal is a rule id: one is lowercase, one is a dotted
    // validator path used as a `rule`, not a `code`.
    await writeFile(
      path.join(dir, "b.ts"),
      [
        'issue("not-a-code", "msg", "warning");',
        'const y = { code: "specPack.layerPolicy", category: "canonical" };',
      ].join("\n"),
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");

    expect(result.status).toBe(0);
    expect(written).toContain('"E_EXAMPLE_ORPHAN"');
    expect(written).toContain('"QFAI-EXAMPLE-001"');
    expect(written).not.toContain("not-a-code");
    expect(written).not.toContain("specPack.layerPolicy");
  });

  // Several validators name their rule through an exported constant. Reading
  // only string literals dropped every code they emit.
  it("resolves a code named through a constant, wherever it is declared", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "ids.ts"),
      'export const EXAMPLE_RULE_ID = "QFAI-EXAMPLE-031";\n',
      "utf-8",
    );
    await writeFile(
      path.join(dir, "validator.ts"),
      [
        'import { EXAMPLE_RULE_ID } from "./ids.js";',
        'issue(EXAMPLE_RULE_ID, "msg", "warning");',
      ].join("\n"),
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");

    expect(result.status).toBe(0);
    expect(written).toContain('"QFAI-EXAMPLE-031"');
  });

  // A `code:` field alone is not proof of a validate `Issue`: the guardrails
  // command and the handoff schema carry their own diagnostic shapes, and
  // `applyWaivers` never sees either.
  it("skips a code: field on a shape that is not an Issue", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "guardrails.ts"),
      'errors.push({ severity: "error", code: "QFAI-GRX-001", message: "m", file: "f" });\n',
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");

    expect(result.status).toBe(0);
    expect(written).not.toContain("QFAI-GRX-001");
  });

  // A code raised only at `error` can never be waived, so it has to be
  // recognisable without a finding in hand.
  it("lists a code as error-only only when every emitter agrees", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "a.ts"),
      [
        'issue("QFAI-EXAMPLE-002", "msg", "error");',
        'issue("QFAI-EXAMPLE-003", "msg", "error");',
        'issue("QFAI-EXAMPLE-004", "msg", "warning");',
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(dir, "b.ts"),
      'issue("QFAI-EXAMPLE-003", "msg", "warning");\n',
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");
    const errorOnly = written.slice(written.indexOf("ERROR_ONLY_RULE_CODES"));

    expect(result.status).toBe(0);
    expect(errorOnly).toContain('"QFAI-EXAMPLE-002"');
    expect(errorOnly).not.toContain('"QFAI-EXAMPLE-003"');
    expect(errorOnly).not.toContain('"QFAI-EXAMPLE-004"');
  });

  // Several validators carry the code on a record and hand it to the factory
  // as a property (`issue(finding.ruleId, …)`), so reading only literals and
  // identifiers dropped every code they emit.
  it("resolves a code handed to the factory as a property", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "audit.ts"),
      [
        'const findings = [{ ruleId: "QFAI-EXAMPLE-040", dimension: "layout" }];',
        'for (const finding of findings) issue(finding.ruleId, "msg", severity);',
      ].join("\n"),
      "utf-8",
    );
    // Same property name, different file: the values must not leak across.
    await writeFile(
      path.join(dir, "other.ts"),
      'const unrelated = { ruleId: "QFAI-EXAMPLE-041" };\n',
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");

    expect(result.status).toBe(0);
    expect(written).toContain('"QFAI-EXAMPLE-040"');
    expect(written).not.toContain("QFAI-EXAMPLE-041");
  });

  // `Issue.severity` is required, so a `code`-bearing literal without one is
  // the metadata a factory call is about to turn into a finding — not a
  // finding whose severity is unknown.
  it("reads the factory call's severity through a metadata literal", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "coverage.ts"),
      [
        'const groups = [{ code: "QFAI-EXAMPLE-050", rule: "plan.howOnly" }];',
        'for (const group of groups) issue(group.code, "msg", "error", file, group.rule);',
      ].join("\n"),
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");
    const errorOnly = written.slice(written.indexOf("ERROR_ONLY_RULE_CODES"));

    expect(result.status).toBe(0);
    expect(errorOnly).toContain('"QFAI-EXAMPLE-050"');
  });

  // Prototyping's exploration mode downgrades its relaxable codes to warning
  // before `applyWaivers` sees them, so an error-only classification would
  // reject on a clean run the waiver a run with the finding accepts.
  it("drops a code a post-emission rewrite can relax from the error-only list", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "mode.ts"),
      [
        "export const EXPLORATION_RELAXABLE_CODES: readonly string[] = [",
        '  "QFAI-EXAMPLE-060", // relaxed under exploration',
        "] as const;",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(dir, "gate.ts"),
      [
        'issue("QFAI-EXAMPLE-060", "msg", "error");',
        'issue("QFAI-EXAMPLE-061", "msg", "error");',
      ].join("\n"),
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");
    const errorOnly = written.slice(written.indexOf("ERROR_ONLY_RULE_CODES"));

    expect(result.status).toBe(0);
    // Still a real rule: only its error-only classification is withdrawn.
    expect(written).toContain('"QFAI-EXAMPLE-060"');
    expect(errorOnly).not.toContain('"QFAI-EXAMPLE-060"');
    expect(errorOnly).toContain('"QFAI-EXAMPLE-061"');
  });

  // `designFidelity.ts` picks between `QFAI-FID-010` and `QFAI-FID-011` on a
  // `const` and hands the result to `issue()`, so an identifier-only resolver
  // saw neither code and a waiver naming them read as unknown.
  it("resolves both branches of a conditional constant", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "fidelity.ts"),
      [
        'const issueCode = isOverridden ? "QFAI-EXAMPLE-070" : "QFAI-EXAMPLE-071";',
        'issue(issueCode, "msg", "warning");',
      ].join("\n"),
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");

    expect(result.status).toBe(0);
    expect(written).toContain('"QFAI-EXAMPLE-070"');
    expect(written).toContain('"QFAI-EXAMPLE-071"');
  });

  // A call that picks its code and its severity off the same condition names a
  // definite severity per branch; pairing them off the cross-product instead
  // would leave both codes' severity unknown and withdraw the error-only
  // classification `QFAI-WAIVER-002` refuses a waiver on.
  it("pairs a conditional code with the matching severity branch", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "review.ts"),
      [
        "issue(",
        '  declaresForm ? "QFAI-EXAMPLE-080" : "QFAI-EXAMPLE-081",',
        '  "msg",',
        '  declaresForm ? "error" : "warning",',
        ");",
      ].join("\n"),
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");
    const errorOnly = written.slice(written.indexOf("ERROR_ONLY_RULE_CODES"));

    expect(result.status).toBe(0);
    expect(written).toContain('"QFAI-EXAMPLE-080"');
    expect(written).toContain('"QFAI-EXAMPLE-081"');
    expect(errorOnly).toContain('"QFAI-EXAMPLE-080"');
    expect(errorOnly).not.toContain('"QFAI-EXAMPLE-081"');
  });

  // `tddList.ts` raises one code and narrows each finding with a per-defect
  // `rule`. A waiver may name either spelling, so the ids that never appear as
  // a `code` have to be published — as aliases, not as codes.
  it("collects a rule-id alias no code literal yields", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "tddList.ts"),
      [
        'const UNRESOLVED_DR_RULE_ID = "EXAMPLELIST-003";',
        'issue("QFAI-EXAMPLE-090", "msg", "warning", file, UNRESOLVED_DR_RULE_ID);',
        // A dotted validator path is what this argument usually carries.
        'issue("QFAI-EXAMPLE-091", "msg", "warning", file, "tddList.evidence");',
      ].join("\n"),
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");
    const codes = written.slice(0, written.indexOf("ERROR_ONLY_RULE_CODES"));
    const aliases = written.slice(written.indexOf("RULE_ID_ALIASES"));

    expect(result.status).toBe(0);
    expect(aliases).toContain('"EXAMPLELIST-003"');
    // An alias is not a code: it must not join the emitted-code list, and the
    // code it was carried by must not join the aliases.
    expect(codes).not.toContain('"EXAMPLELIST-003"');
    expect(aliases).not.toContain('"QFAI-EXAMPLE-090"');
    expect(written).not.toContain("tddList.evidence");
  });

  // `cli/` pushes its findings on after `core/validate.ts` has run
  // `applyWaivers`, so no waiver can ever suppress them. Registering them as
  // known would report a waiver that cannot possibly match as `active`.
  it("skips codes emitted after the waiver pass", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await mkdir(path.join(dir, "cli", "commands"), { recursive: true });
    await writeFile(
      path.join(dir, "cli", "commands", "validate.ts"),
      'const profile = { code: "QFAI-EXAMPLE-100", severity: "warning", category: "canonical" };\n',
      "utf-8",
    );
    await writeFile(
      path.join(dir, "validator.ts"),
      'issue("QFAI-EXAMPLE-101", "msg", "warning");\n',
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");

    expect(result.status).toBe(0);
    expect(written).toContain('"QFAI-EXAMPLE-101"');

    // Out of `EMITTED_RULE_CODES` — a waiver naming it can never match, and
    // registering it would let an unmatchable waiver read as `active`.
    const registered = written.slice(
      written.indexOf("EMITTED_RULE_CODES"),
      written.indexOf("ERROR_ONLY_RULE_CODES"),
    );
    expect(registered).not.toContain("QFAI-EXAMPLE-100");

    // But NAMED, in its own list, so `applyWaivers` can say the true thing
    // rather than calling it an unknown rule (#1110).
    const postWaiver = written.slice(written.indexOf("POST_WAIVER_RULE_CODES"));
    expect(postWaiver).toContain('"QFAI-EXAMPLE-100"');
    expect(postWaiver).not.toContain('"QFAI-EXAMPLE-101"');
  });

  it("exits 2 on an unknown flag", () => {
    const result = runGenerator(["--nope"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown argument");
  });
});
