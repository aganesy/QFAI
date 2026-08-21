/**
 * `qfai-sdd` Critical Constraint 1 — the template whitelist.
 *
 * The constraint used to enumerate template subdirectories, which put it in a
 * race with the directory listing it describes: `templates/evidence/` shipped
 * with a usable `import-lite.md` while the constraint still named three
 * directories, so the correct behaviour under the shipped rules was to ignore
 * the template and invent a layout — the exact drift the "canonical file set is
 * defined by skill templates" sentence exists to prevent.
 *
 * These cases pin the shape that cannot drift: the constraint names the
 * directory, agrees with the Mandatory Outputs sentence, and states the one
 * cross-skill template reference the same file makes.
 */

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateImportLiteEvidencePresence } from "../../src/core/validators/importLite.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const TEMPLATES = "assistant/skills/qfai-sdd/templates";

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("qfai-sdd's template whitelist covers what the skill ships", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Constraint 1 names the directory, not a list of subdirectories`, async () => {
      const skill = await read(tree, SKILL);
      expect(flat(skill)).toContain(
        "Use only templates under `.qfai/assistant/skills/qfai-sdd/templates/` — the whole directory, not an enumerated subset",
      );
    });

    it(`${tree}: no shipped template directory is outside the constraint`, async () => {
      // The regression this file exists for: a directory ships, the
      // enumeration is not updated, and the skill is told not to read it.
      const dirents = await readdir(path.join(repoRoot, tree, TEMPLATES), {
        withFileTypes: true,
      });
      const shipped = dirents.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
      expect(shipped.length, "qfai-sdd ships no template directories").toBeGreaterThan(0);
      expect(shipped).toContain("evidence");

      const skill = flat(await read(tree, SKILL));
      // Bounds are searched on number-independent wording and asserted before
      // slicing. An `indexOf` miss returns -1, so `slice(-1, -1)` yields an
      // empty string and the enumeration check below would pass vacuously —
      // the test would go green on exactly the drift it exists to catch.
      const start = skill.indexOf("Use only templates under");
      const end = skill.indexOf("Always write `.qfai/report/preflight_summary.md`");
      expect(start, "Constraint 1's opening wording moved").toBeGreaterThanOrEqual(0);
      expect(end, "the constraint after Constraint 1 moved").toBeGreaterThan(start);
      const constraint = skill.slice(start, end);
      // A per-directory enumeration inside the constraint is what drifts, so
      // the constraint must not name individual subdirectories at all.
      for (const name of shipped) {
        expect(constraint, `Constraint 1 enumerates \`templates/${name}\``).not.toContain(
          `templates/${name}`,
        );
      }
    });

    it(`${tree}: the constraint and the Mandatory Outputs sentence agree`, async () => {
      // These two said different things 31 lines apart, and both were binding.
      const skill = await read(tree, SKILL);
      expect(skill).toContain(
        "The canonical file set is defined by skill templates under `.qfai/assistant/skills/qfai-sdd/templates/`.",
      );
    });

    it(`${tree}: the one cross-skill template reference is a stated exception`, async () => {
      // `Phase 0 DESIGN.md Freeze` points the user at a qfai-prototyping
      // template, which "use only templates under qfai-sdd/templates/" does
      // not cover. Left unstated, it read as a licence to browse other skills.
      const skill = await read(tree, SKILL);
      expect(flat(skill)).toContain(
        "Named cross-skill exception: `.qfai/assistant/skills/qfai-prototyping/templates/DESIGN.md.sample`",
      );
      expect(flat(skill)).toContain("It is an exception, not a licence to read other skills");
      // The reference the exception exists for must still be there.
      expect(skill).toContain(
        "`.qfai/assistant/skills/qfai-prototyping/templates/DESIGN.md.sample`",
      );
    });

    it(`${tree}: the shipped evidence template stays readable under the constraint`, async () => {
      const template = await read(tree, `${TEMPLATES}/evidence/import-lite.md`);
      expect(template).toContain("# Evidence: import-lite");
    });
  }
});

