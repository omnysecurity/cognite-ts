---
'@omnysecurity/cognite-helpers': minor
---

Support both simple, namespaced and full view reference formats in helpers.
Everywhere a view is passed, the following formats is not supported:

- `<externalId>`: simple
- `<space>__<externalId>`: namespaced
- `<space>__<externalId>__<version>`: full

Which of these types are provided through intellisense varies based on the provided schema type, and will be narrowed to unambigious permutations on the provided schema keys.

**BREAKING**:

- The `asId()` function now returns the reference in the full format
- The `asDefinition()` function no longer narrows the `$.externalId` property of the returned view definition.
