import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  isStoryTreeId,
  itemIdMatchesStory,
  storyIdMatchesFlow,
  type StoryTreeIdKind,
} from "../storyTree/ids.js";
import { resolveStoryTreeRoots, STORY_FILES } from "../storyTree/layout.js";
import { classifyRecordRow } from "../storyTree/tables.js";
import { readStoryTreeModel, type StoryTreeModel } from "../storyTree/tree.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

function finding(code: string, message: string, file: string, refs: string[] = []): Issue {
  return issue(code, message, "error", file, "storyTree.structure", refs);
}

/** Checks relationships in the parsed tree without reading the filesystem again. */
export function validateStoryTreeStructureModel(model: StoryTreeModel): Issue[] {
  const issues: Issue[] = [];
  const kindFor = (id: string): StoryTreeIdKind | undefined => {
    const prefix = id.split("-")[0];
    return ["BF", "US", "AC", "EX", "BR", "DEC", "OQ"].includes(prefix ?? "")
      ? (prefix as StoryTreeIdKind)
      : undefined;
  };
  const definitions = new Map<string, string[]>();
  for (const declaration of model.declarations) {
    const kind = kindFor(declaration.id);
    if (!kind || !isStoryTreeId(declaration.id, kind)) {
      issues.push(
        finding(
          "QFAI-STORY-002",
          `Malformed story-tree ID ${declaration.id || "(empty)"} in ${declaration.file}`,
          declaration.file,
          [declaration.id],
        ),
      );
    }
    const files = definitions.get(declaration.id) ?? [];
    files.push(declaration.file);
    definitions.set(declaration.id, files);
  }
  for (const [id, files] of definitions) {
    if (files.length < 2) continue;
    issues.push(
      issue(
        "QFAI-STORY-002",
        `${id} is defined more than once: ${files.join(", ")}`,
        "error",
        files[0],
        "storyTree.duplicateId",
        [id],
        "canonical",
        undefined,
        { relatedFiles: files.slice(1) },
      ),
    );
  }
  for (const flow of model.flows) {
    if (path.basename(flow.directory) !== `business-flow-${flow.id.slice(3)}`) {
      issues.push(
        finding("QFAI-STORY-002", `${flow.id} disagrees with ${flow.directory}`, flow.file, [
          flow.id,
        ]),
      );
    }
  }
  for (const story of model.stories) {
    if (!storyIdMatchesFlow(story.id, story.flowId)) {
      issues.push(
        finding("QFAI-STORY-002", `${story.id} disagrees with flow ${story.flowId}`, story.file, [
          story.id,
        ]),
      );
    }
    if (path.basename(story.directory) !== `user-story-${story.id.slice(3)}`) {
      issues.push(
        finding("QFAI-STORY-002", `${story.id} disagrees with ${story.directory}`, story.file, [
          story.id,
        ]),
      );
    }
  }
  for (const item of [...model.acceptanceCriteria, ...model.examples]) {
    if (!itemIdMatchesStory(item.id, item.storyId)) {
      issues.push(
        finding(
          "QFAI-STORY-002",
          `${item.id} disagrees with ${item.storyId} in ${item.file}`,
          item.file,
          [item.id],
        ),
      );
    }
  }

  for (const [table, file] of [
    [model.decisions, model.decisionFile],
    [model.openQuestions, model.openQuestionsFile],
  ] as const) {
    if (!table || !file) continue;
    for (const error of table.errors) {
      issues.push(finding("QFAI-STORY-003", `${file}: ${error}`, file));
    }
  }
  for (const row of model.openQuestions?.rows ?? []) {
    const classified = classifyRecordRow(row);
    if (classified.kind === "unadjudicated" && classified.inForce) {
      issues.push(
        finding(
          "QFAI-SPACK-102",
          `Unadjudicated question ${row.id} in ${model.openQuestionsFile}`,
          model.openQuestionsFile ?? "",
          [row.id],
        ),
      );
    }
  }

  const criteria = new Set(model.acceptanceCriteria.map((entry) => entry.id));
  const citedCriteria = new Set<string>();
  for (const example of model.examples) {
    const refs = example.acRef
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (
      refs.length !== 1 ||
      !criteria.has(refs[0] ?? "") ||
      !itemIdMatchesStory(refs[0] ?? "", example.storyId)
    ) {
      issues.push(
        finding(
          "QFAI-STORY-004",
          `${example.id} has invalid AC-Ref ${example.acRef || "(empty)"} in ${example.file}`,
          example.file,
          [example.id],
        ),
      );
    } else {
      const ref = refs[0];
      if (ref) citedCriteria.add(ref);
    }
  }
  for (const criterion of model.acceptanceCriteria) {
    if (!citedCriteria.has(criterion.id)) {
      issues.push(
        finding(
          "QFAI-STORY-004",
          `${criterion.id} has no example in ${criterion.file}`,
          criterion.file,
          [criterion.id],
        ),
      );
    }
  }

  const examples = new Set(model.examples.map((entry) => entry.id));
  const citedExamples = new Set<string>();
  const rules = new Set(model.rules.map((entry) => entry.id));
  for (const rule of model.rules) {
    if (rule.examples.length === 0) {
      issues.push(
        finding("QFAI-STORY-005", `${rule.id} has no examples in ${rule.file}`, rule.file, [
          rule.id,
        ]),
      );
    }
    for (const ref of rule.examples) {
      if (!examples.has(ref)) {
        issues.push(
          finding("QFAI-STORY-005", `${rule.id} cites unknown ${ref} in ${rule.file}`, rule.file, [
            rule.id,
            ref,
          ]),
        );
      } else {
        citedExamples.add(ref);
      }
    }
  }
  for (const example of model.examples) {
    if (!citedExamples.has(example.id)) {
      issues.push(
        finding(
          "QFAI-STORY-005",
          `${example.id} is not cited by a rule in ${example.file}`,
          example.file,
          [example.id],
        ),
      );
    }
  }
  for (const ref of model.ruleRefs) {
    if (!rules.has(ref.id)) {
      issues.push(
        finding("QFAI-STORY-005", `${ref.id} is not defined in a contract: ${ref.file}`, ref.file, [
          ref.id,
        ]),
      );
    }
  }
  for (const error of model.errors) {
    issues.push(finding("QFAI-STORY-005", error, ""));
  }
  return issues;
}

