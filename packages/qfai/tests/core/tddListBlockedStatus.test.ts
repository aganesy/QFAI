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

import type * as FsPromises from "node:fs/promises";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../../src/core/sunset.js";
import { resolveToolVersion } from "../../src/core/version.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

/**
 * Make one steering entry unreadable, `.qfai/steering/unreadable.md`.
 *
 * A single unreadable file is the case the directory-level guard does not
 * cover, and no portable filesystem trick produces it: POSIX permission bits
 * are inert on Windows, and every other shape (a directory named `*.md`, a
 * dangling symlink) is skipped by the walk before it is ever read. Every other
 * path is delegated to the real module, so the rest of this file still
 * exercises real I/O.
 */
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  const readFile = async (
    target: Parameters<typeof actual.readFile>[0],
    options?: Parameters<typeof actual.readFile>[1],
  ): Promise<Awaited<ReturnType<typeof actual.readFile>>> => {
    if (typeof target === "string" && target.replace(/\\/g, "/").endsWith("/unreadable.md")) {
      throw new Error(`EACCES: permission denied, open '${target}'`);
    }
    return await actual.readFile(target, options);
  };
  return { ...actual, readFile };
});

const NINE_COL = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Blocked-By |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ---------- |`;

const EIGHT_COL = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |`;

/** `.qfai/steering/<name>.md` files to seed alongside the ledger. */
type SteeringSeed = Readonly<Record<string, string>>;

