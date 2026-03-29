/**
 * MetricsCollector — collects per-iteration metrics and computes aggregates.
 * SPEC-0032
 *
 * PII exclusion: never includes file contents, emails, or names in metrics.
 * 100% emission guarantee: all emitted metrics are stored.
 */

import type {
  AggregateMetric,
  HistoricalEntry,
  MetricRecord,
  PerIterationMetric,
} from "./types.js";

export class MetricsCollector {
  private iterations: PerIterationMetric[] = [];
  private history: HistoricalEntry[] = [];

  /** Stores a per-iteration metric. */
  emitIteration(metric: PerIterationMetric): void {
    this.iterations.push({ ...metric });
  }

  /** Computes an aggregate from all collected iterations. */
  emitAggregate(runId: string): AggregateMetric {
    const totalCost = this.iterations.reduce((s, m) => s + m.tokenCost, 0);
    const totalTime = this.iterations.reduce((s, m) => s + m.durationMs, 0);
    const ts = new Date().toISOString();

    const aggregate: AggregateMetric = {
      type: "aggregate",
      totalCost,
      totalTime,
      iterationCount: this.iterations.length,
      runId,
      ts,
    };

    this.history.push({
      runId,
      timestamp: ts,
      totalCost,
      totalTime,
    });

    return aggregate;
  }

  /** Returns all collected per-iteration metrics. */
  getIterations(): PerIterationMetric[] {
    return [...this.iterations];
  }

  /** Returns historical entries sorted ascending by timestamp. */
  getHistory(): HistoricalEntry[] {
    return [...this.history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /** Formats a MetricRecord as a JSON Lines string. */
  formatJsonLine(record: MetricRecord): string {
    return JSON.stringify(record);
  }
}
