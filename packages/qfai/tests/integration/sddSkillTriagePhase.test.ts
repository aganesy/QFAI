import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";
import { SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(
  here,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
);

async function skill(): Promise<string> {
  return await readFile(path.join(skillRoot, "SKILL.md"), "utf-8");
}

async function triage(): Promise<string> {
  return await readFile(path.join(skillRoot, "references", "sdd-triage.md"), "utf-8");
}

describe("qfai-sdd triage surface", () => {
  it("keeps the skill within the shared size budget", async () => {
    expect((await skill()).split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
  });

  it("locates classification and decomposition at their shipped paths", async () => {
    const content = await readFile(
      path.join(skillRoot, "..", "..", "step", "sdd-triage", "STEP.md"),
      "utf-8",
    );
    expect(content).toContain(".qfai/assistant/rule/change-classification.md");
    expect(content).toContain("references/requirements-decomposition.md");
  });

  it("records triage, rejected choices, retirement, and open questions in the two tables", async () => {
    const content = await triage();
    expect(content).toContain("<paths.specsDir>/decisions.md");
    expect(content).toContain("<paths.specsDir>/open-questions.md");
    expect(content).toContain("ID, Content, Approach, Status");
    expect(content).toContain("retired-story file");
    expect(content).toContain("row at REJECTED is a rejected option");
    expect(content).toContain("only Status may change");
  });

  // QFAI:AC-0001-0007-02
  // QFAI:EX-0001-0007-13
  // QFAI:EX-0001-0007-14
  // QFAI:EX-0001-0007-15
  // QFAI:EX-0001-0007-16
  it("bounds published decision prefix recovery to its approved source and raw cell", async () => {
    const rule = sectionOf(
      await readShipped("rule/drift-protocol.md"),
      "## Published decision prefix recovery",
    );
    expect(rule, "the owner rule must define the recovery before a target can use it").not.toBe("");
    const introduction = flat(rule.split(/\n(?=1\. )/)[0] ?? "");
    expect(introduction).toMatch(/published malformed decision added by the branch/i);
    expect(introduction).toMatch(/protocol.*does not authorize any target/i);
    expect(introduction).toMatch(
      /separate new in-force.*request.*target.*repository-relative file/i,
    );
    const phases = rule
      .split(/\n(?=\d+\. )/)
      .slice(1)
      .map(flat);
    expect(phases).toHaveLength(6);
    const obligations = [
      [0, /explicit base.*unique common ancestor.*HEAD/i],
      [0, /target ID.*absent from both/i],
      [0, /published.*source commit.*ancestor.*HEAD.*unique.*row/i],
      [0, /Inherited records and open-question rows.*excluded/i],
      [1, /single-line valid UTF-8/i],
      [
        1,
        /exactly one ASCII padding space.*each Approach delimiter.*no additional boundary whitespace/i,
      ],
      [1, /SHA-256.*excluding only.*delimiter pipes.*two padding spaces/i],
      [1, /Do not decode escapes, trim text or normalize/i],
      [1, /Ambiguous boundaries.*additional padding.*invalid UTF-8 stop/i],
      [2, /original Residual risk and Rollback.*ordered, nonempty/i],
      [2, /complete original Approach.*byte-identical suffix/i],
      [2, /Preserve.*wording, order, facts, authority and scope/i],
      [2, /prefixed row.*existing form checks/i],
      [3, /target ID.*published source commit.*fixed base.*common ancestor/i],
      [3, /old and new Approach digests.*exact prefix.*actual file evidence.*approval authority/i],
      [3, /old digest.*published source Approach.*new digest.*exact prefix.*source value/i],
      [3, /do not invent.*answer or approval/i],
      [4, /Immediately before writing.*unique current target/i],
      [4, /byte-identical ID, Content and Status.*old Approach digest/i],
      [
        4,
        /Unknown or unavailable provenance.*inherited or duplicate.*stale.*beyond.*prefix stops.*before writing/i,
      ],
      [
        4,
        /Apply only that prefix.*every other row byte-identical.*existing validation without an exemption/i,
      ],
      [5, /removes only the recorded prefix.*current new Approach digest.*matches/i],
      [5, /Otherwise preserve the current row and stop/i],
      [5, /restores the original Approach and its validation failure/i],
      [5, /Do not reset, amend or force push/i],
      [5, /Status changes, supersession.*diagnostic.*no recovery authority.*no form error/i],
      [5, /not an automatic recovery command.*concurrency guarantee/i],
    ] as const;
    for (const [index, obligation] of obligations) expect(phases[index]).toMatch(obligation);
    expect(phases[2]).toContain("`- Evidence: <actual file references> - Grounds: `");
    expect(phases[2]).toMatch(/including its trailing space/i);

    const pointer = ".qfai/assistant/rule/drift-protocol.md#published-decision-prefix-recovery";
    const reference = flat(sectionOf(await triage(), "## Published decision prefix recovery"));
    const request = flat(
      sectionOf(
        await readShipped("skill/qfai-sdd/templates/change-request.md"),
        "## Published decision prefix recovery",
      ),
    );
    const stage = flat(
      sectionOf(await readShipped("step/sdd-triage/STEP.md"), "## Stage 1: triage and records"),
    );
    for (const surface of [reference, request, stage]) {
      expect(surface).toContain(pointer);
      expect(surface).toMatch(
        /(?:separate new target-specific|actual approval covers this specific).*recovery/i,
      );
      expect(surface).toMatch(/ID, Content(?:,)?(?: and)? Status/i);
      expect(surface).toMatch(/(?:pre-write.*checks|before writing.*recheck)/i);
      expect(surface).toMatch(/(?:existing validation|existing form and validation)/i);
      expect(surface).toMatch(/Inherited.*(?:excluded|stop)/i);
    }
    for (const surface of [request, stage])
      expect(surface).toMatch(/(?:diagnostic suggestion|diagnostic.*suggestion).*not authorize/i);
    expect(reference).toMatch(
      /old digest.*original Approach byte.*suffix.*every other row unchanged/i,
    );
    expect(request).toMatch(/old and new SHA-256 Approach digests.*exact.*prefix.*trailing space/i);
    expect(request).toMatch(
      /exclude only delimiter pipes.*exactly one ASCII padding space.*Decode no escapes.*normalize nothing/i,
    );
    expect(request).toMatch(
      /current new digest.*matches.*otherwise.*preserves.*stops.*original validation failure/i,
    );
    expect(stage).toMatch(
      /before any write.*source, base, ancestor, raw cell bytes, digests and exact prefix/i,
    );
    expect(stage).toMatch(
      /entire original suffix.*unknown provenance and stale data stop.*no recovery executor/i,
    );
  });

  it("stops approval-dependent writes in no-question mode", async () => {
    const content = await triage();
    for (const operation of ["CREATE", "DELETE", "SPLIT", "MERGE", "SUPERSEDE", "UPDATE:REMOVE"]) {
      expect(content).toContain(operation);
    }
    expect(content).toContain("In --auto, ask no question");
    expect(content).toContain("stop before the dependent writes");
    expect(content).toContain("report every pending operation with its target");
  });

  it("traces companion changes through contracts", async () => {
    const content = await triage();
    expect(content).toContain("policy → BF → US → AC → EX → enforcing contract");
    expect(content).toContain("other flow or contract");
    expect(content).toContain("authoritative contract");
  });

  it("does not reuse retired IDs", async () => {
    const content = await triage();
    expect(content).toContain("highest plus one");
    expect(content).toContain("including IDs named by retirement rows");
    expect(content).toContain("Do not reuse an ID");
  });

  it("scopes exceptions and unanswered decisions to explicit rows", async () => {
    const content = await triage();
    expect(content).toContain("Unadjudicated:");
    expect(content).toContain("Test exception:");
    expect(content).toContain("It takes effect only at DONE");
  });
});
