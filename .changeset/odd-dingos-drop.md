---
'@omnysecurity/cognite-helpers': patch
---

- Fixed ESM module resolution by adding `.js` extensions to relative imports in source files

This fixes `ERR_MODULE_NOT_FOUND` errors when using this package in ESM projects.