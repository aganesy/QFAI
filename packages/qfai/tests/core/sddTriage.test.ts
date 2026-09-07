import { describe, expect, it } from "vitest";

import {
  bestSubjectMatch,
  classifyTriage,
  DEFAULT_TRIAGE_THRESHOLDS,
  isUpdateOp,
  renderTriageMarkdown,
  requiresApproval,
  subOp,
  topLevelOp,
  type TriageRow,
} from "../../src/core/sddTriage.js";
import type { SpecSummary } from "../../src/core/specSummary.js";
import { validateTriageSection } from "../../src/core/validators/specPack.js";

function makeSummary(spec: Partial<SpecSummary> & { specId: string }): SpecSummary {
  return {
    title: "Spec",
    status: "active",
    scopeIn: [],
    scopeOut: [],
    layout: "layered",
    acCount: 0,
    tcCount: 0,
    ...spec,
  };
}

describe("classifyTriage", () => {
  it("classifies REQs as CREATE only when no active spec scope absorbs the requirement", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0001", subject: "alpha", capability: "CAP-0099" }],
      summaries: [
        makeSummary({
          specId: "spec-0001",
          capability: "CAP-0001",
          title: "zeta module",
          scopeIn: ["zeta"],
        }),
      ],
    });
    expect(rows[0]).toMatchObject({
      source: "REQ-0001",
      subject: "alpha",
      existingSpec: null,
      op: "CREATE",
    });
    expect(rows[0]?.rationale).toMatch(/add CAP-NNNN/);
    expect(rows[0]?.rationale).toMatch(/QFAI-TRIAGE-006/);
  });

  it("falls back to UPDATE:APPEND on the closest spec when capability is unknown but tokens overlap", () => {
    const rows = classifyTriage({
      reqs: [
        {
          id: "REQ-0001b",
          subject: "extend packaging command behavior",
          capability: "CAP-9999",
        },
      ],
      summaries: [
        makeSummary({
          specId: "spec-0001",
          capability: "CAP-0001",
          title: "auth module",
          scopeIn: ["auth"],
        }),
        makeSummary({
          specId: "spec-0002",
          capability: "CAP-0002",
          title: "packaging command",
          scopeIn: ["packaging"],
        }),
      ],
    });
    expect(rows[0]).toMatchObject({
      existingSpec: "spec-0002",
      op: { update: "APPEND" },
    });
    expect(rows[0]?.rationale).toMatch(/subject-overlap fallback/);
  });

  it("keeps a fallback on an oversized spec as UPDATE:APPEND with a size signal", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0001c", subject: "extend packaging command", capability: undefined }],
      summaries: [
        makeSummary({
          specId: "spec-0002",
          capability: "CAP-0002",
          title: "packaging command",
          scopeIn: ["packaging"],
          acCount: DEFAULT_TRIAGE_THRESHOLDS.ac + 1,
        }),
      ],
    });
    expect(rows[0]?.op).toEqual({ update: "APPEND" });
    expect(rows[0]?.existingSpec).toBe("spec-0002");
    expect(rows[0]?.rationale).toMatch(/size signal/);
    expect(rows[0]?.rationale).toMatch(/QFAI-SPLIT-102/);
  });

  it("classifies REQs matching a single small spec as UPDATE:APPEND", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0002", subject: "extend rule", capability: "CAP-0001" }],
      summaries: [makeSummary({ specId: "spec-0001", capability: "CAP-0001", acCount: 5 })],
    });
    expect(rows).toEqual([
      {
        source: "REQ-0002",
        subject: "extend rule",
        existingSpec: "spec-0001",
        op: { update: "APPEND" },
      },
    ]);
  });

  it("classifies REQs matching multiple specs as MERGE", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0003", subject: "consolidation", capability: "CAP-0001" }],
      summaries: [
        makeSummary({ specId: "spec-0001", capability: "CAP-0001" }),
        makeSummary({ specId: "spec-0002", capability: "CAP-0001" }),
      ],
    });
    expect(rows[0]?.op).toBe("MERGE");
    expect(rows[0]?.existingSpec).toBe("spec-0001+spec-0002");
    // No breach, no note.
    expect(rows[0]?.rationale).toBeUndefined();
  });

  it("records the size signal on a MERGE row, naming every breaching target", () => {
    // Step 4 of the Slice Policy runs after step 3, not instead of it. The
    // MERGE branch returned before the thresholds were evaluated, so the
    // signal the policy promises was simply absent for every MERGE row.
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0031", subject: "consolidation", capability: "CAP-0001" }],
      summaries: [
        makeSummary({
          specId: "spec-0001",
          capability: "CAP-0001",
          acCount: DEFAULT_TRIAGE_THRESHOLDS.ac + 1,
        }),
        makeSummary({ specId: "spec-0002", capability: "CAP-0001" }),
        makeSummary({
          specId: "spec-0003",
          capability: "CAP-0001",
          tcCount: DEFAULT_TRIAGE_THRESHOLDS.tc + 1,
        }),
      ],
    });
    // The operation is untouched — the breach never rewrites MERGE to APPEND.
    expect(rows[0]?.op).toBe("MERGE");
    expect(rows[0]?.rationale).toMatch(/size signal/);
    expect(rows[0]?.rationale).toContain("spec-0001 has ac=31");
    expect(rows[0]?.rationale).toContain("spec-0003 has ac=0");
    // The target that is within both thresholds is not named.
    expect(rows[0]?.rationale).not.toContain("spec-0002");
    expect(rows[0]?.rationale).toContain("MERGE stands");
    expect(rows[0]?.rationale).toContain("QFAI-SPLIT-102/104");
  });

  it("keeps an AC-threshold breach as UPDATE:APPEND with a size signal", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0004", subject: "extend large spec", capability: "CAP-0001" }],
      summaries: [
        makeSummary({
          specId: "spec-0001",
          capability: "CAP-0001",
          acCount: DEFAULT_TRIAGE_THRESHOLDS.ac + 1,
        }),
      ],
    });
    // A count breach is a signal, not the operation. SPLIT on a
    // single-capability spec would raise QFAI-SPLIT-102/104 at `error`.
    expect(rows[0]?.op).toEqual({ update: "APPEND" });
    expect(rows[0]?.rationale).toMatch(/size signal/);
  });

  it("keeps a TC-threshold breach as UPDATE:APPEND with a size signal", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0005", subject: "extend large spec", capability: "CAP-0001" }],
      summaries: [
        makeSummary({
          specId: "spec-0001",
          capability: "CAP-0001",
          tcCount: DEFAULT_TRIAGE_THRESHOLDS.tc + 1,
        }),
      ],
    });
    expect(rows[0]?.op).toEqual({ update: "APPEND" });
    expect(rows[0]?.rationale).toMatch(/size signal/);
  });

  it("never emits SPLIT, whatever the counts or the branch taken", () => {
    const oversized = {
      acCount: DEFAULT_TRIAGE_THRESHOLDS.ac + 1,
      tcCount: DEFAULT_TRIAGE_THRESHOLDS.tc + 1,
    };
    const rows = classifyTriage({
      reqs: [
        // capability match on an oversized spec
        { id: "REQ-0101", subject: "extend alpha", capability: "CAP-0001" },
        // subject-overlap fallback onto an oversized spec
        { id: "REQ-0102", subject: "beta tweak" },
        // removal hint against an oversized spec
        { id: "REQ-0103", subject: "extend alpha", capability: "CAP-0001", removalHint: true },
        // no overlap at all -> CREATE
        { id: "REQ-0104", subject: "unrelated zeta subject", capability: "CAP-0099" },
      ],
      summaries: [
        makeSummary({ specId: "spec-0001", capability: "CAP-0001", title: "alpha", ...oversized }),
        makeSummary({
          specId: "spec-0002",
          capability: "CAP-0002",
          title: "beta",
          scopeIn: ["beta"],
          ...oversized,
        }),
      ],
    });
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(topLevelOp(row.op)).not.toBe("SPLIT");
    }
  });

  it("respects custom thresholds", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0006", subject: "extend", capability: "CAP-0001" }],
      summaries: [makeSummary({ specId: "spec-0001", capability: "CAP-0001", acCount: 5 })],
      thresholds: { ac: 3, tc: 100 },
    });
    expect(rows[0]?.op).toEqual({ update: "APPEND" });
    expect(rows[0]?.rationale).toMatch(/threshold 3/);
  });

  it("classifies removal hints as UPDATE:REMOVE", () => {
    const rows = classifyTriage({
      reqs: [
        {
          id: "REQ-0007",
          subject: "drop obsolete flag",
          capability: "CAP-0001",
          removalHint: true,
        },
      ],
      summaries: [makeSummary({ specId: "spec-0001", capability: "CAP-0001", acCount: 5 })],
    });
    expect(rows[0]?.op).toEqual({ update: "REMOVE" });
  });

  it("marks the targetless DELETE proposal as a placeholder the validator will refuse", () => {
    // No active spec absorbs the removal, so the classifier can only propose
    // DELETE with an unresolved target. DELETE removes a whole spec
    // directory, so `QFAI-TRIAGE-009` refuses the rendered row until the
    // target is filled in — the rationale has to say so, the same contract
    // the CREATE placeholder has with `QFAI-TRIAGE-006`.
    const rows = classifyTriage({
      reqs: [
        {
          id: "REQ-0011",
          subject: "retire zeta",
          capability: "CAP-0099",
          removalHint: true,
        },
      ],
      summaries: [makeSummary({ specId: "spec-0001", capability: "CAP-0001", title: "alpha" })],
    });
    const proposal = rows[0];
    expect(proposal?.op).toBe("DELETE");
    expect(proposal?.existingSpec).toBeNull();
    expect(proposal?.rationale).toContain("QFAI-TRIAGE-009");
    expect(proposal?.rationale).toMatch(/Existing Spec/);
    if (!proposal) return;
    const rendered = renderTriageMarkdown([{ ...proposal, approvedBy: "user@host" }]);
    expect(
      // A version inside every promotion window, so a rule still inside its
      // window reports at its pre-promotion severity. `renderTriageMarkdown`
      // writes a canonical `## Triage`, so nothing here reaches the heading
      // rule and this stays a single-code assertion either way.
      validateTriageSection(`# 09 Delta\n\n${rendered}`, "spec-0042/09_delta.md", "0.0.0").map(
        (entry) => entry.code,
      ),
    ).toEqual(["QFAI-TRIAGE-009"]);
  });

  it("classifies removal hint with multiple capability matches as MERGE", () => {
    const rows = classifyTriage({
      reqs: [
        {
          id: "REQ-0010",
          subject: "drop obsolete behavior",
          capability: "CAP-0001",
          removalHint: true,
        },
      ],
      summaries: [
        makeSummary({ specId: "spec-0001", capability: "CAP-0001" }),
        makeSummary({ specId: "spec-0002", capability: "CAP-0001" }),
      ],
    });
    expect(rows[0]?.op).toBe("MERGE");
    expect(rows[0]?.existingSpec).toBe("spec-0001+spec-0002");
    expect(rows[0]?.rationale).toMatch(/removal-intent/);
  });

  it("records the size signal on a removal-intent MERGE too", () => {
    const rows = classifyTriage({
      reqs: [
        {
          id: "REQ-0032",
          subject: "retire",
          capability: "CAP-0001",
          removalHint: true,
        },
      ],
      summaries: [
        makeSummary({
          specId: "spec-0001",
          capability: "CAP-0001",
          acCount: DEFAULT_TRIAGE_THRESHOLDS.ac + 1,
        }),
        makeSummary({ specId: "spec-0002", capability: "CAP-0001" }),
      ],
    });
    expect(rows[0]?.op).toBe("MERGE");
    // The existing removal-intent note is kept, the signal is appended.
    expect(rows[0]?.rationale).toMatch(/removal-intent/);
    expect(rows[0]?.rationale).toMatch(/size signal/);
    expect(rows[0]?.rationale).toContain("spec-0001 has ac=31");
  });

  it("ignores non-active specs when looking up matches", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0008", subject: "extend", capability: "CAP-0001" }],
      summaries: [
        makeSummary({ specId: "spec-0001", capability: "CAP-0001", status: "deprecated" }),
      ],
    });
    expect(rows[0]?.op).toBe("CREATE");
    expect(rows[0]?.existingSpec).toBeNull();
  });

  it("classifies as CREATE when REQ has no capability", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0009", subject: "uncategorized" }],
      summaries: [makeSummary({ specId: "spec-0001", capability: "CAP-0001" })],
    });
    expect(rows[0]?.op).toBe("CREATE");
  });

  it("keeps an oversized removal hint as UPDATE:REMOVE with a size signal (AC)", () => {
    // PR #206 review #3: removalHint path should mirror the additive
    // size-threshold escalation. Without this the additive and removal
    // branches diverge on size handling.
    const rows = classifyTriage({
      reqs: [
        {
          id: "REQ-0011",
          subject: "drop obsolete oversized rule",
          capability: "CAP-0001",
          removalHint: true,
        },
      ],
      summaries: [
        makeSummary({
          specId: "spec-0001",
          capability: "CAP-0001",
          acCount: DEFAULT_TRIAGE_THRESHOLDS.ac + 1,
        }),
      ],
    });
    expect(rows[0]?.op).toEqual({ update: "REMOVE" });
    expect(rows[0]?.existingSpec).toBe("spec-0001");
    expect(rows[0]?.rationale).toMatch(/size signal/);
    expect(rows[0]?.rationale).toMatch(/QFAI-SPLIT-102/);
  });

  it("keeps an oversized removal hint as UPDATE:REMOVE with a size signal (TC)", () => {
    const rows = classifyTriage({
      reqs: [
        {
          id: "REQ-0012",
          subject: "drop obsolete oversized rule",
          capability: "CAP-0001",
          removalHint: true,
        },
      ],
      summaries: [
        makeSummary({
          specId: "spec-0001",
          capability: "CAP-0001",
          tcCount: DEFAULT_TRIAGE_THRESHOLDS.tc + 1,
        }),
      ],
    });
    expect(rows[0]?.op).toEqual({ update: "REMOVE" });
    expect(rows[0]?.rationale).toMatch(/size signal/);
  });

  it("keeps removal hint as UPDATE:REMOVE when the target spec is within thresholds", () => {
    // Sanity check that the size-threshold escalation does not fire for
    // a small spec — preserves the existing UPDATE:REMOVE behaviour.
    const rows = classifyTriage({
      reqs: [
        {
          id: "REQ-0013",
          subject: "drop obsolete flag",
          capability: "CAP-0001",
          removalHint: true,
        },
      ],
      summaries: [
        makeSummary({ specId: "spec-0001", capability: "CAP-0001", acCount: 5, tcCount: 5 }),
      ],
    });
    expect(rows[0]?.op).toEqual({ update: "REMOVE" });
  });
});

