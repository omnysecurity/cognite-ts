# @omnysecurity/cognite-codegen

Core TypeScript code generation library for Cognite Data Fusion data models.

## Overview

This package provides the core functionality for generating TypeScript types and utilities from Cognite Data Fusion (CDF) data models. It takes CDF data model definitions and generates strongly-typed TypeScript interfaces, types, and helper constants.

## Usage

```typescript
import { generate } from '@omnysecurity/cognite-codegen';

const output = generate({
	dataModel: myDataModel,
	views: myViews,
});

// Write the generated TypeScript code to a file
await writeFile('generated-types.ts', output.fileContent);
```

## Features

- Generates TypeScript types from CDF data model views
- Supports all CDF property types (text, number, boolean, dates, enums, direct references, etc.)
- Creates type-safe schema definitions
- Handles view inheritance and relationships
- Generates utility constants for runtime usage

## API

### `generate(options: GenerateFileOptions)`

Generates TypeScript code from a CDF data model.

**Parameters:**

- `options.dataModel`: The CDF DataModel object
- `options.views`: Array of ViewDefinition objects from the data model

**Returns:**

- `fileName`: Suggested filename for the generated code
- `fileContent`: The generated TypeScript code as a string
