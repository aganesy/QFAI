import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const initAssets = getInitAssetsDir();
const assistant = path.join(initAssets, ".qfai", "assistant");
const sharedRules = path.join(initAssets, "root", ".agents", "rules");

/** A shipped Markdown file with soft wraps collapsed, so a sentence matches across line breaks. */
async function readFlat(...segments: string[]): Promise<string> {
  return (await readFile(path.join(...segments), "utf8")).replace(/\s+/g, " ");
}

/** Every file under a directory, relative and POSIX-separated. */
async function filesUnder(directory: string, prefix = ""): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await filesUnder(directory, relative)));
    else found.push(relative);
  }
  return found.sort();
}

/** Every Markdown file under the assistant tree, templates left out. */
async function assistantMarkdown(): Promise<string[]> {
  return (await filesUnder(assistant)).filter(
    (file) => file.endsWith(".md") && !file.includes("/templates/"),
  );
}

describe("assistant tree placement", () => {
  // QFAI:AC-0001-0012-02
  it("keeps rule detail under rule/references and cites every reference from the tree", async () => {
    const files = await assistantMarkdown();
    const texts = new Map(
      await Promise.all(
        files.map(
          async (file) => [file, await readFile(path.join(assistant, file), "utf8")] as const,
        ),
      ),
    );
    const ruleEntries = await readdir(path.join(assistant, "rule"), { withFileTypes: true });
    for (const entry of ruleEntries) {
      expect(entry.isDirectory() ? entry.name : path.extname(entry.name)).toMatch(
        /^(references|\.md)$/,
      );
    }
    const references = files.filter((file) => /^(rule|skill\/[^/]+)\/references\//.test(file));
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      const name = path.posix.basename(reference);
      const citedBy = files.filter((file) => file !== reference && texts.get(file)?.includes(name));
      expect(citedBy, `${reference} is cited by no other asset`).not.toEqual([]);
      if (reference.startsWith("rule/references/")) {
        expect(
          citedBy.some((file) => /^rule\/[^/]+\.md$/.test(file)),
          `${reference} is cited by no rule`,
        ).toBe(true);
      }
    }
  });
});

describe("test volume follows the scope", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-volume-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function seed(flow: string, stories: Record<string, number>): Promise<void> {
    const flowDir = path.join(root, ".qfai", "spec", "02_business-flow", `business-flow-${flow}`);
    await mkdir(flowDir, { recursive: true });
    await writeFile(path.join(flowDir, "business-flow.md"), `# BF-${flow}: Flow ${flow}\n`);
    for (const [tail, count] of Object.entries(stories)) {
      const storyDir = path.join(flowDir, `user-story-${flow}-${tail}`);
      await mkdir(storyDir, { recursive: true });
      await writeFile(
        path.join(storyDir, "01_User-story.md"),
        `# US-${flow}-${tail}: Story ${tail}\n`,
      );
      const criteria = Array.from({ length: count }, (_, index) => {
        const id = `AC-${flow}-${tail}-${String(index + 1).padStart(2, "0")}`;
        return `# ${id}\nScenario: ${id}\n  Given a case`;
      });
      await writeFile(
        path.join(storyDir, "02_Acceptance-Criteria.md"),
        ["# Acceptance Criteria", "", "```gherkin", ...criteria, "```", ""].join("\n"),
      );
    }
  }

  // QFAI:AC-0001-0067-01
  // QFAI:EX-0001-0067-01
  it("writes one E2E skeleton per flow and one integration skeleton per criterion in scope", async () => {
    await seed("0008", { "0007": 3, "0008": 2 });
    await seed("0009", { "0001": 2 });
    const quiet = { write: () => {}, writeErr: () => {} };
    for (const flowId of ["BF-0008", "BF-0009"]) {
      expect(await runAtddScaffold({ root, flowId, ...quiet })).toBe(0);
    }
    for (const storyId of ["US-0008-0007", "US-0008-0008", "US-0009-0001"]) {
      expect(await runAtddScaffold({ root, storyId, ...quiet })).toBe(0);
    }
    expect((await readdir(path.join(root, "tests", "e2e"))).sort()).toEqual([
      "BF-0008.test.ts",
      "BF-0009.test.ts",
    ]);
    expect(await filesUnder(path.join(root, "tests", "integration"))).toHaveLength(7);
  });
});

describe("reviewer depth and completion", () => {
  // QFAI:AC-0001-0072-01
  // QFAI:EX-0001-0072-01
  it("returns REVISE for a normal-path-only obligation and invents no failure case", async () => {
    const analyst = await readFlat(assistant, "agent", "test-design-analyst.md");
    expect(analyst).toContain(
      "Score normal, error, boundary, special, state transition and combinatorial cases where the active AC, EX, BR or contract makes them meaningful.",
    );
    expect(analyst).toContain("Do not invent a failure case for every row.");
    expect(analyst).toContain(
      "Return REVISE with the ID, missing behavior and owner when a required case is absent",
    );
    const gatekeeper = await readFlat(assistant, "agent", "qa-gatekeeper.md");
    expect(gatekeeper).toContain(
      "Check the normal, failure, boundary, special, state-transition and combinatorial cases the active story and contract make meaningful.",
    );
    expect(gatekeeper).toContain("Return REVISE for an unexplained required gap or weak oracle");
  });

  // QFAI:AC-0001-0157-01
  // QFAI:EX-0001-0157-01
  it("holds the stage until every finding of its one review is fixed or answered", async () => {
    const cycle = await readFlat(assistant, "step", "common-review-cycle", "STEP.md");
    expect(cycle).toContain(
      "No reviewer is rerun. 4. **Complete** once every reviewer has responded and every finding is fixed or answered.",
    );
    const baseline = await readFlat(assistant, "rule", "shared-skill-delegation-baseline.md");
    expect(baseline).toContain(
      "An in-scope blocking finding from a routed reviewer prevents DONE until it is fixed or answered; no reviewer is rerun.",
    );
    const convergence = await readFlat(assistant, "rule", "review-convergence.md");
    expect(convergence).toContain("There is no re-review and no `REVISE` loop.");
  });
});

