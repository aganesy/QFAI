/**
 * Validator: importLite (`QFAI-IMPLITE-001`).
 *
 * The preflight input-source rule: a project that already has spec packs must
 * be able to name what they were derived from — a discussion pack `06_REQ.md`
 * or an `.qfai/evidence/import-lite-*.md`.
 *
 * The module shipped unreferenced: nothing dispatched it, so the rule could
 * never fire and no test noticed. These cases pin all three halves of the fix
 * — the rule's own behaviour, its dispatch from the `sdd` profile, and the
 * catalog entry that gives it human-readable text in `qfai validate` output.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveIssueExpected, runValidate } from "../../src/cli/commands/validate.js";
import { defaultConfig, loadConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";
import { validateProject } from "../../src/core/validate.js";
import { validateImportLiteEvidencePresence } from "../../src/core/validators/importLite.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const SKILL_MD = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "SKILL.md",
);

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-implite-"));
  tempDirs.push(root);
  return root;
}

/** One `spec-0001` pack — enough for `collectSpecEntries` to see a spec. */
async function seedSpec(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# Spec 0001\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# User stories\n", "utf-8");
}

async function seedDiscussionReq(root: string): Promise<void> {
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260401000000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "06_REQ.md"), "# REQ\n", "utf-8");
}

async function seedEvidence(root: string, fileName: string): Promise<void> {
  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, fileName), "# Evidence: import-lite\n", "utf-8");
}

async function run(root: string) {
  const { config } = await loadConfig(root);
  return validateImportLiteEvidencePresence(root, config);
}

describe("validateImportLiteEvidencePresence", () => {
  it("stays silent on a project with no spec packs", async () => {
    const root = await newRoot();
    expect(await run(root)).toEqual([]);
  });

  it("stays silent when a discussion pack 06_REQ.md is the input source", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedDiscussionReq(root);
    expect(await run(root)).toEqual([]);
  });

  it("stays silent when an import-lite evidence file is the input source", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite-20260401000000000.md");
    expect(await run(root)).toEqual([]);
  });

  // The shipped template is `templates/evidence/import-lite.md`. The original
  // `/^import-lite-.*\.md$/` required the separator, so copying the template
  // under its own name left the warning standing with nothing left to do.
  it("accepts the shipped template filename `import-lite.md` as evidence", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite.md");
    expect(await run(root)).toEqual([]);
  });

  it("does not accept an unrelated evidence file", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "sdd-spec-0001.md");
    expect((await run(root)).map((found) => found.code)).toEqual(["QFAI-IMPLITE-001"]);
  });

  it("reports QFAI-IMPLITE-001 when specs exist with no input source", async () => {
    const root = await newRoot();
    await seedSpec(root);
    const issues = await run(root);
    expect(issues).toHaveLength(1);
    const [found] = issues;
    expect(found?.code).toBe("QFAI-IMPLITE-001");
    expect(found?.severity).toBe("warning");
    expect(found?.rule).toBe("preflight.inputSource");
    expect(found?.suggested_action).toContain("import-lite-<ts>.md");
  });
});

describe("importLite profile wiring", () => {
  // The regression this whole issue is about: the check existed, was correct,
  // and never ran. Asserting on `validateProject` — not on the module — is
  // what makes un-wiring it fail again.
  it("reports QFAI-IMPLITE-001 through the sdd profile", async () => {
    const root = await newRoot();
    await seedSpec(root);
    const result = await validateProject(root, undefined, { profile: "sdd" });
    expect(result.issues.map((found) => found.code)).toContain("QFAI-IMPLITE-001");
  });

  it("does not report QFAI-IMPLITE-001 once an input source exists", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedDiscussionReq(root);
    const result = await validateProject(root, undefined, { profile: "sdd" });
    expect(result.issues.map((found) => found.code)).not.toContain("QFAI-IMPLITE-001");
  });

  it("has a catalog entry, so the report prints the rule instead of the fallback", () => {
    const expected = resolveIssueExpected({
      code: "QFAI-IMPLITE-001",
      severity: "warning",
      category: "change",
      message: "input source missing",
    });
    expect(expected).not.toBe("Rule compliance");
    expect(expected).toContain("06_REQ.md");
    expect(expected).toContain("import-lite-");
  });

  // Remedy 2 of the rule names an artifact. Without a skill step that writes
  // it, the warning has no procedure behind it.
  it("qfai-sdd Stage 0 tells the agent how to produce the evidence file", async () => {
    const skill = await readFile(SKILL_MD, "utf-8");
    expect(skill).toContain("QFAI-IMPLITE-001");
    expect(skill).toContain(".qfai/evidence/import-lite-<timestamp>.md");
    expect(skill).toContain("templates/evidence/import-lite.md");
  });
});

