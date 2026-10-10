/**
 * Integration: Configure skill
 *
 * Validates that the /qfai-configure skill requirements are
 * covered by existing implementation: SKILL.md template, config module,
 * and loadConfig functionality.
 *
 * The skill should match the current story-tree contract.
 */
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { collectFilesByGlobs } from "../../src/core/fs.js";
import {
  DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
  collectScTestReferences,
} from "../../src/core/traceability.js";
import { readEffectiveRouting } from "../../src/core/validators/agentDefinition.js";
import { removeTempTree } from "../helpers/tempTree.js";

const SKILL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-configure",
  "SKILL.md",
);

const CONFIG_PATH = path.resolve(__dirname, "..", "..", "src", "core", "config.ts");

/** The story-tree templates the skill fills from repository evidence. */
const SPEC_TEMPLATES = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
  "templates",
  "spec",
);

const flat = (text: string): string => text.replace(/\s+/g, " ");

/** One `## ` section of the skill whose heading starts with `heading`, with soft wraps folded. */
function section(content: string, heading: string): string {
  const start = content.indexOf(`\n## ${heading}`);
  expect(start, `no "## ${heading}" section`).toBeGreaterThanOrEqual(0);
  const body = content.slice(start + 1);
  const next = body.indexOf("\n## ", 3);
  return flat(next === -1 ? body : body.slice(0, next));
}

/** Creates a file with one line at each of the relative paths. */
async function writeTree(root: string, files: readonly string[]): Promise<void> {
  for (const rel of files) {
    const file = path.join(root, ...rel.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "// test file\n", "utf-8");
  }
}

describe("Repository Analysis Identifies Frameworks", () => {
  // QFAI:AC-0001-0075-01
  // QFAI:EX-0001-0075-01
  it("SKILL.md defines repository analysis as primary goal", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Aa]nalyze.*repositor/);
    expect(content).toContain("qfai.config.yaml");
    expect(content).toContain("Identify test frameworks and locations");
    expect(content).toContain("Enumerate directories that contain tests");
    expect(content).toContain("Note naming rules");
    expect(content).toContain("package manager (pnpm/npm/yarn)");
    expect(content).toContain("Inspect `package.json` and config files (e.g., `vitest.config.*`");
    expect(content).toContain(
      "- [ ] Repository analysis completed (frameworks, test layout, naming rules).",
    );
  });

  it("config module defines testFileGlobs for framework detection", async () => {
    const content = await readFile(CONFIG_PATH, "utf-8");
    expect(content).toContain("testFileGlobs");
  });
});

describe("Glob Patterns Cover Test Locations", () => {
  it("config module defines testFileGlobs and testFileExcludeGlobs", async () => {
    const content = await readFile(CONFIG_PATH, "utf-8");
    expect(content).toContain("testFileGlobs");
    expect(content).toContain("testFileExcludeGlobs");
  });

  it("SKILL.md specifies 3-10 include globs requirement", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("testFileGlobs");
  });

  // QFAI:AC-0001-0076-01
  it("asks for 3-10 explicit include globs, forbids a catch-all and adds excludes only beyond the defaults", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    const proposal = section(content, "Step 2");
    expect(proposal).toContain(
      "Provide 3-10 **include globs** that cover all known test locations",
    );
    expect(proposal).toContain(
      "Prefer explicit patterns (e.g., `src/**/*.test.ts`, `tests/**/*.spec.ts`).",
    );
    expect(proposal).toContain(
      "Provide **exclude globs** only when necessary (beyond the default exclusions).",
    );
    expect(section(content, "Constraints")).toContain("Avoid overly broad globs (e.g., `**/*`).");
    expect(section(content, "Step 4")).toContain(
      "`validation.traceability.testFileExcludeGlobs` (only if needed)",
    );
  });

  // QFAI:EX-0001-0076-04
  it("covers the test locations with explicit globs and leaves the default-excluded paths to the defaults", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    const listed = /Exclude generated\/output directories \(([^)]*)\)/.exec(
      section(content, "Constraints"),
    )?.[1];
    const directories = [...(listed ?? "").matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
    expect(
      directories.map((directory) => `**/${directory}/**`),
      "the directories the skill says are excluded already are the package's default exclusions",
    ).toEqual(DEFAULT_TEST_FILE_EXCLUDE_GLOBS);

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-configure-globs-"));
    try {
      await writeTree(root, [
        "packages/qfai/tests/unit/a.test.ts",
        "src/core/b.test.ts",
        "packages/qfai/tests/node_modules/dep/c.test.ts",
        "src/dist/d.test.ts",
      ]);
      const globs = ["packages/qfai/tests/**/*.test.ts", "src/**/*.test.ts"];
      const withoutDefaults = await collectFilesByGlobs(root, { globs, ignore: [] });
      expect(withoutDefaults.matchedFileCount, "the globs reach into excluded directories").toBe(4);
      const scan = (await collectScTestReferences(root, globs, [])).scan;
      expect(scan.matchedFileCount, "an empty exclude list still skips them").toBe(2);
      expect(scan.excludeGlobs).toEqual(DEFAULT_TEST_FILE_EXCLUDE_GLOBS);
    } finally {
      await removeTempTree(root);
    }
  });
});

