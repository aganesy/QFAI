Feature: Order draft creation

  # QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001

  @SPEC-0001 @SC-0001-0001 @AC-0001-0001 @BR-0001-0001 @layer-api @size-s
  Scenario: Create draft succeeds
    Given no existing draft for customer "C-100" and item "I-900"
    When the client submits customer "C-100" and item "I-900"
    Then the API responds with status 201
    And the response contains status "draft"

  @SPEC-0001 @SC-0001-0002 @AC-0001-0002 @BR-0001-0002 @layer-integration @size-m
  Scenario: Duplicate draft is rejected
    Given an existing draft for customer "C-100" and item "I-900"
    When the client submits customer "C-100" and item "I-900"
    Then the API responds with status 409

  @SPEC-0001 @SC-0001-0003 @AC-0001-0003 @BR-0001-0003 @layer-api @size-s
  Scenario: Duplicate error code is stable
    Given an existing draft for customer "C-100" and item "I-900"
    When the client submits customer "C-100" and item "I-900"
    Then the response error code is "DUPLICATE_ORDER_DRAFT"
