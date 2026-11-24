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
    | "unbalanced-parens"
    | "unbalanced-brackets"
    | "unmatched-close-paren";
  /** 1-based line where the offending construct opened, or where a stray `)` sits. */
  line: number;
  detail: string;
};

export type SqlParseResult = {
  statements: SqlStatement[];
  errors: SqlParseError[];
};

/**
 * Every character above ASCII, written with escapes so the source holds no
 * raw U+FFFF, which no editor or diff shows.
 */
const NON_ASCII_RANGE = String.raw`\u0080-\uFFFF`;

/** A character that may start an identifier or a dollar-quote tag. */
const IDENTIFIER_START_CLASS = `[A-Za-z_${NON_ASCII_RANGE}]`;

/** A character that may continue a dollar-quote tag, which takes no `$`. */
const TAG_CHAR_CLASS = `[A-Za-z0-9_${NON_ASCII_RANGE}]`;

/** A character that may continue an identifier, `$` included. */
const IDENTIFIER_CHAR_CLASS = `[A-Za-z0-9_$${NON_ASCII_RANGE}]`;

/**
 * The opening marker of a PostgreSQL dollar-quoted literal: `$$` or `$tag$`.
 *
 * The literal ends at the next occurrence of the same marker. Shared with the
 * apply-order check, which has to skip the same literals this splitter does.
 *
 * A tag follows PostgreSQL's identifier rules without the `$`: a letter, `_` or
 * any non-ASCII character first, then digits as well. PostgreSQL counts every
 * byte above 0x7F as a letter here, so `\u0080-\uFFFF` stands for all of them,
 * each half of a surrogate pair included.
 *
 * A marker directly after a letter, digit, `_`, non-ASCII character or `$`
 * opens nothing: `$` continues an identifier, so `foo$tag$` is one name.
 */
export const DOLLAR_QUOTE_MARKER = new RegExp(
  String.raw`(?<!${IDENTIFIER_CHAR_CLASS})\$(?:${IDENTIFIER_START_CLASS}${TAG_CHAR_CLASS}*)?\$`,
);

/**
 * The words PostgreSQL allows between `CREATE` and `TABLE`:
 * `[ [ GLOBAL | LOCAL ] { TEMPORARY | TEMP } | UNLOGGED ]`. PostgreSQL has no
 * `CREATE OR REPLACE TABLE`, and `GLOBAL` or `LOCAL` goes only with a temporary
 * table. Any other word there makes it another statement, such as
 * `CREATE PUBLICATION … FOR TABLE`, which creates no table.
 *
 * A regular-expression source fragment, optional as a whole and ending in
 * whitespace when present, for `\bCREATE\s+${CREATE_TABLE_MODIFIERS}TABLE`.
 * Every pattern that finds a table a contract creates builds on it, so no two
 * of them can count tables differently.
 */
export const CREATE_TABLE_MODIFIERS = String.raw`(?:(?:(?:GLOBAL|LOCAL)\s+)?(?:TEMPORARY|TEMP)\s+|UNLOGGED\s+)?`;

/** {@link DOLLAR_QUOTE_MARKER} at one offset of the whole text, so the lookbehind sees what precedes it. */
const DOLLAR_QUOTE_AT = new RegExp(DOLLAR_QUOTE_MARKER.source, "y");

/**
 * Splits SQL into statements on top-level `;`.
 *
 * "Top-level" is the whole point: a `;` inside a string literal, a comment, a
 * dollar-quoted function body or a parenthesised expression does not end a
 * statement. A naive `text.split(";")` would report a valid PL/pgSQL function
 * as a dozen malformed fragments, which is worse than not checking at all.
 *
 * Recognised: single-quoted strings with `''` escaping, `E'…'` escape strings
 * whose backslash escapes the next character, double-quoted identifiers and
 * MySQL backtick identifiers with a doubled quote as its escape, `--` line
 * comments, C-style block comments (nested, as PostgreSQL allows), and
 * `$tag$ … $tag$` dollar quoting.
 *
 * `[ … ]` is a SQL Server identifier and a PostgreSQL array subscript or
 * constructor, so it is read as a nesting group: a `(`, `)` or `;` inside it
 * is not counted, while a string inside it is still a string.
 *
 * Ceiling: a SQL Server bracket name holding a quote, a `[` or the escaped
 * `]]` is not read, since PostgreSQL gives those characters their own meaning
 * inside a subscript.
 * Lift when: a contract needs such a name.
 */
