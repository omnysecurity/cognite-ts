import { expect, describe, it } from 'vitest';
import { Filter } from './filter';
import type {
	EqualsFilterV3,
	TableExpressionFilterDefinition,
} from '@cognite/sdk';

import { __VIEWS, type __Schema } from './_mock';
import { createHelpers } from './helpers';

describe('Filter', () => {
	const helpers = createHelpers<__Schema>(__VIEWS);

	it('provides better DevEx than constructing the types in plain json using the helpers', () => {
		const f = new Filter<__Schema>(helpers);
		const filter = f.not(
			f.and(
				f.hasData('__Dummy', '__Stub'),
				f.or(
					f.equals('__Dummy', 'a', 'string'),
					f.in('__Dummy', 'b', [42, 53, 54]),
					f.equals('__Dummy', 'c', { space: 'foo', externalId: 'bar' }),
					f.equals('__Dummy', 'd', ['foo', 'bar'])
				),
				f.prefix('__Stub', 'a', 'prefix')
			)
		);

		expect(filter).toStrictEqual({
			not: {
				and: [
					{
						hasData: [
							helpers.getView('__Dummy').asRef(),
							helpers.getView('__Stub').asRef(),
						],
					},
					{
						or: [
							{
								equals: {
									property: helpers.getView('__Dummy').asPropertyRef('a'),
									value: 'string',
								},
							},

							{
								in: {
									property: helpers.getView('__Dummy').asPropertyRef('b'),
									values: [42, 53, 54],
								},
							},
							{
								equals: {
									property: helpers.getView('__Dummy').asPropertyRef('c'),
									value: { space: 'foo', externalId: 'bar' },
								},
							},

							{
								equals: {
									property: helpers.getView('__Dummy').asPropertyRef('d'),
									value: ['foo', 'bar'],
								},
							},
						],
					},
					{
						prefix: {
							property: helpers.getView('__Stub').asPropertyRef('a'),
							value: 'prefix',
						},
					},
				],
			},
		} satisfies TableExpressionFilterDefinition);
	});

	it('assists in referencing build-in properties', () => {
		const f = new Filter<__Schema>(helpers);
		const filter = f.instance.equals('edge', 'endNode', {
			externalId: 'anotherOne',
			space: 'test',
		});

		expect(filter).toStrictEqual({
			equals: {
				property: ['edge', 'endNode'],
				value: { space: 'test', externalId: 'anotherOne' },
			},
		} satisfies EqualsFilterV3);
	});
});
