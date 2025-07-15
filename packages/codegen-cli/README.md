# @omnysecurity/cognite-codegen-cli

Command-line interface for generating TypeScript types from Cognite Data Fusion data models.

## Installation

**Note:** This package is currently private. You need to build from source and use `node .` to run the CLI.

## Usage

```bash
node . --help
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
  --project omny-dev \
  --space sp_omny_app_model_risk \
  --model dm_omny_app_risk \
  --version 1 \
  --token "your-cdf-token"
```

Use with a different CDF cluster:

```bash
node . \
  --cluster https://api.cognitedata.com \
  --project my-project \
  --space my-space \
  --model my_model \
  --version 1.0 \
  --token "your-cdf-token"
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
node . --token "your-cdf-token-here" --model my_model --version 1.0
```