export function parseSqlContract(text: string): SqlParseResult {
  const statements: SqlStatement[] = [];
  const errors: SqlParseError[] = [];

  let index = 0;
  let line = 1;
  let depth = 0;
  let openParenLine = 0;
  let bracketDepth = 0;
  let openBracketLine = 0;
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
      DOLLAR_QUOTE_AT.lastIndex = index;
      const tag = DOLLAR_QUOTE_AT.exec(text);
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
    if (ch === "'" || ch === '"' || ch === "`") {
      const openedAt = line;
      const quote = ch;
      const escapes = quote === "'" && opensEscapeString(text, index);
      let cursor = index + 1;
      let closed = false;
      while (cursor < text.length) {
        if (text[cursor] === "\n") line += 1;
        // In an `E'…'` string a backslash escapes the next character, a quote
        // included, so `E'it\'s'` is one literal and not `E'it\'` then `s'`.
        if (escapes && text[cursor] === "\\") {
          if (text[cursor + 1] === "\n") line += 1;
          cursor += 2;
          continue;
        }
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

    if (ch === "[") {
      if (bracketDepth === 0) openBracketLine = line;
      bracketDepth += 1;
    } else if (ch === "]") {
      if (bracketDepth > 0) bracketDepth -= 1;
    } else if (ch === "(" && bracketDepth === 0) {
      // Inside a bracket a parenthesis is part of the name or subscript.
      if (depth === 0) openParenLine = line;
      depth += 1;
    } else if (ch === ")" && bracketDepth === 0) {
      if (depth === 0) {
        // A `)` that closes nothing makes the statement unrunnable; it is
        // reported where it sits, and the depth stays at zero.
        errors.push({
          kind: "unmatched-close-paren",
          line,
          detail: 'unmatched ")" with no open "("',
        });
      } else {
        depth -= 1;
      }
    }

    if (ch === ";" && depth === 0 && bracketDepth === 0) {
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
  if (bracketDepth > 0) {
    errors.push({
      kind: "unbalanced-brackets",
      line: openBracketLine,
      detail: `${bracketDepth} unclosed "[" at end of file`,
    });
  }
  push();

  return { statements, errors };
}

/** One character that may continue an identifier, under the rules {@link DOLLAR_QUOTE_MARKER} follows. */
export const IDENTIFIER_CHAR = new RegExp(IDENTIFIER_CHAR_CLASS);

/**
 * Whether the `'` at `quoteAt` opens a PostgreSQL escape string, `E'…'`.
 *
 * The prefix is a lone `E` or `e`. One that ends a longer identifier, as in
 * `name'x'`, belongs to that name, and the quote opens a standard string.
 */
export function opensEscapeString(text: string, quoteAt: number): boolean {
  const prefix = text[quoteAt - 1];
  if (prefix !== "E" && prefix !== "e") return false;
  return !IDENTIFIER_CHAR.test(text[quoteAt - 2] ?? "");
}

/** One statement split into the SQL it runs and the literals it carries. */
export type StatementParts = {
  /** The statement with each literal and quoted name replaced by one space. */
  code: string;
  /** The content of each string literal and dollar-quoted body, in order. Quoted names are not literals. */
  literals: string[];
};

/**
 * Separates a statement's code from its literals, under the quoting rules
 * {@link parseSqlContract} follows. Takes one statement that splitter returned,
 * so comments are already gone. A literal left open runs to the end.
 */
export function separateLiterals(statement: string): StatementParts {
  let code = "";
  const literals: string[] = [];
  let index = 0;
  while (index < statement.length) {
    const ch = statement[index] ?? "";
    if (ch === "$") {
      DOLLAR_QUOTE_AT.lastIndex = index;
      const marker = DOLLAR_QUOTE_AT.exec(statement)?.[0];
      if (marker) {
        const bodyStart = index + marker.length;
        const close = statement.indexOf(marker, bodyStart);
        const bodyEnd = close === -1 ? statement.length : close;
        literals.push(statement.slice(bodyStart, bodyEnd));
        code += " ";
        index = close === -1 ? statement.length : close + marker.length;
        continue;
      }
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const escapes = ch === "'" && opensEscapeString(statement, index);
      let cursor = index + 1;
      let value = "";
      while (cursor < statement.length) {
        const current = statement[cursor] ?? "";
        if (escapes && current === "\\") {
          value += statement[cursor + 1] ?? "";
          cursor += 2;
          continue;
        }
        if (current === ch) {
          cursor += 1;
          if (statement[cursor] !== ch) break;
        }
        value += current;
        cursor += 1;
      }
      if (ch === "'") literals.push(value);
      code += " ";
      index = cursor;
      continue;
    }
    code += ch;
    index += 1;
  }
  return { code, literals };
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
  ).join("|")})\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?`,
  "i",
);

/**
 * `CONCURRENTLY` and `IF NOT EXISTS`, which `CREATE INDEX` writes in that order
 * between `INDEX` and the name. {@link CREATE_RE} reads only `IF NOT EXISTS`.
 */
const INDEX_OPTIONS_AT = /CONCURRENTLY\s+(?:IF\s+NOT\s+EXISTS\s+)?/iy;

/** A bare `ON` where an index name would start: the index has no name. */
const UNNAMED_INDEX_AT = new RegExp(`^ON(?!${IDENTIFIER_CHAR_CLASS})`, "i");

/** The first character of a bare identifier, under the rules {@link IDENTIFIER_CHAR} continues. */
const IDENTIFIER_START = new RegExp(IDENTIFIER_START_CLASS);

/**
 * The normalised, possibly qualified object name that starts at `from`.
 *
 * Each dot-separated part follows PostgreSQL's identifier rules: a bare part
 * folds ASCII A-Z to lower case and keeps every other letter, and a quoted part
 * keeps its case, with `""` standing for one `"`. A quoted part is written back
 * without its quotes unless it holds a `.` or a `"`, the two characters no bare
 * part can hold; that keeps `"a.b"`, one name, apart from `a.b`, a schema and a
 * table. `end` is the index just past the name's last part. Returns undefined
 * when no whole name starts there: a quoted part that never closes, or a part
 * missing after a `.`, names nothing.
 *
 * Ceiling: a `U&"…"` part is not read, because its Unicode escapes are not
 * decoded, so an object named that way is not recorded at all.
 * Lift when: a contract needs a `U&` name checked for redefinition.
 */
function readQualifiedName(text: string, from: number): { name: string; end: number } | undefined {
  const parts: string[] = [];
  let index = from;
  for (;;) {
    const part = readNamePart(text, index);
    if (!part) return undefined;
    parts.push(part.name);
    index = skipSpaces(text, part.end);
    if (text[index] !== ".") return { name: parts.join("."), end: part.end };
    index = skipSpaces(text, index + 1);
  }
}

function readNamePart(text: string, from: number): { name: string; end: number } | undefined {
  const first = text[from] ?? "";
  if (first === '"') {
    let close = text.indexOf('"', from + 1);
    // A doubled quote is an escaped `"`, not the end of the part.
    while (close !== -1 && text[close + 1] === '"') close = text.indexOf('"', close + 2);
    if (close === -1) return undefined;
    const value = text.slice(from + 1, close).replace(/""/g, '"');
    if (value.length === 0) return undefined;
    const name = /[."]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    return { name, end: close + 1 };
  }
  if (!IDENTIFIER_START.test(first)) return undefined;
  let end = from + 1;
  while (end < text.length && IDENTIFIER_CHAR.test(text[end] ?? "")) end += 1;
  const bare = text.slice(from, end);
  if (/^u$/i.test(bare) && text[end] === "&" && text[end + 1] === '"') return undefined;
  return { name: bare.replace(/[A-Z]/g, (letter) => letter.toLowerCase()), end };
}

function skipSpaces(text: string, from: number): number {
  let index = from;
  while (index < text.length && /\s/.test(text[index] ?? "")) index += 1;
  return index;
}

export type CreatedObject = {
  kind: string;
  /**
   * Normalised name, schema-qualification preserved: each bare part with ASCII
   * A-Z lower-cased, each quoted part without its quotes unless it holds a `.`
   * or a `"`.
   */
  name: string;
  /** For functions and procedures, the normalised identity argument types. */
  signature: string;
  line: number;
};

/**
 * Every object a file creates, with the line it is created on.
 *
 * Functions and procedures carry their identity argument types, because
 * PostgreSQL overloading makes two same-named functions with different input
 * types two distinct objects. Everything else is keyed on the name alone.
 */
export function collectCreatedObjects(statements: SqlStatement[]): CreatedObject[] {
  const created: CreatedObject[] = [];
  for (const statement of statements) {
    const match = CREATE_RE.exec(statement.text);
    if (!match) continue;
    const kind = (match[1] ?? "").replace(/\s+/g, " ").toUpperCase();
    let nameAt = match.index + match[0].length;
    if (identityKind(kind) === "INDEX") {
      INDEX_OPTIONS_AT.lastIndex = nameAt;
      nameAt += INDEX_OPTIONS_AT.exec(statement.text)?.[0].length ?? 0;
      // An index created without a name is named by PostgreSQL itself.
      if (UNNAMED_INDEX_AT.test(statement.text.slice(nameAt))) continue;
    }
    const name = readQualifiedName(statement.text, nameAt);
    if (!name) continue;
    created.push({
      kind,
      name: name.name,
      signature:
        kind === "FUNCTION" || kind === "PROCEDURE"
          ? identityArgumentTypes(argumentList(statement.text, name.end), kind)
          : "",
      line: statement.line,
    });
  }
  return created;
}

/**
 * The text inside the parentheses that follow a `CREATE FUNCTION` /
 * `PROCEDURE` routine name ending at `nameEnd`. A quoted name may itself hold
 * a `(`, so the search starts after the name rather than at the statement's
 * first parenthesis.
 */
function argumentList(statement: string, nameEnd: number): string {
  const open = skipSpaces(statement, nameEnd);
  if (statement[open] !== "(") return "";
  let depth = 0;
  for (let index = open; index < statement.length; index += 1) {
    const ch = statement[index];
    if (ch === "'") {
      index = statement.indexOf("'", index + 1);
      if (index === -1) return "";
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) return statement.slice(open + 1, index);
    }
  }
  return "";
}

const ARGUMENT_MODES = new Set(["in", "out", "inout", "variadic"]);

/**
 * Type phrases whose first word could otherwise be read as an argument name.
 * A shortcut, not a type parser: a multi-word type missing from this list is
 * read as `name type`, so its first word is dropped and two definitions that
 * differ only in that word are taken for one routine. Extend the list when a
 * contract uses such a type.
 */
const MULTI_WORD_TYPE_START =
  /^(?:double precision|(?:character|char|bit) varying|national (?:character|char)\b|(?:time|timestamp)(?:\(\d+\))?\s*with(?:out)? time zone|interval (?:year|month|day|hour|minute|second)\b)/;

/** The SQL-standard array suffix, lower-cased and with no space before `[`. */
const ARRAY_SUFFIX = /^array(?:\[\d*\])?$/;

/**
 * Each built-in type alias, mapped to the one spelling PostgreSQL resolves it
 * to. Type modifiers are already gone when this is read.
 */
const TYPE_ALIASES = new Map<string, string>([
  ["int", "integer"],
  ["int4", "integer"],
  ["int2", "smallint"],
  ["int8", "bigint"],
  ["float4", "real"],
  ["float", "double precision"],
  ["float8", "double precision"],
  ["decimal", "numeric"],
  ["dec", "numeric"],
  ["bool", "boolean"],
  ["varchar", "character varying"],
  ["char varying", "character varying"],
  ["national character varying", "character varying"],
  ["national char varying", "character varying"],
  ["char", "character"],
  ["bpchar", "character"],
  ["national character", "character"],
  ["national char", "character"],
  ["varbit", "bit varying"],
  ["timestamp", "timestamp without time zone"],
  ["timestamptz", "timestamp with time zone"],
  ["time", "time without time zone"],
  ["timetz", "time with time zone"],
]);

/** An array suffix: SQL-standard `ARRAY`, `ARRAY[n]`, or one or more `[n]`. */
const ARRAY_TYPE_SUFFIX = /(?: array(?:\[\d*\])?|(?:\[\d*\])+)$/;

/**
 * The one spelling of an argument type PostgreSQL resolves a routine by.
 *
 * PostgreSQL ignores a routine argument's type modifiers (`varchar(10)`,
 * `numeric(10,2)`, an interval's fields) and its array bounds, and resolves
 * each alias (`int`, `int4`, `bool`, `timestamptz`) to one type. `float(p)` is
 * the exception: its precision picks `real` or `double precision`. A
 * schema-qualified or quoted spelling of a built-in type is kept as written.
 */
function canonicalArgumentType(type: string): string {
  const arraySuffix = ARRAY_TYPE_SUFFIX.exec(type);
  let base = arraySuffix ? type.slice(0, arraySuffix.index) : type;
  const floatPrecision = /^float\((\d+)\)$/.exec(base);
  if (floatPrecision) base = Number(floatPrecision[1]) <= 24 ? "real" : "double precision";
  // A space stands in for the modifier: the caller removed the spaces around
  // parentheses, so `timestamp(3) with time zone` arrives as `timestamp(3)with`.
  base = base
    .replace(/\([^()]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^interval (?:year|month|day|hour|minute|second)\b/.test(base)) base = "interval";
  const name = TYPE_ALIASES.get(base) ?? base;
  return arraySuffix ? `${name}[]` : name;
}

/**
 * The PostgreSQL identity of a routine's argument list: its input argument
 * types, in order, each in its canonical spelling. Argument names, DEFAULT
 * expressions, type modifiers and spacing are not part of it; neither are a
 * function's OUT arguments.
 */
function identityArgumentTypes(argumentText: string, kind: string): string {
  const types: string[] = [];
  for (const argument of splitTopLevel(argumentText)) {
    const words = stripDefault(argument)
      .toLowerCase()
      .replace(/\s*([(),[\]])\s*/g, "$1")
      .split(/\s+/)
      .filter(Boolean);
    let mode = "in";
    if (words[0] !== undefined && ARGUMENT_MODES.has(words[0])) {
      mode = words.shift() ?? mode;
    } else if (words[1] !== undefined && ARGUMENT_MODES.has(words[1]) && words.length > 2) {
      mode = words[1];
      words.splice(1, 1);
    }
    // `int ARRAY` and `int ARRAY[3]` are one type: the suffix is not a type
    // of its own, so it never makes the word before it an argument name.
    const typeWords = ARRAY_SUFFIX.test(words.at(-1) ?? "") ? words.length - 1 : words.length;
    if (typeWords > 1 && !MULTI_WORD_TYPE_START.test(words.join(" "))) words.shift();
    const type = words.join(" ");
    if (type.length === 0) continue;
    if (mode === "out" && kind === "FUNCTION") continue;
    types.push(canonicalArgumentType(type));
  }
  return types.join(",");
}

/** Split on commas outside parentheses and string literals. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (const ch of text) {
    if (ch === "'") inString = !inString;
    if (!inString && ch === "(") depth += 1;
    if (!inString && ch === ")") depth -= 1;
    if (!inString && depth === 0 && ch === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/** An argument without its `DEFAULT <expr>` or `= <expr>` tail. */
function stripDefault(argument: string): string {
  const match = /\s+default\s|\s+default$|=/i.exec(argument);
  return match ? argument.slice(0, match.index) : argument;
}

/**
 * The kind an object's name is unique within. `UNIQUE` is a property of an
 * index, not a namespace of its own: a regular and a unique index share
 * PostgreSQL's relation namespace, so one name used for both collides.
 */
function identityKind(kind: string): string {
  return kind === "UNIQUE INDEX" ? "INDEX" : kind;
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
    const key = `${identityKind(object.kind)}|${object.name}|${object.signature}`;
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
      kind: identityKind(first.kind),
      name: first.name,
      lines: objects.map((object) => object.line),
    });
  }
  return redefined.sort(
    (left, right) =>
      (left.lines[0] ?? 0) - (right.lines[0] ?? 0) || left.name.localeCompare(right.name),
  );
}
