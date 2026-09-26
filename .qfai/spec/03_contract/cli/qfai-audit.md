# CLI Contract: `qfai audit log`

- Contract scope: the public read-only command for envelope-deviation decision records
- Migration origin: `spec-0015` (`REQ-0171`, `AC-0015-0019`, `BR-0015-0014`)
- Used-by: operators reviewing approvals recorded under `REQ-0158`
- SSOT modules:
  - `packages/qfai/src/cli/lib/args.ts` and `packages/qfai/src/cli/main.ts`
  - `packages/qfai/src/cli/commands/auditLog.ts`
  - `packages/qfai/src/core/decisionRecord.ts` (record writer and reader)
  - `packages/qfai/src/core/gitignore.ts` (tracked governance-record path)

## Current command

```text
qfai audit log [--scope <value>] [--operator <value>]
               [--clause <substring>] [--format table|json]
```

The command reads `.qfai/evidence/decision/*.json` under the resolved project
root. The migration moves existing records there; the command does not read
the former `.qfai/evidence/decisions/` directory. It never writes a record.
`--scope` matches `scope` exactly,
`--operator` matches `operatorIdentity` exactly, and `--clause` matches a
case-sensitive substring of `envelopeContractClause`. Supplied filters are
combined with AND. Records are ordered by descending `timestamp` string.

The default `table` format is tab-separated text, with the unconditional
header `timestamp\tscope\toperator\tclause`. Each data row contains those
four fields in that order. An empty store or a filter with no matches prints
only the header on stdout and a `no decision records matched` hint on stderr.
`--format json` prints an array of objects with `timestamp`, `scope`,
`operatorIdentity`, `envelopeContractClause`, `question`, and `answer`; an
empty result is `[]` with no no-match hint. The command strips the reader's
internal `__file` field from JSON output.

An absent directory is an empty store. The reader considers `.json` entries;
it skips an unreadable entry, invalid JSON, and JSON that is not an object.
Missing or non-string record fields become empty strings in the result. A
directory read failure exits 1 and reports it on stderr. A missing or unknown
`audit` subcommand, an invalid option, or a `--format` value other than
`table` or `json` is a CLI argument error (exit 2). Successful reads, including
empty results, exit 0.

## Decision-record source

The library writer `writeDecisionRecord` creates a JSON record only when
`envelopeContractClause` contains one of `skill-envelope`,
`architectural-decision`, `rejected-option`, or `scope-expansion`, ignoring
case. Other questions create no file. A record holds `question`, `answer`,
`scope`, `operatorIdentity`, `timestamp`, and `envelopeContractClause`. Its
filename uses a Windows-safe ISO-8601 timestamp; exclusive creation and a
numeric suffix protect records written in the same millisecond. The managed
`.gitignore` block re-includes `.qfai/evidence/decision/` so these approvals
remain tracked. The command's SHOULD-level status describes the convenience
of the query; it does not make the decision record optional.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                | Examples        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| BR-0355 | `qfai audit log` filter + format surface - Per DR-0271, `qfai audit log` (SHOULD) lists `.qfai/evidence/decision/<ts>.json` records newest-first with filters `--scope`, `--operator`, `--clause` (on `envelopeContractClause`) and `--format table\|json` defaulting to `table`. - SHOULD-level because `.qfai/evidence/decision/` is human-readable JSON; the CLI is an ergonomic improvement, not a hard requirement. | EX-0001-0179-01 |
