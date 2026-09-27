# US-0001-0180: Cross-skill handoff legacy adapter helper

## User Story

As a downstream-project operator with a legacy handoff file, I want `qfai handoff upgrade <legacy-file>` to write a conforming `handoff.yaml` at the canonical path while preserving every original field under `legacy:`, so that migration to the canonical handoff schema loses nothing during the deprecation window.
