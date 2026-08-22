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
import { findImportLiteEvidence } from "../../src/core/preflight/importLiteEvidence.js";
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

const EVIDENCE_TEMPLATE = path.join(
  path.dirname(SKILL_MD),
  "templates",
  "evidence",
  "import-lite.md",
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

/**
 * A filled-in copy of the shipped template: identifying metadata plus one real
 * source. A filename match alone is not evidence, so the seed used by every
 * "input source exists" case has to record something traceable.
 */
const FILLED_EVIDENCE = [
  "# Evidence: import-lite (legacy-import)",
  "",
  "## Metadata",
  "",
  "- generated_at: 2026-04-01T00:00:00Z",
  "- author: AI",
  "- entrypoint: import-lite",
  "",
  "## Sources",
  "",
  "- URLs: https://example.com/legacy-requirements",
  "- Local paths:",
  "",
  "## User provided excerpt",
  "",
  "```text",
  "<paste if available>",
  "```",
  "",
].join("\n");

async function writeEvidence(root: string, fileName: string, body: string): Promise<void> {
  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, fileName), body, "utf-8");
}

async function seedEvidence(root: string, fileName: string): Promise<void> {
  await writeEvidence(root, fileName, FILLED_EVIDENCE);
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

  // A REQ index inside a legacy or misnamed pack is still something the specs
  // can be traced back to; it is an input source to REPAIR (`QFAI-DPACK-005` /
  // `QFAI-DPACK-006`), not one that is absent. Reporting "no input source" here
  // too would offer remedies that are not the rename those rules want.
  it("accepts a 06_REQ.md inside a legacy discussion pack", async () => {
    const root = await newRoot();
    await seedSpec(root);
    const legacyPack = path.join(root, ".qfai", "discussion", "discussion-0001");
    await mkdir(legacyPack, { recursive: true });
    await writeFile(path.join(legacyPack, "06_REQ.md"), "# REQ\n", "utf-8");
    expect(await run(root)).toEqual([]);
  });

  // The check inspects the CONFIGURED discussion directory, so a remedy naming
  // the default sent a relocated project to a path the validator never looks
  // at: creating the file it printed did not clear the warning.
  it("names the configured discussion directory in the remedy", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["paths:", "  discussionDir: requirements/discussion", ""].join("\n"),
      "utf-8",
    );
    const [found] = await run(root);
    expect(found?.suggested_action).toContain("requirements/discussion/discussion-*/06_REQ.md");
    expect(found?.suggested_action).not.toContain(".qfai/discussion/");
  });
});

describe("import-lite evidence filenames", () => {
  // `isFile()` succeeds for a real entry whose name carries surrounding
  // whitespace, but trimming it for the match and then joining the trimmed form
  // returned a path that does not exist: the validator and the full/verify gate
  // passed the project while the preflight summary pointed at an unreadable
  // file.
  it("returns the real filename when it carries surrounding whitespace", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, " import-lite.md");

    const selected = await findImportLiteEvidence(root);

    expect(selected).not.toBeNull();
    expect(path.basename(selected ?? "")).toBe(" import-lite.md");
    await expect(readFile(selected ?? "", "utf-8")).resolves.toContain("import-lite");
  });
});

describe("import-lite evidence content", () => {
  // A matching filename is not an input source. An empty file, or the shipped
  // template dropped in untouched, names nothing traceable — yet it cleared
  // `QFAI-IMPLITE-001` and, through the entrypoint, `QFAI-DPACK-001` too.
  it("does not accept an empty evidence file", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await writeEvidence(root, "import-lite-20260401000000000.md", "");
    expect((await run(root)).map((found) => found.code)).toEqual(["QFAI-IMPLITE-001"]);
    expect(await findImportLiteEvidence(root)).toBeNull();
  });

  it("does not accept the shipped template with its placeholders untouched", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await writeEvidence(
      root,
      "import-lite-20260401000000000.md",
      await readFile(EVIDENCE_TEMPLATE, "utf-8"),
    );
    expect((await run(root)).map((found) => found.code)).toEqual(["QFAI-IMPLITE-001"]);
  });

  it("does not accept a filled Sources section without the template metadata", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await writeEvidence(
      root,
      "import-lite-20260401000000000.md",
      ["# Evidence", "", "## Sources", "", "- URLs: https://example.com/spec", ""].join("\n"),
    );
    expect((await run(root)).map((found) => found.code)).toEqual(["QFAI-IMPLITE-001"]);
  });

  // `Assumptions / Missing information` lists what is NOT known, so filling it
  // in alone still leaves the specs untraceable.
  it("does not accept assumptions as a substitute for a source", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await writeEvidence(
      root,
      "import-lite-20260401000000000.md",
      (await readFile(EVIDENCE_TEMPLATE, "utf-8"))
        .replace("<ISO8601>", "2026-04-01T00:00:00Z")
        .replace("<missing item 1>", "the original ticket is lost"),
    );
    expect((await run(root)).map((found) => found.code)).toEqual(["QFAI-IMPLITE-001"]);
  });

  it("accepts a user excerpt when no source URL is known", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await writeEvidence(
      root,
      "import-lite-20260401000000000.md",
      (await readFile(EVIDENCE_TEMPLATE, "utf-8"))
        .replace("<ISO8601>", "2026-04-01T00:00:00Z")
        .replace("<paste if available>", "The importer must keep legacy CSV columns."),
    );
    expect(await run(root)).toEqual([]);
  });

  // Rejection is per candidate, not for the directory: an unusable newest
  // record must not hide an older one that does record an input source.
  it("skips a hollow newer record for an older filled one", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite-20260401000000000.md");
    await writeEvidence(root, "import-lite-20260501000000000.md", "");

    const selected = await findImportLiteEvidence(root);

    expect(path.basename(selected ?? "")).toBe("import-lite-20260401000000000.md");
  });

  // The entrypoint reads the same selector, so a hollow file must not flip the
  // preflight to `ready` or silence the missing-pack error.
  it("does not open the preflight entrypoint on a hollow evidence file", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await writeEvidence(root, "import-lite-20260401000000000.md", "");

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.status).toBe("blocked");
    expect(result.source).toBe("discussion-pack");

    const validated = await validateProject(root, undefined, { profile: "full" });
    expect(validated.issues.map((found) => found.code)).toContain("QFAI-DPACK-001");
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

