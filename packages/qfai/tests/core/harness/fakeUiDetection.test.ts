import { describe, expect, it } from "vitest";

import { detectFakeUi } from "../../../src/core/harness/fakeUiDetection.js";

describe("detectFakeUi", () => {
  it("detects fake UI when neither render nor interaction confirm behavior", () => {
    const result = detectFakeUi({
      renderResults: [{ entries: [], filesWritten: [] }],
      browserQaResults: [
        {
          provider: "test",
          timestamp: "2026-04-05T00:00:00.000Z",
          phases: [
            {
              phase: "interaction",
              status: "executed",
              findings: [],
              repair_suggestions: [],
              evidence_refs: [],
              checks_performed: ["checked interaction"],
            },
          ],
        },
      ],
    });

    expect(result.detected).toBe(true);
    expect(result.confidence).toBe("high");
  });
});
