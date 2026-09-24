/**
 * `16_Traceability-ledger.md` was listed under `qfai-sdd`'s `## Mandatory
 * Outputs` while the same bullet called it an optional artifact, conditioned it
 * on a linkage that exists only inside the file itself, and cited a
 * `QFAI-TRACE-002` warning that the skill's own `--profile sdd` stop condition
 * never raises (`QFAI-TRACE-*` belongs to the `tdd` gate group).
 *
 * The list is what an agent and the completion reviewer check a run against, so
 * an entry with three defensible readings decides nothing. These tests pin the
 * ledger to an `## Optional Outputs` section, keep it out of the mandatory
 * list, and keep the wording aligned with the two sibling files that already
 * describe the artifact as optional.
 */

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../src/core/config.js";
import { validateTraceabilityIntegrity } from "../../src/core/validators/traceabilityIntegrity.js";
import { removeTempTree } from "../helpers/tempTree.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const RULES = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";
const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/16_Traceability-ledger.md";

const LEDGER = "16_Traceability-ledger.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Body of a `## <heading>` section, up to the next `##` heading. */
const section = (text: string, heading: string): string => {
  const start = text.indexOf(`## ${heading}\n`);
  expect(start, `missing section: ## ${heading}`).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + heading.length + 4);
  const end = rest.indexOf("\n## ");
  return flat(end === -1 ? rest : rest.slice(0, end));
};

