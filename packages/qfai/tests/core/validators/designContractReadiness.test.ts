/**
 * TC-3.8.x — designContractReadiness validator.
 *
 * Root DESIGN.md at the sdd and prototyping stages (QFAI-DCON-030 / 033 /
 * 034), and at the prototyping stage the `handoff` record the prototyping
 * loop leaves in its local prototyping.json (QFAI-DCON-012 / 013).
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { defaultConfig } from "../../../src/core/config.js";
import { writeDiscussionCurrentId } from "../../../src/core/state.js";
import {
  PROCUREMENT_PLACEHOLDERS,
  validatePrototypingDesignContractReadiness,
  validateSddDesignContractReadiness,
} from "../../../src/core/validators/designContractReadiness.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-dcon-"));
  tempDirs.push(dir);
  return dir;
}

const VALID_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
].join("\n");

const PROTOTYPING_JSON = ".qfai/evidence/prototyping/prototyping.json";

/** The two string fields a handoff carries, filled in. */
const COMPLETE_HANDOFF: Readonly<Record<string, unknown>> = {
  finalArtifact: ".qfai/prototype/final/index.html",
  implementationNotes:
    "Reviewed final iter has clear navigation, four-state coverage, and compliant DESIGN.md token use.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function seedUiBearingProject(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai/spec/03_contract/ui"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/spec/03_contract/ui/ui-0001.yaml"),
    "# QFAI-CONTRACT-ID: UI-0001\nscreens:\n  - id: home\n    title: Home\n    route: /\n",
    "utf-8",
  );
}

async function seedDesignMd(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), VALID_DESIGN_MD, "utf-8");
}

async function writePrototypingJson(root: string, record: unknown): Promise<void> {
  const file = path.join(root, PROTOTYPING_JSON);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
}

/** A prototyping.json whose handoff is the complete one with `fields` over it. */
async function seedHandoff(root: string, fields: Record<string, unknown> = {}): Promise<void> {
  await writePrototypingJson(root, { handoff: { ...COMPLETE_HANDOFF, ...fields } });
}

/** The fields a few YAML lines describe, so a case reads as the record it seeds. */
function fieldsFrom(lines: readonly string[]): Record<string, unknown> {
  const parsed: unknown = parseYaml(lines.join("\n"));
  return isRecord(parsed) ? parsed : {};
}

async function prototypingIssues(root: string, code: string): Promise<string[]> {
  const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
  return issues.filter((i) => i.code === code).map((i) => i.message);
}

