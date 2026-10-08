/**
 * What a UI contract screen states about the words it shows.
 *
 * A screen declares two keys beside `elements`, `actions` and `primary_tasks`:
 *
 * - `supplements` lists every displayed text beyond the screen `title`, the
 *   group headings and the labels of elements and actions. An empty list says
 *   the screen shows none. The key is required.
 * - `structure` lists the groups the screen is read in, in reading order, each
 *   with the primary tasks it serves and the elements and actions it holds.
 *   Without it the screen shows no heading beyond its `title`. The key is
 *   optional.
 *
 * Both are closed: an entry carries exactly the keys below, so a mistyped key
 * is named instead of read as nothing.
 *
 * The checks here are about shape, references and exact repetition. Whether a
 * sentence is needed is a judgment made against the task, by the reviewer who
 * walks the rendered screen; no word list or length is consulted.
 */

/** Keys a `structure` entry must carry. */
export const STRUCTURE_REQUIRED_KEYS = ["id", "tasks", "members"] as const;
/** The one key a `structure` entry may carry beyond the required ones. */
export const STRUCTURE_OPTIONAL_KEYS = ["heading"] as const;
/** Keys a `supplements` entry must carry, and the only keys it may carry. */
export const SUPPLEMENT_KEYS = ["id", "near", "when", "text", "why"] as const;
/** The states a supplement is shown in. */
export const SUPPLEMENT_STATES = ["default", "empty", "loading", "error", "success"] as const;

/** Which check a finding comes from: the shape of a key, a reference to an id, or a repeated text. */
export type ScreenCopyKind = "shape" | "reference" | "repeat";

export type ScreenCopyFinding = {
  kind: ScreenCopyKind;
  severity: "error" | "warning";
  message: string;
  remedy: string;
};

type Group = { id: string; heading: string | null; tasks: string[]; members: string[] };
type Supplement = { id: string; near: string; when: string; text: string };
type Labelled = { id: string; label: string };

/** Every finding the copy definition of one `screens[]` mapping raises. */
export function analyzeScreenCopy(screen: Record<string, unknown>): ScreenCopyFinding[] {
  const findings: ScreenCopyFinding[] = [];
  const shape = (message: string, remedy: string): void => {
    findings.push({ kind: "shape", severity: "error", message, remedy });
  };
  const groups = readStructure(screen["structure"], shape);
  const supplements = readSupplements(screen["supplements"], shape);

  const controls = [...labelled(screen["elements"]), ...labelled(screen["actions"])];
  const taskIds = labelled(screen["primary_tasks"]).map((task) => task.id);
  checkReferences(
    {
      groups,
      supplements,
      controls,
      taskIds,
      structureDeclared: screen["structure"] !== undefined,
    },
    findings,
  );
  checkRepeats(screen["title"], groups, supplements, controls, findings);
  return findings;
}

export function isMapping(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function quoted(keys: readonly string[]): string {
  return keys.map((key) => `\`${key}\``).join(", ");
}

/** The wording a repeat is judged on: case, spacing and closing punctuation do not make a new text. */
export function normalizeCopy(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\s]+$/u, "");
}

type Report = (message: string, remedy: string) => void;

function readStructure(value: unknown, report: Report): Group[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    report("`structure` is not a list.", "Write `structure` as a list with one mapping per group.");
    return [];
  }
  if (value.length === 0) {
    report(
      "`structure` lists no group.",
      "List at least one group, or leave `structure` out when the screen shows no heading beyond its title.",
    );
    return [];
  }
  const groups: Group[] = [];
  const seen = new Set<string>();
  value.forEach((entry: unknown, index) => {
    const where = `\`structure[${String(index)}]\``;
    const remedy = `Give each group exactly ${quoted(STRUCTURE_REQUIRED_KEYS)} and, when it shows one, \`heading\`. \`tasks\` and \`members\` are non-empty lists of ids.`;
    if (!isMapping(entry)) {
      report(`${where} is not a mapping.`, remedy);
      return;
    }
    const problems = entryProblems(entry, STRUCTURE_REQUIRED_KEYS, STRUCTURE_OPTIONAL_KEYS);
    if ("heading" in entry && text(entry["heading"]) === "") {
      problems.push("`heading` is empty; omit the key when the group shows no heading");
    }
    if (problems.length > 0) {
      report(`${where} ${problems.join("; ")}.`, remedy);
      return;
    }
    const id = text(entry["id"]);
    if (seen.has(id)) {
      report(`${where} repeats the group \`id\` \`${id}\`.`, "Give every group its own `id`.");
      return;
    }
    seen.add(id);
    groups.push({
      id,
      heading: text(entry["heading"]) === "" ? null : text(entry["heading"]),
      tasks: idsOf(entry["tasks"]) ?? [],
      members: idsOf(entry["members"]) ?? [],
    });
  });
  return groups;
}

