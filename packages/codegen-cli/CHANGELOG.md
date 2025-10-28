# @omnysecurity/cognite-codegen-cli

## 0.2.0

### Minor Changes

- 52e40fd: Support exact view references
  - Add support for multiple views with matching externalId and multiple versions of the same view.
  - **BREAKING**: The `__Schema` type has been modifier. New type `Schema` with backwards compatible declarations has been added.
  - **BREAKING**: Remove `Node` and `Edge` types from generated output. Consumers should use types from `@cognite/sdk` instead.

### Patch Changes

- Updated dependencies [52e40fd]
  - @omnysecurity/cognite-codegen@0.2.0

## 0.1.3

### Patch Changes

- a6abd18: Adds support for providing arguments through .env in addition to flags

## 0.1.2

### Patch Changes

- 9ae27d6: re-publish
- Updated dependencies [9ae27d6]
  - @omnysecurity/cognite-codegen@0.1.1

## 0.1.1

### Patch Changes

- 9c8777e: add missing typescript dependency

## 0.1.0

### Minor Changes

- 263db22: Initial pre-release of Cognite TypeScript tools

  This pre-release includes:
  - Core TypeScript code generation library for Cognite Data Fusion data models
  - Command-line interface for code generation
  - Enhanced TypeScript helpers for Cognite Data Fusion APIs

  This is a pre-release version for testing the publishing pipeline before the stable v1.0.0 release.

### Patch Changes

- Updated dependencies [263db22]
  - @omnysecurity/cognite-codegen@0.1.0
