import type {
	EdgeWrite,
	NodeOrEdge,
	NodeWrite,
	SourceSelectorV3,
	ViewDefinition,
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

	it('supports different reference styles', () => {
		const viewDefinitions = TEST_VIEW_DEFINITIONS() as ViewDefinition[];
		const helpers = createHelpers(viewDefinitions);
		// simple
		expect(helpers.isKnownView('Assessment')).toBeTruthy();
		// full
		expect(
			helpers.isKnownView('presentation_model__Assessment__c902f759da6320')
		).toBeTruthy();
	});
});

function TEST_VIEW_DEFINITIONS() {
	return [
		{
			externalId: 'Assessment',
			space: 'presentation_model',
			version: 'c902f759da6320',
			createdTime: 1755860256522,
			lastUpdatedTime: 1758178246398,
			writable: true,
			queryable: true,
			usedFor: 'all',
			isGlobal: false,
			properties: {
				status: {
					constraintState: {},
					type: {
						type: 'enum',
						values: {
							Draft: {
								description:
									'A preliminary assessment that is still being prepared or edited and not yet shared beyond the assessor.',
							},
							Provisional: {
								description:
									'An assessment that has been recorded and may be visible, but is subject to change pending review, approval, or additional input.',
							},
							Final: {
								description:
									'A completed assessment that is confirmed, officially recorded, and no longer subject to revision.',
							},
						},
						list: false,
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Assessment',
					},
					containerPropertyIdentifier: 'status',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					description:
						'Assessment status describes the stage of completeness and authority of an assessment, indicating whether it is an initial draft, a provisional version awaiting confirmation, or a final record that is officially approved and fixed.',
					name: 'Assessment.status',
				},
				comment: {
					constraintState: {},
					type: {
						type: 'text',
						list: false,
						collation: 'ucs_basic',
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Assessment',
					},
					containerPropertyIdentifier: 'comment',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Assessment.comment',
				},
			},
			mappedContainers: [
				{
					type: 'container',
					space: 'presentation_model',
					externalId: 'Assessment',
				},
			],
			name: 'Assessment',
			description:
				'An Assessment is a textual comment that provides qualitative feedback on a student, professor, subject, or school, describing performance or quality without assigning a formal grade.',
			implements: [],
		},
		{
			externalId: 'Professor',
			space: 'presentation_model',
			version: 'a9604ac0c4a94e',
			createdTime: 1755860256522,
			lastUpdatedTime: 1758184542884,
			writable: true,
			queryable: true,
			usedFor: 'node',
			isGlobal: false,
			properties: {
				name: {
					constraintState: {},
					type: {
						type: 'text',
						list: false,
						collation: 'ucs_basic',
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Professor',
					},
					containerPropertyIdentifier: 'name',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Professor.name',
				},
				school: {
					constraintState: {},
					type: {
						type: 'direct',
						list: false,
						source: {
							type: 'view',
							space: 'presentation_model',
							externalId: 'School',
							version: '1cc15f29cb5b7a',
						},
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Professor',
					},
					containerPropertyIdentifier: 'school',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Professor.school',
				},
				colleagues: {
					type: {
						space: 'presentation_model',
						externalId: 'hasColleague',
					},
					source: {
						type: 'view',
						space: 'presentation_model',
						externalId: 'Professor',
						version: 'a9604ac0c4a94e',
					},
					connectionType: 'multi_edge_connection',
					name: 'Professor.colleagues',
					description: 'Best work buddies',
					direction: 'outwards',
				},
			},
			mappedContainers: [
				{
					type: 'container',
					space: 'presentation_model',
					externalId: 'Professor',
				},
			],
			name: 'Professor',
			description:
				'A Professor is an educator responsible for teaching subjects and guiding students within a school.',
			implements: [],
		},
		{
			externalId: 'School',
			space: 'presentation_model',
			version: '1cc15f29cb5b7a',
			createdTime: 1755860256522,
			lastUpdatedTime: 1758178246398,
			writable: true,
			queryable: true,
			usedFor: 'node',
			isGlobal: false,
			properties: {
				name: {
					constraintState: {},
					type: {
						type: 'text',
						list: false,
						collation: 'ucs_basic',
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'School',
					},
					containerPropertyIdentifier: 'name',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'School.name',
				},
				description: {
					constraintState: {},
					type: {
						type: 'text',
						list: false,
						collation: 'ucs_basic',
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'School',
					},
					containerPropertyIdentifier: 'description',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'School.description',
				},
				students: {
					connectionType: 'multi_reverse_direct_relation',
					source: {
						type: 'view',
						space: 'presentation_model',
						externalId: 'Student',
						version: '307de9bcb3ee59',
					},
					through: {
						source: {
							type: 'container',
							space: 'presentation_model',
							externalId: 'Student',
						},
						identifier: 'school',
					},
					targetsList: false,
					name: '*School.students',
				},
			},
			mappedContainers: [
				{
					type: 'container',
					space: 'presentation_model',
					externalId: 'School',
				},
			],
			name: 'School',
			description:
				'A School is an organized institution where students are taught by educators in a structured environment to gain knowledge, skills, and cultural or social learning.',
			implements: [],
		},
		{
			externalId: 'Student',
			space: 'presentation_model',
			version: '307de9bcb3ee59',
			createdTime: 1755860256522,
			lastUpdatedTime: 1758179427358,
			writable: true,
			queryable: true,
			usedFor: 'node',
			isGlobal: false,
			properties: {
				name: {
					constraintState: {},
					type: {
						type: 'text',
						list: false,
						collation: 'ucs_basic',
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Student',
					},
					containerPropertyIdentifier: 'name',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Student.name',
				},
				birthyear: {
					constraintState: {},
					type: {
						type: 'int32',
						list: false,
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Student',
					},
					containerPropertyIdentifier: 'birthyear',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Student.birthyear',
				},
				school: {
					constraintState: {},
					type: {
						type: 'direct',
						list: false,
						source: {
							type: 'view',
							space: 'presentation_model',
							externalId: 'School',
							version: '1cc15f29cb5b7a',
						},
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Student',
					},
					containerPropertyIdentifier: 'school',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Student.school',
				},
				subjects: {
					type: {
						space: 'presentation_model',
						externalId: 'studentEnrolledInClass',
					},
					source: {
						type: 'view',
						space: 'presentation_model',
						externalId: 'Subject',
						version: '4d020fa33ecd51',
					},
					connectionType: 'multi_edge_connection',
					name: 'Student.subjects',
					edgeSource: {
						type: 'view',
						space: 'presentation_model',
						externalId: 'Assessment',
						version: 'c902f759da6320',
					},
					direction: 'outwards',
				},
			},
			mappedContainers: [
				{
					type: 'container',
					space: 'presentation_model',
					externalId: 'Student',
				},
			],
			name: 'Student',
			description:
				'A Student is a learner enrolled in a school who attends subjects to gain knowledge and skills.',
			implements: [],
		},
		{
			externalId: 'Subject',
			space: 'presentation_model',
			version: '4d020fa33ecd51',
			createdTime: 1755860256522,
			lastUpdatedTime: 1758179427358,
			writable: true,
			queryable: true,
			usedFor: 'node',
			isGlobal: false,
			properties: {
				school: {
					constraintState: {},
					type: {
						type: 'direct',
						list: false,
						source: {
							type: 'view',
							space: 'presentation_model',
							externalId: 'School',
							version: '1cc15f29cb5b7a',
						},
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Subject',
					},
					containerPropertyIdentifier: 'school',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Subject.school',
				},
				professor: {
					constraintState: {},
					type: {
						type: 'direct',
						list: false,
						source: {
							type: 'view',
							space: 'presentation_model',
							externalId: 'Professor',
							version: 'a9604ac0c4a94e',
						},
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Subject',
					},
					containerPropertyIdentifier: 'professor',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Subject.professor',
				},
				name: {
					constraintState: {},
					type: {
						type: 'text',
						list: false,
						collation: 'ucs_basic',
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Subject',
					},
					containerPropertyIdentifier: 'name',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Subject.name',
				},
				description: {
					constraintState: {},
					type: {
						type: 'text',
						list: false,
						collation: 'ucs_basic',
					},
					container: {
						type: 'container',
						space: 'presentation_model',
						externalId: 'Subject',
					},
					containerPropertyIdentifier: 'description',
					immutable: false,
					nullable: true,
					autoIncrement: false,
					name: 'Subject.description',
				},
				students: {
					type: {
						space: 'presentation_model',
						externalId: 'studentEnrolledInClass',
					},
					source: {
						type: 'view',
						space: 'presentation_model',
						externalId: 'Student',
						version: '307de9bcb3ee59',
					},
					connectionType: 'multi_edge_connection',
					name: 'Subject.students',
					edgeSource: {
						type: 'view',
						space: 'presentation_model',
						externalId: 'Assessment',
						version: 'c902f759da6320',
					},
					direction: 'inwards',
				},
			},
			mappedContainers: [
				{
					type: 'container',
					space: 'presentation_model',
					externalId: 'Subject',
				},
			],
			name: 'Subject',
			description:
				"A Subject is a defined area of study within a school's curriculum that is taught by a professor.",
			implements: [],
		},
	];
}
