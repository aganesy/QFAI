/**
 * E2E: the route an adopter has to notice a fixed template never reached them (spec-0006)
 *
 * `qfai init` copies the shipped workflows create-only — `force: false`, `conflictPolicy: "skip"`
 * — so an installed `.github/workflows/qfai-*.yml` is never refreshed, not even by
 * `qfai init --force` (asserted from the other side in
 * `tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`). `US-0006-0011` is the non-destructive
 * compensation for that premise: `qfai doctor` compares what is installed against the copy inside
 * the installed package and TELLS the adopter, naming the stale path and the manual repair.
 *
 * The integration rows beside `tests/integration/spec0006WorkflowsIntegrity.*.test.ts` own the deep
 * oracles — the discriminated file state, the provenance gate, the exact repair sentence, the
 * advisory bucket. They read `createDoctorData()`'s structured check list.
 *
 * What none of them reads is the surface the story is about: **what an adopter sitting in their own
 * repository actually sees.** That is `qfai doctor --format text` over a tree produced by a real
 * `qfai init`, and the two propositions it carries are that the advisory is legible there at all and
 * that it does not fail the command — an `info` route that exited non-zero would be a breaking
 * change dressed as a notification. Both are invisible to a structured-data assertion.
 *
 * The last row is the control. Without it every assertion here is also satisfied by a doctor that
 * prints the drift advisory unconditionally.
 */
import { describe, expect, it } from "vitest";

import { shippedWorkflowsDir } from "../helpers/shippedWorkflowFixtures.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  editShippedWorkflow,
  runDoctorText,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

const STALE = "qfai-tests.yml";
const UNTOUCHED = "qfai-validate.yml";

// QFAI:SPEC-0006:US-0006-0011
describe(
  "E2E: an adopter is told which installed workflow went stale, and doctor still exits 0 (US-0006-0011)",
  { timeout: 120000 },
  () => {
    it("names the stale path and the manual repair in the rendered report", async () => {
      const dir = await pool.seedAdopterTree();
      await editShippedWorkflow(dir, STALE);

      const { exitCode, stdout } = await runDoctorText(dir);

      // The rendered line, not the structured check: the text renderer prints
      // `[severity] id: message`, so this is simultaneously the id, the bucket and the fact that
      // the advisory reached a human at all.
      expect(stdout, "the drift advisory is not rendered in the text report").toMatch(
        /^\[info\] workflows\.integrity:/m,
      );

      // The path an adopter has to act on, spelled the way their tree spells it.
      expect(stdout, "the report does not name the stale file").toContain(
        `${ADOPTER_WORKFLOWS_DIR}/${STALE}`,
      );
      // …and only that file. A report that listed the whole installed set would satisfy a
      // `toContain` while telling the adopter nothing about which file moved.
      expect(stdout, "the report implicates a workflow that was never edited").not.toContain(
        `${ADOPTER_WORKFLOWS_DIR}/${UNTOUCHED}`,
      );

      // The repair. `toContain` and not the byte-exact pin: the integration row
      // `spec0006WorkflowsIntegrity.repairText.test.ts` owns the whole sentence, and duplicating it
      // here would double the maintenance without adding an oracle. What this level owes is that
      // the two clauses an adopter needs — where the good copy is, and that QFAI will not do it for
      // them — survive into the rendered text.
      expect(stdout, "the report states no repair").toContain(shippedWorkflowsDir());
      expect(stdout, "the report does not say the installed file is left alone").toMatch(
        /never overwritten by QFAI/,
      );

      // An advisory that failed the command would be a breaking change wearing a notification's
      // clothes: every adopter running doctor in CI would go red on a template they never touched.
      expect(exitCode, "an info-severity advisory must not fail doctor").toBe(0);
    });

    it("says nothing about drift on a tree that has not drifted", async () => {
      const dir = await pool.seedAdopterTree();

      const { exitCode, stdout } = await runDoctorText(dir);

      // The check still runs and still reports — silence would be indistinguishable from a probe
      // that never fired.
      expect(stdout, "workflows.integrity does not report on a clean tree").toMatch(
        /^\[\w+\] workflows\.integrity:/m,
      );
      // …but it reports the match, not a drift. Without this leg the row above passes against a
      // doctor that prints the advisory for every tree.
      expect(stdout, "a clean tree is reported as drifted").not.toMatch(
        /differ from the packaged copy/,
      );
      expect(stdout, "a clean tree is not reported as matching").toMatch(/match the packaged copy/);
      expect(exitCode).toBe(0);
    });
  },
);
