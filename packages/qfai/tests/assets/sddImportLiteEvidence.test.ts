/**
 * `qfai-sdd` — the producing route for `templates/evidence/import-lite.md`.
 *
 * The template shipped with a stated purpose (a preflight pointer artifact) and
 * no trigger: no phase, stage or Mandatory Output said who writes it, to which
 * path, under which name. Critical Constraint 1 puts the whole template
 * directory in scope, so enumerating it surfaced an artifact an author could
 * only name after the template itself — leaving `.qfai/evidence/import-lite.md`
 * as the one name a reader could infer, which holds a single run and is
 * overwritten by the next import.
 *
 * These cases pin both halves: the shipped documents describe the producer, and
 * every `import-lite-*` path they print really satisfies the detector, whose
 * name and content rules live in `src/core/preflight/importLiteEvidence.ts`
 * behind `validateImportLiteEvidencePresence`.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import { validateImportLiteEvidencePresence } from "../../src/core/validators/importLite.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL_REL = "assistant/skills/qfai-sdd/SKILL.md";
const TEMPLATE_REL = "assistant/skills/qfai-sdd/templates/evidence/import-lite.md";
const TRIAGE_REL = "assistant/skills/qfai-sdd/references/sdd-triage.md";
const TRACE_REL = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";
const US_REL = "assistant/skills/qfai-sdd/templates/specs/spec/02_User-stories.md";
const AC_REL = "assistant/skills/qfai-sdd/templates/specs/spec/03_Acceptance-Criteria.md";
const SUMMARY_REL = "assistant/skills/qfai-sdd/templates/report/preflight_summary.md";

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Every `import-lite-…md` path a shipped document prints — the directory it
 * names included, `<ts>` placeholder included. The directory is half of the
 * instruction: a document that sent the file to `.qfai/report/` would leave
 * `QFAI-IMPLITE-001` firing, so the path is kept whole and written where it
 * says. Glob forms (`import-lite-*.md`) are the detector's own pattern quoted
 * back at the reader, not a path to write, so they are excluded.
 */
