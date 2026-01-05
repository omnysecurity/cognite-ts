import { describe, expect, it } from 'vitest';
import { TEST_VIEW_DEFINITIONS } from './__fixtures';
import { createInstanceBuilder } from './instance-builder';

// Test fixture with ambiguous view references (same externalId in different spaces/versions)
const AMBIGUOUS_VIEWS = [
	{
		space: 'space_a',
		externalId: 'SharedView',
		version: '1',
		properties: {
			name: { container: {}, type: { type: 'text' }, nullable: true },
		},
	},
	{
		space: 'space_b',
		externalId: 'SharedView',
		version: '1',
		properties: {
			name: { container: {}, type: { type: 'text' }, nullable: true },
		},
	},
	{
		space: 'space_a',
		externalId: 'MultiVersion',
		version: '1',
		properties: {
			name: { container: {}, type: { type: 'text' }, nullable: true },
		},
	},
	{
		space: 'space_a',
		externalId: 'MultiVersion',
		version: '2',
		properties: {
			name: { container: {}, type: { type: 'text' }, nullable: true },
		},
	},
	{
		space: 'space_a',
		externalId: 'UniqueView',
		version: '1',
		properties: {
			name: { container: {}, type: { type: 'text' }, nullable: true },
		},
	},
] as const;

