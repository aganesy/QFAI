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
        requireLayerTags: false,
        requireSizeTags: false,
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

async function seedReviewJsonRaw(root: string, index: number, raw: string): Promise<void> {
  const dir = path.join(
    root,
    ".qfai/evidence/prototyping",
    `iter-${String(index).padStart(2, "0")}`,
  );
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "review.json"), raw, "utf-8");
}

async function seedReviewJson(root: string, index: number, body: unknown): Promise<void> {
  await seedReviewJsonRaw(root, index, JSON.stringify(body));
}

/**
 * The `review.json` an iteration record is a faithful mirror of.
 *
 * Derived from the mirror rather than written out beside it so a case that
 * means to change one field changes exactly that field: a hand-written pair
 * drifts on the fields the case is not about, and every assertion below then
 * passes for the wrong reason.
 */
function reviewFrom(
  iter: {
    index: number;
    scores: Record<string, string>;
    proseCritique: string;
    layoutAntiPatternsDetected: readonly string[];
    designMdViolations: readonly { kind: string; found: string }[];
    pivotDirective: string;
    evidenceRefs: { screenshot: string; html: string };
  },
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    iterIndex: iter.index,
    reviewerId: "product-surface-reviewer",
    scores: iter.scores,
    proseCritique: iter.proseCritique,
    layoutAntiPatternsDetected: iter.layoutAntiPatternsDetected,
    designMdViolations: iter.designMdViolations,
    pivotDirective: iter.pivotDirective,
    evidenceRefs: iter.evidenceRefs,
    ...overrides,
  };
}

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
    const iter = { ...validIter(0), proseCritique: japaneseCritique };
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [iter],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, reviewFrom(iter));
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
    const first = validIter(0);
    const second = validIter(1, true);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [first, second],
      acceptedIterationIndex: 1,
      stopReason: "axes-exceptional",
    });
    // A record whose reviewer artifacts are absent is no longer valid: the
    // mirror is a transcription, and there is nothing on disk it transcribes.
    await seedReviewJson(root, 0, reviewFrom(first));
    await seedReviewJson(root, 1, reviewFrom(second));
    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues).toEqual([]);
  });
});

/**
 * The reviewer-deliverable gate on `iter-NN/review.json`.
 *
 * Every case here mutates the reviewer's file and leaves the mirror in
 * `prototyping.json` alone, or the reverse — which is the point. Before
 * this gate existed, only the mirror was read, so each of these
 * returned `error=0`: a deleted `review.json`, an invented `lap-*`
 * code, an out-of-enum score, and a mirror that disagreed with the
 * reviewer's own file.
 */
