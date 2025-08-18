# Pre-release Publishing Guide

## Current Status
The packages are set up for **0.1.0** pre-release versions to test the publishing pipeline before committing to v1.0.0.

## How to Publish Pre-release

1. **Ensure NPM_TOKEN is set** in GitHub repository secrets
2. **Push changes** to main branch 
3. **Wait for workflow** to create "Version Packages" PR
4. **Review and merge** the PR to publish

## Expected Versions
- `@omnysecurity/cognite-codegen@0.1.0`
- `@omnysecurity/cognite-codegen-cli@0.1.0` 
- `@omnysecurity/cognite-helpers@0.1.0`

## Testing After Release
```bash
npm install @omnysecurity/cognite-codegen@0.1.0
npm install -g @omnysecurity/cognite-codegen-cli@0.1.0
npm install @omnysecurity/cognite-helpers@0.1.0
```

## Moving to v1.0.0
When ready for stable release, create a major changeset:
```bash
pnpm changeset
# Select all packages
# Choose "major" to go from 0.1.0 → 1.0.0
```
