# contracts/api (OpenAPI)

## Purpose

Define API contracts that specs, tests, and prototyping can reference.

## File rules

- File name: `api-XXXX-<slug>.yaml`
- Header: `# QFAI-CONTRACT-ID: CON-API-XXXX`
- Use OpenAPI 3.x.
- Keep it minimal: endpoints/fields used by specs only.

## Template (YAML)

```yaml
# QFAI-CONTRACT-ID: CON-API-0001
openapi: "<openapi-version>"
info:
  title: <API title>
  version: "<contract-version>"
paths:
  /api/system/health:
    get:
      summary: Health check
      responses:
        "200":
          description: OK
```

## Sample (excerpt)

```yaml
paths:
  /api/products:
    get:
      summary: List products
      parameters:
        - name: q
          in: query
          schema: { type: string }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/Product"
components:
  schemas:
    Product:
      type: object
      required: [code, name]
      properties:
        code: { type: string }
        name: { type: string }
```

## Checklist

- [ ] Contract ID exists and matches file name.
- [ ] Paths/methods are correct and minimal.
- [ ] Schema has required fields needed for tests.
