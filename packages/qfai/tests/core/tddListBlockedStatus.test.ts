/**
 * The ledger had no value meaning "this row cannot be started".
 *
 * Six statuses, none of them "blocked", and no blocker-reference field —
 * `DR-ID` is reserved for `exception`. So a row stopped on a defective upstream
 * contract or an unresolved Change Request had exactly one honest encoding,
 * `todo`, which is what Phase Red selects next and what the completion gate
 * treats as unfinished. The determination was never persisted, so it got
 * re-derived — and disagreed about — on every planning pass.
 *
 * `exception` could not absorb it: it is scoped to an anomaly, demands a
 * `DR-*` at `error`, and **satisfies spec completion** — so filing a blocked
 * row there would silently close the obligation.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const NINE_COL = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Blocked-By |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ---------- |`;

const EIGHT_COL = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |`;

async function run(
  ledger: string,
  opts: {
    /** `.qfai/decisions/<name>` files to seed alongside the ledger. */
    readonly decisions?: Readonly<Record<string, string>>;
  } = {},
): Promise<Array<{ code: string; severity: string; message: string; suggested: string }>> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-blocked-"));
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger, "utf-8");
    const decisions = opts.decisions ?? {};
    if (Object.keys(decisions).length > 0) {
      const decisionsDir = path.join(root, ".qfai", "decisions");
      await mkdir(decisionsDir, { recursive: true });
      for (const [name, body] of Object.entries(decisions)) {
        await writeFile(path.join(decisionsDir, name), body, "utf-8");
      }
    }
    const issues = await validateTddList(root, defaultConfig);
    return issues.map((i) => ({
      code: i.code,
      severity: i.severity,
      message: i.message,
      suggested: i.suggested_action ?? "",
    }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("`blocked` is a legal status", () => {
  it("is no longer reported as an invalid status", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | CR-20260729-0008 |\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_INVALID_STATUS");
  });

  it("still rejects a status outside the vocabulary", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | stuck | - | - | CR-1 |\n`,
    );
    expect(issues.map((i) => i.code)).toContain("TDDLIST_INVALID_STATUS");
  });
});

describe("TDDLIST_BLOCKED_MISSING_REF — a blocked row must name its blocker", () => {
  // Otherwise `blocked` is the same unfalsifiable state `todo` was, one word
  // further along: "cannot start" with no record of what it waits on.
  it("errors when Blocked-By is empty", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - |  |\n`,
    );
    expect(issues.find((i) => i.code === "TDDLIST_BLOCKED_MISSING_REF")?.severity).toBe("error");
  });

  it("errors when the cell is a dash placeholder", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | - |\n`,
    );
    expect(issues.map((i) => i.code)).toContain("TDDLIST_BLOCKED_MISSING_REF");
  });

  it("errors, and says so, when the ledger has no Blocked-By column at all", async () => {
    // The column is optional; a ledger that uses `blocked` without it needs the
    // message to name the missing column, not just an empty cell.
    const issues = await run(
      `${EIGHT_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - |\n`,
    );
    expect(issues.map((i) => i.code)).toContain("TDDLIST_BLOCKED_MISSING_REF");
  });

  for (const blocker of [
    "CR-20260729-0008",
    ".qfai/contracts/db/CON-DB-0005.sql:2715",
    "spec-0006:TDD-0034",
  ]) {
    it(`accepts "${blocker}" with its departure status`, async () => {
      const issues = await run(
        `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | ${blocker} — blocked at green |\n`,
      );
      expect(issues.map((i) => i.code)).not.toContain("TDDLIST_BLOCKED_MISSING_REF");
    });
  }

  it("says nothing about a row that is not blocked", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | todo | - | - |  |\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_BLOCKED_MISSING_REF");
  });
});

describe("TDDLIST_BLOCKED_MISSING_REF — the departure-status half", () => {
  // `blocked` is reachable from every active status, and a row parked there
  // across a session boundary persists nothing but its `Status` and this cell.
  // The resumption reads the departure status to decide whether it continues an
  // interrupted round or opens the next one, and to compose
  // `Round N: Resumed-from-blocked`. Accepting a bare blocker let a row be saved
  // in a state no later session can resume from.
  it("errors when the cell names a blocker but no departure status", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | CR-20260729-0008 |\n`,
    );
    const found = issues.find((i) => i.code === "TDDLIST_BLOCKED_MISSING_REF");
    expect(found?.severity).toBe("error");
  });

  for (const status of ["done", "exception", "blocked", "reviewfix", "in-progress"]) {
    it(`errors when the departure status is "${status}"`, async () => {
      // Only the active statuses the inbound edge admits can be departed from:
      // `blocked` is the destination, and `done` / `exception` are terminal, so
      // neither has work in flight for a blocker to stop.
      const issues = await run(
        `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | CR-20260729-0008 — blocked at ${status} |\n`,
      );
      expect(issues.map((i) => i.code)).toContain("TDDLIST_BLOCKED_MISSING_REF");
    });
  }

  for (const status of ["todo", "red", "green", "refactor", "review-fix"]) {
    it(`accepts a departure status of "${status}"`, async () => {
      const issues = await run(
        `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | CR-20260729-0008 — blocked at ${status} |\n`,
      );
      expect(issues.map((i) => i.code)).not.toContain("TDDLIST_BLOCKED_MISSING_REF");
    });
  }

  it("keeps a dash-bearing blocker whole", async () => {
    // The blocker half is matched greedily so the separator is the last one that
    // still leaves a legal tail; anchoring on the first would cut
    // `spec-0006:TDD-0034` in half and reject a well-formed cell.
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | spec-0006:TDD-0034 - blocked at review-fix |\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_BLOCKED_MISSING_REF");
  });

  for (const dash of ["—", "–", "-"]) {
    it(`names the missing blocker when only the departure status is there ("${dash}")`, async () => {
      // Asserting the code alone let this report the wrong half: the parse
      // required a non-empty blocker, so the cell fell through to
      // "names no departure status" — about the half it already had.
      const issues = await run(
        `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | ${dash} blocked at green |\n`,
      );
      const found = issues.find((i) => i.code === "TDDLIST_BLOCKED_MISSING_REF");
      expect(found?.severity).toBe("error");
      expect(found?.message).toContain("names no blocker");
      expect(found?.message).not.toContain("names no departure status");
      expect(found?.message).not.toContain("is empty");
    });
  }

  it("still calls an empty cell empty", async () => {
    // The over-correction pin for the line above: the three states have three
    // sentences, and widening the parse must not merge two of them.
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | - |\n`,
    );
    expect(issues.find((i) => i.code === "TDDLIST_BLOCKED_MISSING_REF")?.message).toContain(
      "is empty",
    );
  });

  it("still says nothing about a non-blocked row carrying a bare value", async () => {
    // The check is scoped to `blocked` rows; a stale `Blocked-By` left on a
    // resumed row is not this finding.
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | todo | - | - | CR-20260729-0008 |\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_BLOCKED_MISSING_REF");
  });
});

describe("blocked does not become a completion loophole", () => {
  // The whole hazard of adding a status: if `blocked` satisfied completion the
  // way `exception` does, it would be a one-word way to close an unimplemented
  // obligation. It must stay unfinished work.
  it("does not require, or accept, a DR-ID in place of a blocker", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | DR-0001-0001 | - |  |\n`,
    );
    expect(issues.map((i) => i.code)).toContain("TDDLIST_BLOCKED_MISSING_REF");
    // And it is not treated as a parked exception either.
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_EXCEPTION_PARKED");
  });
});

