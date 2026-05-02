import { describe, expect, it } from "vitest";

import {
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
  it("classifies REQs without a matching capability as CREATE", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0001", subject: "new packaging command", capability: "CAP-0099" }],
      summaries: [makeSummary({ specId: "spec-0001", capability: "CAP-0001" })],
    });
    expect(rows).toEqual([
      {
        source: "REQ-0001",
        subject: "new packaging command",
        existingSpec: null,
        op: "CREATE",
      },
    ]);
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
  });

  it("upgrades to SPLIT when the matching spec exceeds AC threshold", () => {
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
    expect(rows[0]?.op).toBe("SPLIT");
  });

  it("upgrades to SPLIT when the matching spec exceeds TC threshold", () => {
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
    expect(rows[0]?.op).toBe("SPLIT");
  });

  it("respects custom thresholds", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0006", subject: "extend", capability: "CAP-0001" }],
      summaries: [makeSummary({ specId: "spec-0001", capability: "CAP-0001", acCount: 5 })],
      thresholds: { ac: 3, tc: 100 },
    });
    expect(rows[0]?.op).toBe("SPLIT");
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

  it("ignores non-active specs when looking up matches", () => {
    const rows = classifyTriage({
      reqs: [{ id: "REQ-0008", subject: "extend", capability: "CAP-0001" }],
      summaries: [makeSummary({ specId: "spec-0001", capability: "CAP-0001", status: "deprecated" })],
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
    expect(md).toContain("| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |");
    expect(md).toContain("| REQ-0042 | spec layout migration | spec-0008 | UPDATE | APPEND | - | - |");
    expect(md).toContain(
      "| REQ-0043 | obsolete CLI flag | spec-0005 | UPDATE | REMOVE | user@host | Flag dropped in v1.9 |",
    );
    expect(md).toContain("| REQ-0044 | new packaging command | (none) | CREATE | - | user@host | - |");
  });
});
