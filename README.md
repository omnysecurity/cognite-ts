# cognite-ts

TypeScript tools and utilities for building applications using the `@cognite/sdk` package

## Overview

- [@omnysecurity/cognite-codegen](./packages/codegen) - Core TypeScript code generation library for Cognite Data Fusion data models
- [@omnysecurity/cognite-codegen-cli](./packages/codegen-cli) - Command-line interface for Cognite Data Fusion TypeScript code generation
- [@omnysecurity/cognite-helpers](./packages/helpers) - Enhanced TypeScript support for Cognite Data Fusion APIs

## Quick Start

### 1. Generate TypeScript Types from CDF Data Models

Before you can do this step you need to have a valid CDF token at hand. This can be obtained by inspecting the `Authorization` HTTP header in an API request to CDF, e.g. when browsing the Cognite Data Fusion UI.

```bash
cd ./packages/codegen-cli
pnpm install
pnpm build
node . \
  --cluster https://api.cognitedata.com \
  --project acme \
  --space jam \
  --model citizen \
  --version 42 \
  --output datamodel.ts
  --token <access token to CDF>
```

You may want to run the file through your preferred formatting tool before adding it to your repository.

### 2. Use generated types to instantiate typescript helpers for Cognite APIs

```typescript
import { __Schema, VIEW_DEFIINITIONS } from 'datamodel.ts';
import { createHelpers } from '@omnyysecurity/cognite-helpers';

const helpers = createHelpers<__Schema>(VIEW_DEFINITIONS);
```

See [@omnysecurity/cognite-helpers](./packages/helpers) for additional documentation.

## License

This project is licensed under the Apache License 2.0 - with the exception below - see the [LICENSE](LICENSE) file for details.

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

Licensee may use, modify, and incorporate the Software into its products and services for internal or commercial use. Redistribution, sublicensing, or disclosure of the Software to third parties is strictly prohibited.

Notwithstanding anything to the contrary in this License:

- The provisions of Section 4 (Redistribution) do not apply to the Software provided under this License.
- Any attempt to redistribute or sublicense the Software shall be void and of no effect.
