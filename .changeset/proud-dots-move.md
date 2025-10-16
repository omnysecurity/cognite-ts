---
'@omnysecurity/cognite-helpers': minor
---

Support both simple and full view reference formats in helpers. The `isKnownView()` function now accepts both the simple format (externalId only, e.g., 'Assessment') and the full format (space__externalId__version, e.g., 'presentation_model__Assessment__c902f759da6320'). The `asId()` method now returns the full format.
