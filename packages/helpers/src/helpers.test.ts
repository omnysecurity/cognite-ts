import type {
	EdgeWrite,
	NodeOrEdge,
	NodeWrite,
	SourceSelectorV3,
	ViewPropertyReference,
	ViewReference,
} from '@cognite/sdk';
import { describe, expect, it } from 'vitest';
import { __VIEWS, type __Dummy, type __Schema } from './_mock';
import { createHelpers } from './helpers';

describe('SchemaHelpers', () => {
	it('provides nice helpers for views in the schema', () => {
		const helpers = createHelpers<__Schema>(__VIEWS);

		const view = helpers.getView('__Dummy');
		const expectedViewReference = {
			space: 'test',
			externalId: '__Dummy',
			version: '1',
			type: 'view',
		} satisfies ViewReference;
		expect(view.asDefinition()).toStrictEqual(__VIEWS[0]);
		expect(view.asId()).toBe('__Dummy');
		expect(view.asPropertyName('a')).toBe('a');
		expect(view.asPropertyRef('b')).toStrictEqual(['test', '__Dummy/1', 'b']);
		expect(view.asRef()).toStrictEqual(expectedViewReference);
		expect(view.asSource()).toStrictEqual({
			source: expectedViewReference,
		});
		expect(view.asSourceSelector(['a', 'b'])).toStrictEqual({
			properties: ['a', 'b'],
			source: expectedViewReference,
		} satisfies SourceSelectorV3[number]);
		expect(view.asSourceSelector(['*'])).toStrictEqual({
			properties: ['*'],
			source: expectedViewReference,
		} satisfies SourceSelectorV3[number]);

		expect(view.asViewPropertyRef('c')).toStrictEqual({
			identifier: 'c',
			view: expectedViewReference,
		} satisfies ViewPropertyReference);

		const mockNodeOrEdge = {
			properties: {
				test: {
					'__Dummy/1': {
						a: 'string',
						b: 42,
						c: { space: 'test', externalId: 'ref' },
						d: ['foo', 'bar'],
					} satisfies __Dummy,
				},
			},
		} as Pick<NodeOrEdge, 'properties'>;
		const instance = mockNodeOrEdge as unknown as NodeOrEdge;
		expect(view.getPartialProps(instance)).toStrictEqual({
			a: 'string',
			b: 42,
			c: { space: 'test', externalId: 'ref' },
			d: ['foo', 'bar'],
		});
		// the typescript type is what changes - the returned value includes all the properties
		expect(view.getSelectProps<'a'>(instance)).toStrictEqual({
			a: 'string',
			b: 42,
			c: { space: 'test', externalId: 'ref' },
			d: ['foo', 'bar'],
		});
		expect(view.getProps(instance)).toStrictEqual({
			a: 'string',
			b: 42,
			c: { space: 'test', externalId: 'ref' },
			d: ['foo', 'bar'],
		});
	});

	it('supports introspection', () => {
		const helpers = createHelpers<__Schema>(__VIEWS);

		expect(helpers.isKnownView('__Dummy')).toBe(true);
		expect(helpers.isKnownView('Unknown')).toBe(false);

		const maybeView = '__Stub';
		if (helpers.isKnownView(maybeView)) {
			const view = helpers.getView(maybeView);
			expect(view.asDefinition()).toBeTruthy();
		} else {
			expect.fail('Condition should be true');
		}

		expect(helpers.__views).toStrictEqual(__VIEWS);
	});

	it('simplifies creating instances', () => {
		const helpers = createHelpers<__Schema>(__VIEWS);

		const nodeWrite = helpers.createNodeWrite('__Dummy', {
			space: 'test',
			externalId: 'instance',
			existingVersion: 1,
			properties: {
				a: 'string',
				b: 1,
				c: { space: 'test', externalId: 'ref' },
				d: ['a', 'b'],
			},
		});

		expect(nodeWrite).toStrictEqual({
			instanceType: 'node',
			space: 'test',
			externalId: 'instance',
			existingVersion: 1,
			sources: [
				{
					source: helpers.getView('__Dummy').asRef(),
					properties: {
						a: 'string',
						b: 1,
						c: { space: 'test', externalId: 'ref' },
						d: ['a', 'b'],
					},
				},
			],
		} satisfies NodeWrite);

		const edgeWrite = helpers.createEdgeWrite('__Dummy', {
			space: 'test',
			externalId: 'instance',
			type: { space: 'test', externalId: 'type' },
			startNode: { space: 'test', externalId: 'startNode' },
			endNode: { space: 'test', externalId: 'endNode' },
			existingVersion: 1,
			properties: {
				a: 'string',
				b: 1,
				c: { space: 'test', externalId: 'ref' },
				d: ['a', 'b'],
			},
		});

		expect(edgeWrite).toStrictEqual({
			instanceType: 'edge',
			space: 'test',
			externalId: 'instance',
			type: { space: 'test', externalId: 'type' },
			startNode: { space: 'test', externalId: 'startNode' },
			endNode: { space: 'test', externalId: 'endNode' },
			existingVersion: 1,
			sources: [
				{
					source: helpers.getView('__Dummy').asRef(),
					properties: {
						a: 'string',
						b: 1,
						c: { space: 'test', externalId: 'ref' },
						d: ['a', 'b'],
					},
				},
			],
		} satisfies EdgeWrite);
	});
});
