import process from "node:process";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

async function main() {
  const sdk = await import(pathToFileURL(process.argv[2]).href);
  const { default: CodeGraph, setLogger, silentLogger } = sdk.default;
  setLogger(silentLogger);
  const mode = process.argv[4];
  const corpus = process.argv[3];
  const graph = mode
    ? await CodeGraph.open(process.argv[3], { readOnly: true })
    : await CodeGraph.init(process.argv[3], { index: false });
  try {
    if (mode === "inventory") {
      process.stdout.write(
        JSON.stringify({ files: graph.getFiles().map((file) => file.path) }) + "\n",
      );
    } else if (mode === "coverage") {
      process.stdout.write(JSON.stringify(await coverage(graph, corpus)) + "\n");
    } else if (mode === undefined) {
      const result = await graph.indexAll();
      const build = graph.getIndexBuildInfo();
      await writeFile(
        path.join(corpus, ".codegraph", "qfai-native-evidence.json"),
        JSON.stringify({
          engineVersion: build.version,
          extractionVersion: build.extractionVersion,
          lastIndexedAt: graph.getLastIndexedAt(),
          result: {
            success: result.success,
            filesDiscovered: result.filesDiscovered ?? null,
            filesIndexed: result.filesIndexed,
            filesSkipped: result.filesSkipped,
            filesErrored: result.filesErrored,
            filesSkippedUnsupported: result.filesSkippedUnsupported ?? 0,
            topUnsupportedExtensions: result.topUnsupportedExtensions ?? [],
            errors: result.errors.map((error) => ({
              code: error.code ?? "unclassified",
              severity: error.severity,
              filePath: safeRelativeInput(corpus, error.filePath),
            })),
          },
        }) + "\n",
      );
      process.stdout.write("CodeGraph native indexing completed.\n");
    } else {
      throw new Error("Unsupported native operation");
    }
  } finally {
    graph.close();
  }
}

function safeRelativeInput(corpus, file) {
  if (typeof file !== "string" || !file) return "Unidentified native input";
  const relative = (path.isAbsolute(file) ? path.relative(corpus, file) : file).replaceAll(
    "\\",
    "/",
  );
  if (
    path.posix.isAbsolute(relative) ||
    path.win32.isAbsolute(relative) ||
    relative.split("/").some((part) => !part || part === "." || part === "..") ||
    /(?:^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.pypirc$|\.netrc$|credentials?(?:\.|$)|secrets?(?:\.|$))|\.(?:pem|key|p12|pfx)$/i.test(
      relative,
    )
  )
    return "Unidentified native input";
  return relative;
}

async function coverage(graph, corpus) {
  const unknown = { complete: false, unsupported: [], unreadable: [], unparsed: [] };
  let evidence;
  try {
    evidence = JSON.parse(
      await readFile(path.join(corpus, ".codegraph", "qfai-native-evidence.json"), "utf8"),
    );
  } catch {
    return unknown;
  }
  const build = graph.getIndexBuildInfo();
  const result = evidence?.result;
  const counts = [
    "filesDiscovered",
    "filesIndexed",
    "filesSkipped",
    "filesErrored",
    "filesSkippedUnsupported",
  ];
  if (
    !record(evidence) ||
    Object.keys(evidence).length !== 4 ||
    evidence.engineVersion !== build.version ||
    evidence.extractionVersion !== build.extractionVersion ||
    !Number.isSafeInteger(evidence.lastIndexedAt) ||
    evidence.lastIndexedAt !== graph.getLastIndexedAt() ||
    !record(result) ||
    Object.keys(result).length !== 8 ||
    typeof result.success !== "boolean" ||
    counts.some((key) => !Number.isSafeInteger(result[key]) || result[key] < 0) ||
    !Array.isArray(result.errors) ||
    !Array.isArray(result.topUnsupportedExtensions)
  )
    return unknown;
  const unsupported = [];
  const unreadable = [];
  const unparsed = [];
  let documentedInputs = 0;
  for (const group of result.topUnsupportedExtensions) {
    if (
      !record(group) ||
      typeof group.ext !== "string" ||
      !Number.isSafeInteger(group.count) ||
      group.count < 0
    )
      return unknown;
    if (
      /^\.(?:md|mdx|txt|rst|adoc|pdf|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|mp[34]|wav)$/i.test(
        group.ext,
      )
    ) {
      documentedInputs += group.count;
    } else {
      unsupported.push(`${group.ext} (${group.count} inputs)`);
    }
  }
  const namedUnsupported = result.topUnsupportedExtensions.reduce(
    (count, group) => count + group.count,
    0,
  );
  if (namedUnsupported < result.filesSkippedUnsupported)
    unsupported.push("Other unsupported native inputs");
  if (
    namedUnsupported > result.filesSkippedUnsupported ||
    documentedInputs > result.filesSkippedUnsupported
  )
    return unknown;
  for (const error of [
    ...result.errors,
    ...graph.getFiles().flatMap((file) => file.errors ?? []),
  ]) {
    if (!record(error) || !["error", "warning"].includes(error.severity)) return unknown;
    const file = safeRelativeInput(corpus, error.filePath);
    if (error.code === "read_error") unreadable.push(file);
    else unparsed.push(file);
  }
  if (result.filesErrored > 0 && unreadable.length === 0 && unparsed.length === 0)
    unparsed.push("Unidentified native extraction errors");
  const complete =
    result.success &&
    result.filesIndexed + result.filesSkipped + result.filesErrored >= result.filesDiscovered &&
    result.filesErrored === 0 &&
    unsupported.length === 0 &&
    unreadable.length === 0 &&
    unparsed.length === 0;
  return {
    complete,
    unsupported,
    unreadable: [...new Set(unreadable)],
    unparsed: [...new Set(unparsed)],
  };
}

function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

main().catch(() => {
  process.stderr.write("CodeGraph native indexing failed.\n");
  process.exitCode = 1;
});
