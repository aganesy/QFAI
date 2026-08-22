/**
 * `qfai-sdd` — the producing route for `templates/evidence/import-lite.md`.
 *
 * The template shipped with a stated purpose (a preflight pointer artifact) and
 * no trigger: no phase, stage or Mandatory Output said who writes it, to which
 * path, under which name. Critical Constraint 1 puts the whole template
 * directory in scope, so enumerating it surfaced an artifact an author could
 * only name after the template itself — and `.qfai/evidence/import-lite.md` is
 * exactly the name `QFAI-IMPLITE-001`'s detector rejects.
 *
 * These cases pin both halves: the shipped documents describe the producer, and
 * every `import-lite-*` path they print really satisfies the detector in
 * `src/core/validators/importLite.ts`.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateImportLiteEvidencePresence } from "../../src/core/validators/importLite.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL_REL = "assistant/skills/qfai-sdd/SKILL.md";
const TEMPLATE_REL = "assistant/skills/qfai-sdd/templates/evidence/import-lite.md";

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

/** Resolve the doc's `<ts>` placeholder to a concrete run stamp. */
const materialize = (documented: string): string => documented.replace(/<ts>/gi, "20260822T090000");

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
async function importLiteCodesAt(relativePath: string | null): Promise<string[]> {
  if (relativePath !== null) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "# Evidence: import-lite\n", "utf-8");
  }
  const issues = await validateImportLiteEvidencePresence(root, defaultConfig);
  return issues.map((issue) => issue.code);
}

const importLiteCodes = (evidenceFileName: string | null): Promise<string[]> =>
  importLiteCodesAt(evidenceFileName === null ? null : `.qfai/evidence/${evidenceFileName}`);

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

    it(`${tree}: every documented import-lite path satisfies the detector`, async () => {
      const documented = [
        ...documentedEvidencePaths(await read(tree, SKILL_REL)),
        ...documentedEvidencePaths(await read(tree, TEMPLATE_REL)),
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

  it("still fires for the trap name the template's own basename would produce", async () => {
    // The reason the docs must print the `-<ts>` form: copying the template
    // as-named yields a file the detector does not see.
    expect(await importLiteCodes("import-lite.md")).toContain("QFAI-IMPLITE-001");
  });

  it("still fires for a correctly named file written outside the evidence directory", async () => {
    // The reason the documented directory is kept and honoured above: the name
    // alone is not enough, so a doc that printed the wrong directory must fail.
    expect(await importLiteCodesAt(".qfai/report/import-lite-20260822T090000.md")).toContain(
      "QFAI-IMPLITE-001",
    );
  });

  it("fires when the evidence directory holds nothing at all", async () => {
    expect(await importLiteCodes(null)).toContain("QFAI-IMPLITE-001");
  });
});
