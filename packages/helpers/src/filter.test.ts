import type {
	EqualsFilterV3,
	TableExpressionFilterDefinition,
} from '@cognite/sdk';
import { expect, describe, it } from 'vitest';
import { __VIEWS, type __Schema } from './__fixtures__/minimal-schema';
import { Filter } from './filter';

import { createHelpers } from './helpers';

describe('Filter', () => {
	const helpers = createHelpers<__Schema>(__VIEWS);

	it('provides better DevEx than constructing the types in plain json using the helpers', () => {
		const f = new Filter<__Schema>(helpers);
		const filter = f.not(
			f.and(
				f.hasData('TestView1', 'TestView2'),
				f.or(
					f.equals('TestView1', 'a', 'string'),
					f.in('TestView1', 'b', [42, 53, 54]),
					f.equals('TestView1', 'c', { space: 'foo', externalId: 'bar' }),
					f.equals('TestView1', 'd', ['foo', 'bar'])
				),
				f.prefix('TestView2', 'a', 'prefix')
			)
		);

		expect(filter).toStrictEqual({
			not: {
				and: [
					{
						hasData: [
							helpers.getView('TestView1').asRef(),
							helpers.getView('TestView2').asRef(),
						],
					},
					{
						or: [
							{
								equals: {
									property: helpers.getView('TestView1').asPropertyRef('a'),
									value: 'string',
								},
							},

							{
								in: {
									property: helpers.getView('TestView1').asPropertyRef('b'),
									values: [42, 53, 54],
								},
							},
							{
								equals: {
									property: helpers.getView('TestView1').asPropertyRef('c'),
									value: { space: 'foo', externalId: 'bar' },
								},
							},

							{
								equals: {
									property: helpers.getView('TestView1').asPropertyRef('d'),
									value: ['foo', 'bar'],
								},
							},
						],
					},
					{
						prefix: {
							property: helpers.getView('TestView2').asPropertyRef('a'),
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

	it('supports full, namespaced, and simple view references', () => {
		const f = new Filter<__Schema>(helpers);
		const value = f.equals('TestView1', 'a', '1');
		expect(value).toBeTruthy();
		expect(f.equals('test__TestView1', 'a', '1')).toStrictEqual(value);
		expect(f.equals('test__TestView1__1', 'a', '1')).toStrictEqual(value);

		const value2 = f.equals('TestView2', 'b', 1);
		expect(value2).toBeTruthy();
		//@ts-expect-error overdefined but not unambigious
		expect(f.equals('test__TestView2', 'b', 1)).toStrictEqual(value2);
		//@ts-expect-error overdefined but not unambigious
		expect(f.equals('test__TestView2__1', 'b', 1)).toStrictEqual(value2);
	});
});
