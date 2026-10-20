/**
 * Integration: the `qfai-triage` stage skill `qfai init` ships and its eleven steps — what the parent
 * lists, what each step's front matter and routing entry carry, and what the shipped text says a
 * request that ends without a change leaves behind.
 */
import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";
import { parseAutopilotPolicy } from "../../../src/core/validators/autopilotPolicy.js";
import { readEffectiveRouting, stepReview } from "../../../src/core/validators/agentDefinition.js";
import {
  flat,
  frontMatterOf,
  readShipped,
  rowOf,
  sectionOf,
  skillSteps,
} from "../../helpers/shippedAssistant.js";

const SKILL = "skill/qfai-triage/SKILL.md";

const TRIAGE_STEPS = [
  "triage-close",
  "triage-answer",
  "triage-investigate",
  "triage-request-info",
  "triage-dedupe",
  "triage-decompose",
  "triage-cluster",
  "triage-security-intake",
  "triage-handoff",
  "triage-owned-cleanup",
  "triage-operate",
];

function step(name: string): Promise<string> {
  return readShipped(`step/${name}/STEP.md`);
}

describe("qfai-triage as a stage skill", () => {
  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-05
  // QFAI:AC-0001-0211-02
  // QFAI:AC-0001-0220-06
  // QFAI:EX-0001-0211-45
  // QFAI:EX-0001-0211-46
  // QFAI:EX-0001-0220-49
  it("lists the eleven triage steps, closing last, and opens its description with its trigger", async () => {
    const steps = await skillSteps("qfai-triage");
    expect([...steps].sort()).toEqual([...TRIAGE_STEPS].sort());
    expect(steps.at(-1)).toBe("triage-close");

    const front = frontMatterOf(await readShipped(SKILL));
    const description = String(front.description);
    expect(description).toMatch(/^Use when invoked by name or handed a QFAI work order\b/);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(description).not.toMatch(/[<>]/);
    expect(Object.keys(front)).not.toContain("disable-model-invocation");
    expect(Object.keys(front)).not.toContain("routing-profile");

    const stepRoles: string[] = [];
    for (const name of steps) {
      const stepFront = frontMatterOf(await step(name));
      expect(stepFront.name, name).toBe(name);
      expect(stepFront.owner, name).toBe("qfai-triage");
      if (Array.isArray(stepFront.roles)) stepRoles.push(...stepFront.roles.map(String));
    }
    const declared = Array.isArray(front.roles) ? front.roles.map(String) : [];
    expect([...new Set(declared)].sort()).toEqual(
      [...new Set(["orchestrator", ...stepRoles])].sort(),
    );
    const cleanup = await step("triage-owned-cleanup");
    const reads = flat(sectionOf(cleanup, "## Reads"));
    expect(reads).toMatch(/user.*(?:current request|standing instruction).*exact cleanup targets/i);
    expect(reads).toMatch(/current task.*created.*owns/i);
    const phases = sectionOf(cleanup, "## Procedure").split(/(?=^\d+\.)/m);
    const authority = flat(phases.find((phase) => /^1\./.test(phase)) ?? "");
    expect(authority).toMatch(/exact targets.*authority.*deleting/i);
    expect(authority).toMatch(/empty artifacts.*ignored paths.*available tool.*not authority/i);
    expect(authority).toMatch(/no tracked deliverable.*need files/i);
    expect(authority).toMatch(/host-managed.*external paths.*outside/i);

    const preflight = flat(phases.find((phase) => /^2\./.test(phase)) ?? "");
    expect(preflight).toMatch(/entire preflight.*every target.*before deleting any/i);
    expect(preflight).toMatch(
      /specific directory beneath.*never.*root itself.*workspace root.*Git metadata/i,
    );
    expect(preflight).toMatch(/Git ignores.*contents.*no tracked file.*inside/i);
    expect(preflight).toMatch(/do not change ignore rules/i);
    expect(preflight).toMatch(/allow only ordinary directories and regular files/i);
    expect(preflight).toMatch(
      /required host deletion permissions.*every target.*before the first deletion/i,
    );
    expect(preflight).toMatch(/read-only permission inspection.*not proof of deletion permission/i);
    expect(preflight).toMatch(
      /missing or unknown permission.*entire cleanup.*without deleting any target/i,
    );
    expect(preflight).toMatch(
      /every descendant.*every path component.*reject.*symbolic links.*junctions.*reparse points.*nested repositories.*special entries/i,
    );
    expect(preflight).toMatch(
      /current-task ownership.*every entry.*no process.*other task.*pending operation.*uses/i,
    );
    expect(preflight).toMatch(/unknown ownership or use stops.*do not terminate processes/i);
    expect(preflight).toMatch(
      /identity.*contents.*detect replacement.*additions.*changes.*before each deletion/i,
    );
    expect(preflight).toMatch(/snapshot tracked contents.*index separately/i);

    const recheck = flat(phases.find((phase) => /^3\./.test(phase)) ?? "");
    expect(recheck).toMatch(/recheck each target.*immediately before deleting/i);
    expect(recheck).toMatch(/stop.*path.*identity.*contents or permissions changed.*unknown/i);
    expect(recheck).toMatch(/literal absolute paths.*one shell/i);
    expect(recheck).toMatch(
      /never.*another shell.*follow links.*disable.*guard.*elevate.*bypass.*host denial/i,
    );

    const deletion = flat(phases.find((phase) => /^4\./.test(phase)) ?? "");
    expect(deletion).toMatch(/delete only.*approved targets/i);
    expect(deletion).toMatch(/denial before deletion.*every target untouched/i);
    expect(deletion).toMatch(
      /failure after deletion began.*stops further work.*removed.*remains.*could not be confirmed/i,
    );
    expect(deletion).toMatch(/do not claim rollback.*completed cleanup.*partial failure/i);

    const verification = flat(phases.find((phase) => /^5\./.test(phase)) ?? "");
    expect(verification).toMatch(/exact targets.*absent.*tracked contents.*index.*starting state/i);
    expect(verification).toMatch(/check fails or cannot run.*unfinished.*remaining targets/i);
    expect(verification).toMatch(/do not record.*cleaned.*start.*closing step.*succeeded/i);
    const writes = flat(sectionOf(cleanup, "## What it writes"));
    expect(writes).toMatch(
      /no tracked file or index entry.*only.*authorized ignored temporary directories/i,
    );
    expect(writes).toMatch(
      /receipt.*stage report.*authority.*ownership evidence.*exact targets.*preflight.*deletion results.*absence checks.*tracked-content.*index comparison/i,
    );
    expect(writes).toMatch(/ignored receipt file stays outside.*deletion targets.*stage report/i);
    expect(flat(sectionOf(cleanup, "## Gate"))).toMatch(
      /every exact target.*absent.*tracked contents.*index.*unchanged.*receipt.*evidence/i,
    );
    expect(flat(sectionOf(cleanup, "## Gate"))).toMatch(
      /missing authority.*uncertain ownership.*unsafe paths.*host denial.*partial failure.*unfinished.*only.*completed gate.*cleaned/i,
    );

    const extractionReference = await readShipped("skill/qfai-run/references/extraction.md");
    const eligibility = flat(
      extractionReference
        .split(/\r?\n\s*\r?\n/u)
        .find((paragraph) => /^For `owned-temporary-cleanup`/.test(paragraph)) ?? "",
    );
    expect(eligibility).toMatch(
      /user.*current request.*standing instruction.*ownership evidence.*exact.*temporary scope.*before setting/i,
    );
    expect(eligibility).toMatch(
      /empty artifacts.*ignored files.*available tools.*prove no authority/i,
    );
    expect(eligibility).toMatch(
      /host-managed.*external paths.*other tasks.*tracked files.*outside/i,
    );
    expect(eligibility).toMatch(/unknown scope.*ownership.*authority.*use.*does not qualify/i);
    expect(flat(sectionOf(cleanup, "## Procedure"))).toMatch(
      /step runs no SDD.*repository-wide gate.*commit.*push/i,
    );
    const close = flat(sectionOf(await step("triage-close"), "## Procedure"));
    expect(close).toMatch(
      /use.*cleaned.*only after.*triage-owned-cleanup.*gate.*absence.*unchanged-content.*index evidence/i,
    );
    expect(close).toMatch(
      /denial.*partial failure.*missing check.*unfinished.*not closed.*cleaned/i,
    );
  });

  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-05
  it("routes each step by name on its own profile and gives the skill no entry", async () => {
    const effective = await readEffectiveRouting(defaultConfig);
    expect(effective.routing?.has("qfai-triage")).toBe(false);
    for (const name of TRIAGE_STEPS) {
      expect(frontMatterOf(await step(name))["routing-profile"], name).toBe("default");
      expect(effective.routing?.has(name), name).toBe(true);
      expect(stepReview(effective, name).profile, name).toBe("default");
      expect(stepReview(effective, name).alwaysRequired, name).toEqual([]);
    }
  });
});

