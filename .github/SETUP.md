# Publishing Setup Guide

This guide explains how to set up and use the GitHub Actions workflows for publishing the cognite packages to npm using Changesets for version management.

## Prerequisites

Before you can publish packages, you need to set up the following:

### 1. NPM Token

1. Create an npm account if you don't have one: https://www.npmjs.com/signup
2. Generate an Access Token:
   - Go to https://www.npmjs.com/settings/tokens
   - Click "Generate New Token"
   - Choose "Automation" (for CI/CD workflows)
   - Copy the token (starts with `npm_`)

### 2. GitHub Repository Secrets

Add the following secret to your GitHub repository:

1. Go to your repository on GitHub
2. Click on "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add the following secret:
   - **Name**: `NPM_TOKEN`
   - **Value**: Your npm access token from step 1

## Usage with Changesets

### Daily Workflow (Recommended)

1. **Make your changes**: Edit code in any of the packages
2. **Create a changeset**: Run `pnpm changeset` and describe your changes
3. **Create a PR**: Commit your changes and changeset, then create a pull request
4. **Merge your PR**: Once approved, merge to `main`
5. **Automatic release**: The workflow creates a "Version Packages" PR
6. **Publish**: Review and merge the "Version Packages" PR to publish

### Changeset Creation

```bash
# After making changes to any package
pnpm changeset

# Follow the interactive prompts:
# - Select which packages were changed
# - Choose the change type (patch/minor/major)
# - Write a description of your changes
```

### Manual Release (if needed)

You can also manually trigger the release workflow:

1. Go to the "Actions" tab in your GitHub repository
2. Click on "Release with Changesets" workflow  
3. Click "Run workflow"
4. Click "Run workflow" again

See the [Changesets Guide](.github/CHANGESETS-GUIDE.md) for detailed usage instructions.

## Workflow Details

### CI Workflow (`ci.yml`)
- Runs on every push to main and pull requests
- Tests code, runs linting, type checking, and builds
- Ensures packages can be packed successfully

### Release with Changesets Workflow (`release-changesets.yml`)
- Automatically triggered on pushes to main
- Creates "Version Packages" PR when changesets exist
- Publishes packages when version PR is merged
- Updates CHANGELOG.md files automatically
- Uses Changesets for proper semantic versioning

## Troubleshooting

### Authentication Issues
- Verify your `NPM_TOKEN` secret is set correctly
- Make sure the token has permission to publish to the `@omnysecurity` scope
- Check that the token hasn't expired

### Version Conflicts
- Ensure you're not trying to publish a version that already exists
- Use the release workflow to automatically handle version bumping

### Build Failures
- Check that all tests pass locally before releasing
- Ensure all dependencies are properly declared
- Verify TypeScript compilation succeeds

### Publishing Scope Issues
If you get errors about the `@omnysecurity` scope:
1. Make sure you have access to publish to this scope on npm
2. Contact the organization owner to grant publishing permissions
3. Alternatively, change the package names in package.json to use a different scope

## Package Information

After publishing, your packages will be available at:
- https://www.npmjs.com/package/@omnysecurity/cognite-codegen
- https://www.npmjs.com/package/@omnysecurity/cognite-codegen-cli
- https://www.npmjs.com/package/@omnysecurity/cognite-helpers

Users can install them with:
```bash
npm install @omnysecurity/cognite-codegen
npm install -g @omnysecurity/cognite-codegen-cli
npm install @omnysecurity/cognite-helpers
```
