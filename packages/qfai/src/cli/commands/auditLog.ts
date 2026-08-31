/**
 * `qfai audit log` — list `.qfai/evidence/decisions/<ts>.json` records.
 *
 * AC-0015-0019: SHOULD-level CLI; lists records newest-first and
 * supports `--scope` / `--operator` / `--clause` filters plus
 * `--format table|json` (table is the default).
 *
 * An empty / absent decisions directory yields an empty result without
 * error (exit 0). Filter values are AND-composed; passing multiple
 * filters narrows the result.
 */
import { readDecisionRecords } from "../../core/decisionRecord.js";
import { error as logError, info as logInfo } from "../lib/logger.js";

/**
 * `--format table` emits a tab-separated (TSV) layout — header row
 * `timestamp\tscope\toperator\tclause` followed by one TSV record per
 * row — NOT a column-padded ASCII table. The name is retained for
 * backward compatibility with the `qfai audit log --format table`
 * CLI surface; downstream consumers piping through `cut -f` or
 * `awk -F"\t"` should depend on the TSV layout, not on aligned
 * columns. An empty result set is the header row alone; the
 * "nothing matched" hint goes to stderr so it never enters a pipe.
 * Pass `--format json` for a structured payload.
 */
export type AuditLogFormat = "table" | "json";

export type AuditLogOptions = {
  root: string;
  format?: AuditLogFormat;
  scope?: string;
  operator?: string;
  clause?: string;
  /** Output sink (injectable for tests). Defaults to logger.info. */
  write?: (message: string) => void;
  /** Error sink. Defaults to logger.error. */
  writeErr?: (message: string) => void;
};

export type AuditLogRecordView = {
  timestamp: string;
  scope: string;
  operatorIdentity: string;
  envelopeContractClause: string;
  question: string;
  answer: string;
};

function applyFilters(
  records: AuditLogRecordView[],
  filters: { scope?: string; operator?: string; clause?: string },
): AuditLogRecordView[] {
  return records.filter((r) => {
    if (filters.scope !== undefined && r.scope !== filters.scope) return false;
    if (filters.operator !== undefined && r.operatorIdentity !== filters.operator) return false;
    if (filters.clause !== undefined && !r.envelopeContractClause.includes(filters.clause)) {
      return false;
    }
    return true;
  });
}

function sortNewestFirst(records: AuditLogRecordView[]): AuditLogRecordView[] {
  return [...records].sort((a, b) => {
    if (a.timestamp < b.timestamp) return 1;
    if (a.timestamp > b.timestamp) return -1;
    return 0;
  });
}

/**
 * Render the TSV layout. The header row is unconditional: an empty
 * result set is a header row with zero data rows, so stdout stays a
 * well-formed TSV stream for `cut -f` / `awk -F"\t"` consumers. The
 * human-facing "nothing matched" hint belongs on stderr instead.
 */
function formatTable(records: AuditLogRecordView[]): string {
  const lines: string[] = [];
  lines.push("timestamp\tscope\toperator\tclause");
  for (const r of records) {
    lines.push(`${r.timestamp}\t${r.scope}\t${r.operatorIdentity}\t${r.envelopeContractClause}`);
  }
  return lines.join("\n");
}

/**
 * Read decision records, apply filters, sort newest-first, and emit.
 * Returns the CLI exit code (0 on success, 1 on unrecoverable read
 * error — empty store is success).
 */
export async function runAuditLog(options: AuditLogOptions): Promise<number> {
  const format: AuditLogFormat = options.format ?? "table";
  const write = options.write ?? logInfo;
  const writeErr = options.writeErr ?? logError;
  let records: AuditLogRecordView[];
  try {
    const raw = await readDecisionRecords(options.root);
    records = raw.map((r) => ({
      timestamp: r.timestamp,
      scope: r.scope,
      operatorIdentity: r.operatorIdentity,
      envelopeContractClause: r.envelopeContractClause,
      question: r.question,
      answer: r.answer,
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    writeErr(`qfai audit log: failed to read decisions/: ${message}`);
    return 1;
  }
  const filtered = applyFilters(records, {
    ...(options.scope !== undefined ? { scope: options.scope } : {}),
    ...(options.operator !== undefined ? { operator: options.operator } : {}),
    ...(options.clause !== undefined ? { clause: options.clause } : {}),
  });
  const sorted = sortNewestFirst(filtered);
  if (format === "json") {
    write(JSON.stringify(sorted, null, 2));
  } else {
    write(formatTable(sorted));
    if (sorted.length === 0) {
      writeErr("qfai audit log: no decision records matched.");
    }
  }
  return 0;
}