describe("validatePrototypingEvidence — iter-NN/review.json", () => {
  it("emits QFAI-PROT-002 when a reviewed iteration has no review.json", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [validIter(0)],
      acceptedIterationIndex: 0,
      stopReason: null,
    });

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) => i.code === "QFAI-PROT-002" && i.rule === "prototypingEvidence.review.missing",
      ),
    ).toBe(true);
  });

  it("emits QFAI-PROT-002 when review.json is unparseable", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [validIter(0)],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJsonRaw(root, 0, "{not json");

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) => i.code === "QFAI-PROT-002" && i.rule === "prototypingEvidence.review.parse",
      ),
    ).toBe(true);
  });

  // The seed exists precisely because no reviewer has run yet. Demanding a
  // reviewer artifact from it would fail every project in the window between
  // `iterate --cycle 0` and the first review.
  it("exempts the cycle-0 seed iteration from the reviewer-deliverable gate", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...validIter(0), reviewerId: "iterate-seed" }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.filter((i) => i.code === "QFAI-PROT-002")).toEqual([]);
  });

  // The exemption is a positive claim, not a default: an iteration naming any
  // other reviewer owes the artifact.
  it("does not extend the seed exemption to another reviewerId", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...validIter(0), reviewerId: "product-surface-reviewer" }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) => i.code === "QFAI-PROT-002" && i.rule === "prototypingEvidence.review.missing",
      ),
    ).toBe(true);
  });

  // The mirror accepts any string here, so this code is invisible on that
  // surface no matter how it is written. Both sides carry the same value, so
  // the only finding available is the registry check on the reviewer's file.
  it("emits QFAI-PROT-002 for a lap-* code no registry entry declares", async () => {
    const root = await newTempDir();
    const iter = validIter(0, false, ["lap-999-not-a-real-code"]);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [iter],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, reviewFrom(iter));

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) =>
          i.code === "QFAI-PROT-002" &&
          i.rule === "prototypingEvidence.review.layoutAntiPatternsDetected.unknownCode" &&
          i.message.includes("lap-999-not-a-real-code"),
      ),
    ).toBe(true);
    expect(issues.some((i) => i.rule === "prototypingEvidence.review.mirrorMismatch")).toBe(false);
  });

  it("accepts every lap-* code the registry declares", async () => {
    const root = await newTempDir();
    const iter = validIter(0, false, ["lap-001-saas-dashboard", "lap-008-no-back-affordance"]);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [iter],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, reviewFrom(iter));

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.filter((i) => i.code === "QFAI-PROT-002")).toEqual([]);
  });

  it("emits QFAI-PROT-002 for wrong-enum review.json fields", async () => {
    const root = await newTempDir();
    const iter = validIter(0);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [iter],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(
      root,
      0,
      reviewFrom(iter, {
        designMdViolations: [{ kind: "not-a-kind", found: "x" }],
        pivotDirective: "stop",
        scores: { ...iter.scores, usability: "catastrophic" },
      }),
    );

    const issues = await validatePrototypingEvidence(root, makeConfig());
    const rules = issues.filter((i) => i.code === "QFAI-PROT-002").map((i) => i.rule);
    expect(rules).toContain("prototypingEvidence.review.designMdViolations");
    expect(rules).toContain("prototypingEvidence.review.pivotDirective");
    expect(rules).toContain("prototypingEvidence.review.scores.usability");
  });

  it("emits QFAI-PROT-002 when review.json iterIndex does not match its directory", async () => {
    const root = await newTempDir();
    const iter = validIter(0);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [iter],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, reviewFrom(iter, { iterIndex: 3 }));

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) => i.code === "QFAI-PROT-002" && i.rule === "prototypingEvidence.review.iterIndex",
      ),
    ).toBe(true);
  });

  it("emits QFAI-PROT-002 when review.json omits reviewerId", async () => {
    const root = await newTempDir();
    const iter = validIter(0);
    const review = reviewFrom(iter);
    delete review.reviewerId;
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [iter],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, review);

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) => i.code === "QFAI-PROT-002" && i.rule === "prototypingEvidence.review.reviewerId",
      ),
    ).toBe(true);
  });

  // Both files are internally consistent here. Only comparing them finds the
  // transcription error, which is why neither surface caught it alone.
  it("emits QFAI-PROT-002 when the mirror disagrees with review.json on a score", async () => {
    const root = await newTempDir();
    const iter = validIter(0);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...iter, scores: { ...iter.scores, usability: "strong" } }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, reviewFrom(iter));

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) =>
          i.code === "QFAI-PROT-002" &&
          i.rule === "prototypingEvidence.review.mirrorMismatch" &&
          i.message.includes("scores.usability"),
      ),
    ).toBe(true);
  });

  it("emits QFAI-PROT-002 when the mirror paraphrases proseCritique", async () => {
    const root = await newTempDir();
    const iter = validIter(0);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...iter, proseCritique: `${iter.proseCritique} and-one-more` }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, reviewFrom(iter));

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) =>
          i.code === "QFAI-PROT-002" &&
          i.rule === "prototypingEvidence.review.mirrorMismatch" &&
          i.message.includes("proseCritique"),
      ),
    ).toBe(true);
  });

  // `layoutAntiPatternsDetected` is ordered evidence, so a reordered
  // transcription no longer mirrors the file it cites.
  it("emits QFAI-PROT-002 when the mirror reorders layoutAntiPatternsDetected", async () => {
    const root = await newTempDir();
    const codes = ["lap-001-saas-dashboard", "lap-008-no-back-affordance"];
    const iter = validIter(0, false, codes);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...iter, layoutAntiPatternsDetected: [...codes].reverse() }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, reviewFrom(iter));

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(
      issues.some(
        (i) =>
          i.code === "QFAI-PROT-002" &&
          i.rule === "prototypingEvidence.review.mirrorMismatch" &&
          i.message.includes("layoutAntiPatternsDetected"),
      ),
    ).toBe(true);
  });

  // Key order is not evidence. A transcription that writes the same record
  // with its two declared keys the other way round mirrors it faithfully.
  it("accepts a designMdViolations entry whose keys are written in the other order", async () => {
    const root = await newTempDir();
    const iter = validIter(0);
    const violations = [{ kind: "color", found: "#abcdef" }];
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ ...iter, designMdViolations: [{ found: "#abcdef", kind: "color" }] }],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    await seedReviewJson(root, 0, reviewFrom(iter, { designMdViolations: violations }));

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues.filter((i) => i.code === "QFAI-PROT-002")).toEqual([]);
  });

  it("returns no issues when review.json and the mirror agree", async () => {
    const root = await newTempDir();
    const first = validIter(0);
    const second = validIter(1, true);
    await seedPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [first, second],
      acceptedIterationIndex: 1,
      stopReason: "axes-exceptional",
    });
    await seedReviewJson(root, 0, reviewFrom(first));
    await seedReviewJson(root, 1, reviewFrom(second));

    const issues = await validatePrototypingEvidence(root, makeConfig());
    expect(issues).toEqual([]);
  });
});
