# cognite-ts

TypeScript tools and utilities for building applications using the `@cognite/sdk` package

## Overview

- [@omnysecurity/cognite-codegen](./packages/codegen) - Core TypeScript code generation library for Cognite Data Fusion data models
- [@omnysecurity/cognite-codegen-cli](./packages/codegen-cli) - Command-line interface for Cognite Data Fusion TypeScript code generation
- [@omnysecurity/cognite-helpers](./packages/helpers) - Enhanced TypeScript support for Cognite Data Fusion APIs

## Installation

**Note:** Currently, all packages are private and not published to npm. You need to build from source.

### Prerequisites

- Node.js >= 22.0.0
- pnpm package manager

### Build from Source

1. Clone this repository:

   ```bash
   git clone https://github.com/omnysecurity/cognite-ts.git
   cd cognite-ts
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build all packages:

   ```bash
   pnpm build

   # or individually
   cd packages/codegen && pnpm build
   cd ../codegen-cli && pnpm build
   cd ../helpers && pnpm build
   ```

4. Use the CLI:
   ```bash
   cd packages/codegen-cli
   node . --help
   ```

## Finding Your CDF Parameters

To use the codegen tool, you need:

1. **Cluster URL**: Your CDF cluster (e.g., `https://api.cognitedata.com` or `https://westeurope-1.cognitedata.com`) see [this link](https://docs.cognite.com/cdf/admin/clusters_regions/) for more info
2. **Project**: Your CDF project name
3. **Space**: The space containing your data model
4. **Model**: The external ID of your data model
5. **Version**: The version of your data model
6. **Token**: A valid CDF access token

You can find these values in the Cognite Data Fusion UI under "Data management" > "Data models".

## Quick Start

### 1. Generate TypeScript Types from CDF Data Models

Before you can do this step you need to have a valid CDF token at hand. This can be obtained by inspecting the `Authorization` HTTP header in an API request to CDF, e.g. when browsing the Cognite Data Fusion UI.

```bash
cd ./packages/codegen-cli
pnpm install
pnpm build
node . \
  --project acme \
  --space jam \
  --model citizen \
  --version 42 \
  --output datamodel.ts \
  --token "<access token to CDF>"
```

**Real Example:**

```bash
node . \
  --cluster https://westeurope-1.cognitedata.com \
  --project omny-dev \
  --space omny_models \
  --model customer_data_model \
  --version 1.2 \
  --output customer-schema.ts \
  --token "eyJ0eXAiOiJKV1QiLCJhbGciOiJ..."
```

This will generate a TypeScript file with:

- Type definitions for all views in your data model
- A `__Schema` type that maps view names to their types
- A `VIEW_DEFINITIONS` constant with runtime metadata
- JSDoc comments from your data model descriptions

You may want to run the file through your preferred formatting tool before adding it to your repository.

### 2. Use generated types to instantiate typescript helpers for Cognite APIs

```typescript
import { __Schema, VIEW_DEFINITIONS } from 'datamodel.ts';
import { createHelpers } from '@omnysecurity/cognite-helpers';

const helpers = createHelpers<__Schema>(VIEW_DEFINITIONS);
```

See [@omnysecurity/cognite-helpers](./packages/helpers) for additional documentation.

## Troubleshooting

### Common Issues

#### Authentication Errors (401 Unauthorized)

- **Problem**: `Request failed | status code: 401`
- **Solution**:
  - Verify your CDF token is valid and not expired
  - Ensure the token has access to the specified project and space
  - Check that you're using the correct cluster URL for your CDF instance

#### Data Model Not Found

- **Problem**: `Data model not found`
- **Solution**:
  - Verify the data model exists in your CDF project
  - Check the `--space`, `--model`, and `--version` parameters are correct
  - Ensure your token has read access to data models in that space

### Getting Help

If you're still having issues:

1. Check the Cognite Data Fusion UI to verify your data model details
2. Test your token with the CDF API directly
3. Ensure you have the correct permissions for the resources you're trying to access

## License

This project is licensed under the Apache License 2.0 - with the exception below - see the [LICENSE](LICENSE) file for details.

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

Licensee may use, modify, and incorporate the Software into its products and services for internal or commercial use. Redistribution, sublicensing, or disclosure of the Software to third parties is strictly prohibited.

Notwithstanding anything to the contrary in this License:

- The provisions of Section 4 (Redistribution) do not apply to the Software provided under this License.
- Any attempt to redistribute or sublicense the Software shall be void and of no effect.
