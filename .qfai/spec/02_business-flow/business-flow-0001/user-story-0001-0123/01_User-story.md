# US-0001-0123: Ten-cycle execution limit

## User Story

As a CI operator, I want the run capped at 10 cycles (cycle 0 plus cycles 1 to 9, ending at index 9), so that a runaway loop stops deterministically and validators reject any evidence pack with a cycle index above 9.
