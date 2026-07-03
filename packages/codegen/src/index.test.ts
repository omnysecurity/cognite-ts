import type { DataModel, ViewDefinition } from '@cognite/sdk';
import { describe, it, expect } from 'vitest';
import { generate } from './';
import { VIEW_DEFINITIONS } from './__fixtures__/views';
// import { writeFileSync } from 'fs';

const dataModel = {
	space: 'TEST',
	externalId: 'TEST',
	version: '1',
} as DataModel;

describe('generate', () => {
	it('generates code', () => {
		const output = generate({
			dataModel,
			views: VIEW_DEFINITIONS,
		});

		// record new snapshot using pnpm test -- -u
		expect(output).toMatchSnapshot();
		// writeFileSync(output.fileName, output.fileContent, { encoding: 'utf-8' });
	});

	it('emits an intersection with an implemented view that is included', () => {
		const base: ViewDefinition = {
			space: 'sp_test',
			externalId: 'Base',
			version: '1',
			properties: {
				label: {
					type: { type: 'text', list: false },
					container: {
						type: 'container',
						space: 'sp_test',
						externalId: 'Base',
					},
					containerPropertyIdentifier: 'label',
					nullable: true,
				},
			},
			implements: [],
		} as unknown as ViewDefinition;

		const child: ViewDefinition = {
			space: 'sp_test',
			externalId: 'Child',
			version: '1',
			properties: {},
			implements: [
				{ type: 'view', space: 'sp_test', externalId: 'Base', version: '1' },
			],
		} as unknown as ViewDefinition;

		const { fileContent } = generate({ dataModel, views: [base, child] });

		// Child intersects the generated Base type - not a dangling reference.
		expect(fileContent).toContain('sp_test__Child__1 = {} & sp_test__Base__1');
		expect(fileContent).toContain('sp_test__Base__1 =');
	});

	it('degrades a direct relation to an unresolved view to `unknown`', () => {
		const child: ViewDefinition = {
			space: 'sp_test',
			externalId: 'Child',
			version: '1',
			properties: {
				parent: {
					type: {
						type: 'direct',
						list: false,
						// Source view is not part of the generated set.
						source: {
							type: 'view',
							space: 'sp_test',
							externalId: 'Missing',
							version: '1',
						},
					},
					container: {
						type: 'container',
						space: 'sp_test',
						externalId: 'Child',
					},
					containerPropertyIdentifier: 'parent',
					nullable: true,
				},
			},
			implements: [],
		} as unknown as ViewDefinition;

		const { fileContent } = generate({ dataModel, views: [child] });

		expect(fileContent).toContain('parent?: DirectReference<unknown>');
		// The unresolved view id must never appear as a bare type reference.
		expect(fileContent).not.toContain('DirectReference<sp_test__Missing__1>');
	});
});
