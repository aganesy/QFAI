/**
 * Integration: how a fix route's implement stage seeds a diagnosed example, and how `/qfai-sdd`
 * changes the story tree.
 *
 * Reads the shipped `implement-tdd` step, the `qfai-sdd` skill, its steps and the triage reference.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { parseContractRules } from "../../../src/core/storyTree/contractRules.js";
import {
  SHIPPED_ASSISTANT,
  flat,
  readShipped,
  sectionOf,
  shippedExists,
} from "../../helpers/shippedAssistant.js";

const SKILL = "skill/qfai-sdd/SKILL.md";
const FLOW_STEP = "step/sdd-flow/STEP.md";
const CONTRACT_STEP = "step/sdd-contract/STEP.md";
const TRACEABILITY = "skill/qfai-sdd/references/spec-traceability-rules.md";
const TEMPLATES = path.join(SHIPPED_ASSISTANT, "skill", "qfai-sdd", "templates");
const TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";
const TRIAGE_STEP = "step/sdd-triage/STEP.md";
const CHECKLISTS = "skill/qfai-sdd/references/sdd-phase-checklists.md";
const STORY_STEP = "step/implement-tdd/STEP.md";
const SEEDING = "## A diagnosed missing example";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("defect example seeding", () => {
  // QFAI:AC-0001-0206-01
  // QFAI:EX-0001-0206-01
  it("appends one example under the matched criterion and cites it from the enforcing rule", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(
      /append exactly one EX to the `03_Example\.md` of the story that owns the AC the diagnosis matched/i,
    );
    expect(text).toMatch(/its ID is the next free EX ID of that story, its `AC-Ref` is that AC/i);
    expect(text).toMatch(
      /add the new EX ID to the Examples cell of the contract rule the diagnosis names as owning that AC/i,
    );
  });

  // QFAI:AC-0001-0206-02
  // QFAI:EX-0001-0206-02
  it("changes no story, criterion, rule statement, existing example or test", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the rule's Statement is unchanged/i);
    expect(text).toMatch(/change no story, AC, rule statement or existing EX/i);
  });

  // QFAI:AC-0001-0186-01
  // QFAI:EX-0001-0186-02
  it("carries the diagnosis as the reason for the appended example, and changes no statement", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the diagnosis is its reason/i);
    expect(text).toMatch(/change no story, AC/i);
    expect(text).toMatch(/the rule's Statement is unchanged/i);
  });

  // QFAI:AC-0001-0206-03
  // QFAI:EX-0001-0206-03
  it("asks nothing and appends no decisions row", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the step asks the user nothing/i);
    expect(text).toMatch(
      /append no `decisions\.md` row: the drift gate needs no `Change request:` row for appended example rows/i,
    );
    expect(text).toMatch(/list the EX in the run's final report/i);
  });
});

describe("qfai-sdd changes the story tree", () => {
  // QFAI:AC-0001-0147-03
  // QFAI:EX-0001-0147-05
  it("records in decisions.md only what the user decided, with who, when and the option", async () => {
    const text = await section(TRIAGE, "## Decision and question rows");
    expect(text).toMatch(/decisions\.md records only what the user decided/i);
    expect(text).toMatch(/a row is appended once the user has decided what it records/i);
    expect(text).toMatch(/who approved it, when, and the option chosen/i);
    expect(text).toMatch(/a declined change request is appended at REJECTED/i);
    expect(text).toMatch(/who declined it and when/i);
    expect(text).toMatch(/open questions use OQ-NNNN rows/i);
    expect(flat(await readShipped(CHECKLISTS))).toMatch(
      /a declined change request is a REJECTED `Change request:` row/i,
    );
  });

  // QFAI:AC-0001-0207-02
  // QFAI:EX-0001-0207-02
  it("ends at SDD when invoked by name, and hands a request to go to the end to qfai-run", async () => {
    const text = await section(SKILL, "## /qfai-sdd");
    expect(text).toMatch(/runs standalone, ends at SDD/i);
    expect(text).toMatch(/`qfai-run`/);
  });

  // QFAI:AC-0001-0207-06
  // QFAI:EX-0001-0207-06
  // QFAI:EX-0001-0207-07
  it("changes the story tree only on the user's approval, recording who approved it, when and what", async () => {
    const text = await section(TRIAGE, "### A change to the story tree");
    expect(text).toMatch(/changes only on the user's approval/i);
    expect(text).toMatch(
      /show the user the files the stage would change and the proposed change, and change nothing until the user answers/i,
    );
    expect(text).toMatch(
      /a request from the user in the session that names the change and its effect is that answer: the stage lists the files in its announcement, asks no second question, and records the request as the option chosen/i,
    );
    expect(text).toMatch(
      /on approval, write the change and append one `decisions\.md` row whose Content opens `Change request:`/i,
    );
    expect(text).toMatch(
      /names every story-tree and contract file it changed, and `decisions\.md` when it appended any other row/i,
    );
    expect(text).toMatch(
      /its Approach records who approved it, when, and the label of the option chosen/i,
    );
    expect(text).toMatch(/move the row to DONE once every change it names is written/i);
    const step = await section(TRIAGE_STEP, "## A change to the story tree");
    expect(step).toMatch(/sdd-triage\.md#a-change-to-the-story-tree/);
  });
});

/** The files under a shipped directory that an agent reads as text, by path relative to it. */
async function textFilesUnder(dir: string): Promise<string[]> {
  const names = await readdir(dir, { recursive: true });
  return names.filter((name) => /\.(md|ya?ml|sql)$/i.test(name));
}

