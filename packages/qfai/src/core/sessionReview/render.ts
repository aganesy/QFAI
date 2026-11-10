/**
 * The `qfai session-review` report, as Markdown or JSON.
 *
 * Every string passes `clean` on its way out, and every list arrives sorted, so the same sessions
 * give the same bytes. Nothing here reads a clock.
 */
import type { Agent } from "./locate.js";
import type { Count, SessionSignals } from "./signals.js";

export type ReviewedSession = { agent: Agent; sessionId: string; signals: SessionSignals };

/** The heading a session takes, and the base name a saved report of it would take. */
export function sessionName(session: Pick<ReviewedSession, "agent" | "sessionId">): string {
  return `${session.agent}-${session.sessionId}`;
}

export function renderJson(
  sessions: readonly ReviewedSession[],
  clean: (text: string) => string,
): string {
  const body = {
    sessions: sessions.map((session) => {
      const s = session.signals;
      return {
        name: clean(sessionName(session)),
        agent: session.agent,
        sessionId: clean(session.sessionId),
        records: s.records,
        malformedLines: s.malformed,
        typedTurns: s.typedTurns,
        reminders: cleanCounts(s.reminders, clean),
        reads: s.reads.map((read) => ({ ...read, path: clean(read.path) })),
        toolErrors: s.toolErrors.map((entry) => ({
          tool: clean(entry.tool),
          count: entry.count,
          codes: cleanCounts(entry.codes, clean),
        })),
        qfaiCommands: s.qfaiCommands.map((entry) => ({
          command: clean(entry.command),
          runs: entry.runs,
          exits: cleanCounts(entry.exits, clean),
        })),
        questions: s.questions,
        corrections: s.corrections.map((entry) => ({
          turn: entry.turn,
          words: entry.words.map(clean),
        })),
      };
    }),
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

export function renderMarkdown(
  sessions: readonly ReviewedSession[],
  clean: (text: string) => string,
): string {
  const lines = ["# Session review", ""];
  for (const session of sessions) {
    const s = session.signals;
    lines.push(`## ${clean(sessionName(session))}`, "");
    lines.push(
      `- Records: ${s.records}; lines that are not JSON records: ${s.malformed}`,
      `- Typed user turns: ${s.typedTurns}`,
      `- Structured questions: ${s.questions.calls} call(s), ${s.questions.items} item(s)`,
      "",
    );
    section(
      lines,
      "Hook reminders shown",
      ["Reminder", "Shown"],
      s.reminders.map((entry) => [clean(entry.name), String(entry.count)]),
    );
    section(
      lines,
      "Rule, skill and step files read",
      ["File", "Reads", "Repeats", "Result bytes"],
      s.reads.map((read) => [
        `\`${clean(read.path)}\``,
        String(read.reads),
        String(read.repeats),
        String(read.bytes),
      ]),
    );
    section(
      lines,
      "Tool errors",
      ["Tool", "Errors", "Finding codes"],
      s.toolErrors.map((entry) => [
        clean(entry.tool),
        String(entry.count),
        countList(entry.codes, clean),
      ]),
    );
    section(
      lines,
      "qfai commands",
      ["Command", "Runs", "Exit status"],
      s.qfaiCommands.map((entry) => [
        `\`${clean(entry.command)}\``,
        String(entry.runs),
        countList(entry.exits, clean),
      ]),
    );
    section(
      lines,
      "Typed turns matching the correction words",
      ["Turn", "Matched words"],
      s.corrections.map((entry) => [String(entry.turn), entry.words.map(clean).join(", ")]),
    );
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function section(
  lines: string[],
  title: string,
  header: readonly string[],
  rows: readonly string[][],
): void {
  lines.push(`### ${title}`, "");
  if (rows.length === 0) {
    lines.push("None.", "");
    return;
  }
  lines.push(`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`);
  for (const row of rows) lines.push(`| ${row.map(cell).join(" | ")} |`);
  lines.push("");
}

/** A table cell: a pipe would end it early. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

function countList(counts: readonly Count[], clean: (text: string) => string): string {
  return counts.length === 0
    ? "-"
    : counts.map((entry) => `${clean(entry.name)} (${entry.count})`).join(", ");
}

function cleanCounts(counts: readonly Count[], clean: (text: string) => string): Count[] {
  return counts.map((entry) => ({ name: clean(entry.name), count: entry.count }));
}