/**
 * A Change Request record in the shape the shipped template writes, with the
 * template's own trailing comments kept so the header parser meets them. The
 * body quotes an approved status on purpose: only the header is the record.
 */
function changeRequest(fields: {
  status: string;
  appliedAt?: string;
  id?: string;
  changeClass?: string;
  approvedBy?: string;
  approvedOption?: string;
  supersededBy?: string;
  /** The `## Resolution` body; the default records what was done. */
  resolution?: string;
  /** Lines placed between the title and the header list. */
  preamble?: string;
  /** The `## Blocked downstream items` body; the section is left out when absent. */
  blockedItems?: string;
}): string {
  return [
    "# Change Request",
    "",
    ...(fields.preamble === undefined ? [] : [fields.preamble, ""]),
    `- ID: \`${fields.id ?? "CR-20260801-0001"}\``,
    `- Class: \`${fields.changeClass ?? "defect"}\``,
    `- Status: \`${fields.status}\` <!-- open | approved | rejected | superseded -->`,
    `- Approved by: \`${fields.approvedBy ?? "user"}\``,
    "- Approved at: `2026-08-02T00:00:00Z`",
    `- Approved option: \`${fields.approvedOption ?? "-"}\``,
    `- Applied at: \`${fields.appliedAt ?? "-"}\` <!-- YYYY-MM-DDThh:mm:ssZ -->`,
    `- Superseded by: \`${fields.supersededBy ?? "-"}\``,
    "",
    ...(fields.blockedItems === undefined
      ? []
      : ["## Blocked downstream items", "", fields.blockedItems, ""]),
    "## Resolution",
    "",
    fields.resolution ?? "- Status: `approved`\n- Applied at: `2026-08-03T00:00:00Z`",
    "",
  ].join("\n");
}

