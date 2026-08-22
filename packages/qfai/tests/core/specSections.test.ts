import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, type ConfigLoadResult, type QfaiConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import { validateSpecSections } from "../../src/core/validators/specSections.js";

function configRequiring(sections: string[]): QfaiConfig {
  return {
    ...defaultConfig,
    validation: {
      ...defaultConfig.validation,
      require: { specSections: sections },
    },
  };
}

function loadResult(root: string, sections: string[]): ConfigLoadResult {
  return {
    config: configRequiring(sections),
    issues: [],
    configPath: path.join(root, "qfai.config.yaml"),
  };
}

async function withProject(
  task: (root: string, specsRoot: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec-sections-"));
  try {
    const specsRoot = path.join(root, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "_policies"), { recursive: true });
    await task(root, specsRoot);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedSpec(specsRoot: string, specNumber: string, specBody: string): Promise<string> {
  const dir = path.join(specsRoot, `spec-${specNumber}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "01_Spec.md"), specBody, "utf-8");
  await writeFile(path.join(dir, "02_User-stories.md"), "# US\n", "utf-8");
  return dir;
}

describe("validateSpecSections", () => {
  it("stays silent when no required section is configured", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n");
      const issues = await validateSpecSections(root, configRequiring([]));
      expect(issues).toEqual([]);
    });
  });

  it("reports one finding per spec that misses a required heading", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n\n## Scope\n\ntext\n");
      await seedSpec(specsRoot, "0002", "# spec-0002\n\n## Scope\n\n## Risks\n");

      const issues = await validateSpecSections(root, configRequiring(["Scope", "Risks"]));

      expect(issues).toHaveLength(1);
      const finding = issues[0];
      expect(finding?.code).toBe("QFAI-SPECSECTION-001");
      expect(finding?.severity).toBe("error");
      expect(finding?.rule).toBe("validation.require.specSections");
      expect(finding?.refs).toEqual(["Risks"]);
      expect(finding?.file).toBe(path.join(specsRoot, "spec-0001"));
    });
  });

  it("accepts a heading declared with its own `##` prefix and different casing", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n\n### scope\n");
      const issues = await validateSpecSections(root, configRequiring(["## Scope"]));
      expect(issues).toEqual([]);
    });
  });

  it("accepts a heading supplied by the shared _policies pack", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n");
      await writeFile(
        path.join(specsRoot, "_policies", "07_Constraints.md"),
        "# 07 Constraints\n\n## Constraints\n",
        "utf-8",
      );
      const issues = await validateSpecSections(root, configRequiring(["Constraints"]));
      expect(issues).toEqual([]);
    });
  });

  it("does not accept a heading that only exists in another spec pack", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n");
      await seedSpec(specsRoot, "0002", "# spec-0002\n\n## Scope\n");

      const issues = await validateSpecSections(root, configRequiring(["Scope"]));

      expect(issues.map((entry) => entry.file)).toEqual([path.join(specsRoot, "spec-0001")]);
    });
  });

  it("does not count a heading that only appears inside a fenced sample", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(
        specsRoot,
        "0001",
        "# spec-0001\n\n" +
          "テンプレート例:\n\n" +
          "```markdown\n## Risks\n\n- 例\n```\n\n" +
          "<!--\n## Risks\n-->\n",
      );

      const issues = await validateSpecSections(root, configRequiring(["Risks"]));

      expect(issues.map((entry) => entry.refs)).toEqual([["Risks"]]);
    });
  });

  it("does not count a heading that only appears inside a raw HTML block", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(
        specsRoot,
        "0001",
        "# spec-0001\n\n" + "<pre>\n## Risks\n</pre>\n\n" + "<pre>## Risks</pre>\n",
      );

      const issues = await validateSpecSections(root, configRequiring(["Risks"]));

      // `<pre>` holds literal text, so neither line is a Markdown heading and
      // the spec still owes a real Risks section.
      expect(issues.map((entry) => entry.refs)).toEqual([["Risks"]]);
    });
  });

  it("accepts a heading written with an ATX closing sequence", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n\n## Risks ##\n");

      const issues = await validateSpecSections(root, configRequiring(["Risks"]));

      expect(issues).toEqual([]);
    });
  });

  it("keeps a trailing `#` run that is not a closing sequence part of the name", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n\n## Risks##\n");

      // No space before the run, so CommonMark reads the heading as `Risks##`.
      const issues = await validateSpecSections(root, configRequiring(["Risks"]));

      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-SPECSECTION-001"]);
    });
  });

  it("reports a configured entry that names no heading instead of dropping it", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n");

      const issues = await validateSpecSections(root, configRequiring(["##", "   "]));

      // Nothing usable is left, so without this the gate would be configured
      // and yet silently evaluate nothing.
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-SPECSECTION-002"]);
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.file).toBe("qfai.config.yaml");
      expect(issues[0]?.refs).toEqual(['"##"', '"   "']);
    });
  });

  it("still evaluates the usable entries alongside an invalid one", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n");

      const issues = await validateSpecSections(root, configRequiring(["##", "Scope"]));

      expect(issues.map((entry) => entry.code)).toEqual([
        "QFAI-SPECSECTION-002",
        "QFAI-SPECSECTION-001",
      ]);
    });
  });

  it("does not let the shared pack cover a legacy spec pack", async () => {
    await withProject(async (root, specsRoot) => {
      const legacyDir = path.join(specsRoot, "spec-0001");
      await mkdir(legacyDir, { recursive: true });
      await writeFile(path.join(legacyDir, "spec.md"), "# spec-0001\n", "utf-8");
      await seedSpec(specsRoot, "0002", "# spec-0002\n");
      await writeFile(
        path.join(specsRoot, "_policies", "07_Constraints.md"),
        "# 07 Constraints\n\n## Constraints\n",
        "utf-8",
      );

      const issues = await validateSpecSections(root, configRequiring(["Constraints"]));

      // spec-0002 is layered, so `_policies` still covers it; the legacy pack
      // owns its own Constraints file and must carry the heading itself.
      expect(issues.map((entry) => entry.file)).toEqual([legacyDir]);
    });
  });

  it("reads a top-level Markdown file that is a symlink", async () => {
    await withProject(async (root, specsRoot) => {
      const dir = await seedSpec(specsRoot, "0001", "# spec-0001\n");
      const target = path.join(root, "external-scope.md");
      await writeFile(target, "# external\n\n## Scope\n", "utf-8");
      try {
        await symlink(target, path.join(dir, "03_Scope.md"), "file");
      } catch {
        // Windows without developer mode refuses symlink creation; the
        // behaviour under test is unreachable there.
        return;
      }

      const issues = await validateSpecSections(root, configRequiring(["Scope"]));

      expect(issues).toEqual([]);
    });
  });

  it("surfaces the finding through the sdd profile", async () => {
    await withProject(async (root, specsRoot) => {
      await seedSpec(specsRoot, "0001", "# spec-0001\n");
      const result = await validateProject(root, loadResult(root, ["Scope"]), { profile: "sdd" });
      expect(result.issues.some((entry) => entry.code === "QFAI-SPECSECTION-001")).toBe(true);
    });
  });
});
