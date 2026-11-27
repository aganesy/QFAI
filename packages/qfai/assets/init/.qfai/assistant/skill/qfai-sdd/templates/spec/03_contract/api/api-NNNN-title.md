# API-0001: Order confirmation

## Responsibility

Decide whether an order can be confirmed.

## Inputs

- The order and the identity of the requester.

## Outcomes

- The requester learns the confirmation result.

## Business rules

| BR-ID            | Statement                            | Examples        |
| ---------------- | ------------------------------------ | --------------- |
| BR-API-0001-0001 | Only the owner may confirm an order. | EX-0001-0001-01 |