describe("qfai-triage invoked by name", () => {
  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-06
  it("runs the duplicate check and the close for a duplicate question, and ends at its stage", async () => {
    const skill = await readShipped(SKILL);
    const steps = sectionOf(skill, "## Steps");
    expect(rowOf(steps, "| `triage-dedupe`")).toMatch(/may repeat an existing item/);
    expect(rowOf(steps, "| `triage-close`")).toMatch(/Only `triage-security-intake` ran/);
    expect(flat(steps)).toMatch(/Invoked by name, the skill ends at this stage/);
    expect(flat(steps)).toMatch(/starts no other stage and routes no follow-up/);
    expect(flat(sectionOf(skill, "### Reviewer Gate"))).toMatch(
      /A tracked file the stage changed fails the review/,
    );
    expect(flat(sectionOf(skill, "## Completion"))).toMatch(
      /never says a (?:tracked )?change is done/i,
    );

    const policy = parseAutopilotPolicy(skill, "qfai-triage");
    expect(policy.hardRequiredMissing).toEqual([]);
    expect(policy.hardRequiredUnknown).toEqual([]);
    expect(
      parseAutopilotPolicy("## Default Autopilot Policy\n", "qfai-triage").hardRequiredMissing,
    ).toEqual(["triage request"]);

    for (const name of TRIAGE_STEPS) {
      expect(flat(sectionOf(await step(name), "## What it writes")), name).toMatch(
        /No file git tracks|No tracked file or index entry/,
      );
    }
    expect(flat(await step("triage-dedupe"))).toMatch(/does not edit the items it links/);
    const remit = sectionOf(
      await readShipped("rule/references/reviewer-remit.md"),
      "## Reviewer remit",
    );
    expect(rowOf(remit, "`/qfai-triage`")).toMatch(/no tracked file changed/);
  });
});

