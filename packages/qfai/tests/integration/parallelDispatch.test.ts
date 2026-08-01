import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const implementSkillPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

// #232 moved the full allow/deny conditions into
// `references/parallelization-policy.md` (progressive disclosure: SKILL.md has
// a 400-line budget). The policy is still shipped, so these obligations read
// the skill and its reference together.
const parallelPolicyPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "references",
  "parallelization-policy.md",
);

let content: string | undefined;

async function loadContent(): Promise<string> {
  content ??= [
    await readFile(implementSkillPath, "utf-8"),
    await readFile(parallelPolicyPath, "utf-8"),
  ].join("\n");
  return content;
}

// QFAI:SPEC-0011:TC-0011-0016
describe("independent slices dispatched in parallel with integration verify", () => {
  it("defines allow conditions for parallel dispatch", async () => {
    const c = await loadContent();
    expect(c).toMatch(/allow.*condition|allow.*parallel/i);
    // Restated as a concurrent write conflict rather than the existence of a
    // shared thing (#232): a DI container every item constructs afresh must
    // not veto the policy.
    expect(c).toMatch(/write.*same source module|concurrent write conflict/i);
    expect(c).toMatch(/write.*same test module|independent.*test.*file|no shared.*test/i);
    expect(c).toMatch(/mutate.*same fixture|no shared.*state/i);
    expect(c).toMatch(/worktree.*separation|worktree.*branch/i);
    expect(c).toMatch(/integration.*verify/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0017
describe("dependent slices blocked from parallel dispatch", () => {
  it("defines deny conditions that block parallel dispatch", async () => {
    const c = await loadContent();
    expect(c).toMatch(/deny.*condition|block.*parallel/i);
    expect(c).toMatch(/shared.*fixture|shared.*mock|shared.*DI/i);
    expect(c).toMatch(/same.*API.*surface|same.*public.*API/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0018
describe("parallel in same worktree blocked", () => {
  it("requires worktree separation for parallel execution", async () => {
    const c = await loadContent();
    expect(c).toMatch(/worktree.*separation.*required|worktree.*branch.*separation/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0019
describe("integration verify failure rolls back merge", () => {
  it("defines rollback on integration verify failure", async () => {
    const c = await loadContent();
    expect(c).toMatch(/integration.*verify.*fail[\s\S]*?roll.*back|fail[\s\S]*?re.examination/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0020
describe("implementation agent cannot bypass delivery-planner", () => {
  it("states delivery-planner is sole authority for parallel dispatch", async () => {
    const c = await loadContent();
    expect(c).toMatch(/delivery-planner[\s\S]*?sole.*authorit/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0021
describe("single slice degenerates to sequential", () => {
  it("allows single-slice parallel request without error", async () => {
    const c = await loadContent();
    // Default is serial execution for single items
    expect(c).toMatch(/serial.*execution|one.*test.*at.*a.*time/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0029
describe("integration verify pass; sequential flow resumes", () => {
  it("defines return to sequential flow after integration verify passes", async () => {
    const c = await loadContent();
    expect(c).toMatch(/integration.*verify.*pass[\s\S]*?delivery-planner[\s\S]*?sequential/i);
  });
});