describe("requiresApproval", () => {
  it.each(["CREATE", "DELETE", "SPLIT", "MERGE", "SUPERSEDE"] as const)(
    "returns true for top-level %s",
    (op) => {
      expect(requiresApproval(op)).toBe(true);
    },
  );

  it("returns false for UPDATE:APPEND", () => {
    expect(requiresApproval({ update: "APPEND" })).toBe(false);
  });

  it("returns false for UPDATE:MODIFY", () => {
    expect(requiresApproval({ update: "MODIFY" })).toBe(false);
  });

  it("returns true for UPDATE:REMOVE", () => {
    expect(requiresApproval({ update: "REMOVE" })).toBe(true);
  });
});

describe("op helpers", () => {
  it("isUpdateOp distinguishes UPDATE from top-level ops", () => {
    expect(isUpdateOp("CREATE")).toBe(false);
    expect(isUpdateOp({ update: "APPEND" })).toBe(true);
  });

  it("topLevelOp returns UPDATE for sub-op variants", () => {
    expect(topLevelOp({ update: "MODIFY" })).toBe("UPDATE");
    expect(topLevelOp("SPLIT")).toBe("SPLIT");
  });

  it("subOp returns null for top-level ops", () => {
    expect(subOp("CREATE")).toBeNull();
    expect(subOp({ update: "REMOVE" })).toBe("REMOVE");
  });
});