async function run(
  ledger: string,
  steering: SteeringSeed = {},
  opts: { readonly steeringIsRegularFile?: boolean } = {},
): Promise<Array<{ code: string; severity: string; message: string; suggested: string }>> {
  const root = path.join(
    os.tmpdir(),
    `qfai-blocked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
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
    if (opts.steeringIsRegularFile === true) {
      // A regular file where the surface belongs: `readdir` fails with
      // ENOTDIR, which is the portable stand-in for the EACCES / unreadable
      // nested folder cases that a unit test cannot create on every OS.
      await mkdir(path.join(root, ".qfai"), { recursive: true });
      await writeFile(path.join(root, ".qfai", "steering"), "not a directory\n", "utf-8");
    }
    const steeringNames = Object.keys(steering);
    if (steeringNames.length > 0) {
      const steeringDir = path.join(root, ".qfai", "steering");
      await mkdir(steeringDir, { recursive: true });
      for (const name of steeringNames) {
        await writeFile(path.join(steeringDir, name), steering[name] ?? "", "utf-8");
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

/**
 * A minimal, schema-valid work-log entry.
 *
 * Every required frontmatter key of `worklog-entry.schema.md` is present,
 * `promote-to` included: the stop check counts an entry only when it is a
 * work-log by the schema, and a helper missing a required key would assert
 * that gate against a file the schema itself rejects.
 */
function entry(fields: {
  id: string;
  kind: string;
  status?: string;
  scope?: string;
  links?: string[];
  promoteTo?: string | null;
}): string {
  const links = fields.links ?? [];
  const promoteTo = fields.promoteTo === undefined ? null : fields.promoteTo;
  return [
    "---",
    `id: ${fields.id}`,
    `status: ${fields.status ?? "active"}`,
    `kind: ${fields.kind}`,
    "created: 2026-08-22",
    "updated: 2026-08-22",
    `scope: ${fields.scope ?? "global"}`,
    "blocking: true",
    `promote-to: ${promoteTo === null ? "null" : promoteTo}`,
    links.length > 0 ? `links:\n${links.map((l) => `  - ${l}`).join("\n")}` : "links: []",
    "---",
    "",
    "## Situation",
    "",
    "The upstream contract is defective.",
    "",
  ].join("\n");
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
    it(`accepts "${blocker}"`, async () => {
      const issues = await run(
        `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | ${blocker} |\n`,
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

describe("QFAI-TDD-001 — a stop must leave a steering record", () => {
  // `blocked` and `handoff` are the two conditions where the run stops and a
  // human or a later session picks it up — the case where a missing work-log
  // entry costs the most and the case where nobody is left in the loop to
  // notice it is missing. The ledger says the row stopped; nothing asked
  // whether `.qfai/steering/` says why.
  const BLOCKED_ROW = `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | CR-20260729-0008 |`;

  it("takes its severity from the promotion window, ending at `error`", async () => {
    // The obligation is `error` — the stage completes on
    // `validate --profile tdd --fail-on error`, so a permanent warning would
    // state it and gate nothing. But it is a NEW rule landing on stops
    // recorded before anyone was asked to account for them, on rows that are
    // terminal, so P7 gives it a window first: shipping it straight at `error`
    // took this repository's own dogfooding validate from 0 errors to 1 on
    // rows parked months before the check existed.
    //
    // Read from the pin rather than asserted as `"warning"`, so the assertion
    // stays true across the promotion instead of having to be edited at it.
    // What is pinned unconditionally is that the registry decides the severity
    // and that the window ends at `error`.
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`);
    const found = issues.find((i) => i.code === "QFAI-TDD-001");
    const promoteAt = RULE_PROMOTIONS.tddListBlockedWithoutWorklog.promoteAt;
    const severity = newRuleSeverity(await resolveToolVersion(), promoteAt);

    expect(found?.severity).toBe(severity);
    expect(newRuleSeverity(promoteAt, promoteAt)).toBe("error");
    expect(found?.message).toContain("spec-0001");
    if (severity === "warning") expect(found?.message).toContain(promoteAt);
  });

  it("points `links` at a global entry, the only scope that reads it", async () => {
    // Adding the spec to `links` on a `scope: spec-NNNN` entry does not clear
    // the finding, so the advice must not offer it unconditionally.
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`);
    const found = issues.find((i) => i.code === "QFAI-TDD-001");
    expect(found?.suggested).toContain("`scope: global` のエントリの `links`");
  });

  it("is satisfied by a kind: blocker entry scoped to the spec", async () => {
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, {
      "2026-08-22-stuck.md": entry({
        id: "2026-08-22-stuck",
        kind: "blocker",
        scope: "spec-0001",
      }),
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDD-001");
  });

  it("is satisfied by a global kind: handoff entry that links the spec", async () => {
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, {
      "2026-08-22-pause.md": entry({
        id: "2026-08-22-pause",
        kind: "handoff",
        status: "handoff",
        scope: "global",
        links: ["spec-0001"],
      }),
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDD-001");
  });

  it("is not satisfied by an entry of another kind", async () => {
    // A milestone or a decision is not a record of a stopped run.
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, {
      "2026-08-22-note.md": entry({
        id: "2026-08-22-note",
        kind: "milestone",
        scope: "spec-0001",
      }),
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDD-001");
  });

  it("is not satisfied by a blocker entry that names a different spec", async () => {
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, {
      "2026-08-22-elsewhere.md": entry({
        id: "2026-08-22-elsewhere",
        kind: "blocker",
        scope: "spec-0006",
        links: ["spec-0006"],
      }),
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDD-001");
  });

  it("reports one finding per spec, not one per blocked row", async () => {
    const issues = await run(
      `${NINE_COL}\n${BLOCKED_ROW}\n| TDD-0002 | TC-0002 | Unit | tests/b.test.ts | b | blocked | - | - | CR-20260729-0009 |\n`,
    );
    expect(issues.filter((i) => i.code === "QFAI-TDD-001")).toHaveLength(1);
  });

  it("says nothing when no row is blocked", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | todo | - | - |  |\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("QFAI-TDD-001");
  });

  it("is not satisfied by an archived entry", async () => {
    // The closed state. A blocker resolved months ago must not stand in for
    // the record today's stop owes, or the spec's first blocker would silence
    // the check for the life of the project.
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, {
      "2026-05-01-old.md": entry({
        id: "2026-05-01-old",
        kind: "blocker",
        status: "archived",
        scope: "spec-0001",
      }),
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDD-001");
  });

  it("is not satisfied by a file that is not a schema-shaped entry", async () => {
    // `--profile tdd` never runs `validateWorklogSurface`, so a stub carrying
    // only `kind:` and `scope:` would otherwise suppress the finding with
    // nothing else reporting it.
    const stub = ["---", "kind: blocker", "scope: spec-0001", "---", "", "stuck", ""].join("\n");
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, { "stub.md": stub });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDD-001");
  });

  it("is not satisfied by another spec's entry that merely links this spec", async () => {
    // `scope: spec-0002` applies to spec-0002 alone; `links` is a
    // cross-reference. spec-0001's implementation skill filters on
    // `scope ∈ {global, spec-0001}` and never reads this entry.
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, {
      "2026-08-22-other.md": entry({
        id: "2026-08-22-other",
        kind: "blocker",
        scope: "spec-0002",
        links: ["spec-0001"],
      }),
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDD-001");
  });

  it("reports an unwalkable steering surface without aborting the ledger run", async () => {
    // The row also has an empty `Blocked-By`, so a ledger check unrelated to
    // the steering surface must still be reported.
    const noRef = `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - |  |`;
    const issues = await run(`${NINE_COL}\n${noRef}\n`, {}, { steeringIsRegularFile: true });
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("QFAI-TDD-002");
    // The surface gave no answer, so the stop check abstains rather than
    // accusing every blocked spec of an omission it cannot see.
    expect(codes).not.toContain("QFAI-TDD-001");
    // And the rest of the ledger was still validated.
    expect(codes).toContain("TDDLIST_BLOCKED_MISSING_REF");
  });

  it("is not satisfied by an entry with no `promote-to` key", async () => {
    // `promote-to` is required by `worklog-entry.schema.md` (string OR null),
    // and `--profile tdd` never runs `validateWorklogSurface` — so an entry
    // missing it would count as a stop record here while no profile reports
    // that it is schema-invalid.
    const withoutPromoteTo = entry({
      id: "2026-08-22-stuck",
      kind: "blocker",
      scope: "spec-0001",
    })
      .split("\n")
      .filter((line) => !line.startsWith("promote-to:"))
      .join("\n");
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, {
      "2026-08-22-stuck.md": withoutPromoteTo,
    });
    expect(issues.map((i) => i.code)).toContain("QFAI-TDD-001");
  });

  it("holds the stop judgement when one entry file cannot be read", async () => {
    // The directory walk succeeded, so the ledger run continues — but the one
    // file that could not be opened may be exactly the record this stop owes.
    // Reporting the omission would accuse the author on the strength of
    // evidence nobody managed to read.
    const issues = await run(`${NINE_COL}\n${BLOCKED_ROW}\n`, {
      "unreadable.md": entry({ id: "unreadable", kind: "blocker", scope: "spec-0001" }),
    });
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("QFAI-TDD-002");
    expect(codes).not.toContain("QFAI-TDD-001");
    const found = issues.find((i) => i.code === "QFAI-TDD-002");
    // The finding names the file, not just the surface, so the operator knows
    // which one to repair.
    expect(found?.message).toContain("unreadable.md");
  });
});
