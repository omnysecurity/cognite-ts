import type { DataModel, ViewDefinition } from '@cognite/sdk';
import { describe, it, expect } from 'vitest';
import { generate } from './';
// import { writeFileSync } from 'fs';

const VIEW_DEFINITIONS = [
	{
		externalId: 'Assessment',
		space: 'sp_test',
		version: 'c902f759da6320',
		createdTime: 1755860256522,
		lastUpdatedTime: 1760431261505,
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
					space: 'sp_test',
					externalId: 'Assessment',
				},
				containerPropertyIdentifier: 'status',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description:
					'Assessment status describes the stage of completeness and authority of an assessment, indicating whether it is an initial draft, a provisional version awaiting confirmation, or a final record that is officially approved and fixed.\n@name Assessment.status',
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
					space: 'sp_test',
					externalId: 'Assessment',
				},
				containerPropertyIdentifier: 'comment',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Assessment.comment',
				name: 'Assessment.comment',
			},
		},
		mappedContainers: [
			{
				type: 'container',
				space: 'sp_test',
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
		space: 'sp_test',
		version: 'a9604ac0c4a94e',
		createdTime: 1755860256522,
		lastUpdatedTime: 1760431261505,
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
					space: 'sp_test',
					externalId: 'Professor',
				},
				containerPropertyIdentifier: 'name',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Professor.name',
				name: 'Professor.name',
			},
			school: {
				constraintState: {},
				type: {
					type: 'direct',
					list: false,
					source: {
						type: 'view',
						space: 'sp_test',
						externalId: 'School',
						version: '1cc15f29cb5b7a',
					},
				},
				container: {
					type: 'container',
					space: 'sp_test',
					externalId: 'Professor',
				},
				containerPropertyIdentifier: 'school',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Professor.school',
				name: 'Professor.school',
			},
			colleagues: {
				type: {
					space: 'sp_test',
					externalId: 'hasColleague',
				},
				source: {
					type: 'view',
					space: 'sp_test',
					externalId: 'Professor',
					version: 'a9604ac0c4a94e',
				},
				connectionType: 'multi_edge_connection',
				name: 'Professor.colleagues',
				description: 'Best work buddies\n@name Professor.colleagues',
				direction: 'outwards',
			},
		},
		mappedContainers: [
			{
				type: 'container',
				space: 'sp_test',
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
		space: 'sp_test',
		version: '1cc15f29cb5b7a',
		createdTime: 1755860256522,
		lastUpdatedTime: 1760431261505,
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
					space: 'sp_test',
					externalId: 'School',
				},
				containerPropertyIdentifier: 'name',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name School.name',
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
					space: 'sp_test',
					externalId: 'School',
				},
				containerPropertyIdentifier: 'description',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name School.description',
				name: 'School.description',
			},
			country: {
				constraintState: {},
				type: {
					type: 'text',
					list: false,
					collation: 'ucs_basic',
				},
				container: {
					type: 'container',
					space: 'sp_test',
					externalId: 'School',
				},
				containerPropertyIdentifier: 'country',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				name: 'country',
			},
			students: {
				connectionType: 'multi_reverse_direct_relation',
				source: {
					type: 'view',
					space: 'sp_test',
					externalId: 'Student',
					version: '307de9bcb3ee59',
				},
				through: {
					source: {
						type: 'view',
						space: 'sp_test',
						externalId: 'Student',
						version: '307de9bcb3ee59',
					},
					identifier: 'school',
				},
				targetsList: false,
				name: '*School.students',
				description: '@name *School.students',
			},
		},
		mappedContainers: [
			{
				type: 'container',
				space: 'sp_test',
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
		space: 'sp_test',
		version: '307de9bcb3ee59',
		createdTime: 1755860256522,
		lastUpdatedTime: 1760431261505,
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
					space: 'sp_test',
					externalId: 'Student',
				},
				containerPropertyIdentifier: 'name',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Student.name',
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
					space: 'sp_test',
					externalId: 'Student',
				},
				containerPropertyIdentifier: 'birthyear',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Student.birthyear',
				name: 'Student.birthyear',
			},
			school: {
				constraintState: {},
				type: {
					type: 'direct',
					list: false,
					source: {
						type: 'view',
						space: 'sp_test',
						externalId: 'School',
						version: '1cc15f29cb5b7a',
					},
				},
				container: {
					type: 'container',
					space: 'sp_test',
					externalId: 'Student',
				},
				containerPropertyIdentifier: 'school',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Student.school',
				name: 'Student.school',
			},
			subjects: {
				type: {
					space: 'sp_test',
					externalId: 'studentEnrolledInClass',
				},
				source: {
					type: 'view',
					space: 'sp_test',
					externalId: 'Subject',
					version: '4d020fa33ecd51',
				},
				connectionType: 'multi_edge_connection',
				name: 'Student.subjects',
				description: '@name Student.subjects',
				edgeSource: {
					type: 'view',
					space: 'sp_test',
					externalId: 'Assessment',
					version: 'c902f759da6320',
				},
				direction: 'outwards',
			},
		},
		mappedContainers: [
			{
				type: 'container',
				space: 'sp_test',
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
		space: 'sp_test',
		version: '4d020fa33ecd51',
		createdTime: 1755860256522,
		lastUpdatedTime: 1760431261505,
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
						space: 'sp_test',
						externalId: 'School',
						version: '1cc15f29cb5b7a',
					},
				},
				container: {
					type: 'container',
					space: 'sp_test',
					externalId: 'Subject',
				},
				containerPropertyIdentifier: 'school',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Subject.school',
				name: 'Subject.school',
			},
			professor: {
				constraintState: {},
				type: {
					type: 'direct',
					list: false,
					source: {
						type: 'view',
						space: 'sp_test',
						externalId: 'Professor',
						version: 'a9604ac0c4a94e',
					},
				},
				container: {
					type: 'container',
					space: 'sp_test',
					externalId: 'Subject',
				},
				containerPropertyIdentifier: 'professor',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Subject.professor',
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
					space: 'sp_test',
					externalId: 'Subject',
				},
				containerPropertyIdentifier: 'name',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Subject.name',
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
					space: 'sp_test',
					externalId: 'Subject',
				},
				containerPropertyIdentifier: 'description',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				description: '@name Subject.description',
				name: 'Subject.description',
			},
			students: {
				type: {
					space: 'sp_test',
					externalId: 'studentEnrolledInClass',
				},
				source: {
					type: 'view',
					space: 'sp_test',
					externalId: 'Student',
					version: '307de9bcb3ee59',
				},
				connectionType: 'multi_edge_connection',
				name: 'Subject.students',
				description: '@name Subject.students',
				edgeSource: {
					type: 'view',
					space: 'sp_test',
					externalId: 'Assessment',
					version: 'c902f759da6320',
				},
				direction: 'inwards',
			},
		},
		mappedContainers: [
			{
				type: 'container',
				space: 'sp_test',
				externalId: 'Subject',
			},
		],
		name: 'Subject',
		description:
			"A Subject is a defined area of study within a school's curriculum that is taught by a professor.",
		implements: [],
	},
] as unknown as ViewDefinition[];

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
		// writeFileSync('.generated.ts', output, { encoding: 'utf-8' });
	});
});