function readSupplements(value: unknown, report: Report): Supplement[] {
  if (value === undefined) {
    report(
      "`supplements` is absent.",
      "Add `supplements`: the text the screen shows beyond its title, group headings and labels, or `supplements: []` when it shows none.",
    );
    return [];
  }
  if (!Array.isArray(value)) {
    report(
      "`supplements` is not a list.",
      "Write `supplements` as a list with one mapping per text, or `[]` for none.",
    );
    return [];
  }
  const supplements: Supplement[] = [];
  const seen = new Set<string>();
  value.forEach((entry: unknown, index) => {
    const where = `\`supplements[${String(index)}]\``;
    const remedy = `Give each supplement exactly ${quoted(SUPPLEMENT_KEYS)}, each a non-empty string, with \`when\` one of ${quoted(SUPPLEMENT_STATES)}.`;
    if (!isMapping(entry)) {
      report(`${where} is not a mapping.`, remedy);
      return;
    }
    const problems = entryProblems(entry, SUPPLEMENT_KEYS, []);
    const state = text(entry["when"]);
    if (state !== "" && !(SUPPLEMENT_STATES as readonly string[]).includes(state)) {
      problems.push(`\`when\` is \`${state}\`, which is not one of ${quoted(SUPPLEMENT_STATES)}`);
    }
    if (problems.length > 0) {
      report(`${where} ${problems.join("; ")}.`, remedy);
      return;
    }
    const id = text(entry["id"]);
    if (seen.has(id)) {
      report(
        `${where} repeats the supplement \`id\` \`${id}\`.`,
        "Give every supplement its own `id`.",
      );
      return;
    }
    seen.add(id);
    supplements.push({
      id,
      near: text(entry["near"]),
      when: state,
      text: text(entry["text"]),
    });
  });
  return supplements;
}

/** What is wrong with the keys of one entry: missing, empty or malformed values, and keys outside the shape. */
function entryProblems(
  entry: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
): string[] {
  const problems: string[] = [];
  const missing = required.filter((key) =>
    key === "tasks" || key === "members" ? idsOf(entry[key]) === null : text(entry[key]) === "",
  );
  if (missing.length > 0) {
    problems.push(`is missing, empty or malformed in ${quoted(missing)}`);
  }
  const extra = Object.keys(entry).filter(
    (key) => !required.includes(key) && !optional.includes(key),
  );
  if (extra.length > 0) {
    problems.push(`carries ${quoted(extra)}, which the shape does not allow`);
  }
  return problems;
}

/** The ids a list value holds, or null where it is not a non-empty list of non-empty strings. */
function idsOf(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids: string[] = [];
  for (const item of value) {
    const id = text(item);
    if (id === "") return null;
    ids.push(id);
  }
  return ids;
}

/** The `{id, label}` of each mapping in a list that has an `id`. */
function labelled(value: unknown): Labelled[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) =>
    isMapping(entry) && text(entry["id"]) !== ""
      ? [{ id: text(entry["id"]), label: text(entry["label"]) }]
      : [],
  );
}

type Declared = {
  groups: Group[];
  supplements: Supplement[];
  controls: Labelled[];
  taskIds: string[];
  structureDeclared: boolean;
};

