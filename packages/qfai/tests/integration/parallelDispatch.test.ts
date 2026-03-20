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

let content: string | undefined;

async function loadContent(): Promise<string> {
  content ??= await readFile(implementSkillPath, "utf-8");
  return content;
}

// QFAI:SPEC-0016:TC-0016-0016
describe("independent slices dispatched in parallel with integration verify", () => {
  it("defines allow conditions for parallel dispatch", async () => {
    const c = await loadContent();
    expect(c).toMatch(/allow.*condition|allow.*parallel/i);
    expect(c).toMatch(/independent.*SUT|independent.*source/i);
    expect(c).toMatch(/independent.*test.*file|no shared.*test/i);
    expect(c).toMatch(/no shared.*state/i);
    expect(c).toMatch(/worktree.*separation|worktree.*branch/i);
    expect(c).toMatch(/integration.*verify/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0017
describe("dependent slices blocked from parallel dispatch", () => {
  it("defines deny conditions that block parallel dispatch", async () => {
    const c = await loadContent();
    expect(c).toMatch(/deny.*condition|block.*parallel/i);
    expect(c).toMatch(/shared.*fixture|shared.*mock|shared.*DI/i);
    expect(c).toMatch(/same.*API.*surface|same.*public.*API/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0018
describe("parallel in same worktree blocked", () => {
  it("requires worktree separation for parallel execution", async () => {
    const c = await loadContent();
    expect(c).toMatch(/worktree.*separation.*required|worktree.*branch.*separation/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0019
describe("integration verify failure rolls back merge", () => {
  it("defines rollback on integration verify failure", async () => {
    const c = await loadContent();
    expect(c).toMatch(/integration.*verify.*fail[\s\S]*?roll.*back|fail[\s\S]*?re.examination/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0020
describe("TDDImplementer cannot bypass ParallelSliceDispatcher", () => {
  it("states ParallelSliceDispatcher is sole authority for parallel dispatch", async () => {
    const c = await loadContent();
    expect(c).toMatch(/ParallelSliceDispatcher[\s\S]*?sole.*authorit/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0021
describe("single slice degenerates to sequential", () => {
  it("allows single-slice parallel request without error", async () => {
    const c = await loadContent();
    // Default is serial execution for single items
    expect(c).toMatch(/serial.*execution|one.*test.*at.*a.*time/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0029
describe("integration verify pass; sequential flow resumes", () => {
  it("defines return to sequential flow after integration verify passes", async () => {
    const c = await loadContent();
    expect(c).toMatch(
      /integration.*verify.*pass[\s\S]*?sequential|pass[\s\S]*?TDDCycleController/i,
    );
  });
});
