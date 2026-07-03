import type { CogniteClient, ViewDefinition } from '@cognite/sdk';
import { describe, it, expect, vi } from 'vitest';
import { resolveViews } from './resolve';

const view = (
	externalId: string,
	options: Partial<ViewDefinition> = {}
): ViewDefinition =>
	({
		space: 'sp_test',
		externalId,
		version: '1',
		properties: {},
		implements: [],
		...options,
	}) as unknown as ViewDefinition;

const ref = (externalId: string) => ({
	type: 'view' as const,
	space: 'sp_test',
	externalId,
	version: '1',
});

/**
 * Build a fake CogniteClient whose `views.retrieve` resolves the given views by
 * their version reference, and records which references were requested.
 */
const fakeClient = (available: ViewDefinition[]) => {
	const retrieve = vi.fn(
		async (refs: { space: string; externalId: string; version: string }[]) => ({
			items: available.filter((v) =>
				refs.some(
					(r) =>
						r.space === v.space &&
						r.externalId === v.externalId &&
						r.version === v.version
				)
			),
		})
	);
	return {
		client: { views: { retrieve } } as unknown as CogniteClient,
		retrieve,
	};
};

describe('resolveViews', () => {
	it('retrieves the referenced views when none implement anything', async () => {
		const { client, retrieve } = fakeClient([
			view('Assessment'),
			view('Professor'),
		]);

		const result = await resolveViews(client, [
			ref('Assessment'),
			ref('Professor'),
		]);

		// Only the initial retrieval; no implements references to follow.
		expect(retrieve).toHaveBeenCalledTimes(1);
		expect(result.map((v) => v.externalId)).toEqual([
			'Assessment',
			'Professor',
		]);
	});

	it('fetches an implemented view that is not among the references', async () => {
		const child = view('Child', { implements: [ref('Base')] });
		const base = view('Base');
		const { client, retrieve } = fakeClient([child, base]);

		const result = await resolveViews(client, [ref('Child')]);

		// One fetch for the reference, one for the implemented ancestor.
		expect(retrieve).toHaveBeenCalledTimes(2);
		expect(result.map((v) => v.externalId)).toEqual(['Base', 'Child']);
	});

	it('recursively resolves transitive implements chains', async () => {
		// Child -> Middle -> Base, where only Child is referenced up front.
		const child = view('Child', { implements: [ref('Middle')] });
		const middle = view('Middle', { implements: [ref('Base')] });
		const base = view('Base');
		const { client, retrieve } = fakeClient([child, middle, base]);

		const result = await resolveViews(client, [ref('Child')]);

		// One fetch per BFS layer: {Child}, {Middle}, {Base}.
		expect(retrieve).toHaveBeenCalledTimes(3);
		expect(result.map((v) => v.externalId)).toEqual([
			'Base',
			'Child',
			'Middle',
		]);
	});

	it('does not re-fetch an implemented view already referenced', async () => {
		const child = view('Child', { implements: [ref('Base')] });
		const base = view('Base');
		const { client, retrieve } = fakeClient([child, base]);

		const result = await resolveViews(client, [ref('Child'), ref('Base')]);

		// Base is already resolved by the initial retrieval, so it is not
		// fetched again for the implements reference.
		expect(retrieve).toHaveBeenCalledTimes(1);
		expect(result.map((v) => v.externalId)).toEqual(['Base', 'Child']);
	});

	it('throws when a referenced view cannot be resolved', async () => {
		const { client } = fakeClient([]); // nothing resolves

		await expect(resolveViews(client, [ref('Missing')])).rejects.toThrow(
			/Unable to resolve view\(s\): sp_test__Missing__1/
		);
	});

	it('throws when an implemented view cannot be resolved', async () => {
		const child = view('Child', { implements: [ref('Missing')] });
		const { client } = fakeClient([child]); // Child resolves, Missing does not

		await expect(resolveViews(client, [ref('Child')])).rejects.toThrow(
			/Unable to resolve view\(s\): sp_test__Missing__1/
		);
	});
});