function documentedEvidencePaths(source: string): string[] {
  return [...source.matchAll(/(?:[\w.@-]+\/)*import-lite-[^\s`"'()]*\.md/gi)]
    .map((match) => match[0])
    .filter((candidate) => !candidate.includes("*"));
}

/**
 * Resolve the doc's `<ts>` placeholder to a concrete run stamp.
 *
 * The stamp is the canonical 17-digit one (`YYYYMMDDhhmmssSSS`) that
 * `CANONICAL_TIMESTAMP_RE` accepts, the same form discussion packs use. A
 * second-precision `YYYYMMDDTHHmmss` form is not a canonical stamp and the name
 * check rejects it, so materializing to one would have tested a path the
 * documents must never send an operator down.
 */
const materialize = (documented: string): string =>
  documented.replace(/<ts>/gi, "20260822090000000");

/**
 * A filled-in copy of the shipped template: identifying metadata plus one real
 * source. A filename match alone is not evidence — the detector reads the body
 * and skips a record that names nothing traceable — so every "input source
 * exists" case has to seed a record, not just a name.
 */
const FILLED_EVIDENCE = [
  "# Evidence: import-lite (legacy-import)",
  "",
  "## Metadata",
  "",
  "- generated_at: 2026-08-22T09:00:00Z",
  "- author: AI",
  "- entrypoint: import-lite",
  "- produced_by: /qfai-sdd Stage 0",
  "",
  "## Sources",
  "",
  "- URLs: https://example.com/legacy-requirements",
  "- Local paths:",
  "",
].join("\n");

/** A spec set with no discussion pack — the state QFAI-IMPLITE-001 covers. */
async function seedSpecSet(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-import-lite-"));
  const specDir = path.join(dir, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_spec.md"), "# Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-Stories.md"), "# User Stories\n", "utf-8");
  await mkdir(path.join(dir, ".qfai/evidence"), { recursive: true });
  return dir;
}

let root: string;

beforeEach(async () => {
  root = await seedSpecSet();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** Write the evidence at the exact relative path given, then run the detector. */
async function importLiteCodesAt(
  relativePath: string | null,
  body: string = FILLED_EVIDENCE,
): Promise<string[]> {
  if (relativePath !== null) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body, "utf-8");
  }
  const issues = await validateImportLiteEvidencePresence(root, defaultConfig);
  return issues.map((issue) => issue.code);
}

const importLiteCodes = (
  evidenceFileName: string | null,
  body: string = FILLED_EVIDENCE,
): Promise<string[]> =>
  importLiteCodesAt(evidenceFileName === null ? null : `.qfai/evidence/${evidenceFileName}`, body);

describe("qfai-sdd documents who produces import-lite evidence", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: SKILL.md names the producing stage, source template and output path`, async () => {
      const skill = flat(await read(tree, SKILL_REL));
      expect(skill).toContain("`.qfai/evidence/import-lite-<ts>.md`");
      expect(skill).toContain("`templates/evidence/import-lite.md`");
      expect(skill).toContain("Stage 0");
      expect(skill).toContain("QFAI-IMPLITE-001");
    });

    it(`${tree}: SKILL.md lists import-lite evidence among the Mandatory Outputs`, async () => {
      const skill = flat(await read(tree, SKILL_REL));
      const start = skill.indexOf("## Mandatory Outputs");
      const end = skill.indexOf("## Phase 0 DESIGN.md Freeze");
      expect(start, "the Mandatory Outputs heading moved").toBeGreaterThanOrEqual(0);
      expect(end, "the section after Mandatory Outputs moved").toBeGreaterThan(start);
      expect(skill.slice(start, end)).toContain("import-lite-<ts>.md");
    });

    it(`${tree}: the template states the output path its own basename cannot serve as`, async () => {
      const template = flat(await read(tree, TEMPLATE_REL));
      expect(template).toContain("`.qfai/evidence/import-lite-<ts>.md`");
    });

    it(`${tree}: the template carries the same collision rule as the skill`, async () => {
      // A stamp is not uniqueness: a re-run or a parallel run must not
      // overwrite an earlier run's audit trail, and a reader holding only the
      // template has to be told so too. The recovery is a fresh stamp, not a
      // `-<n>` counter — `classifyEvidenceName` rejects any suffix that is not
      // exactly the canonical stamp, so a counter would produce a file the
      // detector cannot see.
      const template = flat(await read(tree, TEMPLATE_REL));
      expect(template).toContain("re-stamp and retry");
      expect(template, "the template still offers the rejected `-<n>` counter").not.toContain(
        "`-<n>` counter",
      );
    });

    it(`${tree}: the template's Metadata keeps the entrypoint the detector reads`, async () => {
      // `entrypoint: import-lite` is not decoration: `hasRequiredMetadata`
      // keys on that exact value to recognise the file as import-lite evidence
      // at all. Naming the producing skill there instead would make every file
      // the shipped procedure produces fail the shipped check, so the producer
      // is recorded in its own field and in the prose above.
      const template = flat(await read(tree, TEMPLATE_REL));
      expect(template).toContain("entrypoint: import-lite");
      expect(template).toContain("produced_by: /qfai-sdd Stage 0");
    });

    it(`${tree}: name reservation is atomic, not list-then-write`, async () => {
      // "List the directory, take a free name" is not a reservation: two runs
      // inside the same second both see the same name free and the later write
      // erases the earlier run's trail. The claim has to be the create itself.
      for (const rel of [TEMPLATE_REL, SKILL_REL]) {
        const doc = flat(await read(tree, rel));
        expect(doc, `${rel} does not require an exclusive create`).toContain("exclusive create");
        expect(doc, `${rel} does not say to retry the counter`).toMatch(/retry|until the name/i);
      }
    });

    it(`${tree}: the Metadata output_path records where the file went`, async () => {
      // The run stamp makes the filename vary per run, so a hard-coded value
      // would make the audit trail lie about where the trail itself is.
      const template = flat(await read(tree, TEMPLATE_REL));
      const start = template.indexOf("## Metadata");
      expect(start, "the Metadata heading moved").toBeGreaterThanOrEqual(0);
      // `## Sources` is quoted in the prose above Metadata, so search forward.
      const metadata = template.slice(start, template.indexOf("## Sources", start));
      expect(metadata).toContain("output_path: <");
      expect(metadata).toContain("import-lite-<ts>.md");
    });

    it(`${tree}: the evidence directory is canonical, not derived from the config`, async () => {
      // `resolveImportLiteEvidenceRoot` is pinned to `.qfai/evidence` on
      // purpose. A document that sent a relocated project to the `evidence/`
      // sibling of its `paths.discussionDir` would put the file where nothing
      // looks, leaving QFAI-IMPLITE-001 unclearable by following the docs.
      for (const rel of [TEMPLATE_REL, SKILL_REL, TRIAGE_REL]) {
        const doc = flat(await read(tree, rel));
        expect(doc, `${rel} sends the evidence to a discussionDir-relative directory`).not.toMatch(
          /`evidence\/` sibling/i,
        );
      }
    });

    it(`${tree}: an evidence file is not left behind when no input source exists`, async () => {
      // Stage 0 persists before Stage 1 can stop, so without this rule an
      // input-less `import-lite-*` file survives and silences the very code
      // that should have reported the missing input source.
      const skill = flat(await read(tree, SKILL_REL));
      expect(skill).toContain("User provided excerpt");
      expect(skill).toMatch(/delete it if the run then stops/i);
      const triage = flat(await read(tree, TRIAGE_REL));
      expect(triage).toMatch(/delete the evidence file/i);
    });

    it(`${tree}: the skill says the packaged preflight API takes this route`, async () => {
      // `runSddPreflight` resolves the entrypoint itself and stamps
      // `source: import-lite`, so the summary has somewhere truthful to record
      // an import-lite input and nobody should hand-write a second copy.
      const skill = flat(await read(tree, SKILL_REL));
      expect(skill).toContain("runSddPreflight");
      expect(skill, "the skill still tells the agent to hand-write the summary").not.toMatch(
        /write the preflight summary by hand/i,
      );
      const summary = flat(await read(tree, SUMMARY_REL));
      expect(summary).toContain("import-lite");
      expect(summary).not.toContain("source: discussion-pack");
    });

    it(`${tree}: import-lite items have a Source form of their own`, async () => {
      // Stage 1's input is the evidence file, but the downstream provenance
      // fields only defined the discussion-pack pair — leaving an agent to
      // write `-` or fabricate a pack ID.
      for (const rel of [TRACE_REL, US_REL, AC_REL, TRIAGE_REL]) {
        const doc = flat(await read(tree, rel));
        expect(doc, `${rel} does not define the import-lite Source pair`).toContain(
          "import-lite-<ts>#<REQ-ID>",
        );
      }
    });

    it(`${tree}: Stage 1 has a defined intake when Stage 0 took the import-lite route`, async () => {
      // The Stage 0 exception continues without a pack, so the Stage 1 Inputs
      // list must say what stands in for `06_REQ.md` / `07_NFR.md`.
      const triage = flat(await read(tree, TRIAGE_REL));
      const start = triage.indexOf("## Inputs");
      const end = triage.indexOf("## Procedure");
      expect(start, "the Inputs heading moved").toBeGreaterThanOrEqual(0);
      expect(end, "the section after Inputs moved").toBeGreaterThan(start);
      expect(triage.slice(start, end)).toContain("import-lite-<ts>.md");
    });

    it(`${tree}: every documented import-lite path satisfies the detector`, async () => {
      const documented = [
        ...documentedEvidencePaths(await read(tree, SKILL_REL)),
        ...documentedEvidencePaths(await read(tree, TEMPLATE_REL)),
        ...documentedEvidencePaths(await read(tree, TRIAGE_REL)),
      ];
      expect(documented.length, "no import-lite output path is documented").toBeGreaterThan(0);

      for (const documentedPath of documented) {
        const relativePath = materialize(documentedPath);
        expect(relativePath, `${documentedPath} names no output directory`).toContain("/");
        // Fresh spec set per path so one accepted location cannot mask another.
        await rm(root, { recursive: true, force: true });
        root = await seedSpecSet();
        expect(
          await importLiteCodesAt(relativePath),
          `${documentedPath} is not detected where it is documented`,
        ).not.toContain("QFAI-IMPLITE-001");
      }
    });
  }

  it("accepts a filled copy kept under the template's own basename", async () => {
    // The template filename is deliberately accepted, so an operator who
    // copied it as-named is not left with a warning nothing they wrote can
    // clear. The docs still print the `-<ts>` form, because that fixed name
    // holds one file and a second import would overwrite the first run.
    expect(await importLiteCodes("import-lite.md")).not.toContain("QFAI-IMPLITE-001");
  });

  it("still fires for the template dropped in with its placeholders untouched", async () => {
    // The real trap the docs steer around: a name that matches while the body
    // records nothing traceable would silence the finding on a project with no
    // input source at all.
    const shipped = await readFile(
      path.join(repoRoot, QFAI_TREES[1] ?? ".qfai", TEMPLATE_REL),
      "utf-8",
    );
    expect(await importLiteCodes("import-lite-20260822090000000.md", shipped)).toContain(
      "QFAI-IMPLITE-001",
    );
  });

  it("still fires for a correctly named file written outside the evidence directory", async () => {
    // The reason the documented directory is kept and honoured above: the name
    // alone is not enough, so a doc that printed the wrong directory must fail.
    expect(await importLiteCodesAt(".qfai/report/import-lite-20260822090000000.md")).toContain(
      "QFAI-IMPLITE-001",
    );
  });

  it("fires when the evidence directory holds nothing at all", async () => {
    expect(await importLiteCodes(null)).toContain("QFAI-IMPLITE-001");
  });

  // A hyphenated name has to carry the canonical stamp and nothing else. Each
  // of these would otherwise stand in for a record of a run that never
  // happened — the `-<n>` collision suffix included, which is why the shipped
  // procedure recovers from a name clash by re-stamping instead.
  for (const name of [
    "import-lite-.md",
    "import-lite-<ts>.md",
    "import-lite-notatimestamp.md",
    "import-lite-20260822.md",
    "import-lite-20260822090000000-2.md",
  ]) {
    it(`still fires for the non-canonical name ${name}`, async () => {
      expect(await importLiteCodes(name)).toContain("QFAI-IMPLITE-001");
    });
  }

  it("accepts the canonical 17-digit stamp the procedure produces", async () => {
    expect(await importLiteCodes("import-lite-20260822090000000.md")).not.toContain(
      "QFAI-IMPLITE-001",
    );
  });
});

