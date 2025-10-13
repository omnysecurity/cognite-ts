---
'@omnysecurity/cognite-helpers': minor
---

Adds support for non ambiguous view references in helpers
- Different versions of the same view
- Views with matching externalId from different spaces

Adds `getViewId` top level helper to return a unique identifier for the provided view. 

BREAKING: `getView().asId` no longer returns `TView`
