/**
 * A spec stage that completes over a decision nobody took.
 *
 * `08_Open-questions.md` holds two different things under one word. A question
 * parked on purpose is what the file is for, and a stage completes over it. A
 * decision a grilling session put to the user, which nobody answered, is the
 * pack claiming a design nobody chose — and completing there records the
 * agent's preference as the project's, with nothing later reopening it.
 *
 * `unadjudicated` is the second one. It is a status rather than a new file or a
 * new section, because the gate already reads statuses and no existing pack
 * carries the value, so nothing has to be migrated to it.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
);

import { collectOpenQuestionsGateIssues } from "../../../src/core/validators/specPack.js";
import type { SpecEntry } from "../../../src/core/specLayout.js";

const ENTRY = { openQuestionsPath: "spec-0042/08_Open-questions.md" } as unknown as SpecEntry;

const doc = (rows: readonly string[]): string =>
  ["# 08 Open Questions", "", "## Open Questions", "", ...rows, ""].join("\n");

const codes = (text: string, releaseCandidate = false): string[] =>
  collectOpenQuestionsGateIssues(ENTRY, text, releaseCandidate).map((issue) => issue.code);

describe("a decision the user was asked for and never took blocks the stage", () => {
  it("reports it, and names the question", () => {
    const issues = collectOpenQuestionsGateIssues(
      ENTRY,
      doc(["- OQ-0007 — which retention window applies", "  - status: unadjudicated"]),
      false,
    );
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPACK-102"]);
    expect(issues[0]?.refs).toEqual(["OQ-0007"]);
  });

  it("is an error at the merge gate, not only in a release candidate", () => {
    // `open` softens to a warning outside a release candidate, because a
    // question still being worked is not a claim. This one is a claim.
    const rows = ["- OQ-0007 — which retention window applies", "  - status: unadjudicated"];
    for (const releaseCandidate of [false, true]) {
      const issues = collectOpenQuestionsGateIssues(ENTRY, doc(rows), releaseCandidate);
      expect(issues[0]?.severity, String(releaseCandidate)).toBe("error");
    }
  });

  it("says what to do instead", () => {
    const issues = collectOpenQuestionsGateIssues(
      ENTRY,
      doc(["- OQ-0007 — which retention window applies", "  - status: unadjudicated"]),
      false,
    );
    expect(issues[0]?.suggested_action).toContain("set the status to");
    expect(issues[0]?.suggested_action).toContain("deferred");
  });
});

describe("what the new status does not change", () => {
  it("leaves a question parked on purpose alone", () => {
    // The whole point of the file. A stage completes over this.
    expect(
      codes(doc(["- OQ-0007 — which retention window applies", "  - status: deferred"])),
    ).toEqual([]);
  });

  it("keeps `open` a warning at the merge gate", () => {
    const rows = ["- OQ-0007 — which retention window applies", "  - status: open"];
    const issues = collectOpenQuestionsGateIssues(ENTRY, doc(rows), false);
    expect(issues.map((issue) => issue.code)).toEqual(["E_OQ_OPEN_RELEASE_BLOCK"]);
    expect(issues[0]?.severity).toBe("warning");
  });

  it("reads the new value as a valid status rather than an unparseable one", () => {
    // Both would fire on the same row otherwise, and the second would tell the
    // author to write one of three values that does not include this one.
    expect(
      codes(doc(["- OQ-0007 — which retention window applies", "  - status: unadjudicated"])),
    ).not.toContain("E_OQ_STATUS_UNPARSEABLE");
    expect(codes(doc(["- OQ-0008 — which region is live", "  - status: pending"]))).toContain(
      "E_OQ_STATUS_UNPARSEABLE",
    );
  });
});

describe("the register it reads, and the notation it reads it in", () => {
  it("reads the status out of the table the template writes", () => {
    // The template records one row per question, so the status is a cell. Read
    // only as a standalone line, every shipped row went unparsed — which is the
    // shape the packs this gate exists for are in.
    const table = [
      "# 08 Open Questions",
      "",
      "## Open Questions",
      "",
      "| OQ-ID   | Question                  | Owner | Due | Status        | Notes |",
      "| ------- | ------------------------- | ----- | --- | ------------- | ----- |",
      "| OQ-0007 | which retention window    | ops   | -   | unadjudicated | -     |",
      "| OQ-0008 | which region is live      | ops   | -   | deferred      | -     |",
      "",
    ].join("\n");
    const issues = collectOpenQuestionsGateIssues(ENTRY, table, false);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPACK-102"]);
    expect(issues[0]?.refs).toEqual(["OQ-0007"]);
  });

  it("reads the Status column, not whichever cell holds one of the words", () => {
    // A question can be about an open question. Searching every cell answered
    // for the row from the Question column and let the blocker go unfired.
    const table = [
      "| OQ-ID   | Question | Owner | Due        | Status        | Notes |",
      "| ------- | -------- | ----- | ---------- | ------------- | ----- |",
      "| OQ-0007 | open     | alice | 2026-10-01 | unadjudicated | -     |",
      "",
    ].join("\n");
    expect(codes(table)).toEqual(["QFAI-SPACK-102"]);
  });

  it("reports a status that is none of the four", () => {
    const table = [
      "| OQ-ID   | Status       |",
      "| ------- | ------------ |",
      "| OQ-0007 | unadjudicted |",
      "",
    ].join("\n");
    expect(codes(table)).toContain("E_OQ_STATUS_UNPARSEABLE");
    expect(codes(table)).not.toContain("QFAI-SPACK-102");
  });

  it("does not read a separator row as a status", () => {
    const table = ["| OQ-ID   | Status |", "| ------- | ------ |", "| OQ-0007 | open   |", ""].join(
      "\n",
    );
    expect(codes(table)).toEqual(["E_OQ_OPEN_RELEASE_BLOCK"]);
  });

  it("passes the template a fresh spec is created from", async () => {
    // The template carries a glossary of the four statuses beside the register.
    // Read as a second register, an untouched spec reports itself.
    const template = await readFile(
      path.join(
        repoRoot,
        "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/spec/08_Open-questions.md",
      ),
      "utf-8",
    );
    expect(codes(template)).toEqual([]);
  });

  it("reads a table written without trailing pipes", () => {
    // Valid GFM, and the shared Markdown parser accepts it. Seeing no cells,
    // the gate saw no status and the unanswered decision passed.
    const table = ["| OQ-ID | Status", "| ----- | ------", "| OQ-0007 | unadjudicated", ""].join(
      "\n",
    );
    expect(codes(table)).toEqual(["QFAI-SPACK-102"]);
  });

  it("reads the status beside a note in the same cell", () => {
    // The registers in this repository write `resolved (2026-05-06)`. The date
    // is a note beside the value, not a second status.
    const table = [
      "| OQ-ID   | Status                |",
      "| ------- | --------------------- |",
      "| OQ-0007 | resolved (2026-05-06) |",
      "| OQ-0008 | unadjudicated (asked) |",
      "",
    ].join("\n");
    expect(codes(table)).toEqual(["QFAI-SPACK-102"]);
    // And a misspelling is still the first word, and still reported.
    expect(
      codes(
        [
          "| OQ-ID   | Status               |",
          "| ------- | -------------------- |",
          "| OQ-0007 | unadjudicted (asked) |",
          "",
        ].join("\n"),
      ),
    ).toContain("E_OQ_STATUS_UNPARSEABLE");
  });

  it("reports a question row with no status at all", () => {
    const table = [
      "| OQ-ID   | Question | Status |",
      "| ------- | -------- | ------ |",
      "| 0 items | none     | -      |",
      "| OQ-0007 | which    | -      |",
      "",
    ].join("\n");
    const issues = collectOpenQuestionsGateIssues(ENTRY, table, false);
    // The placeholder row declares nothing and is not a question.
    expect(issues.map((issue) => issue.code)).toEqual(["E_OQ_STATUS_UNPARSEABLE"]);
    expect(issues[0]?.message).toContain("OQ-0007=(none)");
  });

  it("keeps an escaped pipe inside the cell that holds it", () => {
    // `choose A \| B` is one cell in valid GFM. Split on every pipe, every
    // column after it shifts and the status is read from its neighbour.
    const table = [
      "| OQ-ID   | Question          | Status        |",
      "| ------- | ----------------- | ------------- |",
      "| OQ-0007 | choose A \\| B     | unadjudicated |",
      "",
    ].join("\n");
    expect(codes(table)).toEqual(["QFAI-SPACK-102"]);
  });

  it("does not read an example table as the register", () => {
    // A register that documents its own notation writes one in a fenced block.
    const text = [
      "# 08 Open Questions",
      "",
      "A row looks like this:",
      "",
      "```markdown",
      "| OQ-ID   | Status        |",
      "| ------- | ------------- |",
      "| OQ-0007 | unadjudicated |",
      "```",
      "",
    ].join("\n");
    expect(codes(text)).toEqual([]);
  });

  it("reports a subsection entry that declares no status", () => {
    // The other notation: one subsection per question. An entry that omits the
    // line declares nothing, and reading only the declared statuses found none
    // to object to.
    const text = [
      "# 08 Open Questions",
      "",
      "## Open Questions",
      "",
      "### OQ-0007 — which retention window applies",
      "",
      "- owner: ops",
      "",
    ].join("\n");
    expect(codes(text)).toContain("E_OQ_STATUS_UNPARSEABLE");
  });

  it("reads `Disposition` as the same field", () => {
    // The discussion pack's register calls this field `Disposition` over the
    // same values, and subsection entries are written both ways. A reader that
    // knows one word reports an entry that states its answer plainly.
    const entry = (status: string): string =>
      [
        "# 08 Open Questions",
        "",
        "## Open Questions",
        "",
        "### OQ-0007: which retention window applies",
        "",
        `- Disposition: ${status}`,
        "- Owner: ops",
        "",
      ].join("\n");
    expect(codes(entry("deferred"))).toEqual([]);
    expect(codes(entry("open"))).toEqual(["E_OQ_OPEN_RELEASE_BLOCK"]);
    expect(codes(entry("unadjudicated"))).toEqual(["QFAI-SPACK-102"]);
  });

  it("reads the value beside a parenthetical as the status", () => {
    // `deferred (trigger = ...)` names the point that takes the question up.
    // The note is not a second status.
    const text = [
      "# 08 Open Questions",
      "",
      "## Open Questions",
      "",
      "### OQ-0007: which retention window applies",
      "",
      "- Disposition: deferred (trigger = the first request to keep a record longer)",
      "",
    ].join("\n");
    expect(codes(text)).toEqual([]);
  });

  it("reads a status written inline on the entry's own bullet", () => {
    // Registers here write a whole entry as one bullet, with the field in the
    // middle of the sentence and a note after it. Read only as a line of its
    // own, the entry declared nothing and the blocking value was invisible.
    const entry = (status: string): string =>
      [
        "# 08 Open Questions",
        "",
        "## Open Questions",
        "",
        `- OQ-0007 — which retention window applies. Owner: ops. Status: ${status}. The`,
        "  answer of record is in the decision this cites.",
        "",
      ].join("\n");
    expect(codes(entry("deferred"))).toEqual([]);
    expect(codes(entry("unadjudicated"))).toEqual(["QFAI-SPACK-102"]);
  });

  it("keeps a status with the entry that owns it", () => {
    // A field naming another question sits between the heading and the status
    // all the time. Read as the entry it names, the status below it answers for
    // that question, and the entry that owns it is reported as declaring none.
    const text = [
      "# 08 Open Questions",
      "",
      "## Open Questions",
      "",
      "### OQ-0007: which retention window applies",
      "",
      "- Depends on: OQ-0008",
      "- Status: unadjudicated",
      "",
    ].join("\n");
    const issues = collectOpenQuestionsGateIssues(ENTRY, text, false);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPACK-102"]);
    expect(issues[0]?.refs).toEqual(["OQ-0007"]);
  });

  it("does not read a sentence about a status as one", () => {
    // Prose naming the value is how a register explains itself, and read as a
    // declaration it answers for whichever question was named last.
    const text = [
      "# 08 Open Questions",
      "",
      "## Open Questions",
      "",
      "### OQ-0007: which retention window applies",
      "",
      "- Status: deferred",
      "- Notes: the row this replaces carried status: unadjudicated",
      "",
    ].join("\n");
    expect(codes(text)).toEqual([]);
  });
});
