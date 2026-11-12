/**
 * Integration: the discussion stage writes only the run's deliberation record and its
 * `open-questions.md` rows, and a route that ends without `verify-commit` commits only those
 * locally at its last step.
 */
import { describe, expect, it } from "vitest";
import {
  flat,
  frontMatterOf,
  planStageSteps,
  readShipped,
  sectionOf,
} from "../../helpers/shippedAssistant.js";

/** The last step of a built-in plan. */
async function lastStep(route: string): Promise<string | undefined> {
  return (await planStageSteps(route)).flatMap((stage) => stage.steps).at(-1)?.name;
}

const RECORD_ONLY_COMMIT =
  "commit locally only the run's deliberation record and the `open-questions.md` rows the run wrote, and push nothing";

describe("the discussion stage writes the record and open questions only", () => {
  // QFAI:AC-0001-0300-01
  // QFAI:EX-0001-0300-01
  it("writes the record and one open-questions.md row per open question, and nothing else", async () => {
    const skill = flat(
      sectionOf(await readShipped("skill/qfai-discussion/SKILL.md"), "## What the stage writes"),
    );
    expect(skill).toContain(
      "The run's deliberation record, and one `<paths.specsDir>/open-questions.md` row for each question the stage left open.",
    );
    expect(skill).toContain(
      "Nothing else: no other story-tree file, no policy file, no contract and no root `DESIGN.md`.",
    );

    const interview = await readShipped("step/discussion-interview/STEP.md");
    const writes = flat(sectionOf(interview, "## Writes"));
    expect(writes).toContain("The run's deliberation record, under this stage's subheading");
    expect(writes).toContain(
      "One `<paths.specsDir>/open-questions.md` row for each question the stage left open.",
    );
    expect(writes).toContain(
      "No other story-tree file, no policy file, no contract and no root `DESIGN.md`.",
    );
    expect(flat(sectionOf(interview, "## Procedure"))).toContain(
      "Write each question as an Interview row of the record when its answer arrives",
    );

    const research = flat(
      sectionOf(await readShipped("step/discussion-research/STEP.md"), "## Writes"),
    );
    expect(research).toContain("No story-tree file, no policy file and no root `DESIGN.md`.");
  });

  // QFAI:AC-0001-0300-01
  // QFAI:EX-0001-0300-02
  it("records a chosen brand theme as an Interview row and writes no DESIGN.md", async () => {
    expect(flat(await readShipped("skill/qfai-discussion/SKILL.md"))).toContain(
      "A brand theme the user chose is an Interview row of the record;",
    );
    const intake = flat(
      sectionOf(
        await readShipped("skill/qfai-discussion/references/design-dna-intake.md"),
        "## Where the answers go",
      ),
    );
    expect(intake).toContain(
      "Each answer is an Interview row of the run's deliberation record: the chosen theme,",
    );
    expect(intake).toContain(
      "Root `DESIGN.md` is written later, by `/qfai-sdd`'s `common-design-md` step.",
    );
  });

  // QFAI:AC-0001-0195-07
  // QFAI:EX-0001-0195-14
  it("invoked by name, writes the record and runs no review after its last step", async () => {
    const text = await readShipped("skill/qfai-discussion/SKILL.md");
    expect(frontMatterOf(text).requires).toEqual([]);
    expect(flat(sectionOf(text, "## Review"))).toContain(
      "None. The output is a memo, so the skill runs no review after its last step",
    );
    expect(flat(sectionOf(text, "## Completion"))).toContain(
      "Invoked by name, the skill ends after `discussion-interview`: that step commits locally only the run's deliberation record",
    );
    expect(
      flat(sectionOf(await readShipped("step/discussion-interview/STEP.md"), "## Procedure")),
    ).toContain(`Invoked by name, this step is the run's last step: ${RECORD_ONLY_COMMIT}.`);
  });
});

describe("a route that ends without verify-commit commits only the record", () => {
  // QFAI:AC-0001-0301-03
  // QFAI:EX-0001-0301-06
  it("ends decide-design at triage-close, which commits only the record and its open questions", async () => {
    expect(await lastStep("decide-design")).toBe("triage-close");
    const close = await readShipped("step/triage-close/STEP.md");
    expect(flat(sectionOf(close, "## What it writes"))).toContain(
      `As the route's last step, ${RECORD_ONLY_COMMIT}.`,
    );
    expect(flat(sectionOf(close, "## Gate"))).toContain(
      "The local commit holds only the record and those rows, and nothing was pushed.",
    );
  });

  // QFAI:AC-0001-0301-03
  // QFAI:EX-0001-0301-07
  it("ends run-release at triage-operate, which commits only the record after the operation", async () => {
    expect(await lastStep("run-release")).toBe("triage-operate");
    expect(
      flat(sectionOf(await readShipped("step/triage-operate/STEP.md"), "## What it writes")),
    ).toContain(`As the route's last step, after the operation, ${RECORD_ONLY_COMMIT}.`);
    expect(
      flat(sectionOf(await readShipped("step/triage-answer/STEP.md"), "## What it writes")),
    ).toContain(
      "Where no `triage-close` follows, this step is the route's last step: commit locally only the run's deliberation record",
    );
    expect(
      flat(sectionOf(await readShipped("step/verify-release-notes/STEP.md"), "## Writes")),
    ).toContain(
      "Where this step ends the route, it commits locally only the run's deliberation record and the `open-questions.md` rows the run wrote, and pushes nothing.",
    );
  });
});
