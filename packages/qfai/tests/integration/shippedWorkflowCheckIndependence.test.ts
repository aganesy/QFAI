/**
 * Integration: the delivered document and validation lanes run their checks independently and
 * require a complete result (spec-0003)
 *
 * `TC-0003-0056` covers `qfai-docs.yml` and `TC-0003-0057` covers `qfai-validate.yml`. For each,
 * the checks run as native matrix jobs that neither fail fast nor tolerate a failure, the external
 * check name stays on an aggregate that always runs, and that aggregate, executed under bash, is
 * green only on a complete result. Both cases declare `Level: integration`, so their tests live
 * under `<testsDir>/integration/**` (`catalog/test-layers.md`, `QFAI-ATDD-112`).
 *
 * Every assertion reads the tree `runInit` writes into a temporary directory, never
 * `assets/init/**`: the copy between the two can drop or alter a file, and a test of the packaged
 * source would not notice. One init serves the whole file.
 */
import { afterAll, describe, expect, it } from "vitest";

import { deliveredWorkflowTree, runStep } from "../helpers/deliveredWorkflowTree.js";
import { collectJobSteps, isRecord } from "../helpers/shippedWorkflowFixtures.js";

const VALIDATE = "qfai-validate.yml";
const DOCS = "qfai-docs.yml";

const delivered = deliveredWorkflowTree("qfai-int-check-independence-");
const { project, jobsOf } = delivered;

afterAll(() => delivered.cleanup());

/**
 * The condition a shipped lane carries that is not about the adopter's opt-in.
 *
 * A closed pull request starts a run in the same concurrency group as the one
 * its last push left running, which cancels it; every lane that costs a runner
 * then declines the work, so the close allocates a queued run and no minutes.
 */
const CLOSE_GATE = "${{ github.event.action != 'closed' }}";

/** What an aggregate declares: `always()` outlives the cancellation, so it declines too. */
const ALWAYS_UNLESS_CLOSED = "${{ always() && github.event.action != 'closed' }}";

