---
'@omnysecurity/cognite-codegen-cli': minor
'@omnysecurity/cognite-codegen': minor
---

Resolve implemented views before code generation

- add `resolveViews`, which retrieves a data model's views plus the transitive closure of everything they `implement`, fixing dangling type references to implemented views not listed on the data model
- throw when a referenced or implemented view cannot be resolved, rather than emitting invalid code
- degrade `direct` relations whose target view is outside the generated set to `DirectReference<unknown>`
- the CLI now resolves views via `resolveViews` in place of a plain `views.retrieve`
