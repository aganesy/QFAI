/**
 * Structural parsing for `.sql` contracts.
 *
 * `.sql` was the only contract kind qfai never parsed. `validateContractFile`
 * returned early for `kind === "DB"`, so the `QFAI-CONTRACT-021` "does not
 * parse" check that guards UI and API files was unreachable for the one kind
 * that is actually executed against a database. Everything a DB contract got
 * was an ID-declaration check plus four dangerous-keyword regexes at `warning`,
 * and `--profile sdd --fail-on error` passed a contract that cannot run.
 *
 * The scope here is deliberately **apply-ability, not semantic correctness**: a
 * statement splitter that knows SQL's quoting rules, plus the intra-file
 * invariant that one file must not define the same object twice. Nothing here
 * type-checks a query or resolves a column.
 */

/** A single statement, with the 1-based line its first token sits on. */
export type SqlStatement = {
  text: string;
  line: number;
};

export type SqlParseError = {
  /** What was left open, in the terms an author can act on. */
  kind:
    | "unterminated-string"
    | "unterminated-comment"
    | "unterminated-dollar-quote"
    | "unbalanced-parens";
  /** 1-based line where the offending construct opened. */
  line: number;
  detail: string;
};

export type SqlParseResult = {
  statements: SqlStatement[];
  errors: SqlParseError[];
};

/**
 * Splits SQL into statements on top-level `;`.
 *
 * "Top-level" is the whole point: a `;` inside a string literal, a comment, a
 * dollar-quoted function body or a parenthesised expression does not end a
 * statement. A naive `text.split(";")` would report a valid PL/pgSQL function
 * as a dozen malformed fragments, which is worse than not checking at all.
 *
 * Recognised: single-quoted strings with `''` escaping, double-quoted
 * identifiers, `--` line comments, C-style block comments (nested, as
 * PostgreSQL allows), and `$tag$ … $tag$` dollar quoting.
 */