describe("validateSddDesignContractReadiness (TC-3.8.x)", () => {
  // QFAI:EX-0001-0042-03
  it("TC-3.8.1: an authored root DESIGN.md passes (no issues)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  // QFAI:EX-0001-0042-03
  it("TC-3.8.2: missing root DESIGN.md → DCON-030", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("QFAI-DCON-030");
    const dcon030 = issues.find((i) => i.code === "QFAI-DCON-030");
    expect(dcon030?.file).toBe("DESIGN.md");
    expect(dcon030?.severity).toBe("error");
  });

  // QFAI:EX-0001-0042-10
  it("TC-3.8.5: a prototyping.json with no handoff → DCON-012 on prototyping.json", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    await writePrototypingJson(root, { iterations: [] });
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon012 = issues.filter((i) => i.code === "QFAI-DCON-012");
    expect(dcon012).toHaveLength(1);
    expect(dcon012[0]?.file).toBe(PROTOTYPING_JSON);
    expect(dcon012[0]?.severity).toBe("error");
  });

  // QFAI:EX-0001-0042-11
  it("TC-3.8.5b: no prototyping.json → no handoff finding", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("TC-3.8.6: SDD vs prototyping stage divergence", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    // No DESIGN.md, and a prototyping.json with no handoff.
    await writePrototypingJson(root, {});
    const sddIssues = await validateSddDesignContractReadiness(root, defaultConfig);
    const protoIssues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    expect(sddIssues.map((i) => i.code)).toContain("QFAI-DCON-030");
    expect(sddIssues.map((i) => i.code)).not.toContain("QFAI-DCON-012");
    expect(protoIssues.map((i) => i.code)).toContain("QFAI-DCON-030");
    expect(protoIssues.map((i) => i.code)).toContain("QFAI-DCON-012");
  });

  it("a handoff that is not an object surfaces as '(got <array>)' (not opaque JSON)", async () => {
    // Pins describeValueForDiagnostic's array branch, so a refactor that
    // collapses the helper back to a JSON.stringify cannot regress the
    // operator-facing diagnostic to `(got [1,2])`.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    await writePrototypingJson(root, { handoff: [1, 2] });
    const messages = await prototypingIssues(root, "QFAI-DCON-012");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("(got <array>)");
    expect(messages[0]).not.toContain("[1,2]");
  });

  // QFAI:EX-0001-0042-10
  it("a complete handoff does NOT emit DCON-012 or DCON-013", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    // A target whose UI contracts declare screens owes a `procurement`, so the
    // seeded handoff carries the one that says the screen needed nothing.
    await seedHandoff(root, { procurement: { "drawn-from-project": [{ screen: "home" }] } });
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("a missing finalArtifact is rejected with DCON-013 (and uses the missing-field phrasing)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    await writePrototypingJson(root, {
      handoff: {
        implementationNotes: "test",
        procurement: { "drawn-from-project": [{ screen: "home" }] },
      },
    });
    const messages = await prototypingIssues(root, "QFAI-DCON-013");
    expect(messages).toEqual([
      "prototyping.json#handoff is missing required field 'finalArtifact'.",
    ]);
  });

  // QFAI:EX-0001-0042-10
  it("a non-string finalArtifact is rejected with DCON-013 (not as missing)", async () => {
    // Distinct phrasing: present-but-invalid is "must be ... (got ...)",
    // not "missing required field" — an operator who wrote the field is
    // told what is wrong with it.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    await seedHandoff(root, {
      finalArtifact: { uri: ".qfai/prototype/final/index.html" },
      procurement: { "drawn-from-project": [{ screen: "home" }] },
    });
    const messages = await prototypingIssues(root, "QFAI-DCON-013");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("'finalArtifact' must be a non-empty string (got object)");
    expect(messages[0]).not.toContain("is missing required field");
  });

  it("a placeholder implementationNotes ('TBD') is rejected with DCON-013", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    await seedHandoff(root, {
      implementationNotes: "TBD",
      procurement: { "drawn-from-project": [{ screen: "home" }] },
    });
    const messages = await prototypingIssues(root, "QFAI-DCON-013");
    expect(messages).toEqual([
      "prototyping.json#handoff field 'implementationNotes' must be a non-empty string.",
    ]);
  });

  it("an object where a list belongs surfaces as '(got <object>)' (not opaque JSON)", async () => {
    // Pins describeValueForDiagnostic's `<typeof>` branch for non-array
    // non-primitive values.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    await seedHandoff(root, { procurement: { procured: { foo: 1 } } });
    const messages = await prototypingIssues(root, "QFAI-DCON-013");
    const shape = messages.find((m) => m.includes("'procurement.procured' must be a list"));
    expect(shape).toContain("(got <object>)");
    expect(shape).not.toContain('{"foo":1}');
  });

  // `procurement` is what `/qfai-implement` installs from rather than
  // rebuilding, and what the reviewer reads instead of judging a resemblance.
  // A row a reader cannot act on leaves both doing the thing the manifest
  // exists to stop.
  describe("the procurement manifest", () => {
    /** The seeded handoff with the fields `body` describes over the complete ones. */
    const withProcurement = async (root: string, body: readonly string[]): Promise<void> => {
      await seedHandoff(root, fieldsFrom(body));
    };

    /** A second contract, declaring the screen the rows below name. */
    const withDashboard = async (root: string): Promise<void> => {
      await writeFile(
        path.join(root, ".qfai/spec/03_contract/ui/ui-0002.yaml"),
        [
          "# QFAI-CONTRACT-ID: UI-0002",
          "screens:",
          "  - id: dashboard",
          "    title: Dashboard",
          "    route: /dashboard",
          "",
        ].join("\n"),
        "utf-8",
      );
    };

    const seeded = async (body: readonly string[]): Promise<string[]> => {
      const root = await newTempDir();
      await seedUiBearingProject(root);
      await withDashboard(root);
      await seedDesignMd(root);
      await withProcurement(root, body);
      const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
      return issues.filter((i) => i.code === "QFAI-DCON-013").map((i) => i.message);
    };

    const rowFor = (list: "procured" | "authored", screen: string): string[] => [
      "procurement:",
      `  ${list}:`,
      `    - screen: "${screen}"`,
      '      region: "summary cards"',
      list === "procured" ? '      item: "catalogue stat block"' : '      why: "nothing fits"',
    ];

    for (const list of ["procured", "authored"] as const) {
      it(`reports a ${list} row naming a screen no UI contract declares`, async () => {
        // A typo, or a screen renamed since: the row reads as complete while
        // naming a region nobody can locate.
        const messages = await seeded(rowFor(list, "dashbaord"));
        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain(`procurement.${list}[0]`);
        expect(messages[0]).toContain("'dashbaord', which no UI contract declares");
      });

      it(`accepts a ${list} row naming a declared screen`, async () => {
        expect(await seeded(rowFor(list, "home"))).toEqual([]);
      });
    }

    it("leaves the screen unresolved where no UI contract exists", async () => {
      // The readiness gate reports that project already; every row failing
      // beside it would repeat the one finding once per row.
      const root = await newTempDir();
      await seedDesignMd(root);
      await withProcurement(root, rowFor("procured", "anything"));
      const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
      expect(issues.filter((i) => i.message.includes("which no UI contract declares"))).toEqual([]);
    });

    it("reports a list declared and left empty", async () => {
      // `procured:` with nothing under it parses as null. That is a declaration
      // saying nothing, not an omission, and reading the two as one let it past
      // the shape check — the same distinction the key itself is held to.
      const messages = await seeded(["procurement:", "  procured:"]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("'procurement.procured' must be a list");
    });

    it("reads only the mapping's own keys", async () => {
      // `key in` reaches the prototype, so `constructor` and `toString` read as
      // declared lists and the value read back was a function rather than
      // anything the contract describes.
      const messages = await seeded(["procurement:", "  constructor:", "    - screen: a"]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("'constructor'");
    });

    it("names the placeholders the shipped example writes", async () => {
      // Two spellings of one placeholder drift in silence: the example keeps
      // writing its phrase and the check stops recognising it, so an unfilled
      // copy reads as a manifest somebody wrote.
      const handoff = await readFile(
        path.join(
          getInitAssetsDir(),
          ".qfai/assistant/skill/qfai-prototyping/references/handoff.md",
        ),
        "utf-8",
      );
      for (const placeholder of PROCUREMENT_PLACEHOLDERS) {
        expect(handoff).toContain(placeholder);
      }
    });

    for (const item of ["<DataTable>", '<DataTable density="compact">', "<button type='submit'>"]) {
      it(`leaves a component written as ${item} alone`, async () => {
        // These columns are free text, and a component is named and invoked in
        // angle brackets. Any pattern wide enough to cover the example's
        // phrases covers one of these, and reports a row that was written.
        expect(
          await seeded([
            "procurement:",
            "  procured:",
            '    - screen: "dashboard"',
            '      region: "summary cards"',
            `      item: "${item.replace(/"/g, '\\"')}"`,
          ]),
        ).toEqual([]);
      });
    }

    it("leaves a component named in angle brackets alone", async () => {
      // Every placeholder the shipped example writes is two words or more, and
      // a one-word angle token is how a component is named. Rejecting it would
      // report a row somebody wrote.
      expect(
        await seeded([
          "procurement:",
          "  procured:",
          '    - screen: "dashboard"',
          '      region: "summary cards"',
          '      item: "<DataTable>"',
        ]),
      ).toEqual([]);
    });

    it.each([
      ["a code span", "`TBD`"],
      ["a quoted word", "'TODO'"],
      ["brackets", "[tbd]"],
      ["a trailing stop", "TBD."],
      ["an emphasised word", "**TODO**"],
      ["a word beside tbd", "TBA"],
      ["a marker", "XXX"],
      ["a question", "???"],
      ["a named decision", "TODO: choose component"],
      ["a named decision with no space", "TBD:pick one"],
      ["a shipped phrase with a stop", "<screen id>."],
      ["a shipped phrase in brackets", "[<what part of the screen>]"],
    ])("reports a placeholder written as %s", async (_name, cell) => {
      // Read whole, each of these is a value nothing recognises, so the row
      // passed carrying nothing for the implementer to install.
      const messages = await seeded([
        "procurement:",
        "  procured:",
        '    - screen: "dashboard"',
        '      region: "summary cards"',
        `      item: ${JSON.stringify(cell)}`,
      ]);
      expect(messages.join("\n")).toContain("item");
    });

    it.each([
      ["a component in angle brackets", "<DataTable>"],
      ["a component with props", '<DataTable density="compact">'],
      ["a sentence opening with none", "none of the catalogue items fit the density"],
      ["a name holding a colon", "ui:DataTable"],
      ["a quoted component", "`DataTable`"],
    ])("leaves %s alone", async (_name, cell) => {
      expect(
        await seeded([
          "procurement:",
          "  procured:",
          '    - screen: "dashboard"',
          '      region: "summary cards"',
          `      item: ${JSON.stringify(cell)}`,
        ]),
      ).toEqual([]);
    });

    describe("one realisation per screen region", () => {
      const row = (screen: string, region: string, cell: string, value: string): string[] => [
        `    - screen: "${screen}"`,
        `      region: "${region}"`,
        `      ${cell}: "${value}"`,
      ];

      it("reports a region realised twice in one list", async () => {
        // The contract says each region names what realises it, singular. Two
        // rows for one region leave an implementer without an answer to what to
        // install, and reading rows independently let both pass.
        const messages = await seeded([
          "procurement:",
          "  procured:",
          ...row("dashboard", "summary cards", "item", "catalogue stat block"),
          ...row("dashboard", "summary cards", "item", "the project's own card"),
        ]);
        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain("dashboard / summary cards");
        expect(messages[0]).toContain("procurement.procured[0]");
        expect(messages[0]).toContain("procurement.procured[1]");
      });

      it("reports a region that is both procured and authored", async () => {
        // The contradiction across the two lists is the sharper one: install
        // this, and it was written because nothing served.
        const messages = await seeded([
          "procurement:",
          "  procured:",
          ...row("dashboard", "trend sparkline", "item", "catalogue chart"),
          "  authored:",
          ...row("dashboard", "trend sparkline", "why", "no catalogue entry plots a series"),
        ]);
        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain("procurement.procured[0]");
        expect(messages[0]).toContain("procurement.authored[0]");
      });

      it("says nothing about two regions of one screen", async () => {
        expect(
          await seeded([
            "procurement:",
            "  procured:",
            ...row("dashboard", "summary cards", "item", "catalogue stat block"),
            ...row("dashboard", "trend sparkline", "item", "catalogue chart"),
          ]),
        ).toEqual([]);
      });
    });

    it("reports the key absent on a target whose UI contracts declare screens", async () => {
      // Absence used to be legal, for a project that had drawn every screen
      // from what it already had. It reads the same as a loop that recorded
      // nothing, and an implementer taking the second for the first rebuilds
      // by hand what the loop procured. `drawn-from-project` is where the
      // first case is now said.
      const messages = await seeded([]);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("'procurement' is absent");
    });

    it("says nothing when a screen that needed nothing is named as such", async () => {
      expect(
        await seeded(["procurement:", "  drawn-from-project:", '    - screen: "dashboard"']),
      ).toEqual([]);
    });

    it("reports a drawn-from-project row naming a screen no UI contract declares", async () => {
      const messages = await seeded([
        "procurement:",
        "  drawn-from-project:",
        '    - screen: "nowhere"',
      ]);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("names screen 'nowhere'");
    });

    it("reports a drawn-from-project row naming no screen", async () => {
      const messages = await seeded([
        "procurement:",
        "  drawn-from-project:",
        '    - region: "summary cards"',
      ]);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("procurement.drawn-from-project[0]");
      expect(messages[0]).toContain("names no screen");
    });

    it("reports one screen said to have needed nothing and to have needed something", async () => {
      const messages = await seeded([
        ...rowFor("procured", "dashboard"),
        "  drawn-from-project:",
        '    - screen: "dashboard"',
      ]);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("needed nothing");
      expect(messages[0]).toContain("names something it needed");
    });

    it("reports one screen named twice as having needed nothing", async () => {
      const messages = await seeded([
        "procurement:",
        "  drawn-from-project:",
        '    - screen: "dashboard"',
        '    - screen: "dashboard"',
      ]);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("'dashboard'");
    });

    it("reports a key present and saying nothing", async () => {
      // A bare `procurement:` parses as null. The contract permits omitting the
      // key, not declaring it and leaving it empty, and reading the two as one
      // let a present declaration past the shape check.
      const messages = await seeded(["procurement:"]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("must be a mapping");
    });

    // QFAI:EX-0001-0098-01
    it("reports the shipped example, copied and filled in with nothing", async () => {
      // The documented example writes its cells as `<screen id>` and the like,
      // and the word-form placeholder list knows none of them — so the unfilled
      // template satisfied the check written to catch it. Read out of the
      // shipped file rather than restated, so the two cannot drift apart.
      const handoff = await readFile(
        path.join(
          getInitAssetsDir(),
          ".qfai/assistant/skill/qfai-prototyping/references/handoff.md",
        ),
        "utf-8",
      );
      const fence = /```json\n("handoff": \{[\s\S]*?\n\})\n```/.exec(
        handoff.replace(/\r\n/g, "\n"),
      );
      expect(fence, "handoff.md no longer shows the handoff record").not.toBeNull();
      const parsed: unknown = JSON.parse(`{${fence?.[1] ?? ""}}`);
      const example = isRecord(parsed) && isRecord(parsed.handoff) ? parsed.handoff : {};
      expect(Object.keys(example).sort()).toEqual([
        "finalArtifact",
        "implementationNotes",
        "procurement",
      ]);
      expect(JSON.stringify(example.procurement)).toContain("<screen id>");

      const root = await newTempDir();
      await seedUiBearingProject(root);
      await withDashboard(root);
      await seedDesignMd(root);
      await writePrototypingJson(root, { handoff: example });
      const messages = await prototypingIssues(root, "QFAI-DCON-013");

      // Every row of the example, each named for the cells it does not carry.
      // `drawn-from-project` carries only a screen, so it is named for that
      // alone; the other two lists carry a region as well.
      expect(messages.length).toBeGreaterThan(0);
      for (const message of messages) {
        expect(message).toContain(
          message.includes("drawn-from-project") ? "names no screen" : "names no screen, region",
        );
      }
    });

    it("reports a list name nothing reads", async () => {
      // A closed key set, as the sibling schema keeps. Misspelled, both known
      // names are absent, so no row is read and the manifest passes while
      // exposing nothing to either consumer.
      const messages = await seeded(["procurement:", "  procurred:", '    - screen: "dashboard"']);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("'procurred'");
      expect(messages[0]).toContain("which nothing reads");
    });

    it("says nothing about well-formed rows", async () => {
      expect(
        await seeded([
          "procurement:",
          "  procured:",
          '    - screen: "dashboard"',
          '      region: "summary cards"',
          '      item: "catalogue stat block"',
          "  authored:",
          '    - screen: "dashboard"',
          '      region: "trend sparkline"',
          '      why: "no catalogue entry plots a series under 80px"',
        ]),
      ).toEqual([]);
    });

    it("reports an authored region that records no reason", async () => {
      // Rung 5 is the only rung that has to explain itself. A row with no
      // reason is what an unexplained rung looks like by the time it reaches
      // the handoff, and the reviewer's last-resort criterion passes it.
      const messages = await seeded([
        "procurement:",
        "  authored:",
        '    - screen: "dashboard"',
        '      region: "trend sparkline"',
      ]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("procurement.authored[0]");
      expect(messages[0]).toContain("names no why");
    });

    it("reports a procured region that names nothing to install", async () => {
      const messages = await seeded([
        "procurement:",
        "  procured:",
        '    - screen: "dashboard"',
        '      region: "summary cards"',
        '      item: "TBD"',
      ]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("procurement.procured[0]");
      expect(messages[0]).toContain("names no item");
    });

    it("reports a list that is not a list, and a key that is not a mapping", async () => {
      expect((await seeded(["procurement:", '  procured: "a card"']))[0]).toContain(
        "'procurement.procured' must be a list",
      );
      expect((await seeded(['procurement: "none"']))[0]).toContain(
        "field 'procurement' must be a mapping",
      );
    });

    it("names every missing cell of a row at once", async () => {
      // One finding per row rather than one per cell: the fix is to write the
      // row, and three findings for one row is the same edit read three times.
      const messages = await seeded(["procurement:", "  procured:", "    - {}"]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("names no screen, region, item");
    });
  });

  // QFAI:EX-0001-0042-03
  it("malformed root DESIGN.md surfaces DCON-033 (parse error)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    // Author a malformed DESIGN.md (missing front-matter delimiter).
    await writeFile(path.join(root, "DESIGN.md"), "no front matter here\n", "utf-8");
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-DCON-033"]);
    expect(issues[0]?.severity).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// QFAI-DCON-034 — unreplaced sample DESIGN.md.
//
// The sample gate has to fire BEFORE the UI-contract gate: a copied sample
// can be in place from the first commit, `contracts/ui/**` is authored later
// in SDD, and a prototyping loop records the file's sha256 after that.
// ---------------------------------------------------------------------------

/**
 * The sample brand the package ships, as the prototyping template.
 *
 * `qfai init` writes no root `DESIGN.md`, so a project only holds this text
 * because someone put it there — copied from the template, or seeded by a
 * release that still did. Both are what this gate exists to catch, so the
 * sample is still the fixture; only where it ships has moved.
 */
const SHIPPED_DESIGN_MD_SAMPLE = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skill",
  "qfai-prototyping",
  "templates",
  "DESIGN.md.sample",
);

describe("validateSddDesignContractReadiness — unreplaced sample (QFAI-DCON-034)", () => {
  async function readShippedSample(): Promise<string> {
    return readFile(SHIPPED_DESIGN_MD_SAMPLE, "utf-8");
  }

  it("reports DCON-034 before any UI contract exists (fresh init)", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    const dcon034 = issues.filter((i) => i.code === "QFAI-DCON-034");
    expect(dcon034).toHaveLength(1);
    expect(dcon034[0]?.file).toBe("DESIGN.md");
    // Warning, not error: a project that ships no UI freezes nothing, so the
    // sample costs it nothing yet. An error would stop a project that never
    // opted into the design surface at all.
    expect(dcon034[0]?.severity).toBe("warning");
    expect(dcon034[0]?.suggested_action).toContain(
      ".qfai/assistant/skill/qfai-prototyping/templates/DESIGN.md.sample",
    );
  });

  it("escalates DCON-034 to error once the project is UI-bearing", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    const dcon034 = issues.filter((i) => i.code === "QFAI-DCON-034");
    expect(dcon034).toHaveLength(1);
    expect(dcon034[0]?.severity).toBe("error");
  });

  it("does not escalate on a retired spec-level surface marker", async () => {
    // Only a declared UI contract with screens is UI-bearing on the story
    // tree. Legacy spec-level markers cannot turn on a visual design gate.
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# 01 Spec\n\n- Spec: spec-0001\n",
      "utf-8",
    );
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    const dcon034 = issues.filter((i) => i.code === "QFAI-DCON-034");
    expect(dcon034).toHaveLength(1);
    expect(dcon034[0]?.severity).toBe("warning");
  });

  it("stays a warning when a UI contract has no screens", async () => {
    const root = await newTempDir();
    const uiDir = path.join(root, ".qfai/spec/03_contract/ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "ui-0001.yaml"),
      "# QFAI-CONTRACT-ID: UI-0001\nscreens: []\n",
      "utf-8",
    );
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues.find((i) => i.code === "QFAI-DCON-034")?.severity).toBe("warning");
  });

  it("reports DCON-034 for a marker-less legacy sample seeded by an older init", async () => {
    const root = await newTempDir();
    const legacy = (await readShippedSample()).replace(
      /<!-- QFAI-SAMPLE-DESIGN-MD:[\s\S]*?-->\n\n/,
      "",
    );
    await writeFile(path.join(root, "DESIGN.md"), legacy, "utf-8");
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues.map((i) => i.code)).toContain("QFAI-DCON-034");
  });

  it("stays silent for an authored DESIGN.md with no UI contracts", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "DESIGN.md"), VALID_DESIGN_MD, "utf-8");
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("stays silent when root DESIGN.md is absent and no UI contracts exist", async () => {
    const root = await newTempDir();
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("reports DCON-034 from the prototyping stage as well", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    expect(issues.map((i) => i.code)).toContain("QFAI-DCON-034");
  });
});

/**
 * The story tree has no spec-level UI marker. A declared UI contract with
 * screens is the design-readiness signal. A discussion pack still guides SDD,
 * but it cannot override a live UI contract when validation runs.
 */
describe("story-tree visual design readiness", () => {
  async function seedDiscussionPack(root: string, primarySurface: string): Promise<void> {
    const id = "discussion-20260101000000000";
    const dir = path.join(root, ".qfai/discussion", id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "01_Context.md"),
      [
        "# 01 Context",
        "",
        "## UI-bearing Classification",
        "",
        "- ui_bearing: true",
        `- primary_surface: ${primarySurface}`,
        "- secondary_surfaces: []",
        "- classification_rationale: fixture",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeDiscussionCurrentId(root, id);
  }

  it("a cli-only discussion without UI contracts requires no root DESIGN.md", async () => {
    const root = await newTempDir();
    await seedDiscussionPack(root, "cli");
    const codes = (await validateSddDesignContractReadiness(root, defaultConfig)).map(
      (issue) => issue.code,
    );
    expect(codes).not.toContain("QFAI-DCON-030");
  });

  it("an unreplaced sample without a UI contract only warns", async () => {
    const root = await newTempDir();
    await seedDiscussionPack(root, "cli");
    await writeFile(
      path.join(root, "DESIGN.md"),
      await readFile(SHIPPED_DESIGN_MD_SAMPLE, "utf-8"),
    );
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues.map((issue) => [issue.code, issue.severity])).toEqual([
      ["QFAI-DCON-034", "warning"],
    ]);
  });

  it("an active cli pack cannot suppress a UI contract with screens", async () => {
    const root = await newTempDir();
    await seedDiscussionPack(root, "cli");
    await seedUiBearingProject(root);
    const codes = (await validateSddDesignContractReadiness(root, defaultConfig)).map(
      (issue) => issue.code,
    );
    expect(codes).toContain("QFAI-DCON-030");
  });

  it("a web discussion alone does not invent a UI contract", async () => {
    const root = await newTempDir();
    await seedDiscussionPack(root, "web");
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("a UI contract without screens does not require visual design artifacts", async () => {
    const root = await newTempDir();
    const uiDir = path.join(root, ".qfai/spec/03_contract/ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "ui-0001.yaml"),
      "# QFAI-CONTRACT-ID: UI-0001\nscreens: []\n",
      "utf-8",
    );
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });
});
