import type {
	CogniteClient,
	ViewDefinition,
	ViewReference,
} from '@cognite/sdk';
import { getViewId, type ViewRef } from './types.js';

/**
 * Collect the `implements` references declared by a set of views.
 *
 * Only the views' own `implements` arrays are inspected - this is a single,
 * non-recursive pass. Callers that need the full transitive closure (i.e.
 * `resolveViews`) repeat the pass as newly-fetched views are added.
 */
export function collectImplementsRefs(
	views: ViewDefinition[]
): ViewReference[] {
	return views.flatMap((view) => view.implements ?? []);
}

/**
 * Retrieve the given view references, failing if any cannot be resolved so we
 * never proceed with a dangling type reference.
 */
async function fetchViews(
	client: CogniteClient,
	refs: ViewRef[]
): Promise<ViewDefinition[]> {
	const { items } = await client.views.retrieve(
		refs.map(({ space, externalId, version }) => ({
			space,
			externalId,
			version,
		}))
	);

	const resolvedIds = new Set(items.map(getViewId));
	const unresolvable = refs.filter((ref) => !resolvedIds.has(getViewId(ref)));
	if (unresolvable.length > 0) {
		const list = unresolvable.map(getViewId).join(', ');
		throw new Error(
			`Unable to resolve view(s): ${list}. ` +
				`These views are referenced by the data model or via 'implements' ` +
				`but could not be retrieved. ` +
				`Refusing to generate code with dangling type references.`
		);
	}

	return items;
}

/**
 * Resolve a data model's view references into the full set of view definitions
 * required for code generation: the referenced views plus the transitive
 * closure of everything they `implement`, all retrieved from CDF.
 *
 * A view that implements another view is only rendered correctly by the code
 * generator when the implemented view is also present (codegen emits an
 * intersection with the ancestor's generated type). Data models frequently
 * reference implemented views that are not themselves listed on the model, so
 * we resolve them here before generation.
 *
 * Throws if any referenced view cannot be retrieved, so we never emit code with
 * a dangling type reference.
 */
export async function resolveViews(
	client: CogniteClient,
	viewRefs: ViewRef[]
): Promise<ViewDefinition[]> {
	const resolved = new Map<string, ViewDefinition>();

	// Breadth-first: start from the data model's own views, then follow
	// `implements` references, fetching each unseen ancestor.
	let frontier = await fetchViews(client, viewRefs);
	while (frontier.length > 0) {
		for (const view of frontier) resolved.set(getViewId(view), view);

		const missing = new Map<string, ViewReference>();
		for (const ref of collectImplementsRefs(frontier)) {
			const key = getViewId(ref);
			if (!resolved.has(key)) missing.set(key, ref);
		}
		if (missing.size === 0) break;

		frontier = await fetchViews(client, [...missing.values()]);
	}

	// Deterministic order (space, then externalId, then version) regardless of
	// retrieval order, so generated output is stable across runs.
	return [...resolved.values()].sort((a, b) =>
		getViewId(a).localeCompare(getViewId(b))
	);
}