/** Every citation in `text` of a document named `file`, as written, path prefix included. */
function citationsOf(text: string, file: string): string[] {
  const pattern = new RegExp(`[^\\s\`"'()<>]*${file.replace(".", "\\.")}`, "g");
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

describe("qfai-sdd writes the story tree", () => {
  // QFAI:AC-0001-0147-04
  // QFAI:EX-0001-0147-07
  it("states each policy fact once and keeps the gate commands in the Standard commands section of tech.md", async () => {
    const procedure = await section(FLOW_STEP, "## Procedure");
    expect(procedure).toContain(
      "Write each fact once across `01_policy/objective.md`, `initiative.md`, `principle.md` and `03_contract/tech.md`.",
    );
    expect(procedure).toContain(
      "the quality-gate commands, one labelled item each, only in the Standard commands section of `tech.md`. Other documents point there.",
    );
    expect(flat(await readShipped(TRACEABILITY))).toContain(
      "A value set, a behaviour rule or a command belongs to the contract or tech.md that owns it, and policy links there.",
    );
    const tech = await readFile(path.join(TEMPLATES, "spec", "03_contract", "tech.md"), "utf-8");
    expect(tech).toMatch(/^## Standard commands \(copy-paste\)$/m);
  });

  // QFAI:AC-0001-0147-05
  it("allocates the highest number in a scope plus one, and reissues no retired ID", async () => {
    const allocation = await section(TRIAGE, "## ID allocation");
    expect(allocation).toContain(
      "Read all IDs of the kind in the relevant scope, including IDs named by retirement rows. The next ID is the highest plus one.",
    );
    expect(allocation).toContain(
      "Empty numeric scopes begin at 0001, and AC/EX tails begin at 01.",
    );
    expect(allocation).toContain(
      "Do not reuse an ID because its file was removed or a row was rejected.",
    );
    const scopes = flat(await readShipped(TRACEABILITY));
    expect(scopes).toContain(
      "Count IDs named in retired-item decisions, so deletion never frees an ID.",
    );
    expect(scopes).toContain("Directory names match their BF and US IDs.");
  });

  // QFAI:AC-0001-0147-06
  // QFAI:EX-0001-0147-09
  it("writes each rule inside the contract that enforces it, in that file type's form", async () => {
    expect(await section(CONTRACT_STEP, "## Procedure")).toContain(
      "Put each BR in the contract that enforces it, numbered `BR-<contract number>-NNNN`: `x-qfai-rules` in YAML or JSON, `-- Rule` and `-- Examples:` in SQL, and a `## Business rules` table in Markdown.",
    );
    const samples: [string, RegExp][] = [
      [path.join("contracts", "api-contract.sample.yaml"), /^# QFAI-CONTRACT-ID: API-(\d{4})$/m],
      [path.join("contracts", "db-contract.sample.sql"), /^-- QFAI-CONTRACT-ID: DB-(\d{4})$/m],
      [path.join("spec", "03_contract", "cli", "cli-NNNN-title.md"), /^# CLI-(\d{4}):/m],
    ];
    for (const [relative, declaration] of samples) {
      const text = await readFile(path.join(TEMPLATES, relative), "utf-8");
      const number = declaration.exec(text)?.[1];
      expect(number, relative).toBeDefined();
      const scan = parseContractRules(relative, text);
      expect(scan.errors, relative).toEqual([]);
      expect(scan.rules.length, relative).toBeGreaterThan(0);
      for (const rule of scan.rules) {
        expect(rule.id.startsWith(`BR-${number}-`), `${relative} ${rule.id}`).toBe(true);
        expect(rule.statement, relative).not.toBe("");
        expect(rule.examples.length, relative).toBeGreaterThan(0);
      }
    }
    const templateFiles = await textFilesUnder(TEMPLATES);
    expect(templateFiles.filter((name) => /rules?\.md$/i.test(path.basename(name)))).toEqual([]);
  });

  // QFAI:EX-0001-0147-10
  it("defines a rule that several contracts rely on once, in the contract authoritative for it", async () => {
    expect(await section(CONTRACT_STEP, "## Procedure")).toContain(
      "Define a rule shared by contracts once, in its authoritative contract. No other contract restates or cites it: only code and tests cite a BR.",
    );
    expect(flat(await readShipped(TRACEABILITY))).toContain(
      "The authoritative contract defines a shared BR once. Other contracts neither restate nor cite it.",
    );
  });

  // QFAI:AC-0001-0147-07
  // QFAI:EX-0001-0147-11
  it("cites the change-classification and requirements-decomposition documents where they live", async () => {
    const skillDir = path.join(SHIPPED_ASSISTANT, "skill", "qfai-sdd");
    const files = [
      ...(await textFilesUnder(skillDir)).map((name) => path.join(skillDir, name)),
      ...(await readdir(path.join(SHIPPED_ASSISTANT, "step")))
        .filter((name) => name.startsWith("sdd-"))
        .map((name) => path.join(SHIPPED_ASSISTANT, "step", name, "STEP.md")),
    ];
    const classification = ".qfai/assistant/rule/change-classification.md";
    const decomposition = `${defaultConfig.paths.skillsDir}/qfai-sdd/references/requirements-decomposition.md`;
    let classificationCitations = 0;
    let decompositionCitations = 0;
    for (const file of files) {
      const text = await readFile(file, "utf-8");
      expect(text, file).not.toContain(".qfai/assistant/constitution/");
      const classified = citationsOf(text, "change-classification.md");
      const decomposed = citationsOf(text, "requirements-decomposition.md");
      expect(
        classified.filter((cited) => cited !== classification),
        file,
      ).toEqual([]);
      expect(
        decomposed.filter((cited) => cited !== decomposition),
        file,
      ).toEqual([]);
      classificationCitations += classified.length;
      decompositionCitations += decomposed.length;
    }
    expect(classificationCitations).toBeGreaterThan(0);
    expect(decompositionCitations).toBeGreaterThan(0);
    expect(shippedExists("rule/change-classification.md")).toBe(true);
    expect(shippedExists("skill/qfai-sdd/references/requirements-decomposition.md")).toBe(true);
  });
});
