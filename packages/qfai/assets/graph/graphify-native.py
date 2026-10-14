"""Inspect the managed corpus with Graphify's native freshness operation."""

import json
import sys
from pathlib import Path

from graphify.detect import detect_incremental


def input_inventory(output, graph):
    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("Invalid native manifest")
    files = set(manifest.keys())
    groups = [graph["nodes"]]
    for name in ("edges", "links", "hyperedges"):
        if name in graph:
            groups.append(graph[name])
    nested = graph.get("graph", {})
    if not isinstance(nested, dict):
        raise ValueError("Invalid native graph attributes")
    if "hyperedges" in nested:
        groups.append(nested["hyperedges"])
    for group in groups:
        if not isinstance(group, list):
            raise ValueError("Invalid native graph references")
        for item in group:
            if not isinstance(item, dict):
                raise ValueError("Invalid native graph reference")
            for field in ("source_file", "definition_file", "path"):
                value = item.get(field)
                if value is None or value == "":
                    continue
                if not isinstance(value, str):
                    raise ValueError("Invalid native input path")
                files.add(value)
    return sorted(files)


def main():
    root = Path(sys.argv[1])
    kind = sys.argv[2]
    output = root / "graphify-out"
    graph = json.loads((output / "graph.json").read_text(encoding="utf-8"))
    if not isinstance(graph, dict) or not isinstance(graph.get("nodes"), list):
        raise ValueError("Invalid native graph")
    if kind == "inventory":
        print(json.dumps({"files": input_inventory(output, graph)}))
        return
    if kind not in ("semantic", "ast"):
        raise ValueError("Unsupported native inspection")
    state = detect_incremental(
        root,
        manifest_path=str(output / "manifest.json"),
        kind=kind,
        cache_root=output,
    )
    print(json.dumps({
        "current": state["new_total"] == 0
        and not state["deleted_files"]
        and not state["excluded_files"],
        "unsupported": state.get("unclassified", []),
        "unreadable": state.get("unreadable", []),
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.stderr.write("Graphify freshness inspection failed.\n")
        sys.exit(1)
