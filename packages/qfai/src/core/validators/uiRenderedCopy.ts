/**
 * What a screen rendered, compared with the words its UI contract lists.
 *
 * `qfai validate --rendered <file>` reads a JSON file of the texts each screen
 * showed in a state. The caller writes it with a browser of its own; QFAI
 * renders nothing. For each entry, a rendered text that is no title, group
 * heading, label or supplement of that state is excess (`QFAI-CONTRACT-047`),
 * and a supplement of that state that was not rendered is an unmet need
 * (`QFAI-CONTRACT-048`). A file that cannot be read, or an entry out of shape,
 * is `QFAI-CONTRACT-046`. Texts compare as the repeat check compares them:
 * case, spacing and closing punctuation do not make a text different.
 *
 * Only the screens and states the file has an entry for are compared, so a
 * caller that renders the default state alone is asked about nothing else.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { readUiContractScreens, type UiContractScreenEntry } from "../contracts/screenContracts.js";
import {
  SUPPLEMENT_STATES,
  isMapping,
  normalizeCopy,
  screenCopyInventory,
} from "../contracts/screenCopy.js";
import { toRelativePath } from "../paths.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const RULE = "contracts.ui.renderedCopy";
/** The keys an entry of the file's `screens` list carries, and the only ones. */
const ENTRY_KEYS = ["contract", "screen", "when", "texts"] as const;
const SHAPE_REMEDY =
  'Write `{ "screens": [...] }` with one entry per screen and state, each with exactly `contract` (a declared `UI-NNNN`), `screen` (a `screens[].id` of that contract), `when` (`default`, `empty`, `loading`, `error` or `success`) and `texts` (the strings the screen showed).';

type RenderedEntry = {
  screen: UiContractScreenEntry;
  contract: string;
  when: string;
  texts: string[];
};

/** Every finding a rendered-text file raises against the project's UI contracts. */
export async function validateUiRenderedCopy(
  root: string,
  config: QfaiConfig,
  renderedPath: string,
): Promise<Issue[]> {
  const absolute = path.resolve(root, renderedPath);
  const shown = toRelativePath(root, absolute);
  const shape = (message: string): Issue =>
    issue(
      "QFAI-CONTRACT-046",
      `Rendered-text file ${shown}: ${message}`,
      "error",
      shown,
      RULE,
      [],
      "canonical",
      SHAPE_REMEDY,
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(absolute, "utf-8"));
  } catch (error: unknown) {
    const reason = error instanceof SyntaxError ? "it is not JSON" : "it cannot be read";
    return [shape(`${reason}.`)];
  }
  if (!isMapping(parsed) || !Array.isArray(parsed["screens"]) || Object.keys(parsed).length > 1) {
    return [shape("the top level is not a mapping holding only a `screens` list.")];
  }
  const screens = await readUiContractScreens(root, config.paths.contractsDir);
  const issues: Issue[] = [];
  const entries: RenderedEntry[] = [];
  const seen = new Set<string>();
  parsed["screens"].forEach((value: unknown, index) => {
    const where = `\`screens[${String(index)}]\``;
    const read = readEntry(value, screens);
    if (typeof read === "string") {
      issues.push(shape(`${where} ${read}.`));
      return;
    }
    const key = JSON.stringify([read.screen.file, read.screen.index, read.when]);
    if (seen.has(key)) {
      issues.push(shape(`${where} repeats the screen and state of an earlier entry.`));
      return;
    }
    seen.add(key);
    entries.push(read);
  });
  return [...issues, ...entries.flatMap(compareEntry)];
}

/** The entry, or what is wrong with it. */
function readEntry(value: unknown, screens: UiContractScreenEntry[]): RenderedEntry | string {
  if (!isMapping(value)) return "is not a mapping";
  const extra = Object.keys(value).filter(
    (key) => !(ENTRY_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return `carries ${extra.map((key) => `\`${key}\``).join(", ")}, which the shape does not allow`;
  }
  const { contract, screen, when, texts } = value;
  if (typeof contract !== "string" || typeof screen !== "string" || typeof when !== "string") {
    return "is missing `contract`, `screen` or `when` as a string";
  }
  if (!(SUPPLEMENT_STATES as readonly string[]).includes(when)) {
    return `\`when\` is \`${when}\`, which is not one of the five states`;
  }
  if (!Array.isArray(texts) || !texts.every((item: unknown) => typeof item === "string")) {
    return "has a `texts` that is not a list of strings";
  }
  if (!screens.some((entry) => entry.contractId === contract)) {
    return `names the contract \`${contract}\`, which no UI contract declares`;
  }
  const found = screens.find((entry) => entry.contractId === contract && entry.screenId === screen);
  if (found === undefined) {
    return `names the screen \`${screen}\`, which \`${contract}\` does not declare with a route`;
  }
  return { screen: found, contract, when, texts };
}

/** The excess and the unmet texts of one entry. */
function compareEntry({ screen, contract, when, texts }: RenderedEntry): Issue[] {
  const inventory = screenCopyInventory(screen.entry);
  const ofState = inventory.supplements.filter((supplement) => supplement.when === when);
  const listed = new Set(
    [...inventory.fixed, ...ofState.map((supplement) => supplement.text)].map(normalizeCopy),
  );
  const shownTexts = new Set(texts.map(normalizeCopy));
  const where = `Screen \`${screen.screenId}\` of ${contract} (\`when: ${when}\`)`;
  const refs = [contract, screen.screenId];
  const excess = texts
    .filter((value) => normalizeCopy(value) !== "" && !listed.has(normalizeCopy(value)))
    .map((value) =>
      issue(
        "QFAI-CONTRACT-047",
        `${where} rendered "${value}", which is no title, group heading, label or supplement of that state in ${screen.file}.`,
        "error",
        screen.file,
        RULE,
        refs,
        "canonical",
        "Add the text to `supplements` with the state it shows in and its `why`, or remove it from the screen. Data the product shows or the user types, and the message of a field rule, do not belong in the rendered-text file.",
      ),
    );
  const unmet = ofState
    .filter((supplement) => !shownTexts.has(normalizeCopy(supplement.text)))
    .map((supplement) =>
      issue(
        "QFAI-CONTRACT-048",
        `${where} did not render supplement \`${supplement.id}\`: "${supplement.text}".`,
        "error",
        screen.file,
        RULE,
        refs,
        "canonical",
        "Show the text on the screen in that state, or remove the supplement from the contract as a change to it.",
      ),
    );
  return [...excess, ...unmet];
}