describe("QFAI-IMPLITE-001 input-source shape", () => {
  // The catalogue asks for `discussion-<ts>/06_REQ.md`. A basename match
  // anywhere under `discussionDir` also cleared the warning from a parked copy,
  // so a project with no real input source looked compliant.
  it("does not accept a 06_REQ.md parked outside a discussion pack", async () => {
    const root = await newRoot();
    await seedSpec(root);
    const archiveDir = path.join(root, ".qfai", "discussion", "archive");
    await mkdir(archiveDir, { recursive: true });
    await writeFile(path.join(archiveDir, "06_REQ.md"), "# REQ\n", "utf-8");
    expect((await run(root)).map((found) => found.code)).toEqual(["QFAI-IMPLITE-001"]);
  });

  it("does not accept a 06_REQ.md sitting at the discussion root", async () => {
    const root = await newRoot();
    await seedSpec(root);
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });
    await writeFile(path.join(discussionDir, "06_REQ.md"), "# REQ\n", "utf-8");
    expect((await run(root)).map((found) => found.code)).toEqual(["QFAI-IMPLITE-001"]);
  });

  // Evidence lives at the canonical `<root>/.qfai/evidence` — every producer
  // writes there, including the Stage 0 step. Deriving it from `discussionDir`
  // made a relocated discussion root look for `requirements/evidence`, so the
  // warning could not be cleared on such a project at all.
  it("reads evidence from .qfai/evidence even when discussionDir is relocated", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["paths:", "  discussionDir: requirements/discussion", ""].join("\n"),
      "utf-8",
    );
    expect((await run(root)).map((found) => found.code)).toEqual(["QFAI-IMPLITE-001"]);
    await seedEvidence(root, "import-lite-20260401000000000.md");
    expect(await run(root)).toEqual([]);
  });
});

describe("runSddPreflight import-lite entrypoint", () => {
  // `runSddPreflight` is exported from the package root, so a consumer running
  // Stage 0 through it must reach the same verdict the validator does.
  it("is ready from import-lite evidence when there is no discussion pack", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite-20260401000000000.md");

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.status).toBe("ready");
    expect(result.source).toBe("import-lite");
    expect(result.selectedInputPath).toContain("import-lite-20260401000000000.md");
    expect(result.blockers).toEqual([]);
    expect(result.nextCommands).not.toContain("/qfai-discussion");

    const summary = await readFile(result.preflightSummaryPath, "utf-8");
    expect(summary).toContain("status: ready");
    expect(summary).toContain("source: import-lite");
  });

  // Evidence is an entrypoint, not an override: a pack that exists but is
  // incomplete must still block.
  it("stays blocked when a discussion pack exists but is incomplete", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedDiscussionReq(root);
    await seedEvidence(root, "import-lite-20260401000000000.md");

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.status).toBe("blocked");
    expect(result.source).toBe("discussion-pack");
  });
});

describe("QFAI-IMPLITE-001 CLI output", () => {
  // The catalogue entry only pays off if a formatter prints it. Both formatters
  // gated `expected` / `fix` on `severity === "error"`, so this warning-only
  // rule never showed its expected state — not even under `--fail-on warning`,
  // where it is what fails the run.
  it("prints the catalogue entry under --fail-on warning", async () => {
    const root = await newRoot();
    await seedSpec(root);
    const chunks: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown): boolean => {
      chunks.push(String(chunk));
      return true;
    });
    try {
      await runValidate({ root, strict: false, failOn: "warning", format: "text", profile: "sdd" });
    } finally {
      spy.mockRestore();
    }
    const output = chunks.join("");
    expect(output).toContain("QFAI-IMPLITE-001");
    expect(output).toContain("expected: A project that has spec packs");
    expect(output).toContain("fix:");
  });
});
