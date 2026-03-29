/**
 * MetricsWriter — writes metric records to a sink with buffering on failure.
 * SPEC-0032
 *
 * On sink failure: buffers locally and logs a warning.
 * On sink recovery: flushes the buffer.
 */

import type { MetricRecord } from "./types.js";

export class MetricsWriter {
  private sinkAvailable = true;
  private buffer: MetricRecord[] = [];
  private written: MetricRecord[] = [];
  private warnings: string[] = [];

  /** Writes a record to the sink, or buffers it if the sink is down. */
  write(record: MetricRecord): void {
    if (this.sinkAvailable) {
      this.written.push(record);
    } else {
      this.buffer.push(record);
      this.warnings.push(`[WARN] Sink unavailable — buffered record (type=${record.type})`);
    }
  }

  /** Simulates sink availability changes. */
  setSinkAvailable(available: boolean): void {
    this.sinkAvailable = available;
  }

  /** Returns currently buffered (unwritten) records. */
  getBuffer(): MetricRecord[] {
    return [...this.buffer];
  }

  /** Returns all warnings logged during sink failures. */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /** Returns all records successfully written to the sink. */
  getWritten(): MetricRecord[] {
    return [...this.written];
  }

  /** Flushes buffered records to the sink when available. Returns flushed records. */
  flush(): MetricRecord[] {
    if (!this.sinkAvailable) {
      return [];
    }
    const flushed = [...this.buffer];
    this.written.push(...flushed);
    this.buffer = [];
    return flushed;
  }
}
