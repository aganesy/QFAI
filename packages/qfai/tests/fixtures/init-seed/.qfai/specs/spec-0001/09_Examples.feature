Feature: Examples for order draft creation

  @EX-0001 @AC-0001 @layer-api
  Scenario: Create draft succeeds
    Given no existing draft for customer "C-100" and item "I-900"
    When the client submits customer "C-100" and item "I-900"
    Then the API responds with status 201
    And the response contains status "draft"

  @EX-0002 @AC-0002 @layer-integration
  Scenario: Duplicate draft is rejected
    Given an existing draft for customer "C-100" and item "I-900"
    When the client submits customer "C-100" and item "I-900"
    Then the API responds with status 409

  @EX-0003 @AC-0003 @layer-api
  Scenario: Duplicate error code is stable
    Given an existing draft for customer "C-100" and item "I-900"
    When the client submits customer "C-100" and item "I-900"
    Then the response error code is "DUPLICATE_ORDER_DRAFT"