describe("the detector is reachable from the public validate profiles", () => {
  it("reports QFAI-IMPLITE-001 through validateProject --profile sdd", async () => {
    // The detector once had no caller in production at all, so a spec change
    // with neither a pack nor import-lite evidence passed the gate the shipped
    // skill points at. This pins the dispatch that closed that hole.
    const result = await validateProject(root, undefined, { profile: "sdd" });
    expect(result.issues.map((entry) => entry.code)).toContain("QFAI-IMPLITE-001");
  });

  it("goes quiet through the profile once the evidence exists", async () => {
    await writeFile(
      path.join(root, ".qfai/evidence/import-lite-20260822090000000.md"),
      FILLED_EVIDENCE,
      "utf-8",
    );
    const result = await validateProject(root, undefined, { profile: "sdd" });
    expect(result.issues.map((entry) => entry.code)).not.toContain("QFAI-IMPLITE-001");
  });

  it("does not fail the full profile on the missing pack this route has by design", async () => {
    // `qfai init` ships CI running `--profile full --fail-on error`, so a
    // QFAI-DPACK-001 here failed the build of every imported spec set.
    const before = await validateProject(root, undefined, { profile: "full" });
    expect(before.issues.map((entry) => entry.code)).toContain("QFAI-DPACK-001");

    await writeFile(
      path.join(root, ".qfai/evidence/import-lite-20260822090000000.md"),
      FILLED_EVIDENCE,
      "utf-8",
    );

    const after = await validateProject(root, undefined, { profile: "full" });
    const codes = after.issues.map((entry) => entry.code);
    expect(codes).not.toContain("QFAI-DPACK-001");
    expect(codes).not.toContain("QFAI-IMPLITE-001");
  });
});
