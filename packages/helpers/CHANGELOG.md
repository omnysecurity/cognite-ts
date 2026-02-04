# @omnysecurity/cognite-helpers

## 0.3.2

### Patch Changes

- 239f12c: Add new exported members
  - `getViewId` - same as `helpers.getViewId` without the need to create a helpers instance
  - `type ViewHelpers` - return type of `helpers.getView<T>(viewRef)`

## 0.3.1

### Patch Changes

- ea7d986: - Fixed ESM module resolution by adding `.js` extensions to relative imports in source files

  This fixes `ERR_MODULE_NOT_FOUND` errors when using this package in ESM projects.

## 0.3.0

### Minor Changes

- f0d30a4: - Add property `helpers.registerView` - Helper can now be extended to additional views after initialization.
  - Add property `helpers.filter` - Returns a `Filter` instance using the currently registered view definitions

## 0.2.0

### Minor Changes

- e85c260: Support both simple, namespaced and full view reference formats in helpers.
  Everywhere a view is passed, the following formats is not supported:
  - `<externalId>`: simple
  - `<space>__<externalId>`: namespaced
  - `<space>__<externalId>__<version>`: full

  Which of these types are provided through intellisense varies based on the provided schema type, and will be narrowed to unambigious permutations on the provided schema keys.

  **BREAKING**:
  - The `asId()` function now returns the reference in the full format
  - The `asDefinition()` function no longer narrows the `$.externalId` property of the returned view definition.

## 0.1.3

### Patch Changes

- 9ae27d6: re-publish

## 0.1.2

### Patch Changes

- 7db1d43: export type declaration for internals

## 0.1.1

### Patch Changes

- eac3193: allow importing typescript declaration for helpers and filter

## 0.1.0

### Minor Changes

- 263db22: Initial pre-release of Cognite TypeScript tools

  This pre-release includes:
  - Core TypeScript code generation library for Cognite Data Fusion data models
  - Command-line interface for code generation
  - Enhanced TypeScript helpers for Cognite Data Fusion APIs

  This is a pre-release version for testing the publishing pipeline before the stable v1.0.0 release.
