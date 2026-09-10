/**
 * Integration: `R-AUTOPILOT-POLICY-MISSING` (severity error).
 *
 * - TC-0015-0020: a SKILL.md WITHOUT a `## Default Autopilot Policy`
 *   section makes the validator emit `R-AUTOPILOT-POLICY-MISSING` at
 *   severity error with a non-empty `justification:` naming the
 *   SKILL.md path and the absent section.
 *
 * The detection scans `.qfai/assistant/skills/<id>/SKILL.md` files
 * (qfai-* skill scope, same scoping rule as
 * `validateSkillDocReferences`). Non-qfai user skills are NOT flagged.
 */
// QFAI:SPEC-0015:TC-0015-0020

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateAutopilotPolicy } from "../../../src/core/validators/autopilotPolicy.js";

async function writeSkill(root: string, skillId: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", skillId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), body, "utf-8");
}

const FULL_POLICY = `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage ops (with prompt template)
  - destructive operations
  - version-pin changes
  - scope expansions
- hard-required:
  - companyName
  - brand intent
  - primarySpecId when absent
`;

const NO_POLICY = `# qfai-fixture

## Some Other Section

- bullet
`;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-autopilot-policy-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0015-0020: validateAutopilotPolicy emits R-AUTOPILOT-POLICY-MISSING on missing section", () => {
  it("fires (error) for a qfai-* SKILL.md that lacks ## Default Autopilot Policy", async () => {
    await writeSkill(root, "qfai-fixture", NO_POLICY);
    const issues = await validateAutopilotPolicy(root);
    const findings = issues.filter((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings[0];
    expect(f?.severity).toBe("error");
    // Justification names the SKILL.md path and the absent section.
    expect(f?.message).toMatch(/qfai-fixture\/SKILL\.md/);
    expect(f?.message).toMatch(/Default Autopilot Policy/);
    expect(f?.message).toMatch(/justification/i);
  });

  it("does NOT fire when the SKILL.md carries the full 3-bucket policy", async () => {
    await writeSkill(root, "qfai-fixture", FULL_POLICY);
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toEqual([]);
  });

  it("does NOT fire for non-qfai user skills (scoping rule)", async () => {
    await writeSkill(root, "user-skill", NO_POLICY);
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toEqual([]);
  });

  it("does NOT fire when the skills directory is absent (fresh project)", async () => {
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toEqual([]);
  });

  // Pin the relocated-skillsDir contract. A project that points
  // `config.paths.skillsDir` at a non-default location must still
  // have its qfai-* SKILL.md files scanned by the autopilot policy
  // validator. Pre-fix the validator hardcoded
  // `.qfai/assistant/skills` and silently SKIPped every qfai-*
  // SKILL.md under the configured directory.
  it("scans the configured skillsDir when options.config.paths.skillsDir is set", async () => {
    const { defaultConfig } = await import("../../../src/core/config.js");
    // Seed a qfai-* SKILL.md WITHOUT a policy section under a
    // non-default skillsDir; the validator must find it via the
    // configured path.
    const customSkillsDir = path.join("custom", "skills");
    const customSkillDir = path.join(root, customSkillsDir, "qfai-relocated");
    await mkdir(customSkillDir, { recursive: true });
    await writeFile(path.join(customSkillDir, "SKILL.md"), NO_POLICY, "utf-8");

    const customConfig = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, skillsDir: customSkillsDir },
    };
    const issues = await validateAutopilotPolicy(root, { config: customConfig });
    const finding = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("error");
    // The relPath in the message must point at the actual scan path
    // (forward-slash normalized, root-relative) — NOT the legacy
    // `.qfai/assistant/skills/...` hardcode. Mirrors the
    // staleReferences.ts pattern.
    expect(finding?.message ?? "").toMatch(/custom\/skills\/qfai-relocated\/SKILL\.md/);
    expect(finding?.message ?? "").not.toMatch(
      /\.qfai\/assistant\/skills\/qfai-relocated\/SKILL\.md/,
    );
  });

  it("default-path scanning still works when no config is supplied (legacy single-arg call)", async () => {
    // Sanity check: a single-arg `validateAutopilotPolicy(root)`
    // invocation continues to scan the legacy
    // `.qfai/assistant/skills` location so older tests / callers
    // stay green. This pins the fallback branch.
    await writeSkill(root, "qfai-legacy", NO_POLICY);
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toMatch(/\.qfai\/assistant\/skills\/qfai-legacy\/SKILL\.md/);
  });
});

