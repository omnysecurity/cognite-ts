# @omnysecurity/cognite-codegen

## 0.3.0

### Minor Changes

- 9bf93b3: Codegen improvements
  - statically resolve unambigious view references for better typescript performance
  - set view definition system timestamps to zero to avoid unwanted diffs on schema re-generation

## 0.2.0

### Minor Changes

- 52e40fd: Support exact view references
  - Add support for multiple views with matching externalId and multiple versions of the same view.
  - **BREAKING**: The `__Schema` type has been modifier. New type `Schema` with backwards compatible declarations has been added.
  - **BREAKING**: Remove `Node` and `Edge` types from generated output. Consumers should use types from `@cognite/sdk` instead.

## 0.1.1

### Patch Changes

- 9ae27d6: re-publish

## 0.1.0

### Minor Changes

- 263db22: Initial pre-release of Cognite TypeScript tools

  This pre-release includes:
  - Core TypeScript code generation library for Cognite Data Fusion data models
  - Command-line interface for code generation
  - Enhanced TypeScript helpers for Cognite Data Fusion APIs

  This is a pre-release version for testing the publishing pipeline before the stable v1.0.0 release.