export function parseSqlContract(text: string): SqlParseResult {
  const statements: SqlStatement[] = [];
  const errors: SqlParseError[] = [];

  let index = 0;
  let line = 1;
  let depth = 0;
  let openParenLine = 0;
  let current = "";
  let currentLine = 0;

  const lineOf = (at: number): number => {
    let count = 1;
    for (let i = 0; i < at; i += 1) {
      if (text[i] === "\n") count += 1;
    }
    return count;
  };

  const push = (): void => {
    if (current.trim().length > 0) {
      statements.push({ text: current.trim(), line: currentLine || line });
    }
    current = "";
    currentLine = 0;
  };

  while (index < text.length) {
    const ch = text[index] ?? "";
    const next = text[index + 1] ?? "";

    if (ch === "\n") {
      line += 1;
      current += ch;
      index += 1;
      continue;
    }

    // `--` line comment
    if (ch === "-" && next === "-") {
      const end = text.indexOf("\n", index);
      index = end === -1 ? text.length : end;
      continue;
    }

    // `/* */`, nestable
    if (ch === "/" && next === "*") {
      const openedAt = line;
      let nesting = 1;
      index += 2;
      while (index < text.length && nesting > 0) {
        if (text[index] === "\n") line += 1;
        if (text[index] === "/" && text[index + 1] === "*") {
          nesting += 1;
          index += 2;
          continue;
        }
        if (text[index] === "*" && text[index + 1] === "/") {
          nesting -= 1;
          index += 2;
          continue;
        }
        index += 1;
      }
      if (nesting > 0) {
        errors.push({
          kind: "unterminated-comment",
          line: openedAt,
          detail: "block comment opened with /* is never closed",
        });
      }
      // A comment separates tokens. Dropping it outright joined them, so
      // `CREATE/*x*/TABLE t (…)` became `CREATETABLE` and stopped matching
      // `CREATE_RE` — a valid statement that silently left the redefinition
      // scan. Newlines are preserved one-for-one so reported lines stay true.
      const spannedLines = line - openedAt;
      current += spannedLines > 0 ? "\n".repeat(spannedLines) : " ";
      continue;
    }

    // `$tag$ … $tag$` dollar quoting (PostgreSQL function bodies)
    if (ch === "$") {
      const tag = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(text.slice(index));
      if (tag) {
        const marker = tag[0];
        const openedAt = line;
        const close = text.indexOf(marker, index + marker.length);
        if (close === -1) {
          errors.push({
            kind: "unterminated-dollar-quote",
            line: openedAt,
            detail: `dollar-quoted body opened with ${marker} is never closed`,
          });
          current += text.slice(index);
          index = text.length;
          continue;
        }
        const body = text.slice(index, close + marker.length);
        if (currentLine === 0) currentLine = line;
        current += body;
        line += countNewlines(body);
        index = close + marker.length;
        continue;
      }
    }

    // String literal / quoted identifier
    if (ch === "'" || ch === '"') {
      const openedAt = line;
      const quote = ch;
      let cursor = index + 1;
      let closed = false;
      while (cursor < text.length) {
        if (text[cursor] === "\n") line += 1;
        if (text[cursor] === quote) {
          // Doubled quote is an escaped quote, not a terminator.
          if (text[cursor + 1] === quote) {
            cursor += 2;
            continue;
          }
          closed = true;
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      if (!closed) {
        errors.push({
          kind: "unterminated-string",
          line: openedAt,
          detail: `${quote === "'" ? "string literal" : "quoted identifier"} is never closed`,
        });
        current += text.slice(index);
        index = text.length;
        continue;
      }
      if (currentLine === 0) currentLine = openedAt;
      current += text.slice(index, cursor);
      index = cursor;
      continue;
    }

    if (ch === "(") {
      if (depth === 0) openParenLine = line;
      depth += 1;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
    }

    if (ch === ";" && depth === 0) {
      push();
      index += 1;
      continue;
    }

    if (currentLine === 0 && ch.trim().length > 0) currentLine = line;
    current += ch;
    index += 1;
  }

  if (depth > 0) {
    errors.push({
      kind: "unbalanced-parens",
      line: openParenLine || lineOf(text.length),
      detail: `${depth} unclosed "(" at end of file`,
    });
  }
  push();

  return { statements, errors };
}

function countNewlines(value: string): number {
  let count = 0;
  for (const ch of value) {
    if (ch === "\n") count += 1;
  }
  return count;
}

/** Object kinds whose redefinition inside one file is always a contradiction. */
const CREATABLE_KINDS = [
  "FUNCTION",
  "PROCEDURE",
  // TRIGGER is deliberately absent. In PostgreSQL a trigger name is unique per
  // TABLE, not per schema, so two same-named triggers on different tables are
  // correct SQL. Keying on the name alone would report them — a false positive
  // on valid input, which is worse than the miss. Re-add it only together with
  // the `ON <table>` clause in the key.
  "VIEW",
  "MATERIALIZED VIEW",
  "TABLE",
  "INDEX",
  "UNIQUE INDEX",
  "TYPE",
  "DOMAIN",
] as const;

const CREATE_RE = new RegExp(
  `^\\s*CREATE\\s+(?:OR\\s+REPLACE\\s+)?(?:GLOBAL\\s+|LOCAL\\s+|TEMP\\s+|TEMPORARY\\s+)?(${CREATABLE_KINDS.map(
    (kind) => kind.replace(/ /g, "\\s+"),
  ).join("|")})\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?("[^"]+"|[A-Za-z_][\\w$]*(?:\\.[A-Za-z_][\\w$]*)*)`,
  "i",
);

export type CreatedObject = {
  kind: string;
  /** Normalised name: unquoted, lower-cased, schema-qualification preserved. */
  name: string;
  /** For functions and procedures, the normalised argument list. */
  signature: string;
  line: number;
};

/**
 * Every object a file creates, with the line it is created on.
 *
 * Functions and procedures carry their argument list, because PostgreSQL
 * overloading makes two same-named functions with different arguments two
 * distinct objects. Everything else is keyed on the name alone.
 */
export function collectCreatedObjects(statements: SqlStatement[]): CreatedObject[] {
  const created: CreatedObject[] = [];
  for (const statement of statements) {
    const match = CREATE_RE.exec(statement.text);
    if (!match) continue;
    const kind = (match[1] ?? "").replace(/\s+/g, " ").toUpperCase();
    const rawName = match[2] ?? "";
    const name = rawName.startsWith('"') ? rawName.slice(1, -1) : rawName.toLowerCase();
    created.push({
      kind,
      name,
      signature: kind === "FUNCTION" || kind === "PROCEDURE" ? argumentList(statement.text) : "",
      line: statement.line,
    });
  }
  return created;
}

/** The parenthesised argument list of a `CREATE FUNCTION` / `PROCEDURE`. */
function argumentList(statement: string): string {
  const open = statement.indexOf("(");
  if (open === -1) return "";
  let depth = 0;
  for (let index = open; index < statement.length; index += 1) {
    const ch = statement[index];
    if (ch === "(") depth += 1;
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return statement
          .slice(open, index + 1)
          .replace(/\s+/g, " ")
          .toLowerCase();
      }
    }
  }
  return "";
}

export type Redefinition = {
  kind: string;
  name: string;
  lines: number[];
};

/**
 * Objects this file creates more than once.
 *
 * Two `CREATE OR REPLACE`s of one name in one file are always a contradiction:
 * only the last can be in force, so the earlier one states something the
 * applied contract does not do.
 */
export function findRedefinitions(created: CreatedObject[]): Redefinition[] {
  const byKey = new Map<string, CreatedObject[]>();
  for (const object of created) {
    const key = `${object.kind}|${object.name}|${object.signature}`;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.push(object);
    } else {
      byKey.set(key, [object]);
    }
  }
  const redefined: Redefinition[] = [];
  for (const objects of byKey.values()) {
    if (objects.length < 2) continue;
    const first = objects[0];
    if (!first) continue;
    redefined.push({
      kind: first.kind,
      name: first.name,
      lines: objects.map((object) => object.line),
    });
  }
  return redefined.sort(
    (left, right) =>
      (left.lines[0] ?? 0) - (right.lines[0] ?? 0) || left.name.localeCompare(right.name),
  );
}
