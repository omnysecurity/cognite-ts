---
'@omnysecurity/cognite-codegen': minor
'@omnysecurity/cognite-codegen-cli': minor
---

Support exact view references

- Add support for multiple views with matching externalId and multiple versions of the same view.
- **BREAKING**: The  `__Schema` type has been modifier. New type `Schema` with backwards compatible declarations has been added.
- **BREAKING**: Remove `Node` and `Edge` types from generated output. Consumers should use types from `@cognite/sdk` instead. 

