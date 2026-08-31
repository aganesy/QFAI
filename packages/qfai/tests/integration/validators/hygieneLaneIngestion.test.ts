/**
 * Integration: the Reviewer Gate ingests the two workflow-set lint codes without
 * demanding a justification (TC-0015-0035, TC-0015-0036; AC-0015-0022 /
 * BR-0015-0017).
 *
 * The rule under test is a **recorded temporary divergence**, and the two ways
 * of getting it wrong are what the rows below are shaped around.
 *
 * The first is deriving it. The exemption must be an explicitly enumerated
 * two-member list, not "codes the workflow lane emits" and not "codes the
 * catalog happens not to hold". Both derivations produce today's behaviour and
 * both generalise silently: the first the moment the lane gains a third code,
 * the second the moment anything else is emitted that nobody registered. So the
 * list itself is asserted by membership AND by size, which is also what makes
 * this oracle flip when the registration lands rather than keep passing quietly.
 *
 * The second is weakening the contract. `R-PACK-LOCATION-DRIFT` — error class,
 * script-emitted, a catalog member on exactly the terms the two new codes will
 * eventually join on — carries an empty justification in the SAME report in the
 * row below, and must still be rejected in the same run. A blanket relaxation
 * passes every other assertion here and fails that one.
 */
// QFAI:SPEC-0015:TC-0015-0035
// QFAI:SPEC-0015:TC-0015-0036

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import {
  CATALOG_ADVISORY_FAILING_CODES,
  DEFERRED_CATALOG_REGISTRATION_CODES,
} from "../../../src/core/validators/justificationCatalog.js";
import { validateReviewerJustification } from "../../../src/core/validators/reviewerJustification.js";
import {
  SHAPE_REVIEW_ARTIFACT,
  writeShapeFindingsForReviewerGate,
} from "../shippedWorkflowShape.js";
import type { Issue } from "../../../src/core/types.js";

/** The repository root — this row asserts against the real tree, not a fixture. */
const REPO_ROOT = path.resolve(__dirname, "../../../../..");

const HYGIENE = "R-WORKFLOW-HYGIENE-DRIFT";
const SHIPPED_SHAPE = "R-SHIPPED-WORKFLOW-SHAPE-DRIFT";
/** Error class, script-emitted, and a catalog member — the negative control. */
const CONTROL = "R-PACK-LOCATION-DRIFT";

/**
 * The producers' own `detail` strings, verbatim in the shape each lane emits.
 *
 * They are DISTINCT from every site value in the same fixture, so an assertion that finds
 * one has found the detail rather than a substring of the file, the job or the rule.
 */
const HYGIENE_DETAIL = "carries a condition of its own (if: false), so it can be skipped";
const SHAPE_DETAIL = "expected profile=full, found profile=tdd";

/** Where `writeReport` puts the report, repo-relative and POSIX-separated as the gate reports it. */
const REPORT_REL = ".qfai/review/review-20260822000000000/reviewer-completion.json";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-wfset-ingest-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeReport(findings: readonly unknown[]): Promise<void> {
  const dir = path.join(root, ".qfai", "review", "review-20260822000000000");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "reviewer-completion.json"),
    JSON.stringify({ findings }, null, 2),
    "utf-8",
  );
}

async function run(): Promise<Issue[]> {
  const { config } = await loadConfig(root);
  return validateReviewerJustification(root, config);
}

const forCode = (issues: readonly Issue[], code: string): Issue[] =>
  issues.filter((entry) => entry.code === code);

