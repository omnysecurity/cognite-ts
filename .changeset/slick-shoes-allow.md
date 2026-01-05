---
'@omnysecurity/cognite-helpers': minor
---

Add `createInstanceBuilder` for type-safe construction of CDF node and edge writes. The builder provides autocomplete for view properties, validates property types at compile time, and supports chaining multiple views on a single node. Edge connections automatically generate deterministic external IDs and handle edge direction.