/**
 * The same directory's other artifact: `templates/evidence/import-lite.md`.
 *
 * It shipped with no producing phase — no invocation, no stage, no output path
 * — while Critical Constraint 1 declared the whole template directory in scope.
 * The only naming hint an author had was the template's own basename, and
 * `QFAI-IMPLITE-001` detects `import-lite-<ts>.md`, so copying the template as
 * named produced a file the detector rejects.
 *
 * These cases pin the route: the skill documents the path, and the documented
 * path is the one `validateImportLiteEvidencePresence` accepts.
 */
const documentedEvidencePath = (skill: string): string => {
  const match = /`\.qfai\/evidence\/(import-lite-[^`]+\.md)`/.exec(skill);
  expect(match, "qfai-sdd no longer documents an import-lite evidence path").not.toBeNull();
  return match === null ? "" : match[1];
};

const projectRoots: string[] = [];

async function makeProject(evidenceFileName?: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-import-lite-"));
  projectRoots.push(root);
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# User stories\n", "utf-8");
  // No `discussion-*/06_REQ.md`: this is the branch the import-lite artifact exists for.
  await mkdir(path.join(root, ".qfai", "discussion"), { recursive: true });
  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  if (evidenceFileName !== undefined) {
    await writeFile(path.join(evidenceDir, evidenceFileName), "# Evidence\n", "utf-8");
  }
  return root;
}

describe("qfai-sdd documents how to produce its import-lite evidence template", () => {
  afterEach(async () => {
    const roots = projectRoots.splice(0, projectRoots.length);
    await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  });

  for (const tree of QFAI_TREES) {
    it(`${tree}: the Evidence section names the producing stage and the output path`, async () => {
      const skill = flat(await read(tree, SKILL));
      expect(skill).toContain(
        "create `.qfai/evidence/import-lite-<ts>.md` from `templates/evidence/import-lite.md`",
      );
      // The trigger, not just the path: which stage writes it, and why.
      expect(skill).toContain("`.qfai/discussion/discussion-*/06_REQ.md`");
      expect(skill).toContain("QFAI-IMPLITE-001");
    });

    it(`${tree}: Mandatory Outputs lists the artifact as conditional`, async () => {
      const skill = flat(await read(tree, SKILL));
      expect(skill).toContain("Evidence file (conditional): `.qfai/evidence/import-lite-<ts>.md`");
    });

    it(`${tree}: the template shows the discriminator its own basename lacks`, async () => {
      const template = flat(await read(tree, `${TEMPLATES}/evidence/import-lite.md`));
      expect(template).toContain("import-lite-<ts>.md");
    });

    it(`${tree}: the documented path satisfies the QFAI-IMPLITE-001 detector`, async () => {
      const skill = await read(tree, SKILL);
      const documented = documentedEvidencePath(skill).replace("<ts>", "20260101-000000");
      const root = await makeProject(documented);
      const issues = await validateImportLiteEvidencePresence(root, defaultConfig);
      expect(issues, `\`${documented}\` is not accepted by the detector`).toEqual([]);
    });
  }

  it("the template's own basename is the trap the documented path avoids", async () => {
    // Copying `templates/evidence/import-lite.md` as-named is what an author
    // did before the path was documented; the detector does not accept it.
    const withTemplateName = await makeProject("import-lite.md");
    const trapped = await validateImportLiteEvidencePresence(withTemplateName, defaultConfig);
    expect(trapped.map((entry) => entry.code)).toEqual(["QFAI-IMPLITE-001"]);

    const withNothing = await makeProject();
    const missing = await validateImportLiteEvidencePresence(withNothing, defaultConfig);
    expect(missing.map((entry) => entry.code)).toEqual(["QFAI-IMPLITE-001"]);
  });
});