describe("delivered document checks run independently and require a complete result", () => {
  // QFAI:SPEC-0003:TC-0003-0056
  it("TC-0003-0056 (TDD-0058): delivers both isolated native matrix units without changing checker commands", async () => {
    const jobs = await jobsOf(DOCS);
    const checks = jobs[`${DOCS}#checks`];
    expect(checks, "the delivered docs workflow has no independent check matrix").toBeDefined();
    // The one job the checks wait on is their scope: it reads the name-only
    // diff and says whether anything a document check reads changed.
    expect(checks?.["needs"]).toBe("scope");
    // The scope's answer, and the close gate. Neither is an opt-in, so the
    // lane is still one whose opt-out is deletion — it runs in every
    // repository whose change can reach it.
    expect(checks?.["if"]).toBe(
      "${{ needs.scope.outputs.run == 'true' && github.event.action != 'closed' }}",
    );
    expect(checks?.["continue-on-error"]).toBeUndefined();
    const strategy = checks?.["strategy"];
    expect(isRecord(strategy)).toBe(true);
    if (!isRecord(strategy)) throw new Error("document checks have no strategy");
    expect(strategy["fail-fast"]).toBe(false);
    expect(strategy["max-parallel"]).toBeUndefined();
    expect(strategy["matrix"]).toEqual({ check: ["shape", "mermaid"] });
    const checkerSteps = collectJobSteps(checks ?? {}).filter((step) =>
      /node node_modules\/qfai\/assets\/scripts\/check-(?:mdschema|mermaid)\.mjs/.test(
        String(step["run"] ?? ""),
      ),
    );
    expect(
      checkerSteps.map((step) => ({
        commands: String(step["run"] ?? "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.startsWith("node ")),
        if: step["if"],
      })),
    ).toEqual([
      {
        commands: [
          "node node_modules/qfai/assets/scripts/check-mdschema.mjs --scope all --summary",
        ],
        if: "matrix.check == 'shape'",
      },
      {
        commands: ["node node_modules/qfai/assets/scripts/check-mermaid.mjs"],
        if: "matrix.check == 'mermaid'",
      },
    ]);
    for (const step of checkerSteps) expect(step["continue-on-error"]).toBeUndefined();
  });

  // QFAI:SPEC-0003:TC-0003-0056
  it("TC-0003-0056 (TDD-0059): keeps the existing external check name and always runs its matrix aggregate", async () => {
    const docs = (await jobsOf(DOCS))[`${DOCS}#docs`];
    expect(docs?.["name"]).toBe("qfai docs (document shape and Mermaid syntax)");
    expect(docs?.["needs"]).toEqual(["scope", "checks"]);
    expect(docs?.["if"]).toBe(ALWAYS_UNLESS_CLOSED);
    expect(docs?.["permissions"]).toEqual({});
    expect(docs?.["continue-on-error"]).toBeUndefined();
    expect(collectJobSteps(docs ?? {}).some((step) => step["uses"] !== undefined)).toBe(false);
  });

  it.each(["success", "failure", "cancelled", "timed_out", "skipped", "unknown", ""])(
    "executes the delivered aggregate for matrix result %j",
    async (result) => {
      const docs = (await jobsOf(DOCS))[`${DOCS}#docs`];
      const verdict = collectJobSteps(docs ?? {}).find((step) =>
        String(step["run"] ?? "").includes("CHECK_RESULT"),
      );
      expect(verdict, "the delivered docs workflow has no executable aggregate").toBeDefined();
      expect(verdict?.["env"]).toEqual({
        CHECK_RESULT: "${{ needs.checks.result }}",
        DOCS_SCOPE: "${{ needs.scope.outputs.run }}",
      });
      // With no scope in hand, only a success is green: a skip nobody can
      // account for is not a skip the scope asked for.
      const executed = await runStep(String(verdict?.["run"] ?? ""), await project(), {
        CHECK_RESULT: result,
      });
      expect(executed.skipped, "bash must execute the delivered aggregate").toBe(false);
      expect(executed.status).toBe(result === "success" ? 0 : 1);
    },
  );

  it.each([
    ["skipped", "false", 0],
    ["skipped", "true", 1],
    ["failure", "false", 1],
    ["success", "false", 0],
  ] as const)(
    "executes the delivered aggregate for matrix result %j under scope %j",
    async (result, scope, status) => {
      // The one green skip is the one the scope asked for. A skip while the
      // scope said a document changed is a lane that should have run and did
      // not, and a failure is a failure whatever the scope said.
      const docs = (await jobsOf(DOCS))[`${DOCS}#docs`];
      const verdict = collectJobSteps(docs ?? {}).find((step) =>
        String(step["run"] ?? "").includes("CHECK_RESULT"),
      );
      const executed = await runStep(String(verdict?.["run"] ?? ""), await project(), {
        CHECK_RESULT: result,
        DOCS_SCOPE: scope,
      });
      expect(executed.skipped, "bash must execute the delivered aggregate").toBe(false);
      expect(executed.status).toBe(status);
    },
  );
});

describe("delivered validation profiles run independently and require a complete result", () => {
  // QFAI:SPEC-0003:TC-0003-0057
  it("TC-0003-0057 (TDD-0060): delivers full validation and PR-only drift in isolated native matrix jobs", async () => {
    const validate = (await jobsOf(VALIDATE))[`${VALIDATE}#validate`];
    expect(validate?.["name"]).toBe("qfai validate check (${{ matrix.profile }})");
    expect(validate?.["needs"]).toBeUndefined();
    // The close gate, and nothing else. It gates on the event rather than on
    // an opt-in, so the lane is still one whose opt-out is deletion — a
    // closed pull request starts a run only to cancel the one its last push
    // left going, and this job declines to spend a runner on it.
    expect(validate?.["if"]).toBe(CLOSE_GATE);
    expect(validate?.["continue-on-error"]).toBeUndefined();
    const strategy = validate?.["strategy"];
    if (!isRecord(strategy))
      throw new Error("the delivered validation workflow has no profile matrix");
    expect(strategy["fail-fast"]).toBe(false);
    expect(strategy["max-parallel"]).toBeUndefined();
    expect(strategy["matrix"]).toEqual({
      profile:
        "${{ fromJSON(github.event_name == 'pull_request' && '[\"full\",\"drift\"]' || '[\"full\"]') }}",
    });
    const profiles = collectJobSteps(validate ?? {}).filter((step) =>
      String(step["run"] ?? "").startsWith("npx qfai validate "),
    );
    expect(profiles).toHaveLength(2);
    expect(
      profiles.map((step) => ({
        tokens: String(step["run"]).split(" "),
        if: step["if"],
      })),
    ).toEqual([
      {
        tokens: ["npx", "qfai", "validate", "--profile", "full", "--fail-on", "error"],
        if: "matrix.profile == 'full'",
      },
      {
        tokens: ["npx", "qfai", "validate", "--profile", "drift", "--fail-on", "error"],
        if: "matrix.profile == 'drift' && github.event_name == 'pull_request'",
      },
    ]);
    for (const step of profiles) expect(step["continue-on-error"]).toBeUndefined();
  });

  // QFAI:SPEC-0003:TC-0003-0057
  it("TC-0003-0057 (TDD-0061): keeps the existing external validation check as an always-run complete verdict", async () => {
    const verdict = (await jobsOf(VALIDATE))[`${VALIDATE}#summary`];
    expect(verdict?.["name"]).toBe("qfai validate (full profile, fail on error)");
    expect(verdict?.["needs"]).toBe("validate");
    expect(verdict?.["if"]).toBe(ALWAYS_UNLESS_CLOSED);
    expect(verdict?.["permissions"]).toEqual({});
    expect(verdict?.["continue-on-error"]).toBeUndefined();
    expect(collectJobSteps(verdict ?? {}).some((step) => step["uses"] !== undefined)).toBe(false);
  });

  it.each(["success", "failure", "cancelled", "timed_out", "skipped", "unknown", ""])(
    "executes the delivered validation verdict for profile result %j",
    async (result) => {
      const verdict = (await jobsOf(VALIDATE))[`${VALIDATE}#summary`];
      const step = collectJobSteps(verdict ?? {}).find((entry) =>
        String(entry["run"] ?? "").includes("PROFILE_RESULT"),
      );
      expect(step, "the delivered validation workflow has no executable aggregate").toBeDefined();
      expect(step?.["env"]).toEqual({ PROFILE_RESULT: "${{ needs.validate.result }}" });
      const executed = await runStep(String(step?.["run"] ?? ""), await project(), {
        PROFILE_RESULT: result,
      });
      expect(executed.skipped, "bash must execute the delivered validation aggregate").toBe(false);
      expect(executed.status).toBe(result === "success" ? 0 : 1);
    },
  );
});
