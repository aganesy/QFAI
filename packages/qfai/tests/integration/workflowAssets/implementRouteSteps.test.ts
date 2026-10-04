/**
 * Integration: the `qfai-implement` steps the routes add, the diagnosis verdicts, and the surface
 * alignment `implement-tdd` takes on.
 *
 * Reads the shipped `STEP.md` files, the skill that lists them and the routing defaults. What the
 * workflow core accepts from a result is not this module's.
 */
import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { readEffectiveRouting, stepReview } from "../../../src/core/validators/agentDefinition.js";
import {
  flat,
  frontMatterOf,
  readShipped,
  rowOf,
  sectionOf,
  skillSteps,
} from "../../helpers/shippedAssistant.js";

/** Each step the routes add to `qfai-implement`, with the review profile it carries: none of its own. */
const ROUTE_STEPS: Record<string, string> = {
  "implement-bisect": "default",
  "implement-revert": "default",
  "implement-minimize": "default",
  "implement-stress-harness": "default",
  "implement-oracle-parity": "default",
  "implement-benchmark": "default",
  "implement-refactor": "default",
  "implement-retire": "default",
  "implement-sweep": "default",
  "implement-quarantine": "default",
  "implement-dep-bump": "default",
  "implement-tooling": "default",
  "implement-backport": "default",
};

const VERDICTS = [
  "missing-test",
  "defective-test",
  "regression",
  "expectation-differs",
  "as-specified",
  "not-ours",
  "duplicate",
  "needs-info",
  "surface-conflict",
  "check-gap",
  "product-race",
];

async function stepText(name: string): Promise<string> {
  const text = await readShipped(`step/${name}/STEP.md`);
  expect(text, `${name} is shipped`).not.toBe("");
  return text;
}

describe("the steps the routes add to qfai-implement", () => {
  // QFAI:AC-0001-0200-02
  // QFAI:EX-0001-0200-02
  it("lists each one, owned by qfai-implement, with its review profile routed", async () => {
    const owned = await skillSteps("qfai-implement");
    const skill = await readShipped("skill/qfai-implement/SKILL.md");
    const effective = await readEffectiveRouting(defaultConfig);
    for (const [name, profile] of Object.entries(ROUTE_STEPS)) {
      expect(owned, name).toContain(name);
      expect(rowOf(skill, `| \`${name}\``), name).toContain(`.qfai/assistant/step/${name}/STEP.md`);
      const front = frontMatterOf(await stepText(name));
      expect([front.name, front.owner, front["routing-profile"]], name).toEqual([
        name,
        "qfai-implement",
        profile,
      ]);
      expect(stepReview(effective, name).profile, name).toBe(profile);
    }
  });

  // QFAI:AC-0001-0200-02
  // QFAI:EX-0001-0200-02
  it("changes no tracked file in the steps that only observe", async () => {
    for (const name of ["implement-bisect", "implement-minimize", "implement-benchmark"]) {
      const written = flat(sectionOf(await stepText(name), "## What it writes"));
      expect(written, name).toMatch(/the step changes no file git tracks/i);
      expect(written, name).toMatch(/the stage report holds/i);
    }
    for (const name of ["implement-stress-harness", "implement-oracle-parity"]) {
      expect(flat(await stepText(name)), name).toMatch(/the step changes no production code/i);
    }
  });

  // QFAI:AC-0001-0200-02
  // QFAI:EX-0001-0200-02
  it("states each step's own obligation", async () => {
    const bisect = flat(await stepText("implement-bisect"));
    expect(bisect).toMatch(/report `branch: \{ outcome: "revert" \}` when all three hold/i);
    expect(bisect).toMatch(/run `git bisect reset`/i);

    const refactor = flat(await stepText("implement-refactor"));
    expect(refactor).toMatch(/adds no example and runs no RED/i);
    expect(refactor).toMatch(/what a test asserts does not change/i);
    expect(refactor).toMatch(/outcome: "behaviour-change", route: "change-compatibility"/);

    const retire = flat(await stepText("implement-retire"));
    expect(retire).toMatch(/add no test asserting that the mechanism is gone/i);

    const sweep = flat(await stepText("implement-sweep"));
    expect(sweep).toMatch(/record it in the check's baseline with the reason/i);
    expect(sweep).toMatch(/under `gate:user`, put the list of findings/i);

    const quarantine = flat(await stepText("implement-quarantine"));
    expect(quarantine).toMatch(/a recorded number of consecutive passing runs/i);

    const bump = flat(await stepText("implement-dep-bump"));
    expect(bump).toMatch(/such as the `engines` field/i);
    expect(bump).toMatch(/never edit a lockfile by hand/i);

    const tooling = flat(await stepText("implement-tooling"));
    expect(tooling).toMatch(/where the project ships CI to others, record one disposition/i);
    expect(tooling).toMatch(/record it as unverified until the next release/i);

    const backport = flat(await stepText("implement-backport"));
    expect(backport).toMatch(/`git cherry-pick -x`/);
    expect(backport).toMatch(/do not push, merge, tag or publish/i);

    const benchmark = flat(await stepText("implement-benchmark"));
    expect(benchmark).toMatch(/a difference inside the measured spread is no difference/i);
  });
});

describe("implement-diagnose", () => {
  // QFAI:AC-0001-0215-01
  // QFAI:EX-0001-0215-01
  it("gives exactly one verdict from the eleven", async () => {
    const text = await stepText("implement-diagnose");
    for (const verdict of VERDICTS) {
      expect(rowOf(sectionOf(text, "## Procedure"), `| \`${verdict}\``), verdict).not.toBe("");
    }
    const listed = VERDICTS.map((verdict) => `\`${verdict}\``).join(", ");
    expect(flat(text)).toContain(
      `exactly one verdict in \`diagnosis.verdict\`, one of: ${listed};`,
    );
  });

  // QFAI:AC-0001-0215-01
  it("changes no tracked file in read-only mode", async () => {
    const text = await stepText("implement-diagnose");
    const readOnly = flat(sectionOf(text, "## Read-only mode"));
    expect(readOnly).toMatch(/reproduces only by reading and by commands that change nothing/i);
    expect(readOnly).toMatch(/not the operation the request asks a person to run/i);
    expect(flat(sectionOf(text, "## What it writes"))).toMatch(
      /elsewhere, and in read-only mode, the step changes no file git tracks/i,
    );
  });
});

describe("implement-tdd", () => {
  it("aligns the surfaces that do not own the truth and regenerates what is generated", async () => {
    const text = await stepText("implement-tdd");
    const align = flat(sectionOf(text, "## Align the other surfaces"));
    expect(align).toMatch(/assistant text the project ships to others/i);
    expect(align).toMatch(/move each test that pins the old wording or value to the new one/i);
    expect(align).toMatch(/run the project's generation or synchronisation command/i);
    expect(align).toMatch(/change nothing on the surface that owns the truth/i);
  });
});