describe('InstanceBuilder', () => {
	const builder = createInstanceBuilder(TEST_VIEW_DEFINITIONS);

	describe('node().view()', () => {
		it('accepts unambiguous view references', () => {
			const nodeRef = { space: 'sp_test', externalId: 'test-1' };

			// Simple externalId (unambiguous when only one view has that externalId)
			builder.node(nodeRef).view('Student');
			builder.node(nodeRef).view('Professor');
			builder.node(nodeRef).view('School');
			builder.node(nodeRef).view('Subject');
			builder.node(nodeRef).view('Assessment');

			// Namespaced reference: space__externalId
			builder.node(nodeRef).view('sp_test__Student');
			builder.node(nodeRef).view('sp_test__Professor');

			// Full reference: space__externalId__version
			builder.node(nodeRef).view('sp_test__Student__1');
			builder.node(nodeRef).view('sp_test__School__4');

			// @ts-expect-error - InvalidView is not a valid view
			builder.node(nodeRef).view('InvalidView');

			// @ts-expect-error - wrong space
			builder.node(nodeRef).view('wrong_space__Student');

			// @ts-expect-error - wrong version
			builder.node(nodeRef).view('sp_test__Student__999');
		});

		it('supports creating new nodes with auto-generated externalId', () => {
			const node = builder.node({ space: 'sp_test', generateId: true });

			// The ref should have space and a generated externalId
			expect(node.ref.space).toBe('sp_test');
			expect(node.ref.externalId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
			);

			// Can still use view on the new node
			const result = node.view('Student').update({ name: 'New Student' });
			const writes = result.asWrite();
			expect(writes).toHaveLength(1);
			expect(writes[0]!.externalId).toBe(node.ref.externalId);
		});

		it('generates unique externalIds for each new node', () => {
			const node1 = builder.node({ space: 'sp_test', generateId: true });
			const node2 = builder.node({ space: 'sp_test', generateId: true });

			expect(node1.ref.externalId).not.toBe(node2.ref.externalId);
		});
	});

	describe('NodeBuilder.update', () => {
		it('accepts partial properties for updates', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			// Can update individual properties
			student.update({ name: 'Jane Doe' });
			student.update({ birthyear: 1995 });

			// Can also update multiple properties at once
			student.update({
				name: 'John Doe',
				birthyear: 1995,
				school: { space: 'sp_test', externalId: 'school-1' },
			});
		});

		it('enforces correct value types', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			// Correct types
			student.update({
				name: 'John',
				birthyear: 2000,
				school: { space: 'sp_test', externalId: 'school-1' },
			});

			student.update({
				// @ts-expect-error - name should be string, not number
				name: 123,
			});

			student.update({
				// @ts-expect-error - birthyear should be number, not string
				birthyear: 'not a number',
			});

			student.update({
				// @ts-expect-error - school should be DirectRelationReference, not string
				school: 'not a reference',
			});
		});

		it('handles enum properties', () => {
			const assessment = builder
				.node({ space: 'sp_test', externalId: 'assessment-1' })
				.view('Assessment');

			// Valid enum values
			assessment.update({ status: 'Draft' });
			assessment.update({ status: 'Provisional' });
			assessment.update({ status: 'Final' });

			assessment.update({
				// @ts-expect-error - InvalidStatus is not a valid enum value
				status: 'InvalidStatus',
			});
		});

		it('only allows direct properties, not edge connections', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			student.update({
				name: 'Test',
				// @ts-expect-error - subjects is an edge connection, not a direct property
				subjects: 'invalid',
			});
		});
	});

	describe('NodeBuilder.upsert', () => {
		it('requires all non-nullable properties', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			// Student has all nullable properties, so empty object is valid
			student.upsert({});

			// Can provide all properties
			student.upsert({
				name: 'John Doe',
				birthyear: 1995,
				school: { space: 'sp_test', externalId: 'school-1' },
			});
		});
	});

	describe('NodeBuilder.connect', () => {
		it('provides autocomplete for edge connections only', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			// Edge connections should be available
			student.connect('subjects');

			// @ts-expect-error - name is a direct property, not an edge connection
			student.connect('name');

			// @ts-expect-error - school is a direct relation, not an edge connection
			student.connect('school');
		});

		it('provides withProperties for edges with edgeSource', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			// Student.subjects has edgeSource: Assessment, so withProperties should be available
			student
				.connect('subjects')
				.to({ space: 'sp_test', externalId: 'math-101' })
				.withProperties({
					status: 'Draft',
					comment: 'Enrolled in course',
				});
		});

		it('does not provide withProperties for edges without edgeSource', () => {
			const professor = builder
				.node({ space: 'sp_test', externalId: 'prof-1' })
				.view('Professor');

			// Professor.colleagues has no edgeSource, so just .to() is available
			professor
				.connect('colleagues')
				.to({ space: 'sp_test', externalId: 'prof-2' });

			// withProperties should not be available (no edgeSource)
			// This is enforced by the return type - EdgeBuilderNoProps doesn't have withProperties
		});

		it('enforces correct edge property types', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			// Correct types for Assessment properties
			student
				.connect('subjects')
				.to({ space: 'sp_test', externalId: 'math-101' })
				.withProperties({
					status: 'Final',
					comment: 'Good progress',
				});

			student
				.connect('subjects')
				.to({ space: 'sp_test', externalId: 'math-101' })
				.withProperties({
					// @ts-expect-error - status must be a valid enum value
					status: 'InvalidStatus',
					comment: 'Test',
				});
		});
	});

	describe('NodeBuilder.addReverse', () => {
		it('provides autocomplete for reverse connections only', () => {
			const school = builder
				.node({ space: 'sp_test', externalId: 'school-1' })
				.view('School');

			// Reverse connections should be available
			school.addReverse('students');

			// @ts-expect-error - name is a direct property, not a reverse connection
			school.addReverse('name');

			// @ts-expect-error - description is a direct property
			school.addReverse('description');
		});

		it('provides from() method to specify source node', () => {
			const school = builder
				.node({ space: 'sp_test', externalId: 'school-1' })
				.view('School');

			// This will update student-2's school property to point to school-1
			school
				.addReverse('students')
				.from({ space: 'sp_test', externalId: 'student-2' });
		});
	});

	describe('ambiguous view references', () => {
		const ambiguousBuilder = createInstanceBuilder(AMBIGUOUS_VIEWS);
		const nodeRef = { space: 'test', externalId: 'test-1' };

		it('rejects ambiguous externalId when same externalId exists in multiple spaces', () => {
			// SharedView exists in both space_a and space_b
			// @ts-expect-error - 'SharedView' is ambiguous (exists in multiple spaces)
			ambiguousBuilder.node(nodeRef).view('SharedView');

			// But space-qualified references are unambiguous
			ambiguousBuilder.node(nodeRef).view('space_a__SharedView');
			ambiguousBuilder.node(nodeRef).view('space_b__SharedView');
		});

		it('rejects ambiguous space__externalId when multiple versions exist', () => {
			// MultiVersion has versions 1 and 2 in space_a
			// @ts-expect-error - 'space_a__MultiVersion' is ambiguous (multiple versions)
			ambiguousBuilder.node(nodeRef).view('space_a__MultiVersion');

			// But fully qualified references are unambiguous
			ambiguousBuilder.node(nodeRef).view('space_a__MultiVersion__1');
			ambiguousBuilder.node(nodeRef).view('space_a__MultiVersion__2');
		});

		it('accepts unambiguous references', () => {
			// UniqueView only exists once, so all reference formats are valid
			ambiguousBuilder.node(nodeRef).view('UniqueView');
			ambiguousBuilder.node(nodeRef).view('space_a__UniqueView');
			ambiguousBuilder.node(nodeRef).view('space_a__UniqueView__1');
		});
	});

	describe('WriteResult', () => {
		it('returns WriteResult with asWrite() from update()', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			const result = student.update({ name: 'Jane Doe' });

			// WriteResult should have asWrite() method
			expect(result.asWrite()).toHaveLength(1);
			expect(result.asWrite()[0]!.instanceType).toBe('node');
		});

		it('returns WriteResult with asWrite() from upsert()', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			const result = student.upsert({
				name: 'Jane Doe',
				birthyear: 1998,
				school: { space: 'sp_test', externalId: 'school-1' },
			});

			// WriteResult should have asWrite() method
			expect(result.asWrite()).toHaveLength(1);
			expect(result.asWrite()[0]!.instanceType).toBe('node');
		});

		it('returns WriteResult with asWrite() from connect().to()', () => {
			const professor = builder
				.node({ space: 'sp_test', externalId: 'prof-1' })
				.view('Professor');

			const result = professor
				.connect('colleagues')
				.to({ space: 'sp_test', externalId: 'prof-2' });

			expect(result.asWrite()).toHaveLength(1);
			expect(result.asWrite()[0]!.instanceType).toBe('edge');
		});

		it('returns WriteResult with asWrite() from connect().to().withProperties()', () => {
			const student = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			const result = student
				.connect('subjects')
				.to({ space: 'sp_test', externalId: 'math-101' })
				.withProperties({ status: 'Final', comment: 'Completed' });

			expect(result.asWrite()).toHaveLength(1);
			expect(result.asWrite()[0]!.instanceType).toBe('edge');
		});

		it('returns WriteResult with asWrite() from addReverse().from()', () => {
			const school = builder
				.node({ space: 'sp_test', externalId: 'school-1' })
				.view('School');

			const result = school
				.addReverse('students')
				.from({ space: 'sp_test', externalId: 'student-2' });

			expect(result.asWrite()).toHaveLength(1);
			expect(result.asWrite()[0]!.instanceType).toBe('node');
		});
	});

	describe('asWrite() output structure', () => {
		it('produces correct NodeWrite structure from update()', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.update({ name: 'Jane Doe', birthyear: 1998 })
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toEqual({
				instanceType: 'node',
				space: 'sp_test',
				externalId: 'student-1',
				sources: [
					{
						source: {
							type: 'view',
							space: 'sp_test',
							externalId: 'Student',
							version: '1',
						},
						properties: {
							name: 'Jane Doe',
							birthyear: 1998,
						},
					},
				],
			});
		});

		it('produces correct NodeWrite with direct relation reference', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.update({
					name: 'Jane Doe',
					school: { space: 'sp_test', externalId: 'school-1' },
				})
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				instanceType: 'node',
				space: 'sp_test',
				externalId: 'student-1',
				sources: [
					{
						source: {
							type: 'view',
							space: 'sp_test',
							externalId: 'Student',
							version: '1',
						},
						properties: {
							name: 'Jane Doe',
							school: { space: 'sp_test', externalId: 'school-1' },
						},
					},
				],
			});
		});

		it('merges properties from chained update() calls', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.update({ name: 'Jane Doe' })
				.update({ birthyear: 1998 })
				.update({ school: { space: 'sp_test', externalId: 'school-1' } })
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				sources: [
					{
						properties: {
							name: 'Jane Doe',
							birthyear: 1998,
							school: { space: 'sp_test', externalId: 'school-1' },
						},
					},
				],
			});
		});

		it('later update() calls override earlier values for same property', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.update({ name: 'Jane Doe' })
				.update({ name: 'John Smith' })
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				sources: [
					{
						properties: {
							name: 'John Smith',
						},
					},
				],
			});
		});

		it('produces correct EdgeWrite structure from connect().to()', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'prof-1' })
				.view('Professor')
				.connect('colleagues')
				.to({ space: 'sp_test', externalId: 'prof-2' })
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				instanceType: 'edge',
				space: 'sp_test',
				type: { space: 'sp_test', externalId: 'hasColleague' },
				startNode: { space: 'sp_test', externalId: 'prof-1' },
				endNode: { space: 'sp_test', externalId: 'prof-2' },
			});
			// Edge should have a deterministic externalId (hash)
			expect(writes[0]!.externalId).toMatch(/^[0-9a-f]{16}$/);
		});

		it('produces correct EdgeWrite with properties from connect().to().withProperties()', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.connect('subjects')
				.to({ space: 'sp_test', externalId: 'math-101' })
				.withProperties({ status: 'Final', comment: 'Good progress' })
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				instanceType: 'edge',
				space: 'sp_test',
				type: { space: 'sp_test', externalId: 'studentEnrolledInClass' },
				startNode: { space: 'sp_test', externalId: 'student-1' },
				endNode: { space: 'sp_test', externalId: 'math-101' },
				sources: [
					{
						source: {
							type: 'view',
							space: 'sp_test',
							externalId: 'Assessment',
							version: 'c902f759da6320',
						},
						properties: {
							status: 'Final',
							comment: 'Good progress',
						},
					},
				],
			});
		});

		it('produces correct NodeWrite from addReverse().from()', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'school-1' })
				.view('School')
				.addReverse('students')
				.from({ space: 'sp_test', externalId: 'student-2' })
				.asWrite();

			expect(writes).toHaveLength(1);
			// addReverse updates the SOURCE node (student-2), not the target (school-1)
			expect(writes[0]).toMatchObject({
				instanceType: 'node',
				space: 'sp_test',
				externalId: 'student-2',
				sources: [
					{
						source: {
							type: 'container',
							space: 'sp_test',
							externalId: 'Student',
						},
						properties: {
							school: { space: 'sp_test', externalId: 'school-1' },
						},
					},
				],
			});
		});

		it('allows custom edge space and externalId via options', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'prof-1' })
				.view('Professor')
				.connect('colleagues')
				.to(
					{ space: 'sp_test', externalId: 'prof-2' },
					{ space: 'custom_space', externalId: 'custom-edge-id' }
				)
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				instanceType: 'edge',
				space: 'custom_space',
				externalId: 'custom-edge-id',
			});
		});

		it('generates deterministic edge externalIds', () => {
			// Same start/end nodes should produce same edge externalId
			const writes1 = builder
				.node({ space: 'sp_test', externalId: 'prof-1' })
				.view('Professor')
				.connect('colleagues')
				.to({ space: 'sp_test', externalId: 'prof-2' })
				.asWrite();

			const writes2 = builder
				.node({ space: 'sp_test', externalId: 'prof-1' })
				.view('Professor')
				.connect('colleagues')
				.to({ space: 'sp_test', externalId: 'prof-2' })
				.asWrite();

			expect(writes1[0]!.externalId).toBe(writes2[0]!.externalId);

			// Different nodes should produce different edge externalId
			const writes3 = builder
				.node({ space: 'sp_test', externalId: 'prof-1' })
				.view('Professor')
				.connect('colleagues')
				.to({ space: 'sp_test', externalId: 'prof-3' })
				.asWrite();

			expect(writes1[0]!.externalId).not.toBe(writes3[0]!.externalId);
		});

		it('generates identical edge regardless of direction (outwards vs inwards)', () => {
			// Student.subjects has direction: 'outwards' - student is startNode
			const fromStudent = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.connect('subjects')
				.to({ space: 'sp_test', externalId: 'math-101' })
				.asWrite();

			// Subject.students has direction: 'inwards' - subject is endNode
			const fromSubject = builder
				.node({ space: 'sp_test', externalId: 'math-101' })
				.view('Subject')
				.connect('students')
				.to({ space: 'sp_test', externalId: 'student-1' })
				.asWrite();

			// Both should produce identical edges
			expect(fromStudent).toEqual(fromSubject);
		});

		it('returns empty array when no properties set', () => {
			const nodeBuilder = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student');

			// No update() or upsert() called
			expect(nodeBuilder.asWrite()).toHaveLength(0);
		});
	});

	describe('node type', () => {
		it('allows setting node type at node level', () => {
			const writes = builder
				.node({
					space: 'sp_test',
					externalId: 'student-1',
					type: { space: 'sp_test', externalId: 'StudentType' },
				})
				.view('Student')
				.update({ name: 'Jane Doe' })
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				instanceType: 'node',
				space: 'sp_test',
				externalId: 'student-1',
				type: { space: 'sp_test', externalId: 'StudentType' },
				sources: [
					{
						properties: { name: 'Jane Doe' },
					},
				],
			});
		});

		it('allows asWrite() without selecting a view when type is set', () => {
			const writes = builder
				.node({
					space: 'sp_test',
					externalId: 'student-1',
					type: { space: 'sp_test', externalId: 'StudentType' },
				})
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toEqual({
				instanceType: 'node',
				space: 'sp_test',
				externalId: 'student-1',
				type: { space: 'sp_test', externalId: 'StudentType' },
			});
		});

		it('returns empty array when asWrite() called without type and without view', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.asWrite();

			expect(writes).toHaveLength(0);
		});

		it('includes type with auto-generated externalId', () => {
			const node = builder.node({
				space: 'sp_test',
				generateId: true,
				type: { space: 'sp_test', externalId: 'StudentType' },
			});

			const writes = node.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				instanceType: 'node',
				space: 'sp_test',
				type: { space: 'sp_test', externalId: 'StudentType' },
			});
			// externalId should be a UUID
			expect(writes[0]!.externalId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
			);
		});

		it('produces NodeWrite with only type (no sources) when no properties set', () => {
			const writes = builder
				.node({
					space: 'sp_test',
					externalId: 'student-1',
					type: { space: 'sp_test', externalId: 'StudentType' },
				})
				.view('Student')
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toEqual({
				instanceType: 'node',
				space: 'sp_test',
				externalId: 'student-1',
				type: { space: 'sp_test', externalId: 'StudentType' },
			});
			// Should NOT have sources property when no properties are set
			expect(writes[0]).not.toHaveProperty('sources');
		});
	});

	describe('multiple views', () => {
		it('allows chaining .view() to add properties from multiple views', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.update({ name: 'Jane Doe', birthyear: 1998 })
				.view('School')
				.update({ name: 'MIT', description: 'A good school' })
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				instanceType: 'node',
				space: 'sp_test',
				externalId: 'student-1',
				sources: [
					{
						source: {
							type: 'view',
							space: 'sp_test',
							externalId: 'Student',
							version: '1',
						},
						properties: {
							name: 'Jane Doe',
							birthyear: 1998,
						},
					},
					{
						source: {
							type: 'view',
							space: 'sp_test',
							externalId: 'School',
							version: '4',
						},
						properties: {
							name: 'MIT',
							description: 'A good school',
						},
					},
				],
			});
		});

		it('produces single NodeWrite with multiple sources', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'node-1' })
				.view('Student')
				.update({ name: 'Student Name' })
				.view('Professor')
				.update({ name: 'Professor Name' })
				.view('Subject')
				.update({ name: 'Subject Name' })
				.asWrite();

			expect(writes).toHaveLength(1);
			const node = writes[0]!;
			expect(node.instanceType).toBe('node');
			expect((node as { sources?: unknown[] }).sources).toHaveLength(3);
		});

		it('skips views with no properties set', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.update({ name: 'Jane Doe' })
				.view('School') // No update called
				.view('Professor')
				.update({ name: 'Prof. Smith' })
				.asWrite();

			expect(writes).toHaveLength(1);
			const sources = (writes[0] as { sources?: unknown[] }).sources!;
			expect(sources).toHaveLength(2);
			expect(sources[0]).toMatchObject({
				source: { externalId: 'Student' },
			});
			expect(sources[1]).toMatchObject({
				source: { externalId: 'Professor' },
			});
		});

		it('preserves node type with multiple views', () => {
			const writes = builder
				.node({
					space: 'sp_test',
					externalId: 'student-1',
					type: { space: 'sp_test', externalId: 'StudentType' },
				})
				.view('Student')
				.update({ name: 'Jane Doe' })
				.view('School')
				.update({ name: 'MIT' })
				.asWrite();

			expect(writes).toHaveLength(1);
			expect(writes[0]).toMatchObject({
				type: { space: 'sp_test', externalId: 'StudentType' },
				sources: [
					{ source: { externalId: 'Student' } },
					{ source: { externalId: 'School' } },
				],
			});
		});

		it('merges properties when referencing the same view multiple times', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.update({ name: 'Jane Doe' })
				.view('School')
				.update({ name: 'MIT' })
				.view('Student') // Back to Student view
				.update({ birthyear: 1998 })
				.asWrite();

			expect(writes).toHaveLength(1);
			const sources = (writes[0] as { sources?: unknown[] }).sources!;
			// Should only have 2 sources (Student and School), not 3
			expect(sources).toHaveLength(2);

			// Student properties should be merged
			expect(sources[0]).toMatchObject({
				source: { externalId: 'Student' },
				properties: {
					name: 'Jane Doe',
					birthyear: 1998,
				},
			});

			// School should remain unchanged
			expect(sources[1]).toMatchObject({
				source: { externalId: 'School' },
				properties: { name: 'MIT' },
			});
		});

		it('overwrites properties when same property is set multiple times on same view', () => {
			const writes = builder
				.node({ space: 'sp_test', externalId: 'student-1' })
				.view('Student')
				.update({ name: 'Jane Doe' })
				.view('School')
				.update({ name: 'MIT' })
				.view('Student')
				.update({ name: 'John Smith' }) // Overwrite name
				.asWrite();

			expect(writes).toHaveLength(1);
			const sources = (writes[0] as { sources?: unknown[] }).sources!;
			expect(sources).toHaveLength(2);

			// Student name should be overwritten
			expect(sources[0]).toMatchObject({
				source: { externalId: 'Student' },
				properties: { name: 'John Smith' },
			});
		});
	});
});
