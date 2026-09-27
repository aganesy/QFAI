import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { collectHeadingSlugs } from "../../src/core/validators/assistantAnchorReferences.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const assistantDir = path.join(getInitAssetsDir(), ".qfai", "assistant");
const driftPath = path.join(assistantDir, "rule", "drift-protocol.md");
const baselinePath = path.join(assistantDir, "rule", "shared-skill-delegation-baseline.md");
const skillPath = path.join(assistantDir, "skill", "qfai-implement", "SKILL.md");
const classificationPath = path.join(
  assistantDir,
  "skill",
  "qfai-implement",
  "references",
  "finding-classification.md",
);

describe("reviewer finding provenance", () => {
  it("keeps demonstrable deliverable defects blocking without an AC ID", async () => {
    const [drift, baseline] = await Promise.all([
      readFile(driftPath, "utf-8"),
      readFile(baselinePath, "utf-8"),
    ]);
    expect(drift).toMatch(
      /A defect is demonstrable from the deliverable or an existing obligation/,
    );
    expect(drift).toMatch(/It is blocking with the concrete artifact and evidence as provenance/);
    for (const cls of ["defect:correctness", "defect:security", "defect:code-quality"]) {
      expect(baseline).toContain(cls);
    }
    expect(baseline).toMatch(/does not need an .AC-\*. to say so/);
  });

  it("routes new scope through the SDD owner before it becomes binding", async () => {
    const drift = await readFile(driftPath, "utf-8");
    expect(drift).toMatch(/A reviewer records it as advisory and sends it to the SDD owner/);
    expect(drift).toMatch(
      /binding only after the owner records the decision and updates the relevant BF, AC, EX, BR, or contract/,
    );
    expect(drift).toMatch(/An advisory does not create a test assertion by itself/);
    expect(drift).toMatch(
      /A finding that changes an approved obligation follows When drift is detected/,
    );
    expect(drift).toMatch(
      /An unrelated new question goes to open-questions\.md through the SDD owner/,
    );
  });

  it("requires precise provenance and full contract IDs", async () => {
    const drift = await readFile(driftPath, "utf-8");
    expect(drift).toMatch(
      /Every reviewer finding names either the governing AC, BR, or full CON ID, a shared rule, a concrete deliverable defect,/,
    );
    expect(drift).toMatch(/Use full contract IDs, including every numeric segment/);
    expect(drift).toMatch(/Do not shorten CON-API, CON-DB,\s+or CON-UI references/);
  });

  it("makes record defects advisory only where a queue and drain exist", async () => {
    const [drift, baseline, skill] = await Promise.all([
      readFile(driftPath, "utf-8"),
      readFile(baselinePath, "utf-8"),
      readFile(skillPath, "utf-8"),
    ]);
    expect(drift).toMatch(
      /classify a finding as a record defect only when its completion contract names a queue and requires it to be\s+drained/,
    );
    expect(baseline).toMatch(/record:\*.*none.*MUST be recorded as .advisory./);
    expect(baseline).toMatch(/today .\/qfai-implement. alone/);
    expect(drift).toMatch(/Completion waits for the queue to drain/);
    expect(skill).toMatch(/A record correction follows\s+.rule\/drift-protocol\.md./);
  });

  it("repairs a record against run proof and seals a new review pack", async () => {
    const [drift, revision] = await Promise.all([
      readFile(driftPath, "utf-8"),
      readFile(
        path.join(assistantDir, "skill", "qfai-implement", "references", "evidence-revision.md"),
        "utf-8",
      ),
    ]);
    expect(drift).toMatch(
      /reviewer records the incorrect statement and the artifact that proves what happened/,
    );
    expect(drift).toMatch(/orchestrator\s+places it in the queue/);
    expect(drift).toMatch(
      /Repair the record to match the run; re-attest any reviewed bytes in a new sealed\s+review pack, leaving the earlier pack intact/,
    );
    expect(revision).toMatch(/A later attempt receives a new pack and a new seal/);
    expect(revision).toMatch(
      /changed response, summary, or request invalidates its original verdict/,
    );
  });

  it("treats false execution or independence claims as blocking evidence defects", async () => {
    const [drift, baseline] = await Promise.all([
      readFile(driftPath, "utf-8"),
      readFile(baselinePath, "utf-8"),
    ]);
    expect(drift).toMatch(
      /A false claim that work ran, or that a reviewer independently checked it, is an evidence defect and\s+remains blocking/,
    );
    expect(drift).toMatch(
      /If the run cannot be reconstructed honestly, treat the finding as a\s+blocking evidence defect/,
    );
    expect(baseline).toMatch(/\*\*Integrity is not record class\.\*\*/);
    expect(baseline).toMatch(
      /stay .blocking. as .defect:code-quality. and are never filed as .record:\*./,
    );
  });

  it("only blocking findings force REVISE and stage out-of-scope advice stays advisory", async () => {
    const [baseline, classification] = await Promise.all([
      readFile(baselinePath, "utf-8"),
      readFile(classificationPath, "utf-8"),
    ]);
    expect(baseline).toMatch(/Only .blocking. findings force .REVISE./);
    expect(baseline).toMatch(
      /An obligation-traced finding is recorded .advisory. where a named section places the work outside the reviewed stage/,
    );
    expect(classification).toMatch(
      /An upstream contradiction is routed through the drift protocol/,
    );
    expect(classification).toMatch(
      /A final PASS still requires the blocking reviewers to answer for the current revision/,
    );
  });

  it("resolves cross-document rule anchors", async () => {
    const [drift, baseline, skill, classification] = await Promise.all([
      readFile(driftPath, "utf-8"),
      readFile(baselinePath, "utf-8"),
      readFile(skillPath, "utf-8"),
      readFile(classificationPath, "utf-8"),
    ]);
    const targets = new Map([
      ["drift-protocol.md", collectHeadingSlugs(drift)],
      ["shared-skill-delegation-baseline.md", collectHeadingSlugs(baseline)],
    ]);
    const sources = [drift, baseline, skill, classification];
    let checked = 0;
    const broken: string[] = [];
    for (const source of sources) {
      for (const match of source.matchAll(
        /(drift-protocol\.md|shared-skill-delegation-baseline\.md)#([\w-]+)/g,
      )) {
        checked++;
        const target = targets.get(match[1] ?? "");
        if (!target?.has(match[2] ?? "")) broken.push(match[0]);
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(broken).toEqual([]);
  });
});