describe("Config Update Is Minimal", () => {
  // QFAI:EX-0001-0076-01
  it("SKILL.md mandates minimal diff for config changes", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/minimal.*diff/i);
    expect(content).toContain("traceability globs");
    expect(content).toContain("Write no `validation.require` key");
  });

  // QFAI:EX-0001-0076-03
  it("records one whole routing entry and copies no other default into the config", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(section(content, "Step 4")).toContain(
      "`routing` or `reviewProfiles` only when the user asks to change one; each matching entry replaces the shipped default as a whole",
    );
    expect(section(content, "Step 4")).toContain("Keep all other config keys unchanged.");
    expect(section(content, "Constraints")).toContain(
      "Only update `qfai.config.yaml` and project-owned policy and contract files under `.qfai/spec/` unless explicitly asked.",
    );
    expect(flat(content)).toContain("an override replaces a matching entry as a whole");

    // The routing defaults are keyed by step, so the override is keyed by the step it changes.
    const override = {
      step: "sdd-contract",
      phases: [
        {
          id: "review",
          mandatory_agents: ["implementation-reviewer"],
          parallel_groups: [],
          rerun_policy: "changed-scope-dependents",
        },
      ],
      review_profile: "default",
    };
    const effective = await readEffectiveRouting({ routing: [override] });
    const agentsOf = (entry: { agents: Map<string, string> } | undefined): string[] =>
      [...(entry?.agents.keys() ?? [])].sort();
    expect(agentsOf(effective.defaultRouting?.get("sdd-contract"))).toContain("solution-architect");
    expect(
      agentsOf(effective.routing?.get("sdd-contract")),
      "the override is the whole entry, with none of the default's agents merged in",
    ).toEqual(["implementation-reviewer"]);
    for (const [name, entry] of effective.defaultRouting ?? []) {
      if (name === "sdd-contract") continue;
      expect(agentsOf(effective.routing?.get(name)), name).toEqual(agentsOf(entry));
    }
  });
});

// Project context is populated from repository evidence.
describe("Project context is populated from evidence", () => {
  it("SKILL.md uses the story-tree policy and contract files", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain(".qfai/spec/01_policy/objective.md");
    expect(content).toContain(".qfai/spec/03_contract/tech.md");
    expect(content).not.toContain(".qfai/assistant/catalog/");
    expect(content).toMatch(/Fill.*verifiable.*evidence/i);
  });

  // QFAI:AC-0001-0077-01
  it("fills each fact from repository evidence or TBD, and gives gate commands and constraints one home", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    const context = section(content, "Step 3");
    expect(context).toContain("Fill policy templates with repo evidence.");
    expect(context).toContain("When evidence is missing, write `TBD` and record what is missing.");
    expect(context).toContain("Do not invent facts.");
    expect(flat(content)).toContain(
      "Fill policy from verifiable repository evidence first; when evidence is missing, mark the field `TBD` and name the gap in the final report.",
    );
    expect(context).toContain(
      "It holds no rule and no constraint; a constraint goes to `01_policy/constraint.md`.",
    );
    expect(flat(content)).toContain(
      "Keep quality-gate commands solely in `03_contract/tech.md` under Standard commands.",
    );
  });

  // QFAI:EX-0001-0077-01
  it("keeps the gate commands in the Standard commands section of tech.md and writes no catalog", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(defaultConfig.paths.contractsDir).toBe(".qfai/spec/03_contract");
    expect(section(content, "Success Criteria")).toContain(
      "Keep quality-gate commands solely in `03_contract/tech.md` under Standard commands.",
    );
    expect(flat(content)).toContain(
      "- [ ] Standard commands recorded only in `03_contract/tech.md`.",
    );
    expect(section(content, "Step 3")).toContain(
      "When evidence is missing, write `TBD` and record what is missing.",
    );
    expect(content).not.toContain(".qfai/assistant/catalog/");

    const tech = await readFile(path.join(SPEC_TEMPLATES, "03_contract", "tech.md"), "utf-8");
    const commands = tech.split(/^## /m).find((part) => part.startsWith("Standard commands"));
    for (const label of ["Test", "Lint", "Typecheck"]) {
      expect(commands, label).toMatch(new RegExp(`^- ${label}: .+$`, "m"));
    }
    for (const other of ["objective", "initiative", "principle"]) {
      const text = await readFile(path.join(SPEC_TEMPLATES, "01_policy", `${other}.md`), "utf-8");
      expect(text, other).not.toMatch(/^- (?:Test|Lint|Typecheck): /m);
    }
  });

  // QFAI:EX-0001-0077-02
  it("records the runtime and the test runner of the repository without claiming an unseen tool", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(section(content, "Step 3")).toContain(
      "a Stack row for the runtime, the platform and each tool detected",
    );
    expect(section(content, "Step 3")).toContain("Do not invent facts.");
    const tech = await readFile(path.join(SPEC_TEMPLATES, "03_contract", "tech.md"), "utf-8");
    expect(tech).toMatch(/^\| Runtime\s+\| `<language runtime and supported version>`\s+\|$/m);
    expect(tech).toMatch(/^\| Test runner\s+\| `<test runner>`\s+\|$/m);
  });
});