describe("reviewer prompt calibration", () => {
  // QFAI:AC-0001-0084-01
  // QFAI:EX-0001-0084-01
  it("contrasts an actionable critique with a lenient one and keeps the defect blocking", async () => {
    const prompt = await readFlat(
      assistant,
      "skill",
      "qfai-prototyping",
      "references",
      "reviewer-prompt.md",
    );
    expect(prompt).toContain(
      "Good: on `checkout`, the primary action remains below the fold at the declared mobile width. Record the screen and observable defect, propose moving the action into the visible task path, and keep it in `blockingFindings`",
    );
    expect(prompt).toContain(
      'Bad: record only "navigation looks good" or a favorable score for that same checkout flow while omitting the blocked action.',
    );
    expect(prompt).toContain("A favorable score never hides a blocking finding.");
  });
});

describe("gate commands", () => {
  // QFAI:AC-0001-0091-03
  // QFAI:EX-0001-0091-03
  it("takes the Test command in implement and the other gates in verify from the Standard commands section", async () => {
    const baseline = await readFlat(assistant, "rule", "shared-skill-operating-baseline.md");
    expect(baseline).toContain("**Read them there and nowhere else.**");
    expect(baseline).toContain("**A capability with no entry is UNRUN, not passed.**");
    const tdd = await readFlat(assistant, "step", "implement-tdd", "STEP.md");
    expect(tdd).toContain("Obtain the Test command only from that section.");
    expect(tdd).toContain("Lint, Typecheck and Build run once, in the verify stage.");
    const gates = await readFile(
      path.join(assistant, "step", "verify-repo-gate", "STEP.md"),
      "utf8",
    );
    const entries = [...gates.matchAll(/^\d+\. [^:\n]+: `([^`]+)`\s*$/gm)].map((match) => match[1]);
    for (const command of ["Lint", "Typecheck", "Test", "Build"]) {
      expect(entries).toContain(command);
    }
  });
});

describe("the shipped minimal-implementation rule", () => {
  async function floor(): Promise<string> {
    const rule = await readFile(path.join(sharedRules, "minimal-implementation.md"), "utf8");
    const start = rule.indexOf("## 2. What the ladder never removes");
    const end = rule.indexOf("## 3.", start);
    expect(start).toBeGreaterThan(-1);
    return rule.slice(start, end).replace(/\s+/g, " ");
  }

  // QFAI:AC-0001-0091-05
  // QFAI:EX-0001-0091-06
  it("restates the Article V chain with no TC hop and no execution ledger", async () => {
    const section = await floor();
    expect(section).not.toMatch(/ledger/i);
    expect(section).not.toMatch(/\bTC\b/);
    const arrow = " → ";
    expect(section).toContain(
      ["BF", "US", "AC", "EX", "Tests", "Code", "Verification evidence"].join(arrow),
    );
    const constitution = await readFlat(assistant, "rule", "constitution.md");
    const article = constitution.slice(constitution.indexOf("## Article V"));
    const nouns = [
      "business flow",
      "stories",
      "acceptance criteria",
      "examples",
      "tests",
      "code",
      "verification evidence",
    ];
    const order = nouns.map((noun) => article.indexOf(noun));
    expect(order.every((position) => position > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(section).toContain("Article V");
  });

  // QFAI:AC-0001-0091-05
  it("defines an observation as an example row under the configured specs directory", async () => {
    const rule = (
      await readFile(path.join(sharedRules, "minimal-implementation.md"), "utf8")
    ).replace(/\s+/g, " ");
    expect(rule).toContain(
      "An observed failure has an example in the owning story's `03_Example.md`",
    );
    expect(rule).toContain("Resolve `paths.specsDir` from `qfai.config.yaml`");
  });
});

describe("verify context loading", () => {
  // QFAI:AC-0001-0158-02
  // QFAI:EX-0001-0158-02
  it("reads the spec tree, contracts and policy from the configured directories", async () => {
    const text = await readFile(
      path.join(assistant, "skill", "qfai-verify", "references", "context-load.md"),
      "utf8",
    );
    const config: Record<string, string> = {
      "<paths.specsDir>": "docs/specs",
      "<paths.contractsDir>": "docs/contracts",
    };
    const resolved = [...text.matchAll(/`([^`\s]+)`/g)]
      .map((match) => match[1] ?? "")
      .filter((value) => value.startsWith("<paths.") && value.includes("/"))
      .map((value) =>
        Object.entries(config).reduce((acc, [key, dir]) => acc.replace(key, dir), value),
      );
    expect(resolved).toEqual([
      "docs/specs/01_policy/objective.md",
      "docs/specs/01_policy/initiative.md",
      "docs/specs/01_policy/principle.md",
      "docs/contracts/tech.md",
      "docs/specs/02_business-flow/",
      "docs/contracts/",
      "docs/specs/decisions.md",
    ]);
    expect(text).not.toMatch(/\.qfai\/(specs?|contracts?)\b/);
    expect(text).not.toContain("catalog");
  });
});
