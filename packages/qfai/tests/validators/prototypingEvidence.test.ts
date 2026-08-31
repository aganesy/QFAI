import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";
import type { QfaiConfig } from "../../src/core/config.js";

const tempDirs: string[] = [];
const VALID_PROSE_CRITIQUE = Array.from(
  { length: 200 },
  (_, index) => `critique-word-${index}`,
).join(" ");

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

function makeConfig(): QfaiConfig {
  return {
    paths: {
      contractsDir: ".qfai/contracts",
      specsDir: ".qfai/specs",
      discussionDir: ".qfai/discussion",
      outDir: ".qfai/out",
      skillsDir: ".qfai/assistant/skills",
      promptsDir: ".qfai/assistant/skills",
      srcDir: "src",
      testsDir: "tests",
    },
    validation: {
      failOn: "error",
      require: { specSections: [] },
      testStrategy: {
        requireApiAtdd: false,
        requireE2eAtdd: false,
        requireIntegrationAtdd: false,
        requireUnitTdd: false,
        requireSpecTagBlock: false,
        requireRoutingProfile: false,
      },
    },
  };
}

async function seedPrototypingJson(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai/evidence/prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "prototyping.json"), JSON.stringify(body), "utf-8");
}

const validIter = (index: number, allExceptional = false, lap: string[] = []) => ({
  index,
  commitSha: "a".repeat(40),
  scores: allExceptional
    ? {
        informationArchitecture: "exceptional" as const,
        navigationFlow: "exceptional" as const,
        usability: "exceptional" as const,
        functionality: "exceptional" as const,
      }
    : {
        informationArchitecture: "acceptable" as const,
        navigationFlow: "acceptable" as const,
        usability: "acceptable" as const,
        functionality: "acceptable" as const,
      },
  proseCritique: VALID_PROSE_CRITIQUE,
  layoutAntiPatternsDetected: lap,
  designMdViolations: [],
  pivotDirective: "continue" as const,
  evidenceRefs: {
    screenshot: `.qfai/evidence/prototyping/iter-${String(index).padStart(2, "0")}/home.png`,
    html: `.qfai/evidence/prototyping/iter-${String(index).padStart(2, "0")}/home.html`,
  },
});

describe("validatePrototypingEvidence", () => {
  it("emits no issues when prototyping.json is missing (silent)", async () => {
    const root = await newTempDir();
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues).toEqual([]);
  });

  it("emits QFAI-PROT-001 when prototyping.json is missing for a UI-bearing prototyping spec", async () => {
    const root = await newTempDir();
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(
      path.join(specDir, "01_Spec.md"),
      "# Prototyping spec\n\nsurface_type: ui-bearing\n",
      "utf-8",
    );

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-PROT-001"]);
  });

  it("emits QFAI-PROT-001 when prototyping.json is unparseable", async () => {
    const root = await newTempDir();
    const dir = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "prototyping.json"), "{not json", "utf-8");
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT-001")).toBe(true);
  });

  it("emits QFAI-PROT-003 when iterations[] is empty", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [],
      acceptedIterationIndex: -1,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT-003")).toBe(true);
  });

  it("emits QFAI-PROT-004 when iterations[i].index is non-contiguous", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [validIter(0), { ...validIter(1), index: 5 }],
      acceptedIterationIndex: 1,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT-004")).toBe(true);
  });

  it("emits QFAI-PROT-005 when stopReason=max-iterations but last index !== 14", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [validIter(0)],
      acceptedIterationIndex: 0,
      stopReason: "max-iterations",
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT-005")).toBe(true);
  });

  it("emits QFAI-PROT-005 when stopReason=axes-exceptional but last iter not all exceptional", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [validIter(0, false)],
      acceptedIterationIndex: 0,
      stopReason: "axes-exceptional",
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT-005")).toBe(true);
  });

  it("emits structured issues instead of throwing when stopReason=axes-exceptional and the last iter is malformed", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [validIter(0), { index: 1, commitSha: "b".repeat(40), scores: null }],
      acceptedIterationIndex: 1,
      stopReason: "axes-exceptional",
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT-002")).toBe(true);
    expect(issues.some((i) => i.code === "QFAI-PROT-005")).toBe(true);
  });

  it("emits QFAI-PROT-002 when a layout anti-pattern is present but informationArchitecture exceeds acceptable", async () => {
    const root = await newTempDir();
    const iter = validIter(0, false, ["lap-001-saas-dashboard"]);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [
        {
          ...iter,
          scores: {
            ...iter.scores,
            informationArchitecture: "strong",
          },
        },
      ],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) =>
          i.code === "QFAI-PROT-002" &&
          i.message.includes("scores.informationArchitecture") &&
          i.message.includes("layoutAntiPatternsDetected"),
      ),
    ).toBe(true);
  });

  it("emits QFAI-PROT-002 when designMdViolations contains a malformed entry", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [
        {
          ...validIter(0),
          designMdViolations: [{ kind: "not-a-real-kind", found: "#abc" }],
        },
      ],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some((i) => i.code === "QFAI-PROT-002" && i.message.includes("designMdViolations")),
    ).toBe(true);
  });

  it("emits QFAI-PROT-002 when proseCritique is outside the 200-500 word range", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...validIter(0), proseCritique: "too short" }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) =>
          i.code === "QFAI-PROT-002" &&
          i.message.includes("proseCritique") &&
          i.message.includes("200-500"),
      ),
    ).toBe(true);
  });

  it("emits no QFAI-PROT-002 when proseCritique is a 600-character Japanese critique", async () => {
    const root = await newTempDir();
    const japaneseCritique = "情報設計と導線は概ね良好である。".repeat(50);
    expect(japaneseCritique.split(/\s+/u).length).toBe(1);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...validIter(0), proseCritique: japaneseCritique }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.filter((i) => i.code === "QFAI-PROT-002")).toEqual([]);
  });

  it("emits QFAI-PROT-002 naming the CJK band when a Japanese proseCritique is too short", async () => {
    const root = await newTempDir();
    const shortJapanese = "情報設計は弱い。".repeat(10);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...validIter(0), proseCritique: shortJapanese }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) =>
          i.code === "QFAI-PROT-002" &&
          i.message.includes("proseCritique") &&
          i.message.includes("characters outside band 600..2500"),
      ),
    ).toBe(true);
  });

  // The character band counts Hiragana / Katakana / Han only, so a Hangul
  // critique is measured on the word path — which is what the shipped
  // reviewer prompt now tells a Korean-writing reviewer to target.
  it("measures a Hangul proseCritique on the word band, not the character band", async () => {
    const root = await newTempDir();
    const koreanCritique = "정보설계와동선은대체로양호하다.".repeat(50);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...validIter(0), proseCritique: koreanCritique }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) => i.code === "QFAI-PROT-002" && i.message.includes("words outside band 200..500"),
      ),
    ).toBe(true);
  });

  it("emits QFAI-PROT-006 when iterations.length > 15", async () => {
    const root = await newTempDir();
    const iters = Array.from({ length: 16 }, (_, i) => validIter(i));
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: iters,
      acceptedIterationIndex: 15,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT-006")).toBe(true);
  });

  it("emits QFAI-PROT-007 when acceptedIterationIndex is not iterations.length-1", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [validIter(0), validIter(1)],
      acceptedIterationIndex: 0, // should be 1
      stopReason: null,
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT-007")).toBe(true);
  });

  it("returns no issues for a valid record", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [validIter(0), validIter(1, true)],
      acceptedIterationIndex: 1,
      stopReason: "axes-exceptional",
    });
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues).toEqual([]);
  });
});