describe("bestSubjectMatch", () => {
  it("returns undefined when no active spec shares any token", () => {
    const result = bestSubjectMatch("alpha bravo", [
      makeSummary({ specId: "spec-0001", title: "zeta module", scopeIn: ["zeta"] }),
    ]);
    expect(result).toBeUndefined();
  });

  it("picks the spec with the highest token overlap", () => {
    const result = bestSubjectMatch("packaging command extension", [
      makeSummary({
        specId: "spec-0001",
        title: "auth module",
        scopeIn: ["auth"],
      }),
      makeSummary({
        specId: "spec-0002",
        title: "packaging command",
        scopeIn: ["packaging"],
      }),
    ]);
    expect(result?.specId).toBe("spec-0002");
  });

  it("breaks ties by smaller acCount, then lexicographic specId", () => {
    const result = bestSubjectMatch("packaging command", [
      makeSummary({
        specId: "spec-0002",
        title: "packaging command",
        scopeIn: ["packaging"],
        acCount: 10,
      }),
      makeSummary({
        specId: "spec-0001",
        title: "packaging command",
        scopeIn: ["packaging"],
        acCount: 10,
      }),
    ]);
    expect(result?.specId).toBe("spec-0001");
  });

  it("ignores non-active specs", () => {
    const result = bestSubjectMatch("packaging command", [
      makeSummary({
        specId: "spec-0001",
        title: "packaging command",
        scopeIn: ["packaging"],
        status: "deprecated",
      }),
    ]);
    expect(result).toBeUndefined();
  });

  it("ignores tokens that appear only in scopeOut", () => {
    const result = bestSubjectMatch("packaging command", [
      makeSummary({
        specId: "spec-0001",
        title: "auth module",
        scopeIn: ["auth"],
        scopeOut: ["packaging command"],
      }),
    ]);
    expect(result).toBeUndefined();
  });

  it("tokenises across CJK middle-dot separators (Unicode property escape)", () => {
    // PR #206 review #12 / #23: middle dot `・` must split CJK compounds
    // so that subjects like `プロトタイプ・契約` token-overlap with a
    // spec whose scope mentions `契約`.
    const result = bestSubjectMatch("プロトタイプ・契約 の改修", [
      makeSummary({
        specId: "spec-0001",
        title: "契約 module",
        scopeIn: ["契約"],
      }),
    ]);
    expect(result?.specId).toBe("spec-0001");
  });

  it("tokenises full-width alphanumerics", () => {
    // PR #206 review #12 / #23: full-width `Ａｐｐ` must tokenise as
    // its own token rather than being lumped together with surrounding
    // punctuation. The new `\p{L}\p{N}` splitter handles this without
    // requiring callers to pre-normalise.
    const result = bestSubjectMatch("Ａｐｐ flow update", [
      makeSummary({
        specId: "spec-0001",
        title: "Ａｐｐ flow",
        scopeIn: ["Ａｐｐ"],
      }),
    ]);
    expect(result?.specId).toBe("spec-0001");
  });

  it("tokenises half-width katakana (e.g. ｶﾀｶﾅ)", () => {
    // Half-width katakana lives in U+FF65..U+FF9F. The previous
    // `[぀-ヿ㐀-鿿]` character class missed this range; the new
    // `\p{L}` splitter accepts it.
    const result = bestSubjectMatch("ｶﾀｶﾅ display behaviour", [
      makeSummary({
        specId: "spec-0001",
        title: "ｶﾀｶﾅ display",
        scopeIn: ["ｶﾀｶﾅ"],
      }),
    ]);
    expect(result?.specId).toBe("spec-0001");
  });
});