describe("TC-0015-0035 (TDD-0036): hygiene drift is ingested with its site intact and no justification demanded", () => {
  it("surfaces the lane's file, job and rule, and demands nothing", async () => {
    await writeReport([
      {
        code: HYGIENE,
        // No `justification` key at all — the absent case, which is what a lane
        // that never had one produces. The empty-string case is the row below.
        file: ".github/workflows/ci.yml",
        job: "ci-pass",
        rule: "job-guardrails",
        detail: HYGIENE_DETAIL,
      },
    ]);

    const issues = await run();
    const ingested = forCode(issues, HYGIENE);

    expect(ingested, "the hygiene drift finding was not surfaced at all").toHaveLength(1);
    // Surfaced at the severity the LANE emits it with, which is error class.
    //
    // This row said `info`, with a comment reading "it must not be reported at a severity
    // that fails a run" — a reading `BR-0015-0017` does not support, and review finding [25]
    // measured the cost: `qfai validate --fail-on error` succeeded while holding an ingested
    // lint failure. The BR says the gate "does not re-derive, re-word or re-classify" the
    // payload, that both codes are "declared lint-failure codes in `CLI-WFSET`, i.e. error
    // class", and that what is deferred is rejecting them for an empty `justification:`.
    // Two exemptions were available and only one was granted.
    expect(ingested[0]?.severity).toBe("error");

    // All three fields, each asserted on its own. Joining them into one haystack
    // would let a message carrying two of the three pass.
    const message = ingested[0]?.message ?? "";
    expect(message, "the ingested finding lost the file the lane reported").toContain(
      ".github/workflows/ci.yml",
    );
    expect(message, "the ingested finding lost the job the lane reported").toContain("ci-pass");
    expect(message, "the ingested finding lost the rule name the lane reported").toContain(
      "job-guardrails",
    );

    // …and in the STRUCTURED fields, which is the half that reaches a JSON consumer.
    //
    // Review finding [32]: `file` held the artifact's own path and `rule` the constant
    // `reviewerJustification.ingested`, so `qfai validate --format json` reported a finding
    // about `.qfai/review/**` with no way back to the workflow, and the job was nowhere at
    // all. Every assertion above passed while that was true — a message is not a field.
    expect(
      ingested[0]?.file,
      "`file` must be the lane's file, not the artifact it arrived in",
    ).toBe(".github/workflows/ci.yml");
    expect(ingested[0]?.job, "the lane's job must survive as a field").toBe("ci-pass");
    expect(ingested[0]?.rule, "the lane's rule must survive as a field").toBe("job-guardrails");
    // The artifact is not lost — it moves to where evidence belongs, which is also what
    // keeps `--spec` scoping seeing the path it saw while `file` carried it.
    expect(
      ingested[0]?.relatedFiles ?? [],
      "the artifact the finding arrived in must still be reachable",
    ).toContain(REPORT_REL);
    // And the producer's own account of the violation, which the gate never read at all.
    expect(
      ingested[0]?.message ?? "",
      "the lane said what was wrong; a gate that drops it leaves a site and no finding",
    ).toContain(HYGIENE_DETAIL);

    // …and nothing was rejected FOR ITS JUSTIFICATION. That is the deferral, and it is not
    // the same claim as "nothing failed": the ingested finding above is error class, so the
    // set of error-severity issues is not empty. Asserting emptiness there conflated the two
    // exemptions, which is how the severity downgrade came to look required.
    expect(
      issues.filter((entry) => entry.rule === "reviewerJustification.empty"),
      "an ingested workflow-set code was rejected for its missing justification",
    ).toEqual([]);
  });

  it("has a production producer for BOTH exempt codes, not just the hygiene one", async () => {
    // The exemption list names two codes and the gate is required to ingest both. Review finding
    // on `package.json:19`: only `R-WORKFLOW-HYGIENE-DRIFT` had a producer — the hygiene lane —
    // while `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` appeared in the catalog and in tests and nowhere
    // else, so shape drift reddened `lint:workflow-shape` and reached no reviewer at all.
    //
    // This RUNS each producer into a temp directory rather than inspecting `.qfai/review/**` in
    // the working tree. Measured: the first version asserted the artifacts were present, and CI
    // reddened — the hygiene lane runs in the `lint` job and this suite runs in `test`, on a
    // different checkout, so the file it looked for had never been written there. An assertion
    // about a producer must not depend on which job last happened to run it.
    const outDir = await mkdtemp(path.join(os.tmpdir(), "qfai-producers-"));
    try {
      // 1. The hygiene lane, spawned exactly as `ci:lint` spawns it.
      const laneDir = path.join(outDir, "workflow-hygiene");
      const lane = spawnSync(
        process.execPath,
        [
          path.join(REPO_ROOT, "scripts", "check-workflow-hygiene.mjs"),
          "--root",
          REPO_ROOT,
          "--report-dir",
          laneDir,
        ],
        { encoding: "utf-8" },
      );
      if (lane.error !== undefined) throw lane.error;
      const laneArtifact = await readFile(
        path.join(laneDir, "workflow-hygiene.json"),
        "utf-8",
      ).catch(() => undefined);
      expect(
        laneArtifact,
        "the hygiene lane produced no findings artifact; a code the gate must ingest with no " +
          "producer reaches no reviewer however good the gate is",
      ).toBeDefined();

      // 2. The shape lane, through the writer the shape module owns.
      const shapeDir = path.join(outDir, "shipped-workflow-shape");
      await writeShapeFindingsForReviewerGate(shapeDir, []);
      const shapeArtifact = await readFile(
        path.join(shapeDir, SHAPE_REVIEW_ARTIFACT),
        "utf-8",
      ).catch(() => undefined);
      expect(
        shapeArtifact,
        "the shape gate produced no findings artifact, which is the half that had no producer at all",
      ).toBeDefined();

      // Both in the one shape the gate reads, and both ingestible: the gate scans any `*.json`
      // under `.qfai/review/**` that parses to `{ findings: [...] }`.
      for (const [what, raw] of [
        ["hygiene", laneArtifact],
        ["shape", shapeArtifact],
      ] as const) {
        const parsed: unknown = JSON.parse(raw ?? "null");
        expect(
          Array.isArray((parsed as { findings?: unknown } | null)?.findings),
          `the ${what} artifact must carry a findings array, which is the only shape the gate reads`,
        ).toBe(true);
      }
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
  it("takes the exemption from an enumerated list of exactly two, not from a property", async () => {
    // Membership, asserted as equality. A subset check would accept a list that
    // had grown a third member, which is precisely the generalisation this
    // divergence is recorded as forbidding.
    expect([...DEFERRED_CATALOG_REGISTRATION_CODES].sort()).toEqual(
      [SHIPPED_SHAPE, HYGIENE].sort(),
    );
    // Size, pinned separately and deliberately. This is the deferral itself:
    // when the registration lands, the two move into the catalog and this list
    // empties, and the row is meant to FLIP at that point rather than keep
    // passing while its subject has changed meaning.
    expect(DEFERRED_CATALOG_REGISTRATION_CODES).toHaveLength(2);
    // The divergence is FROM the catalog, so the two must not also be in it —
    // a code in both sets would be exempt and mandatory at once.
    for (const code of DEFERRED_CATALOG_REGISTRATION_CODES) {
      expect(CATALOG_ADVISORY_FAILING_CODES.has(code), `${code} is already registered`).toBe(false);
    }

    // The other half of "enumerated, not derived": a code the workflow-set lint
    // lane could plausibly emit, sharing the prefix and the emitter, is NOT
    // exempt merely for resembling the two. It is unregistered, so it is neither
    // ingested nor rejected — and asserting that is what separates "we listed
    // two" from "we let this family through".
    await writeReport([{ code: "R-WORKFLOW-HYGIENE-UNREGISTERED", justification: "" }]);
    expect(forCode(await run(), "R-WORKFLOW-HYGIENE-UNREGISTERED")).toEqual([]);
  });
});

describe("TC-0015-0036 (TDD-0037): shipped-shape drift with an empty justification is ingested, and the control still fails", () => {
  it("ingests the exempt code and rejects the catalog member in the same run", async () => {
    // One report, both findings, one run. Same-run is load-bearing: two separate
    // runs would each be satisfied by a global switch thrown one way or the
    // other, and what has to hold is that the two codes are treated differently
    // by the same pass over the same file.
    await writeReport([
      {
        code: SHIPPED_SHAPE,
        justification: "",
        file: "qfai-tests.yml",
        job: "verdict",
        rule: "profile-value",
        detail: SHAPE_DETAIL,
      },
      { code: CONTROL, justification: "   " },
    ]);

    const issues = await run();

    const ingested = forCode(issues, SHIPPED_SHAPE);
    expect(ingested, "shipped-shape drift with an empty justification was dropped").toHaveLength(1);
    expect(ingested[0]?.severity).toBe("error");
    expect(ingested[0]?.message ?? "").toContain("qfai-tests.yml");
    expect(ingested[0]?.message ?? "").toContain("verdict");
    expect(ingested[0]?.message ?? "").toContain("profile-value");
    expect(ingested[0]?.file).toBe("qfai-tests.yml");
    expect(ingested[0]?.job).toBe("verdict");
    expect(ingested[0]?.rule).toBe("profile-value");
    expect(ingested[0]?.message ?? "").toContain(SHAPE_DETAIL);

    // The control finding is NOT given a job by the gate: nothing reported one, and a
    // synthesized field would read as a value a producer supplied.
    expect(forCode(issues, CONTROL)[0]?.job).toBeUndefined();

    const rejected = forCode(issues, CONTROL);
    expect(
      rejected,
      "the negative control was not rejected — the exemption is a blanket weakening",
    ).toHaveLength(1);
    expect(rejected[0]?.severity).toBe("error");
    // Whitespace-only, not just empty: the control's justification is three
    // spaces, so a check that only tested `=== ""` would let it through.
    expect(rejected[0]?.message ?? "").toContain("non-empty justification");
  });
});
