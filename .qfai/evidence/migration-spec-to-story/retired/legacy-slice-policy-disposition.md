# Legacy slice-policy disposition

Source: `.qfai/specs/_policies/11_Slice-Policy.md`.
Step 3 archives the complete file under `retired/_policies/`. It does not
copy any of these old headings into `01_policy/principle.md`.

| Old heading | Current disposition |
| --- | --- |
| Principle (read first) | The old CAP/spec default and token-overlap classifier are retired; current story-tree operation choice lives in `skill/qfai-sdd/references/sdd-triage.md`. |
| Slice categories | The old slice placement vocabulary is retired; current flow/story/contract placement is in the SDD triage reference. |
| Triage オペレーション (8 種) | The current eight operation choices are already governed by the SDD triage reference; retain the old text only as provenance. |
| APPEND vs CREATE 判定アルゴリズム (append-first) | Old CAP/spec and token-overlap rules are retired. The current SDD triage reference governs operation choice and approval. |
| Impact cascade | Current impact and decision-row handling is in the SDD triage reference. |
| Decision procedure | Current operation decision procedure is in the SDD triage reference. |
| Status field | Current decision and question row status rules are in the SDD triage reference and record schema. |
| AskUserQuestion テンプレート | The old host-specific question wording is retired; current user-question rules govern the answer shape. |
| ID 安定性ルール | The story-tree allocator and SDD triage reference govern current IDs and no reuse. |
| ギャップポリシー | Current open-question and drift handling replaces positional old-pack gap rules. |
| Current Slicing Notes | Historical notes remain in the archive and do not form an active rule. |

`rule/change-classification.md` classifies a PR by Primary and Tags; it does
not replace the old slicing procedure. The source archive is authoritative
evidence of what was retired, while current SDD references own operative text.