describe("renderTriageMarkdown", () => {
  it("renders the canonical triage table layout", () => {
    const rows: TriageRow[] = [
      {
        source: "REQ-0042",
        subject: "spec layout migration",
        existingSpec: "spec-0008",
        op: { update: "APPEND" },
      },
      {
        source: "REQ-0043",
        subject: "obsolete CLI flag",
        existingSpec: "spec-0005",
        op: { update: "REMOVE" },
        approvedBy: "user@host",
        rationale: "Flag dropped in v1.9",
      },
      {
        source: "REQ-0044",
        subject: "new packaging command",
        existingSpec: null,
        op: "CREATE",
        approvedBy: "user@host",
      },
    ];

    const md = renderTriageMarkdown(rows);
    expect(md).toContain("## Triage");
    expect(md).toContain(
      "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
    );
    expect(md).toContain(
      "| REQ-0042 | spec layout migration | spec-0008 | UPDATE | APPEND | - | - |",
    );
    expect(md).toContain(
      "| REQ-0043 | obsolete CLI flag | spec-0005 | UPDATE | REMOVE | user@host | Flag dropped in v1.9 |",
    );
    expect(md).toContain("| REQ-0044 | new packaging command | - | CREATE | - | user@host | - |");
  });

  it("escapes literal pipes and newlines so the table round-trips through parseAllMarkdownTables", async () => {
    // PR #206 review Lsbk: render must not let unescaped `|` or
    // embedded `\n` from REQ subject / rationale break the table.
    const { parseAllMarkdownTables } = await import("../../src/core/specPackParsers.js");
    const rows: TriageRow[] = [
      {
        source: "REQ-pipe",
        subject: "support a|b switch",
        existingSpec: "spec-0001",
        op: { update: "APPEND" },
        rationale: "see line\nbreak",
      },
    ];
    const md = renderTriageMarkdown(rows);
    // The persisted text must keep the escape so downstream parsers
    // see one logical pipe, not column breaks.
    expect(md).toContain("support a\\|b switch");
    expect(md).not.toMatch(/\n.*see line\nbreak/);
    const tableSection = md.replace(/^## Triage\n\n/, "");
    const tables = parseAllMarkdownTables(tableSection);
    expect(tables).toHaveLength(1);
    const table = tables[0];
    if (!table) throw new Error("expected one parsed table");
    expect(table.headers).toHaveLength(7);
    expect(table.rows).toHaveLength(1);
    const row = table.rows[0];
    if (!row) throw new Error("expected one parsed row");
    expect(row).toHaveLength(7);
    expect(row[1]).toBe("support a|b switch");
    expect(row[6]).toBe("see line break");
  });

  // PR #206 review NkNm / NkzP / Nk-A / NlLz: escapeTableCell and
  // splitMarkdownRow must agree on what a cell can contain. The parser
  // only un-escapes `\|` → `|`, so literal `\` must be persisted as-is
  // (never doubled). Round-trip identity for these inputs is the
  // contract; if a future change re-introduces `\` → `\\` here without
  // a matching parser rule, these assertions fire instead of silently
  // mutating REQ subjects (Windows paths, regex literals).
  //
  // PR #206 review NxI0: trace markers for the spec entries.
  // QFAI:SPEC-0013:TC-0013-0018 (Type=edge — backslash-only / a\|b /
  //   CRLF / CR-only / path\\|file)
  // QFAI:SPEC-0013:TC-0013-0019 (Type=normal — plain ASCII happy path)
  describe("escapeTableCell ↔ splitMarkdownRow round-trip identity", () => {
    async function roundTripCell(subject: string, rationale: string): Promise<string[]> {
      const { parseAllMarkdownTables } = await import("../../src/core/specPackParsers.js");
      const md = renderTriageMarkdown([
        {
          source: "REQ-rt",
          subject,
          existingSpec: "spec-0001",
          op: { update: "APPEND" },
          rationale,
        },
      ]);
      const tableSection = md.replace(/^## Triage\n\n/, "");
      const tables = parseAllMarkdownTables(tableSection);
      const table = tables[0];
      if (!table) throw new Error("expected one parsed table");
      const row = table.rows[0];
      if (!row) throw new Error("expected one parsed row");
      return row;
    }

    it("plain ASCII subject and rationale (happy path) round-trip unchanged", async () => {
      // TC-0013-0019 (Type=normal): the AC-0013-0012 round-trip
      // identity property must hold for the dominant case — clean
      // ASCII text containing none of the escape-relevant characters
      // (no `|`, no `\`, no `\r` / `\n`). Required by BR-0013-0008
      // (every AC needs a Type=normal TC alongside non-normal TCs).
      const row = await roundTripCell("hello world", "see related discussion");
      expect(row[1]).toBe("hello world");
      expect(row[6]).toBe("see related discussion");
    });

    it("backslash-only subject (Windows path) round-trips unchanged", async () => {
      const row = await roundTripCell("C:\\Users\\spec.md", "matches \\d+ pattern");
      expect(row[1]).toBe("C:\\Users\\spec.md");
      expect(row[6]).toBe("matches \\d+ pattern");
    });

    it("backslash + pipe combo (a\\|b) round-trips unchanged", async () => {
      // Literal `\` followed by literal `|` — the asymmetric escape
      // would have produced extra `\` characters here; symmetric escape
      // must round-trip the original 4-char string verbatim.
      const row = await roundTripCell("a\\|b", "regex (?:foo|\\bar)");
      expect(row[1]).toBe("a\\|b");
      expect(row[6]).toBe("regex (?:foo|\\bar)");
    });

    it("CRLF line breaks collapse to single space (Windows clipboard paste)", async () => {
      const row = await roundTripCell("subject", "line1\r\nline2");
      expect(row[6]).toBe("line1 line2");
    });

    it("CR-only line breaks collapse to single space (legacy Mac)", async () => {
      const row = await roundTripCell("subject", "line1\rline2");
      expect(row[6]).toBe("line1 line2");
    });

    it("backslash adjacent to escaped pipe (path\\\\|file) round-trips unchanged", async () => {
      // Two literal `\` followed by a literal `|`: the escape must not
      // confuse "literal `\\`" with "escape sequence for `\\|`".
      const row = await roundTripCell("path\\\\|file", "rationale");
      expect(row[1]).toBe("path\\\\|file");
    });
  });
});
