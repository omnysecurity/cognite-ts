# @omnysecurity/cognite-codegen-cli

Command-line interface for generating TypeScript types from Cognite Data Fusion data models.

## Installation

**Note:** This package is currently private. You need to build from source and use `node .` to run the CLI.

## Usage

```bash
npx @omnysecurity/cognite-codegen-cli --help
```

## Options

- `--cluster, -c`: CDF Cluster URL (default: https://westeurope-1.cognitedata.com)
- `--project, -p`: CDF Project name (**required**)
- `--space, -s`: CDF Model Space (**required**)
- `--model, -m`: CDF Data model externalId (**required**)
- `--version, -v`: CDF Data model version (**required**)
- `--token, -t`: CDF Access token (**required**)
- `--output, -o`: Output file path (default: auto-generated based on model name)

## Examples

Generate types for a specific data model (using default cluster):

```bash
node . \
  --cluster https://api.cognitedata.com \
  --project acme \
  --space acme_models \
  --model acme_domain \
  --version 1 \
  --token "<access token>"
```

## Authentication

The CLI uses CDF token-based authentication. You need to provide a valid CDF access token using the `--token` parameter.

To obtain a CDF token:

1. Log into your Cognite Data Fusion UI
2. Open browser developer tools (F12)
3. Go to Network tab and make any request
4. Look for the `Authorization` header in the request
5. Copy the token value (without "Bearer " prefix)
