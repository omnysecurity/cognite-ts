# @cognite/helpers

Enhanced TypeScript support for Cognite Data Fusion APIs

## Overview

This package provides the core functionality for generating TypeScript types and utilities from Cognite Data Fusion (CDF) data models. It takes CDF data model definitions and generates strongly-typed TypeScript interfaces, types, and helper constants.

## Usage

```typescript
import { createHelpers, Filter } from '@cognite/codegen';
import { __Schema, VIEW_DEFINITIONS } from 'data_models/dm_example@2';

const helpers = new createHelpers<__Schema>(VIEW_DEFINITIONS);
const f = new Filter(helpers);

// Use helpers and filter instance to query data with ease
const instances = client.instances.list({
	sources: [helpers.getView('MyView').asSource()],
	filter: f.and(
		f.instance.equals('node', 'space', 'jam'),
		f.equals('MyView', 'someProperty', 49)
	),
});

// Extract data from response
const listOfProperties = instances.map(helpers.getView('MyView').getProps);
```

## Features

- Utilities to build queries
- Utilities to parse query results

## API

See typescript types for up-to-date API.