function checkReferences(declared: Declared, findings: ScreenCopyFinding[]): void {
  const { groups, supplements, controls, taskIds } = declared;
  const reference = (message: string, remedy: string): void => {
    findings.push({ kind: "reference", severity: "error", message, remedy });
  };
  const controlIds = new Set(controls.map((control) => control.id));
  const groupIds = new Set(groups.map((group) => group.id));
  const taskSet = new Set(taskIds);
  const placedIn = new Map<string, string[]>();

  for (const group of groups) {
    for (const member of group.members) {
      if (!controlIds.has(member)) {
        reference(
          `Group \`${group.id}\` lists the member \`${member}\`, which is no \`elements[].id\` or \`actions[].id\` of this screen.`,
          `Write an id the screen declares, or declare \`${member}\` under \`elements\` or \`actions\`.`,
        );
        continue;
      }
      placedIn.set(member, [...(placedIn.get(member) ?? []), group.id]);
    }
    for (const task of group.tasks) {
      if (!taskSet.has(task)) {
        reference(
          `Group \`${group.id}\` serves the task \`${task}\`, which is no \`primary_tasks[].id\` of this screen.`,
          "Write the id of a primary task the screen declares.",
        );
      }
    }
  }
  for (const [member, holders] of placedIn) {
    if (holders.length > 1) {
      reference(
        `\`${member}\` is a member of ${String(holders.length)} groups (${holders.map((holder) => `\`${holder}\``).join(", ")}).`,
        "Keep it in the one group it is read in.",
      );
    }
  }
  for (const supplement of supplements) {
    if (!controlIds.has(supplement.near) && !groupIds.has(supplement.near)) {
      reference(
        `Supplement \`${supplement.id}\` is near \`${supplement.near}\`, which is no element, action or group of this screen.`,
        "Set `near` to the `id` of the element, action or group the text sits with, or declare that one.",
      );
    }
  }
}

function checkRepeats(
  title: unknown,
  groups: Group[],
  supplements: Supplement[],
  controls: Labelled[],
  findings: ScreenCopyFinding[],
): void {
  const repeat = (message: string): void => {
    findings.push({
      kind: "repeat",
      severity: "warning",
      message,
      remedy:
        "Show the text once. Remove the repeat, or word it so it tells the user something the first does not.",
    });
  };
  const screenTitle = text(title);
  const headingOf = new Map(groups.map((group) => [group.id, group.heading]));
  const labelOf = new Map(controls.map((control) => [control.id, control.label]));

  for (const group of groups) {
    if (group.heading !== null && same(group.heading, screenTitle)) {
      repeat(
        `The heading of group \`${group.id}\` repeats the screen \`title\`: "${group.heading}".`,
      );
    }
  }
  const byTargetAndText = new Set<string>();
  for (const supplement of supplements) {
    const targets: Array<{ name: string; value: string | null | undefined }> = [
      { name: "the screen `title`", value: screenTitle },
      ...groups.map((group) => ({
        name: `the heading of group \`${group.id}\``,
        value: group.heading,
      })),
      { name: `the label of \`${supplement.near}\``, value: labelOf.get(supplement.near) },
      { name: `the heading of \`${supplement.near}\``, value: headingOf.get(supplement.near) },
    ];
    const hit = targets.find((target) => same(target.value, supplement.text));
    if (hit !== undefined) {
      repeat(`Supplement \`${supplement.id}\` repeats ${hit.name}: "${supplement.text}".`);
    }
    const key = JSON.stringify([supplement.near, supplement.when, normalizeCopy(supplement.text)]);
    if (byTargetAndText.has(key)) {
      repeat(
        `Supplement \`${supplement.id}\` shows the same text as another supplement near \`${supplement.near}\` in the same state: "${supplement.text}".`,
      );
    }
    byTargetAndText.add(key);
  }
}

/** Whether two texts are the same wording; an empty or missing text is the same as nothing. */
function same(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = normalizeCopy(left ?? "");
  return a !== "" && a === normalizeCopy(right ?? "");
}
