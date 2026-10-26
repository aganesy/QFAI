# US-0001-0153: UI contract `primary_tasks` slot per screen

## User Story

As an agent authoring UI contracts during `/qfai-sdd`, I want the shipped `ui-contract.sample.yaml` template to carry a `primary_tasks: []` slot on every `screens[]` entry and the `qfai-sdd` contract authoring guidance to tell me to fill at least one primary task per screen, so that `/qfai-prototyping` always has explicit primary-task semantics and a validate lane stops it from starting on a UI contract whose `primary_tasks` is empty.
