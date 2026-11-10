/**
 * `qfai session-review`: counts from the project's own agent transcripts.
 *
 * The session review at the end of a run asks what QFAI cost and where it got in the way. The
 * agent's memory of a long session is the weakest evidence for that; the host's transcript on
 * this machine is the strongest. This command reads it where the host left it, never sends it
 * anywhere, and reports counts and fixed words only, so the report can be shown and quoted
 * without carrying what the session said.
 *
 * The report goes to standard output unless `--out` names a file. It has no default file: the
 * command adds no record system to the project.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { error, info } from "../../core/logger.js";
import { isRecord, stringAt } from "../../core/sessionReview/events.js";
import {
  locateSessions,
  type Agent,
  type LocateEnvironment,
  type SessionFile,
} from "../../core/sessionReview/locate.js";
import { parseClaudeTranscript } from "../../core/sessionReview/parseClaude.js";
import { parseCodexTranscript } from "../../core/sessionReview/parseCodex.js";
import { redact } from "../../core/sessionReview/redact.js";
import {
  renderJson,
  renderMarkdown,
  type ReviewedSession,
} from "../../core/sessionReview/render.js";
import { summarise } from "../../core/sessionReview/signals.js";
import { EXIT_CODES } from "../lib/exitCodes.js";

export type SessionReviewOptions = {
  root: string;
  agent?: Agent | "all";
  sessionId?: string;
  /** An ISO date; sessions whose transcript changed at or after it are reported. */
  since?: string;
  format?: "md" | "json";
  outPath?: string;
  /** Where the hosts keep their transcripts; read from the process when absent. */
  env?: LocateEnvironment;
};

export async function runSessionReview(options: SessionReviewOptions): Promise<number> {
  const root = path.resolve(options.root);
  const env = options.env ?? environmentFromProcess();
  const agents: Agent[] =
    options.agent === undefined || options.agent === "all" ? ["claude", "codex"] : [options.agent];

  const located = await locateSessions(root, agents, env);
  const chosen = choose(located, options);
  if (chosen === null) {
    error(
      `qfai session-review: no transcript of session ${options.sessionId ?? ""} belongs to this project.`,
    );
    return EXIT_CODES.inputError;
  }
  if (chosen.length === 0) {
    info("qfai session-review: no session transcript of this project was found.");
    return EXIT_CODES.ok;
  }

  const facts = { root, platform: env.platform, reminderTexts: await reminderTexts(root) };
  const sessions: ReviewedSession[] = [];
  for (const session of chosen) {
    const events =
      session.agent === "claude"
        ? await parseClaudeTranscript(session.file)
        : await parseCodexTranscript(session.file);
    sessions.push({
      agent: session.agent,
      sessionId: session.sessionId,
      signals: summarise(events, facts),
    });
  }

  const clean = (text: string): string =>
    redact(text, { root, home: env.home, platform: env.platform });
  const rendered =
    options.format === "json" ? renderJson(sessions, clean) : renderMarkdown(sessions, clean);
  if (options.outPath === undefined) {
    info(rendered.trimEnd());
    return EXIT_CODES.ok;
  }
  const out = path.resolve(root, options.outPath);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, rendered, "utf-8");
  info(`qfai session-review: wrote ${path.relative(root, out).split(path.sep).join("/")}`);
  return EXIT_CODES.ok;
}

/**
 * The sessions the options select: the named one, those since the date, or the latest of each
 * agent. `null` when a named session is not among them.
 */
function choose(
  located: readonly SessionFile[],
  options: SessionReviewOptions,
): SessionFile[] | null {
  if (options.sessionId !== undefined) {
    const named = located.filter((session) => session.sessionId === options.sessionId);
    return named.length > 0 ? named : null;
  }
  if (options.since !== undefined) {
    const since = Date.parse(options.since);
    return located.filter((session) => session.mtimeMs >= since);
  }
  const latest = new Map<Agent, SessionFile>();
  for (const session of located) {
    const held = latest.get(session.agent);
    if (held === undefined || session.mtimeMs >= held.mtimeMs) latest.set(session.agent, session);
  }
  return located.filter((session) => latest.get(session.agent) === session);
}

/** Each reminder text in the project's `.agents/rules/reminders.json`, mapped to its key. */
async function reminderTexts(root: string): Promise<Map<string, string>> {
  const texts = new Map<string, string>();
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      await readFile(path.join(root, ".agents", "rules", "reminders.json"), "utf-8"),
    );
  } catch {
    return texts;
  }
  if (!isRecord(parsed)) return texts;
  for (const [key, entry] of Object.entries(parsed)) {
    const full = stringAt(
      isRecord(entry) ? entry.hookSpecificOutput : undefined,
      "additionalContext",
    );
    const brief = stringAt(entry, "briefContext");
    for (const text of [full, brief]) if (text !== undefined) texts.set(text.trim(), key);
  }
  return texts;
}

function environmentFromProcess(): LocateEnvironment {
  const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
  const codexHome = process.env.CODEX_HOME;
  return {
    home: os.homedir(),
    platform: process.platform,
    ...(claudeConfigDir ? { claudeConfigDir } : {}),
    ...(codexHome ? { codexHome } : {}),
  };
}