describe("import-lite entrypoint eligibility", () => {
  // Dropping an evidence file must not let a brand-new project skip
  // `/qfai-discussion`: the entrypoint is defined for projects that already
  // carry specs.
  it("does not apply to a project with no spec packs", async () => {
    const root = await newRoot();
    await seedEvidence(root, "import-lite.md");

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.status).toBe("blocked");
    expect(result.source).toBe("discussion-pack");
  });

  // A misnamed pack is an input source that has to be repaired
  // (`QFAI-DPACK-005`), not one the evidence file may paper over. It leaves
  // `latestPackDir` null, so a null check alone would have let it through.
  it("does not apply when a non-canonical discussion pack exists", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite.md");
    await mkdir(path.join(root, ".qfai", "discussion", "discussion-latest"), { recursive: true });

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.status).toBe("blocked");
    expect(result.blockers.some((item) => item.includes("discussion-latest"))).toBe(true);
  });

  // `collectSpecEntries` returns an entry for an unknown or empty spec
  // directory too, so it could keep the missing-fileset diagnostics
  // deterministic. Counting entries therefore did not mean "specs exist": an
  // empty directory plus an evidence file flipped a brand-new project to
  // `ready` and suppressed `QFAI-DPACK-001` with it.
  it("does not apply when the only spec directory is empty", async () => {
    const root = await newRoot();
    await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
    await seedEvidence(root, "import-lite-20260401000000000.md");

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.status).toBe("blocked");
    expect(result.source).toBe("discussion-pack");

    const validated = await validateProject(root, undefined, { profile: "full" });
    expect(validated.issues.map((found) => found.code)).toContain("QFAI-DPACK-001");
  });

  // `findPacks` swallows every error and returns `[]`, which reads exactly like
  // "no pack at all". A discussion path that exists but cannot be enumerated is
  // an uninspectable input source, not an absent one, so the fallback must not
  // declare the project ready over it.
  it("does not apply when the discussion directory cannot be enumerated", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite-20260401000000000.md");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    // A plain file where the directory belongs: `readdir` fails with ENOTDIR,
    // which is an enumeration failure rather than ENOENT, on every platform.
    await writeFile(path.join(root, ".qfai", "discussion"), "not a directory\n", "utf-8");

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.status).toBe("blocked");
    expect(result.source).toBe("discussion-pack");
  });

  // The shipped template is a pointer artifact, explicitly "not
  // requirement/spec SSOT", so it carries no REQ ids. Counting them reported a
  // confident `0` for a project whose requirements live in its specs.
  it("reports the imported REQ count as unknown, not zero", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite-20260401000000000.md");

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.status).toBe("ready");
    expect(result.importedReqCount).toBeNull();
    const summary = await readFile(result.preflightSummaryPath, "utf-8");
    expect(summary).toContain("Imported REQ count: unknown");
  });

  // Lexicographic order does not rank `import-lite-<ts>.md` above
  // `import-lite.md` — the separator sorts against the extension dot — so the
  // newest record has to be selected by its parsed timestamp.
  it("prefers the newest timestamped evidence over the template filename", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite.md");
    await seedEvidence(root, "import-lite-20260401000000000.md");
    await seedEvidence(root, "import-lite-20260501000000000.md");

    const result = await runSddPreflight(root, defaultConfig);

    expect(result.selectedInputPath).toContain("import-lite-20260501000000000.md");
  });
});

describe("QFAI-DPACK-001 vs the import-lite entrypoint", () => {
  // The final gate (`validate --profile verify --fail-on error`) runs the
  // discussion validators unconditionally. Reporting a missing pack as an error
  // on exactly the projects the preflight declares ready left them unable to
  // ever reach DoD.
  it("does not fire on an eligible import-lite project", async () => {
    const root = await newRoot();
    await seedSpec(root);
    await seedEvidence(root, "import-lite-20260401000000000.md");
    const result = await validateProject(root, undefined, { profile: "full" });
    expect(result.issues.map((found) => found.code)).not.toContain("QFAI-DPACK-001");
  });

  it("still fires when the project has no import-lite evidence", async () => {
    const root = await newRoot();
    await seedSpec(root);
    const result = await validateProject(root, undefined, { profile: "full" });
    expect(result.issues.map((found) => found.code)).toContain("QFAI-DPACK-001");
  });
});