/** Reports the exact entry set of each story directory. */
export async function validateStoryDirectories(
  specsDir: string,
  model?: StoryTreeModel,
): Promise<Issue[]> {
  const flowRoot = path.join(specsDir, "02_business-flow");
  const issues: Issue[] = [];
  const definedFlowFiles = new Set(model?.flows.map(({ file }) => path.resolve(file)));
  const definedStoryFiles = new Set(model?.stories.map(({ file }) => path.resolve(file)));
  let flows;
  try {
    flows = await readdir(flowRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return issues;
    throw error;
  }
  for (const flow of flows) {
    if (!flow.isDirectory() || !/^business-flow-\d{4}$/.test(flow.name)) continue;
    const flowDir = path.join(flowRoot, flow.name);
    const flowEntries = await readdir(flowDir, { withFileTypes: true });
    const flowFile = path.join(flowDir, "business-flow.md");
    if (model && flowEntries.some((entry) => entry.name === "business-flow.md" && entry.isFile())) {
      if (!definedFlowFiles.has(path.resolve(flowFile))) {
        issues.push(finding("QFAI-STORY-002", `Missing BF H1 ID in ${flowFile}`, flowFile));
      }
    }
    for (const story of flowEntries) {
      if (!story.isDirectory() || !/^user-story-\d{4}-\d{4}$/.test(story.name)) continue;
      const storyDir = path.join(flowDir, story.name);
      const entries = await readdir(storyDir, { withFileTypes: true });
      const storyFile = path.join(storyDir, "01_User-story.md");
      if (model && entries.some((entry) => entry.name === "01_User-story.md" && entry.isFile())) {
        if (!definedStoryFiles.has(path.resolve(storyFile))) {
          issues.push(finding("QFAI-STORY-002", `Missing US H1 ID in ${storyFile}`, storyFile));
        }
      }
      const actual = new Set(entries.map((entry) => entry.name));
      const missing = STORY_FILES.filter((name) => !actual.has(name));
      const extra = entries
        .filter((entry) => !STORY_FILES.some((name) => name === entry.name) || !entry.isFile())
        .map((entry) => entry.name);
      if (missing.length > 0 || extra.length > 0) {
        issues.push(
          finding(
            "QFAI-STORY-001",
            `${storyDir} has invalid entries: missing ${missing.join(", ") || "none"}; extra ${extra.join(", ") || "none"}`,
            storyDir,
          ),
        );
      }
    }
  }
  return issues;
}

export async function validateStoryTreeStructure(
  root: string,
  config: QfaiConfig,
  model?: StoryTreeModel,
): Promise<Issue[]> {
  const roots = resolveStoryTreeRoots(root, config);
  const tree = model ?? (await readStoryTreeModel(root, config));
  return [
    ...(await validateStoryDirectories(roots.specsDir, tree)),
    ...(await validateFlowMermaid(tree)),
    ...validateStoryTreeStructureModel(tree),
  ];
}

/** A business flow needs an actual Mermaid flowchart or sequence diagram. */
async function validateFlowMermaid(model: StoryTreeModel): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (const flow of model.flows) {
    const content = await readFile(flow.file, "utf8");
    const fences = content.matchAll(
      /^ {0,3}(`{3,}|~{3,})[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)^ {0,3}\1[ \t]*$/gim,
    );
    if ([...fences].some((match) => /^\s*(?:flowchart|sequenceDiagram)\b/im.test(match[2] ?? ""))) {
      continue;
    }
    issues.push(
      finding(
        "QFAI-STORY-011",
        `${flow.id} needs a Mermaid flowchart or sequenceDiagram in ${flow.file}`,
        flow.file,
        [flow.id],
      ),
    );
  }
  return issues;
}