describe("a question answered without a change", () => {
  // QFAI:AC-0001-0214-01
  // QFAI:EX-0001-0214-01
  // QFAI:EX-0001-0214-11
  // QFAI:EX-0001-0223-08
  it("excludes only the pre-handoff approval record from the route's no-change gate", async () => {
    const gate = flat(sectionOf(await step("triage-close"), "## Gate"));

    expect(gate).toMatch(/\bno tracked file (?:was )?changed by (?:any|a|the) triage step\b/i);
    expect(gate).toMatch(/\bonly (?:exception|exclusion|tracked-file changes allowed)\b/i);
    expect(gate).toMatch(
      /\bthe approval row, if any, that `qfai-run` writes in `decisions\.md` under its step 7\b/i,
    );
    expect(gate).toContain("`decisions.md`");
    expect(gate).toMatch(/`qfai-run`.*\b(?:records|writes)\b.*\bbefore\b.*`triage-handoff`/i);

    for (const name of ["triage-handoff", "triage-close"]) {
      expect(flat(sectionOf(await step(name), "## What it writes")), name).toMatch(
        /No file git tracks/,
      );
    }
    expect(flat(sectionOf(await step("triage-close"), "## What it writes"))).toMatch(
      /when the release change is produced outside this run \(by a release workflow or bot\), the stage report records the release approval with what was approved, who approved it, when, and the chosen option's label, and lists the row as a pending follow-up; the next change that touches `decisions\.md` appends its row/i,
    );
    const handoff = await step("triage-handoff");
    expect(flat(sectionOf(handoff, "## Procedure"))).toMatch(
      /run none of the operation here: no push, publication, tag or change to an account/i,
    );
    expect(flat(sectionOf(handoff, "## Gate"))).toMatch(/nothing was run on their behalf/i);
  });

  // QFAI:AC-0001-0214-01
  // QFAI:EX-0001-0214-01
  it("answers in one triage stage with no verify stage and no review, and never says a change is done", async () => {
    const plan = (await loadBuiltInPlans()).find((each) => each.route === "answer-question");
    expect(
      plan?.stages.map((stage) => [stage.kind, stage.review, stage.steps.map((s) => s.name)]),
    ).toEqual([["triage", undefined, ["triage-investigate", "triage-answer", "triage-close"]]]);

    const close = await step("triage-close");
    expect(rowOf(close, "| `answered`")).toMatch(/The question was answered/);
    expect(flat(sectionOf(close, "## Gate"))).toMatch(/never says a (?:tracked )?change is done/);
    expect(flat(sectionOf(await step("triage-answer"), "## What it writes"))).toMatch(
      /No file git tracks/,
    );
  });

  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-05
  // QFAI:AC-0001-0220-06
  // QFAI:EX-0001-0220-51
  // QFAI:AC-0001-0215-02
  // QFAI:EX-0001-0215-16
  it("runs the named operation, changes no tracked file, and stops at needs-change for a tracked change", async () => {
    const operate = await step("triage-operate");
    const procedure = flat(sectionOf(operate, "## Procedure"));
    expect(procedure).toMatch(/user's own instruction, or a project policy, names the\s*operation/);
    expect(procedure).toMatch(
      /needs a tracked file to change.*report the outcome `needs-change` with an extraction of the request as the change it needs, naming the artifacts that change, so the decision rules route it again/,
    );
    expect(procedure).toMatch(/Change nothing to make the operation pass/);
    expect(procedure).toMatch(
      /List each follow-up in the final report, since no close step follows/,
    );
    expect(flat(sectionOf(operate, "## What it writes"))).toMatch(/No file git tracks/);
    expect(flat(sectionOf(operate, "## Gate"))).toMatch(/no tracked file changed/);
    expect(flat(sectionOf(await readShipped(SKILL), "## Steps"))).toMatch(
      /`triage-operate` +\| Runs the operation the user named on finished work/,
    );
  });

  // QFAI:AC-0001-0220-06
  // QFAI:EX-0001-0220-52
  it("waits for the checks a merge needs and checks the merged result", async () => {
    const procedure = flat(sectionOf(await step("triage-operate"), "## Procedure"));
    expect(procedure).toMatch(/Wait for checks still running before a merge/);
    expect(procedure).toMatch(/Poll no faster than the checks change/);
    expect(procedure).toMatch(
      /A failing check that a rerun does not clear stops the operation as a tracked change it needs/,
    );
    expect(procedure).toMatch(
      /After a merge, check the merged result: the target branch holds the merge commit, and, when the user asked to see them pass or the project's policy requires it, the checks the project runs on that branch pass/,
    );
    expect(procedure).toMatch(
      /A failure there is reported as `needs-change`, naming the merge commit, since the merge itself stands/,
    );
  });

  // QFAI:AC-0001-0220-07
  // QFAI:EX-0001-0220-57
  it("carries out a release only on a quoted delegation, and never tags, publishes or approves it", async () => {
    const operate = await step("triage-operate");
    const release = flat(sectionOf(operate, "## A delegated release"));
    expect(release).toMatch(/runs this step after the user approves the release/);
    expect(release).toMatch(
      /Quote that instruction word for word, with where it came from: this request or an answer the user gave\. Never infer a delegation/,
    );
    expect(release).toMatch(
      /With no instruction to quote, or no version the user named, stop before any operation/,
    );
    expect(release).toMatch(/with the version the user named, never another/);
    expect(release).toMatch(/covers only the version edit stops once that edit is made/);
    expect(release).toMatch(
      /A release edit the documents make by hand is a tracked change: report `needs-change`/,
    );
    expect(release).toMatch(
      /Review the release pull request as the project's review rules say, and merge it only when they allow/,
    );
    expect(release).toMatch(
      /Create or push no tag by hand, publish nothing, and never approve the publication/,
    );
    expect(release).toMatch(/run the checks the release documents name for after it/);
    expect(release).toMatch(
      /Where the release documents make the merge the instruction for the tag, .*merge only when the quoted instruction names the merge or the whole release\. Otherwise stop once the release pull request is open, and hand the merge to the user/,
    );
    expect(release).toMatch(
      /carry the quoted instruction and the named version into that extraction's request/,
    );
    expect(release).toMatch(
      /no release run starts after the merge, stop waiting and report the tag and the publication as the user's pending follow-ups/,
    );
    expect(flat(sectionOf(operate, "## Reads"))).toMatch(/version-discipline\.md/);
    expect(flat(sectionOf(operate, "## Gate"))).toMatch(
      /the delegation is quoted with its source, and that no tag, publication or publication approval came from the agent/,
    );
    expect(flat(sectionOf(await step("triage-handoff"), "## Procedure"))).toMatch(
      /delegates the release to the agent while this step waits.*Quote the instruction word for word with its source, do not report `handed-off`, and list the delegated release as the follow-up for the closing step, which closes the request as `deferred`/,
    );
  });

  // QFAI:AC-0001-0214-02
  // QFAI:EX-0001-0214-03
  it("records a documentation gap the answer shows as a follow-up, and plans nothing for it", async () => {
    expect(flat(sectionOf(await step("triage-answer"), "## Procedure"))).toMatch(
      /such as an option the documentation never mentions, record it as a follow-up for `triage-close`, or for the final report where no close step follows\. Do not fix it here/,
    );
    const close = await step("triage-close");
    const procedure = flat(sectionOf(close, "## Procedure"));
    expect(procedure).toMatch(/a gap in the documentation an answer exposed/);
    expect(procedure).toMatch(/Each follow-up states its goal and the reason it exists/);
    expect(procedure).toMatch(/no step is added to the run for it/);
    expect(flat(sectionOf(close, "## What it writes"))).toMatch(
      /stage report.*outcome.*each follow-up.*goal.*reason/i,
    );
  });
});

describe("a split request", () => {
  // QFAI:AC-0001-0214-06
  // QFAI:EX-0001-0214-08
  it("records each child as a follow-up with its dependencies and routes none of them", async () => {
    const decompose = flat(await step("triage-decompose"));
    expect(decompose).toMatch(
      /state its goal, the reason it exists, and the children it depends on/,
    );
    expect(decompose).toMatch(/Route none of them here/);

    const close = await step("triage-close");
    expect(rowOf(close, "| `split`")).toMatch(/split into child requests/);
    const procedure = flat(sectionOf(close, "## Procedure"));
    expect(procedure).toMatch(/A child that depends on another names that child in its reason/);
    expect(procedure).toMatch(/Route nothing/);
    expect(procedure).toMatch(/no step is added to the run for it/);
    expect(flat(sectionOf(close, "## What it writes"))).toMatch(
      /stage report.*outcome.*each follow-up.*goal.*reason/i,
    );
  });
});
