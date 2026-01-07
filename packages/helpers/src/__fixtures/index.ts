import type { DirectRelationReference, ViewDefinition } from '@cognite/sdk';

export type TestView1 = {
	a: string;
	b: number;
	c: DirectRelationReference;
	d: string[];
};
export type TestView2 = { a: string; b: number };
export type __Schema = {
	test__TestView1__1: TestView1;
	TestView2: TestView2;
};

const space = 'test';

type MockViewDefinition = Pick<
	ViewDefinition,
	'space' | 'externalId' | 'version'
>;
const mockViews: MockViewDefinition[] = [
	{
		space,
		externalId: 'TestView1',
		version: '1',
	},
	{
		space,
		externalId: 'TestView2',
		version: '1',
	},
];
export const __VIEWS = mockViews as ViewDefinition[];

export const TEST_VIEW_DEFINITIONS = [
	{
		externalId: 'Assessment',
		space: 'sp_test',
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
					space: 'sp_test',
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
					space: 'sp_test',
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
		version: '3',
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
					space: 'sp_test',
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
						space: 'sp_test',
						externalId: 'School',
						version: '4',
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
					version: '3',
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
		version: '4',
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
					space: 'sp_test',
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
					space: 'sp_test',
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
					space: 'sp_test',
					externalId: 'Student',
					version: '1',
				},
				through: {
					source: {
						type: 'container',
						space: 'sp_test',
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
		version: '1',
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
					space: 'sp_test',
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
					space: 'sp_test',
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
						space: 'sp_test',
						externalId: 'School',
						version: '4',
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
						space: 'sp_test',
						externalId: 'School',
						version: '4',
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
						version: '3',
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
					version: '1',
				},
				connectionType: 'multi_edge_connection',
				name: 'Subject.students',
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
	// Test view with an aliased property name (view property name differs from container property identifier)
	{
		externalId: 'Course',
		space: 'sp_test',
		version: '1',
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
					space: 'sp_test',
					externalId: 'Course',
				},
				containerPropertyIdentifier: 'name',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				name: 'Course.name',
			},
			// This property has a different name in the view ("department") than in the container ("dept_ref")
			department: {
				constraintState: {},
				type: {
					type: 'direct',
					list: false,
					source: {
						type: 'view',
						space: 'sp_test',
						externalId: 'Department',
						version: '1',
					},
				},
				container: {
					type: 'container',
					space: 'sp_test',
					externalId: 'Course',
				},
				// Note: containerPropertyIdentifier differs from the view property name "department"
				containerPropertyIdentifier: 'dept_ref',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				name: 'Course.department',
			},
		},
		mappedContainers: [
			{
				type: 'container',
				space: 'sp_test',
				externalId: 'Course',
			},
		],
		name: 'Course',
		description: 'A Course belongs to a Department.',
		implements: [],
	},
	{
		externalId: 'Department',
		space: 'sp_test',
		version: '1',
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
					space: 'sp_test',
					externalId: 'Department',
				},
				containerPropertyIdentifier: 'name',
				immutable: false,
				nullable: true,
				autoIncrement: false,
				name: 'Department.name',
			},
			// Reverse relation that references the Course.department property via the container property identifier
			courses: {
				connectionType: 'multi_reverse_direct_relation',
				source: {
					type: 'view',
					space: 'sp_test',
					externalId: 'Course',
					version: '1',
				},
				through: {
					source: {
						type: 'container',
						space: 'sp_test',
						externalId: 'Course',
					},
					// This references the container property identifier, NOT the view property name
					identifier: 'dept_ref',
				},
				targetsList: false,
				name: 'Department.courses',
			},
		},
		mappedContainers: [
			{
				type: 'container',
				space: 'sp_test',
				externalId: 'Department',
			},
		],
		name: 'Department',
		description: 'A Department contains Courses.',
		implements: [],
	},
] as const;

// Export the precise literal type for type-level testing
export type TestViewDefinitions = typeof TEST_VIEW_DEFINITIONS;
