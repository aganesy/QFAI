import { describe, expect, it } from "vitest";

import { createFullHarnessHandoff } from "../../../src/core/harness/handoff.js";

describe("createFullHarnessHandoff", () => {
  it("builds canonical handoff fields", () => {
    const handoff = createFullHarnessHandoff({
      selectedBuild: "build-1",
      artifactRefs: ["run:1"],
      exitReason: "quality-threshold-met",
    });

    expect(handoff.selected_build).toBe("build-1");
    expect(handoff.artifact_refs).toEqual(["run:1"]);
    expect(handoff.exit_reason).toBe("quality-threshold-met");
  });
});
