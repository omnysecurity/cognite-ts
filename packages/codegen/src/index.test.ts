import type { DataModel } from '@cognite/sdk';
import { describe, it, expect } from 'vitest';
import { generate } from './';
import { VIEW_DEFINITIONS } from './__fixtures__/views';
// import { writeFileSync } from 'fs';

describe('generate', () => {
	it('generates code', () => {
		const output = generate({
			dataModel: {
				space: 'TEST',
				externalId: 'TEST',
				version: '1',
			} as DataModel,
			views: VIEW_DEFINITIONS,
		});

		// record new snapshot using pnpm test -- -u
		expect(output).toMatchSnapshot();
		// writeFileSync(output.fileName, output.fileContent, { encoding: 'utf-8' });
	});
});
