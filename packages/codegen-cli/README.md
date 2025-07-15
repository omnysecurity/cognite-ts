# @omnysecurity/cognite-codegen-cli

Command-line interface for generating TypeScript types from Cognite Data Fusion data models.

## Installation

```bash
npm install -g @omnysecurity/cognite-codegen-cli
```

## Usage

```bash
cognite-codegen --model my_data_model --version 1.0 --output schema.ts
```

## Options

- `--cluster, -c`: CDF Cluster URL (default: https://westeurope-1.cognitedata.com)
- `--project, -p`: CDF Project name (default: omny-dev)
- `--space, -s`: CDF Model Space (default: omny-dev)
- `--model, -m`: CDF Data model externalId (required)
- `--version, -v`: CDF Data model version (required)
- `--output, -o`: Output file path (default: auto-generated based on model name)

## Examples

Generate types for a specific data model:

```bash
cognite-codegen --model omny_cpdo --version 1_4 --output schema.ts
```

Use with a different CDF cluster:

```bash
cognite-codegen \
  --cluster https://api.cognitedata.com \
  --project my-project \
  --model my_model \
  --version 1.0
```

## Authentication

The CLI uses CDF token-based authentication. You need to provide a valid CDF access token using the `--token` parameter.

To obtain a CDF token:

1. Log into your Cognite Data Fusion UI
2. Open browser developer tools (F12)
3. Go to Network tab and make any request
4. Look for the `Authorization` header in the request
5. Copy the token value (without "Bearer " prefix)

Example:

```bash
cognite-codegen --token "your-cdf-token-here" --model my_model --version 1.0
```
