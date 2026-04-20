import { mkdir } from "node:fs/promises";
import path from "node:path";

import { writeEvidenceFile } from "../evidence/fsEvidenceWriter.js";
import { MetricsWriter } from "../observability/writer.js";
import type { HarnessObservabilityAdapter } from "../harness/adapters.js";

export function createObservabilityAdapter(root: string): HarnessObservabilityAdapter {
  const writer = new MetricsWriter();
  const records: Array<{
    iteration: number;
    score: number;
    decision: string;
    terminationReason?: string;
  }> = [];

  return {
    recordIteration(data) {
      records.push(data);
      writer.write({
        type: "iteration",
        index: data.iteration,
        durationMs: 0,
        tokenCost: 0,
        model: "qfai-full-harness",
        ts: new Date().toISOString(),
      });
    },
    async flush() {
      const outputPath = path.join(root, ".qfai", "evidence", "full-harness-observability.json");
      await mkdir(path.dirname(outputPath), { recursive: true });
      writer.flush();
      await writeEvidenceFile(
        outputPath,
        JSON.stringify(
          {
            iterations: records,
            metrics: writer.getWritten(),
          },
          null,
          2,
        ),
      );
    },
  };
}