/**
 * The bucket's CONTENT, not just its header.
 *
 * Before this, `parseAutopilotPolicy` only asked whether a `- hard-required:`
 * line existed, so an installed project whose SKILL.md still listed the retired
 * `companyName` passed `qfai validate` for good: installed skills are refreshed
 * only by an explicit `qfai init --force`, and nothing else read the bucket.
 */
describe("validateAutopilotPolicy checks the hard-required bucket's contents", () => {
  const policyWith = (hardRequired: string): string =>
    `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
- ask-user:
  - destructive operations
- hard-required:
${hardRequired}
`;

  const CANONICAL = "  - brand intent\n  - `primarySpecId` (when absent from inputs)";

  it("stays silent on the bucket the shipped tree ships", async () => {
    await writeSkill(root, "qfai-fixture", policyWith(CANONICAL));
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "QFAI-AUTOPILOT-001")).toEqual([]);
  });

  it("reports the retired entry an installed SKILL.md still carries", async () => {
    await writeSkill(root, "qfai-fixture", policyWith(`${CANONICAL}\n  - companyName`));
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("companyName");
    expect(finding?.severity).toBe("error");
  });

  it("reports a retired entry written beside a pinned one, which a substring test missed", async () => {
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent / companyName\n  - `primarySpecId`"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("brand intent / companyName");
  });

  it("leaves a narrowed bucket alone", async () => {
    // A skill may drop an entry it never reaches. Reporting that would put
    // back a prompt that buys nothing.
    await writeSkill(root, "qfai-fixture", policyWith("  - brand intent"));
    const issues = await validateAutopilotPolicy(root);
    expect(issues.find((i) => i.code === "QFAI-AUTOPILOT-001")).toBeUndefined();
  });

  it("reports an input the skill carrying it does not declare", async () => {
    // The bucket is open at one end only: a skill may hard-require an input of
    // its own, and the declaration is what makes that visible in review.
    // Without it, any name at all passes.
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent\n  - a `testFileGlobs` proposal that matches a real file"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("does not declare");
  });

  it("reports an undeclared input written beside an allowed one", async () => {
    // Asked of the whole bullet, the allowed test passes on `brand intent` and
    // takes whatever shares the line with it — so a bullet joining two names
    // declares an input nothing has approved and reads as clean. Hard-required
    // is the bucket that stops a run, so that is the widening this check is
    // for. Each joined piece answers for itself.
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent / an unreviewed secret\n  - `primarySpecId`"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("an unreviewed secret");
  });

  it("reports an undeclared input written after a dash", async () => {
    // A dash clause was dropped as a qualifier whatever it held, and the two
    // whole-bullet searches beside the allowed test look only for names the
    // policy already knows — retired ones, and ones another skill declares. A
    // name it has never heard of matched neither and was gone from the reduced
    // form, so it reached the bucket that stops a run with nothing reported.
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent — unreviewedSecret\n  - `primarySpecId`"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("unreviewedSecret");
  });

  it("keeps a multi-word dash clause as the qualifier it is", async () => {
    // A qualifier states a condition and reads as prose. One shipped bucket
    // writes exactly this shape, so treating every dash clause as a name would
    // make the tree report itself.
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith(
        "  - brand intent\n  - `primarySpecId` — neither this nor the entry above has a defensible default",
      ),
    );
    const issues = await validateAutopilotPolicy(root);

    expect(issues.find((i) => i.code === "QFAI-AUTOPILOT-001")).toBeUndefined();
  });

  it("keeps a qualifier that holds a joiner as one entry", async () => {
    // A qualifier is prose and may carry a comma or a slash of its own. Split
    // there, one entry would read as several and the bucket every skill ships
    // would report itself.
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent\n  - `primarySpecId` (absent from inputs, and no default)"),
    );
    const issues = await validateAutopilotPolicy(root);
    expect(issues.filter((i) => i.code === "QFAI-AUTOPILOT-001")).toEqual([]);
  });

  it.each(["- hard-required:", "* hard-required:", "  - Hard-Required :"])(
    "finds the bucket opened by `%s` and reads what is nested under it",
    async (header) => {
      // The bucket is located by one pattern and its header's tail read by
      // another. Held together here: a spelling only one of them accepts is a
      // policy located one way and collected another.
      await writeSkill(
        root,
        "qfai-fixture",
        `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
- ask-user:
  - destructive operations
${header}
    - companyName
`,
      );
      const issues = await validateAutopilotPolicy(root);
      const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
      expect(finding?.message ?? "").toContain("companyName");
    },
  );

  it("reads an entry written on the bucket header line", async () => {
    // `- hard-required: companyName` is the header and an entry at once.
    // Read as a header and nothing else, the bucket collected nothing — and an
    // empty bucket is a narrowing this check permits, so the one spelling that
    // hides an entry was the one spelling that reported nothing.
    await writeSkill(
      root,
      "qfai-fixture",
      `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
- ask-user:
  - destructive operations
- hard-required: companyName
`,
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("companyName");
  });

  it("reads a retired entry written in a trailing clause", async () => {
    // A trailing dash clause qualifies one entry, so the reduced form used to
    // compare names drops it. A withdrawn name written there is still written.
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent — companyName\n  - `primarySpecId`"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("companyName");
  });

  it("reads a retired entry written past a wrapped bullet", async () => {
    // The continuation of a wrapped bullet is not itself a bullet. Ending the
    // bucket there dropped the rest of the entry and everything after it.
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent, and\n    companyName\n  - `primarySpecId`"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("companyName");
  });

  it("reads a retired entry written after a blank line", async () => {
    // A hand-edited or reformatted SKILL.md carries blank lines between
    // bullets. Ending the bucket at one made inserting a blank line enough to
    // hide everything below it.
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent\n\n  - companyName\n  - `primarySpecId`"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("companyName");
  });

  it("reads a retired entry written after a comment", async () => {
    await writeSkill(
      root,
      "qfai-fixture",
      policyWith("  - brand intent\n<!-- kept for the next release -->\n  - companyName"),
    );
    const issues = await validateAutopilotPolicy(root);
    const finding = issues.find((i) => i.code === "QFAI-AUTOPILOT-001");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toContain("companyName");
  });

  it("stops at the next bucket rather than reading its bullets", async () => {
    // The bucket still ends somewhere. A bullet belonging to `ask-user` is not
    // a hard-required entry, and reading it would report the wrong bucket.
    await writeSkill(
      root,
      "qfai-fixture",
      `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
- hard-required:
  - brand intent
  - \`primarySpecId\`
- ask-user:
  - companyName
`,
    );
    const issues = await validateAutopilotPolicy(root);
    expect(issues.map((i) => i.code)).toEqual([]);
  });

  it("does not report the bucket twice when the bucket header itself is absent", async () => {
    await writeSkill(
      root,
      "qfai-fixture",
      `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
- ask-user:
  - destructive operations
`,
    );
    const issues = await validateAutopilotPolicy(root);
    expect(issues.map((i) => i.code)).toEqual(["R-AUTOPILOT-POLICY-MISSING"]);
  });
});
