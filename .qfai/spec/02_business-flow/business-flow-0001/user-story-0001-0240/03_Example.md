# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                    | Expected                                                                                         |
| --------------- | --------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| EX-0001-0240-01 | AC-0001-0240-01 | A business-flow flowchart with 13 nodes in one chain                                     | QFAI-FLOW-006 warning naming the file, the opening fence line, 13 nodes, 12 edges and the limits |
| EX-0001-0240-02 | AC-0001-0240-01 | A flowchart with 6 nodes and 17 edges                                                    | QFAI-FLOW-006 warning naming 17 edges                                                            |
| EX-0001-0240-03 | AC-0001-0240-01 | A sequence diagram with 13 participants in the latest discussion pack, run in discussion | QFAI-FLOW-006 warning naming the pack file                                                       |
| EX-0001-0240-04 | AC-0001-0240-01 | A state diagram with 13 states besides the start and end marker                          | QFAI-FLOW-006 warning naming 13 nodes                                                            |
| EX-0001-0240-05 | AC-0001-0240-01 | An entity-relationship diagram with 13 entities                                          | QFAI-FLOW-006 warning naming 13 nodes                                                            |
| EX-0001-0240-06 | AC-0001-0240-01 | A flowchart line `A --> B & C --> D` repeated with new IDs until 13 nodes                | QFAI-FLOW-006 warning; each `&` pair counted as its own edge                                     |
| EX-0001-0240-07 | AC-0001-0240-02 | A flowchart with exactly 12 nodes and 16 edges                                           | No QFAI-FLOW-006                                                                                 |
| EX-0001-0240-08 | AC-0001-0240-02 | A pie chart with 20 slices                                                               | No QFAI-FLOW-006                                                                                 |
| EX-0001-0240-09 | AC-0001-0240-02 | A flowchart with 12 nodes inside a subgraph, the subgraph boundary lines and style lines | No QFAI-FLOW-006                                                                                 |
| EX-0001-0240-10 | AC-0001-0240-03 | validation.diagramBudget sets nodes 20 and edges 30; a flowchart with 13 nodes           | No QFAI-FLOW-006                                                                                 |
| EX-0001-0240-11 | AC-0001-0240-03 | validation.diagramBudget sets nodes 0                                                    | QFAI-CFG-002 naming validation.diagramBudget.nodes; the node limit keeps its default             |
| EX-0001-0240-12 | AC-0001-0240-03 | validation.diagramBudget is a list                                                       | QFAI-CFG-002 naming validation.diagramBudget; both limits keep their defaults                    |
