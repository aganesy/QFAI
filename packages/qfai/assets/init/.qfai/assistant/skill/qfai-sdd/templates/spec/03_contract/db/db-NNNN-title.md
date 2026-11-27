# DB-0001: Order confirmation

## Responsibility

Retain the confirmed order.

## Inputs

- The order and its confirmed contents.

## Outcomes

- The confirmed contents remain available when read later.

## Business rules

| BR-ID           | Statement                                                        | Examples        |
| --------------- | ---------------------------------------------------------------- | --------------- |
| BR-DB-0001-0001 | Subsequent edits preserve the contents accepted at confirmation. | EX-0001-0001-01 |