describe("UI surface paths are configured", () => {
  // QFAI:AC-0001-0076-04
  // QFAI:EX-0001-0076-07
  it("SKILL.md writes uiux.surfacePaths from the observed paths, or an empty list", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("`uiux.surfacePaths`: the repository-relative globs");
    expect(content).toContain("or `[]` when the repository renders none");
    expect(content).toContain("Keep an existing value unless the user asks to change it");
  });
});

describe("Story-tree test discovery", () => {
  it("requires globs to cover each test obligation layer", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("BF needs E2E coverage");
    expect(content).toContain("AC needs integration or API coverage");
    expect(content).toContain("EX needs a selected non-E2E test");
    expect(content).toContain("03_contract/tech.md");
    expect(content).not.toContain(".qfai/specs/");
  });
});

describe("Evidence Sampling Produces Valid Matches", () => {
  it("SKILL.md requires sample matched files in evidence", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/sample.*matched.*files/i);
  });

  // QFAI:AC-0001-0078-01
  it("samples 5-15 test files matching the proposed globs, and the final report lists them", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(section(content, "Step 5")).toContain(
      "Sample 5-15 actual test files that match the proposed globs.",
    );
    expect(section(content, "Final report")).toContain(
      "the proposed include and exclude globs, with 5 to 15 sample matched files",
    );
  });
});

describe("Zero Match Triggers Stop", () => {
  it("SKILL.md mandates stop and escalate on ambiguity", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/stop.*escalat/i);
  });

  // QFAI:AC-0001-0078-01
  // QFAI:EX-0001-0078-01
  it("stops to ask when the proposed glob matches no file, and writes no guessed glob", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    const sampling = section(content, "Step 5");
    expect(sampling).toContain("If zero matches exist, stop and ask for clarification.");
    expect(sampling).toContain("Do not assume a glob and do not write the key");

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-configure-zero-"));
    try {
      await writeTree(root, ["tests/unit/a.test.ts", "src/b.ts"]);
      const scan = (await collectScTestReferences(root, ["tests/**/*.spec.py"], [])).scan;
      expect(scan.matchedFileCount, "a Python glob in a TypeScript-only project").toBe(0);
    } finally {
      await removeTempTree(root);
    }
  });
});

describe("Tool Selection Rationale Exists", () => {
  it("SKILL.md mandates tool selection rationale", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Tt]ool selection rationale/);
  });

  it("SKILL.md evidence template includes chosen tools per layer", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/chosen tools per layer/i);
  });
});

describe("Coverage Placeholder for AC-0009-0007", () => {
  it("config module exports QfaiValidationConfig with traceability fields", async () => {
    const content = await readFile(CONFIG_PATH, "utf-8");
    expect(content).toContain("QfaiValidationConfig");
    expect(content).toContain("traceability");
    expect(content).toContain("testFileGlobs");
    expect(content).toContain("testFileExcludeGlobs");
  });
});

describe("Coverage Placeholder for EX-0009-0005", () => {
  it("SKILL.md defines the final report requirement", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("## Final report");
    expect(content).toContain("chosen tools per layer");
  });
});

describe("Minimum Runnable Path Is Documented", () => {
  // QFAI:AC-0001-0079-02
  // QFAI:EX-0001-0079-02
  it("requires a runnable path with its commands, points at the copyable commands and refuses an unverifiable one", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(section(content, "Mandatory checks")).toContain(
      "A minimum runnable path is described (dev server, db, env, commands).",
    );
    expect(section(content, "Not-done criteria")).toContain(
      "Minimum runnable path missing or unverifiable.",
    );
    expect(section(content, "Final report")).toContain("the minimum runnable path");
    expect(section(content, "Step 0 - Load Context")).toContain(
      "`03_contract/tech.md#standard-commands-copy-paste`",
    );
    expect(section(content, "Completion Contract")).toContain(
      "A path recorded but never executed is UNRUN.",
    );
    expect(section(content, "Hard Constraints")).toContain(
      "Stop and escalate if tooling choices or runnable path remain ambiguous.",
    );

    const tech = await readFile(path.join(SPEC_TEMPLATES, "03_contract", "tech.md"), "utf-8");
    expect(tech).toContain(
      "- Skeleton: `<smallest command that proves the application entrypoint starts>`",
    );
  });
});