describe.each(TREES)("%s", (tree) => {
  it("keeps the optional ledger out of the mandatory list", async () => {
    const mandatory = section(await read(tree, SKILL), "Mandatory Outputs");
    expect(mandatory).not.toContain(LEDGER);
  });

  it("leaves every remaining mandatory entry unconditional", async () => {
    // The defect was one conditional bullet in a list of unconditional ones.
    // `when` / `optional` in this list is what reintroduces it.
    const mandatory = section(await read(tree, SKILL), "Mandatory Outputs");
    expect(mandatory).not.toMatch(/\boptional\b/i);
  });

  it("declares the ledger as an optional layered-spec opt-in", async () => {
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    expect(optional).toContain(`\`spec-*/${LEDGER}\``);
    expect(optional).toContain("opt in per layered spec");
    expect(optional).toContain("A spec without this ledger remains valid");
  });

  it("separates the optional-ledger warning from implementation proof gates", async () => {
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    expect(optional).toContain("`QFAI-TRACE-002` (`warning`) records the opt-out");
    expect(optional).toContain(
      "The `sdd` profile checks ledger shape without requiring implementation or Git proof",
    );
    expect(optional).toContain(
      "the `tdd` and `full` gates compare each obligation with the merge-base copy",
    );
  });

  it("requires a binding for each changed obligation without sweeping unchanged rows", async () => {
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    const rules = flat(await read(tree, RULES));
    expect(optional).toContain(
      "Every changed or new obligation needs an active or explicit planned binding",
    );
    expect(optional).toContain(
      "Missing or ambiguous bindings, failed proof and an unavailable merge-base fail the gate",
    );
    expect(rules).toContain(
      "An unchanged obligation does not make its linked files owe an unrelated edit",
    );
    expect(rules).toContain(
      "a binding that cannot be resolved is ambiguous and fails `QFAI-TRACE-001`",
    );
  });

  it("requires reviewed test proof for an unchanged active implementation", async () => {
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    const rules = flat(await read(tree, RULES));
    const template = flat(await read(tree, TEMPLATE));
    expect(optional).toContain(
      "An unchanged active implementation needs a `Proof` reference to a current, independently reviewed test result",
    );
    expect(rules).toContain("An unchanged file needs one `Proof` TDD ID in that row");
    expect(rules).toContain(
      "match the restored implementation SHA-256 and current RED test manifest/hash",
    );
    expect(rules).toContain("independent `qa-gatekeeper` PASS");
    expect(template).toContain(
      "Missing or ambiguous bindings, failed proof and an unavailable merge-base fail validation",
    );
  });

  it("keeps the refresh obligation for a ledger the spec already opted in to", async () => {
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    const rules = flat(await read(tree, RULES));
    expect(optional).toContain("refresh bindings in the same change as the BR/AC they describe");
    expect(rules).toContain(
      "Authored and refreshed by `/qfai-sdd` in the same change as the BR/AC it links",
    );
  });

  it("points at the shipped template and the reference that owns the rule", async () => {
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    expect(optional).toContain(`templates/specs/spec/${LEDGER}`);
    expect(optional).toContain(
      "references/spec-traceability-rules.md#traceability-ledger-16_traceability-ledgermd",
    );
  });

  it("agrees with the two sibling files that already call the ledger optional", async () => {
    // No third statement of the rule: the reference and the template stay the
    // owners, and both must keep saying `optional`.
    expect(flat(await read(tree, RULES))).toContain("It is **optional**.");
    expect(flat(await read(tree, TEMPLATE))).toContain("This file is **optional**.");
  });

  it("accepts a template-derived planned-only binding and rejects its removal", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-planned-template-"));
    const git = (...args: string[]): void => {
      execFileSync("git", args, { cwd: root, stdio: "ignore" });
    };
    const spec = path.join(root, ".qfai", "specs", "spec-0001");
    const rulePath = path.join(spec, "04_Business-Rules.md");
    const ledgerPath = path.join(spec, LEDGER);
    const config: QfaiConfig = {
      paths: {
        contractsDir: ".qfai/contracts",
        specsDir: ".qfai/specs",
        discussionDir: ".qfai/discussion",
        outDir: ".qfai/out",
        skillsDir: ".qfai/skills",
        promptsDir: ".qfai/prompts",
        srcDir: "src",
        testsDir: "tests",
      },
      validation: {
        failOn: "error",
        require: { specSections: [] },
        testStrategy: {
          maxE2eScenarioRatio: null,
          maxE2eScenarioCount: null,
          forbidTestTodoStubs: false,
          requireLayerTags: false,
          requireSizeTags: false,
        },
        traceability: {
          scMustHaveTest: true,
          testFileGlobs: ["**/*.test.ts"],
          testFileExcludeGlobs: [],
          unknownContractIdSeverity: "warning",
        },
      },
      output: { validateJsonPath: ".qfai/out/validate.json" },
      baseBranch: "main",
    };
    try {
      git("init", "-q", "-b", "main");
      git("config", "user.name", "Fixture");
      git("config", "user.email", "fixture@example.test");
      await mkdir(spec, { recursive: true });
      await writeFile(path.join(spec, "01_Spec.md"), "# Spec\n", "utf-8");
      await writeFile(path.join(spec, "02_User-stories.md"), "# Stories\n", "utf-8");
      await writeFile(
        rulePath,
        "| BR-ID | Rule |\n| --- | --- |\n| BR-0001 | Original rule. |\n",
        "utf-8",
      );
      git("add", ".");
      git("commit", "-qm", "base");
      git("checkout", "-qb", "feature");

      await writeFile(
        rulePath,
        "| BR-ID | Rule |\n| --- | --- |\n| BR-0001 | Changed rule. |\n",
        "utf-8",
      );
      const template = await read(tree, TEMPLATE);
      const ledger = template
        .split(/\r?\n/)
        .filter((line) => !/^\| (?:AC|BR)-0001 \|/.test(line))
        .map((line) =>
          line.startsWith("| src/<module>/<next>.<ext> |")
            ? "| src/planned.ts | absent | BR-0001 | tests/unit/planned.test.ts | File creation |"
            : line,
        )
        .join("\n");
      expect(ledger).toContain("| src/planned.ts | absent | BR-0001 |");
      await writeFile(ledgerPath, ledger, "utf-8");
      git("add", ".");
      git("commit", "-qm", "planned binding");

      const plannedIssues = await validateTraceabilityIntegrity(root, config);
      expect(plannedIssues.filter((issue) => issue.code === "QFAI-TRACE-001")).toEqual([]);

      await writeFile(
        ledgerPath,
        ledger.replace(
          "| src/planned.ts | absent | BR-0001 | tests/unit/planned.test.ts | File creation |",
          "",
        ),
        "utf-8",
      );
      const missingIssues = await validateTraceabilityIntegrity(root, config);
      expect(
        missingIssues.some((issue) => issue.rule === "traceability.integrity.bindingMissing"),
      ).toBe(true);
    } finally {
      await removeTempTree(root);
    }
  });
});