const CR_FILE = "CR-20260801-0001-a-settled-question.md";

describe("QFAI-TDDLIST-021 — a blocked row whose Change Request is settled", () => {
  // Ordinary selection skips a `blocked` row and nothing else writes
  // `blocked -> todo`, so a row parked on a request that has since been decided
  // stays parked with no finding pointing at it.
  const blockedOnCr = `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | CR-20260801-0001 — blocked at todo |`;

  it("warns when the Change Request in Blocked-By is approved and applied", async () => {
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: {
        [CR_FILE]: changeRequest({ status: "approved", appliedAt: "2026-08-03T00:00:00Z" }),
      },
    });
    const found = issues.find((i) => i.code === "QFAI-TDDLIST-021");
    expect(found?.severity).toBe("warning");
    expect(found?.message).toContain("TDD-0001");
    expect(found?.message).toContain("CR-20260801-0001 (approved and applied)");
    expect(found?.suggested).toContain("/qfai-implement");
    expect(found?.suggested).toContain("`blocked -> todo`");
  });

  it("says nothing while the Change Request is still open", async () => {
    // The body's `- Status: approved` line is prose about the record, so it
    // must not stand in for the header's own `open`.
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: { [CR_FILE]: changeRequest({ status: "open" }) },
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
  });

  it("says nothing while an approved Change Request has not been applied", async () => {
    // The template treats an approved request as unresolved until `Applied at`
    // is filled, and the row still owes the obligation in its old form.
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: { [CR_FILE]: changeRequest({ status: "approved" }) },
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
  });

  it("says nothing when the Change Request resolves to no record", async () => {
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: {
        "CR-20260801-0002-another-question.md": changeRequest({
          status: "approved",
          appliedAt: "2026-08-03T00:00:00Z",
        }),
      },
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
  });

  it("says nothing while Blocked-By names another blocker beside the Change Request", async () => {
    // The other blocker can still be holding the row, so "waiting on nothing"
    // would be false.
    const row = `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | CR-20260801-0001, spec-0006:TDD-0034 — blocked at todo |`;
    const issues = await run(`${NINE_COL}\n${row}\n`, {
      decisions: { [CR_FILE]: changeRequest({ status: "rejected" }) },
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
  });

  it("reads the Evidence cell when the ledger has no Blocked-By to read", async () => {
    const row = `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | BLOCKED by CR-20260801-0001, which names this row |`;
    const issues = await run(`${EIGHT_COL}\n${row}\n`, {
      decisions: { [CR_FILE]: changeRequest({ status: "rejected" }) },
    });
    const found = issues.find((i) => i.code === "QFAI-TDDLIST-021");
    expect(found?.severity).toBe("warning");
    expect(found?.message).toContain("Evidence");
    expect(found?.message).toContain("CR-20260801-0001 (rejected)");
  });

  it("says nothing while the Evidence cell names another blocker beside the Change Request", async () => {
    // Evidence is prose, so a row reference beside the request can still be
    // holding the row.
    const row = `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | BLOCKED by CR-20260801-0001 and spec-0006:TDD-0034 |`;
    const issues = await run(`${EIGHT_COL}\n${row}\n`, {
      decisions: { [CR_FILE]: changeRequest({ status: "rejected" }) },
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
  });

  describe("a half-filled record is not settled", () => {
    const cases: ReadonlyArray<[string, Parameters<typeof changeRequest>[0]]> = [
      ["a rejected request with no approver", { status: "rejected", approvedBy: "-" }],
      ["a superseded request that names no successor", { status: "superseded" }],
      [
        "a rejected request whose Resolution holds only the template comment",
        { status: "rejected", resolution: "<!-- Record what was actually done. -->" },
      ],
      [
        "an approved intent request with no approved option",
        { status: "approved", appliedAt: "2026-08-03T00:00:00Z", changeClass: "intent" },
      ],
    ];
    it.each(cases)("says nothing for %s", async (_label, fields) => {
      const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
        decisions: { [CR_FILE]: changeRequest(fields) },
      });
      expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
    });
  });

  it("warns for a superseded request that names its successor", async () => {
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: {
        [CR_FILE]: changeRequest({ status: "superseded", supersededBy: "CR-20260801-0009" }),
      },
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDDLIST-021");
  });

  it("warns for an approved intent request that records its option", async () => {
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: {
        [CR_FILE]: changeRequest({
          status: "approved",
          appliedAt: "2026-08-03T00:00:00Z",
          changeClass: "intent",
          approvedOption: "2",
        }),
      },
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDDLIST-021");
  });

  it("says nothing when the record's declared id is not the one its file name carries", async () => {
    // A copy renamed without its header moving: the declared id is the
    // record's, so the row naming the file-name id has no record.
    const settledCopy = changeRequest({ status: "rejected", id: "CR-20260801-0003" });
    const namingFileId = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: { [CR_FILE]: settledCopy },
    });
    expect(namingFileId.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");

    const namingDeclaredId = await run(
      `${NINE_COL}\n${blockedOnCr.replace("CR-20260801-0001", "CR-20260801-0003")}\n`,
      { decisions: { [CR_FILE]: settledCopy } },
    );
    expect(namingDeclaredId.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
  });

  it("says nothing when two file names carry the same id", async () => {
    // Either file may be the record, and the second one is still open.
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: {
        "CR-20260801-0001-a.md": changeRequest({ status: "rejected" }),
        "CR-20260801-0001-b.md": changeRequest({ status: "open" }),
      },
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
  });

  it("finds a record whose slug is in the project's own language", async () => {
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: {
        "CR-20260801-0001-révision_des_bornes.v2.md": changeRequest({ status: "rejected" }),
      },
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDDLIST-021");
  });

  it("does not read a fenced example ahead of the header as the record", async () => {
    // The example's `Status` would otherwise win as the first occurrence.
    const preamble = ["```markdown", "- Status: `rejected`", "```"].join("\n");
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: { [CR_FILE]: changeRequest({ status: "open", preamble }) },
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
  });

  it("does not end the header at a heading inside a fenced example", async () => {
    const preamble = ["```markdown", "## Example", "```"].join("\n");
    const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
      decisions: { [CR_FILE]: changeRequest({ status: "rejected", preamble }) },
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDDLIST-021");
  });

  describe("a row another unresolved request still blocks", () => {
    // The ledger cell names only the settled request; the open one lists the
    // row in its own blocked set, which is the union the release recomputes.
    const openRequest = (item: string): string =>
      changeRequest({
        id: "CR-20260801-0002",
        status: "open",
        blockedItems: [
          "| Item | Kind | Why it depends on the artifact |",
          "| ---- | ---- | ------------------------------ |",
          `| \`${item}\` | \`ledger-row\` | Its TC is what this request changes |`,
          "",
          "- Not blocked by this CR: `spec-0001/TDD-0009`",
        ].join("\n"),
      });

    it("says nothing while the open request lists the row", async () => {
      const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
        decisions: {
          [CR_FILE]: changeRequest({ status: "rejected" }),
          "CR-20260801-0002-overlapping.md": openRequest("spec-0001/TDD-0001"),
        },
      });
      expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-021");
    });

    it("still warns when the open request lists the same row id in another spec", async () => {
      const issues = await run(`${NINE_COL}\n${blockedOnCr}\n`, {
        decisions: {
          [CR_FILE]: changeRequest({ status: "rejected" }),
          "CR-20260801-0002-overlapping.md": openRequest("spec-0002/TDD-0001"),
        },
      });
      expect(issues.map((i) => i.code)).toContain("QFAI-TDDLIST-021");
    });
  });
});
