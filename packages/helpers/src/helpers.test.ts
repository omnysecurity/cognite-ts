import type {
	EdgeWrite,
	NodeOrEdge,
	NodeWrite,
	SourceSelectorV3,
	ViewDefinition,
	ViewPropertyReference,
	ViewReference,
} from '@cognite/sdk';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
	__VIEWS,
	type TestView1,
	type __Schema,
} from './__fixtures__/minimal-schema';
import { VIEW_DEFINITIONS } from './__fixtures__/view-definitions';
import { Filter } from './filter';
import {
	createHelpers,
	type ResolveViewKey,
	type ResolveView,
	type UnambiguousViewReference,
} from './helpers';

describe('SchemaHelpers', () => {
	it('provides nice helpers for views in the schema', () => {
		const helpers = createHelpers<__Schema>(__VIEWS);

		const view = helpers.getView('TestView1');
		const expectedViewReference = {
			space: 'test',
			externalId: 'TestView1',
			version: '1',
			type: 'view',
		} satisfies ViewReference;
		expect(view.asDefinition()).toStrictEqual(__VIEWS[0]);
		expect(view.asId()).toBe('test__TestView1__1');
		expect(view.asPropertyName('a')).toBe('a');
		expect(view.asPropertyRef('b')).toStrictEqual(['test', 'TestView1/1', 'b']);
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
					'TestView1/1': {
						a: 'string',
						b: 42,
						c: { space: 'test', externalId: 'ref' },
						d: ['foo', 'bar'],
					} satisfies TestView1,
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

		expect(helpers.isKnownView('TestView1')).toBe(true);
		expect(helpers.isKnownView('Unknown')).toBe(false);

		const ref = 'TestView2';
		if (helpers.isKnownView(ref)) {
			const view = helpers.getView(ref);
			expect(view.asDefinition()).toBeTruthy();
		} else {
			expect.fail('Condition should be true');
		}
		expect(helpers.__views).toStrictEqual(__VIEWS);
	});

	it('simplifies creating instances', () => {
		const helpers = createHelpers<__Schema>(__VIEWS);

		const nodeWrite = helpers.createNodeWrite('TestView1', {
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
					source: helpers.getView('TestView1').asRef(),
					properties: {
						a: 'string',
						b: 1,
						c: { space: 'test', externalId: 'ref' },
						d: ['a', 'b'],
					},
				},
			],
		} satisfies NodeWrite);

		const edgeWrite = helpers.createEdgeWrite('TestView1', {
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
					source: helpers.getView('TestView1').asRef(),
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

	it('supports different reference styles', () => {
		const viewDefinitions = VIEW_DEFINITIONS as ViewDefinition[];
		type T = {
			Professor: { name: string };
			sp_test__Student: { name: string; age: number };
			sp_test__School__4: { name: string };
		};
		const helpers = createHelpers<T>(viewDefinitions);

		expect(helpers.getView('Professor')).toBeTruthy();
		expect(
			// @ts-expect-error reference is still unambigious, but not enough information in type to verify
			helpers.getView('sp_test__Professor')
		).toBeTruthy();
		expect(
			// @ts-expect-error reference is still unambigious, but not enough information in type to verify
			helpers.getView('sp_test__Professor__3')
		).toBeTruthy();

		expect(helpers.getView('Student')).toBeTruthy();
		expect(helpers.getView('sp_test__Student')).toBeTruthy();
		expect(
			// @ts-expect-error reference is still unambigious, but not enough information in type to verify
			helpers.getView('sp_test__Student__1')
		).toBeTruthy();

		expect(helpers.getView('School')).toBeTruthy();
		expect(helpers.getView('sp_test__School')).toBeTruthy();
		expect(helpers.getView('sp_test__School__4')).toBeTruthy();

		const simple: string = 'School';
		const namespaced: string = 'sp_test__School';
		const full: string = 'sp_test__School__4';

		expect(helpers.isKnownView(simple)).toBeTruthy();
		expect(helpers.isKnownView(namespaced)).toBeTruthy();
		expect(helpers.isKnownView(full)).toBeTruthy();

		if (
			!(
				helpers.isKnownView(simple) &&
				helpers.isKnownView(namespaced) &&
				helpers.isKnownView(full)
			)
		) {
			expect.fail('Unreachable');
		}

		const def = helpers.getView(simple).asDefinition();
		expect(def).toStrictEqual(helpers.getView(namespaced).asDefinition());
		expect(def).toStrictEqual(helpers.getView(full).asDefinition());
	});
});

it('supports dynamically registering views', () => {
	const viewDefinitions = VIEW_DEFINITIONS as ViewDefinition[];
	const helpers = createHelpers(viewDefinitions);

	const EXPECTED_NUMBER_OF_VIEWS = viewDefinitions.length;
	expect(helpers.__views.length).toBe(EXPECTED_NUMBER_OF_VIEWS);

	const createMockView = (space: string, externalId: string, version: string) =>
		({
			space,
			externalId,
			version,
			properties: {},
		}) as ViewDefinition;

	const FOUX = createMockView('foux', 'foux', '0');
	const FOUX_ID = helpers.getViewId(FOUX);
	const FAFA = createMockView('foux', 'fafa', '0');
	const FAFA_ID = helpers.getViewId(FAFA);

	helpers.registerView(FOUX, FAFA);
	expect(helpers.__views.length).toBe(EXPECTED_NUMBER_OF_VIEWS + 2);

	expect(helpers.isKnownView(FOUX_ID)).toBe(true);
	if (!helpers.isKnownView(FOUX_ID)) {
		expect.fail('Expected view to be known');
	}
	expect(helpers.isKnownView(FOUX.externalId)).toBe(false);
	expect(helpers.getView(FOUX_ID).asDefinition()).toStrictEqual(FOUX);

	if (!helpers.isKnownView(FAFA_ID)) {
		expect.fail('Expected view to be known');
	}
	expect(helpers.getView(FAFA_ID).asDefinition()).toStrictEqual(FAFA);
});

it('supports easy access to filter builder for registered views', () => {
	const viewDefinitions = VIEW_DEFINITIONS as ViewDefinition[];
	type T = {
		Professor: { name: string };
		sp_test__Student: { name: string; age: number };
		sp_test__School__4: { name: string };
	};
	const helpers = createHelpers<T>(viewDefinitions);

	const expected = new Filter(helpers).equals(
		'Professor',
		'name',
		'Dumbledore'
	);
	const actual = helpers.filter.equals('Professor', 'name', 'Dumbledore');
	expect(expected).toStrictEqual(actual);

	const createMockView = (space: string, externalId: string, version: string) =>
		({
			space,
			externalId,
			version,
			properties: {},
		}) as ViewDefinition;

	const CUSTOM = createMockView('sample', 'custom', '0');
	const CUSTOM_ID = helpers.getViewId(CUSTOM);

	helpers.registerView(CUSTOM);
	if (!helpers.isKnownView(CUSTOM_ID)) {
		expect.fail('Expected view to be known');
	}

	expect(helpers.filter.hasData(CUSTOM_ID)).toStrictEqual({
		hasData: [
			{
				space: 'sample',
				externalId: 'custom',
				version: '0',
				type: 'view',
			},
		],
	});
});

describe('View Reference Resolution', () => {
	// Test schema with both full keys and simple keys
	const _schema = {
		// School
		foo__School__1: 'foo/School@1',
		foo__School__2: 'foo/School@2',
		bar__School__1: 'bar/School@1',

		// Student
		foo__Student__1: 'foo/Student@1',
		Student: '*/Student@*',

		// Subject
		foo__Subject: 'foo/Subject@*',
		Subject: '*/Subject@*',

		// Professor
		Professor: '*/Professor@*',
	} as const;

	type Schema = typeof _schema;

	it('should extract unambiguous view references from schema', () => {
		type UnambiguousRefs = UnambiguousViewReference<Schema>;

		// Test unambiguous School references
		expect('foo__School__1' satisfies UnambiguousRefs).toBe('foo__School__1');
		expect('foo__School__2' satisfies UnambiguousRefs).toBe('foo__School__2');
		expect('bar__School__1' satisfies UnambiguousRefs).toBe('bar__School__1');
		expect('bar__School' satisfies UnambiguousRefs).toBe('bar__School');

		// Test unambiguous Student references
		expect('foo__Student' satisfies UnambiguousRefs).toBe('foo__Student');
		expect('foo__Student__1' satisfies UnambiguousRefs).toBe('foo__Student__1');

		// Test unambiguous Subject reference
		expect('foo__Subject' satisfies UnambiguousRefs).toBe('foo__Subject');

		// Test unambiguous Professor reference
		expect('Professor' satisfies UnambiguousRefs).toBe('Professor');

		// Verify that ambiguous references are NOT valid
		// @ts-expect-error - School is ambiguous
		const _school: UnambiguousRefs = 'School';
		// @ts-expect-error - foo__School is ambiguous
		const _fooSchool: UnambiguousRefs = 'foo__School';
		// @ts-expect-error - Student is ambiguous
		const _student: UnambiguousRefs = 'Student';
		// @ts-expect-error - Subject is ambiguous
		const _subject: UnambiguousRefs = 'Subject';
	});

	it('should expand references', () => {
		// School - ambiguous (multiple full keys exist)
		expectTypeOf<ResolveViewKey<Schema, 'School'>>().toEqualTypeOf<
			'foo__School__1' | 'foo__School__2' | 'bar__School__1'
		>();

		// School with space - ambiguous (foo has versions 1 and 2)
		expectTypeOf<ResolveViewKey<Schema, 'foo__School'>>().toEqualTypeOf<
			'foo__School__1' | 'foo__School__2'
		>();

		// School with full key - unambiguous
		expectTypeOf<
			ResolveViewKey<Schema, 'foo__School__1'>
		>().toEqualTypeOf<'foo__School__1'>();
		expectTypeOf<
			ResolveViewKey<Schema, 'foo__School__2'>
		>().toEqualTypeOf<'foo__School__2'>();
		expectTypeOf<
			ResolveViewKey<Schema, 'bar__School__1'>
		>().toEqualTypeOf<'bar__School__1'>();

		// School with space - unambiguous (bar only has version 1)
		expectTypeOf<
			ResolveViewKey<Schema, 'bar__School'>
		>().toEqualTypeOf<'bar__School__1'>();

		// Student - ambiguous (matches both foo__Student__1 and Student wildcard)
		expectTypeOf<ResolveViewKey<Schema, 'Student'>>().toEqualTypeOf<
			'foo__Student__1' | 'Student'
		>();

		// Student with space - unambiguous (only one version exists)
		expectTypeOf<
			ResolveViewKey<Schema, 'foo__Student'>
		>().toEqualTypeOf<'foo__Student__1'>();

		// Student with full key - unambiguous
		expectTypeOf<
			ResolveViewKey<Schema, 'foo__Student__1'>
		>().toEqualTypeOf<'foo__Student__1'>();

		// Subject - ambiguous (matches both foo__Subject and Subject wildcard)
		expectTypeOf<ResolveViewKey<Schema, 'Subject'>>().toEqualTypeOf<
			'foo__Subject' | 'Subject'
		>();

		// Subject with space - unambiguous (no version separator)
		expectTypeOf<
			ResolveViewKey<Schema, 'foo__Subject'>
		>().toEqualTypeOf<'foo__Subject'>();

		// Professor - unambiguous (only wildcard exists)
		expectTypeOf<
			ResolveViewKey<Schema, 'Professor'>
		>().toEqualTypeOf<'Professor'>();
	});

	it('should resolve unambigious references', () => {
		// @ts-expect-error - Testing invalid reference
		expectTypeOf<ResolveView<Schema, 'foo'>>().toEqualTypeOf<unknown>();

		// School - ambiguous references should resolve to unknown
		expectTypeOf<ResolveView<Schema, 'School'>>().toEqualTypeOf<unknown>();
		expectTypeOf<ResolveView<Schema, 'foo__School'>>().toEqualTypeOf<unknown>();

		// School - unambiguous references should resolve to full view reference
		expectTypeOf<
			ResolveView<Schema, 'foo__School__1'>
		>().toEqualTypeOf<'foo/School@1'>();
		expectTypeOf<
			ResolveView<Schema, 'foo__School__2'>
		>().toEqualTypeOf<'foo/School@2'>();
		expectTypeOf<
			ResolveView<Schema, 'bar__School__1'>
		>().toEqualTypeOf<'bar/School@1'>();
		expectTypeOf<
			ResolveView<Schema, 'bar__School'>
		>().toEqualTypeOf<'bar/School@1'>();

		// Student - ambiguous references should resolve to unknown
		expectTypeOf<ResolveView<Schema, 'Student'>>().toEqualTypeOf<unknown>();

		// Student - unambiguous references should resolve to full view reference
		expectTypeOf<
			ResolveView<Schema, 'foo__Student'>
		>().toEqualTypeOf<'foo/Student@1'>();
		expectTypeOf<
			ResolveView<Schema, 'foo__Student__1'>
		>().toEqualTypeOf<'foo/Student@1'>();

		// Subject - ambiguous references should resolve to unknown
		expectTypeOf<ResolveView<Schema, 'Subject'>>().toEqualTypeOf<unknown>();

		// Subject - unambiguous references should resolve to full view reference
		expectTypeOf<
			ResolveView<Schema, 'foo__Subject'>
		>().toEqualTypeOf<'foo/Subject@*'>();

		// Professor - unambiguous reference should resolve to full view reference
		expectTypeOf<
			ResolveView<Schema, 'Professor'>
		>().toEqualTypeOf<'*/Professor@*'>();
	});

	it('isKnownView should narrow to unambiguous references', () => {
		const helpers = createHelpers<Schema>([]);

		// Test that isKnownView properly narrows types
		const ambiguousRef = 'School' as string;
		if (helpers.isKnownView(ambiguousRef)) {
			// ambiguousRef should be narrowed to UnambiguousViewReference<Schema>
			// This means ambiguous references like 'School' should NOT pass this check
			expectTypeOf(ambiguousRef).toEqualTypeOf<
				UnambiguousViewReference<Schema>
			>();

			// And we should be able to use it with getView
			const view = helpers.getView(ambiguousRef);
			expect(view).toBeDefined();
		}

		// Demonstrate type-level filtering of ambiguous references
		type Unambiguous = UnambiguousViewReference<Schema>;

		// Verify the type includes unambiguous references
		const unambiguous1: Unambiguous = 'foo__School__1';
		const unambiguous2: Unambiguous = 'foo__School__2';
		const unambiguous3: Unambiguous = 'bar__School__1';
		const unambiguous4: Unambiguous = 'bar__School';
		const unambiguous5: Unambiguous = 'foo__Student';
		const unambiguous6: Unambiguous = 'foo__Student__1';
		const unambiguous7: Unambiguous = 'foo__Subject';
		const unambiguous8: Unambiguous = 'Professor';

		expect(unambiguous1).toBe('foo__School__1');
		expect(unambiguous2).toBe('foo__School__2');
		expect(unambiguous3).toBe('bar__School__1');
		expect(unambiguous4).toBe('bar__School');
		expect(unambiguous5).toBe('foo__Student');
		expect(unambiguous6).toBe('foo__Student__1');
		expect(unambiguous7).toBe('foo__Subject');
		expect(unambiguous8).toBe('Professor');

		// Verify at type level that ambiguous refs don't match
		// @ts-expect-error - 'School' is ambiguous
		const _ambiguous1: Unambiguous = 'School';
		// @ts-expect-error - 'foo__School' is ambiguous
		const _ambiguous2: Unambiguous = 'foo__School';
		// @ts-expect-error - 'Student' is ambiguous
		const _ambiguous3: Unambiguous = 'Student';
		// @ts-expect-error - 'Subject' is ambiguous
		const _ambiguous4: Unambiguous = 'Subject';
	});
});
