import type {
	DataModelsNestedFilter,
	DirectRelationReference,
	DMSExistsFilter,
	DMSFilterProperty,
	EqualsFilterV3,
	FilterDefinition,
	FilterValueList,
	HasExistingDataFilterV3,
	InFilterV3,
	ParameterizedPropertyValueV3,
	PrefixFilterV3,
} from '@cognite/sdk';
import type {
	ResolveViewKey,
	SchemaHelpers,
	UnambiguousViewReference,
} from './helpers';

export type NodeOrEdgeSchema = {
	node: {
		space: string;
		externalId: string;
		type?: DirectRelationReference;
	};
	edge: {
		space: string;
		externalId: string;
		type: DirectRelationReference;
		startNode: DirectRelationReference;
		endNode: DirectRelationReference;
	};
};

const createCoreHelpers = (): Pick<
	SchemaHelpers<NodeOrEdgeSchema>,
	'getView'
> =>
	({
		getView: (view: string) => {
			const notImplemented = () => {
				throw new Error('Not implemented');
			};
			return {
				asDefinition: notImplemented,
				asId: notImplemented,
				asPropertyName: (property) => property as string,
				asPropertyRef: (property) => [view, property as string],
				asRef: notImplemented,
				asSource: notImplemented,
				asSourceSelector: notImplemented,
				asViewPropertyRef: notImplemented,
				getPartialProps: notImplemented,
				getProps: notImplemented,
				getSelectProps: notImplemented,
			};
		},
	}) satisfies Pick<SchemaHelpers<NodeOrEdgeSchema>, 'getView'>;

/**
 * BasicFilter supports built-in properties such as `["node", "externalId"]` and `["edge", "type"]`
 */
export interface BasicFilter<TSchema> {
	prefix<TRef extends UnambiguousViewReference<TSchema>>(
		view: TRef,
		property: keyof TSchema[ResolveViewKey<TSchema, TRef>],
		value: string | ParameterizedPropertyValueV3
	): PrefixFilterV3;

	equals<
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends keyof TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		view: TRef,
		property: TProp,
		value:
			| TSchema[ResolveViewKey<TSchema, TRef>][TProp]
			| ParameterizedPropertyValueV3
	): EqualsFilterV3;

	in<
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends keyof TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		view: TRef,
		property: TProp,
		values: (
			| TSchema[ResolveViewKey<TSchema, TRef>][TProp]
			| ParameterizedPropertyValueV3
		)[]
	): InFilterV3;
}

export class Filter<TSchema> {
	readonly #coreHelpers: Pick<SchemaHelpers<NodeOrEdgeSchema>, 'getView'>;

	constructor(
		private readonly helpers: Pick<SchemaHelpers<TSchema>, 'getView'>
	) {
		this.#coreHelpers = createCoreHelpers();
	}

	/**
	 * Filter built-in properties native to the instance, such as `node.externalId` or `edge.type`
	 */
	get instance(): BasicFilter<NodeOrEdgeSchema> {
		return new Filter(this.#coreHelpers) as BasicFilter<NodeOrEdgeSchema>;
	}

	public prefix<TRef extends UnambiguousViewReference<TSchema>>(
		view: TRef,
		property: keyof TSchema[ResolveViewKey<TSchema, TRef>],
		value: string | ParameterizedPropertyValueV3
	): PrefixFilterV3 {
		return {
			prefix: {
				property: this.helpers.getView(view).asPropertyRef(property),
				value,
			},
		};
	}

	public equals<
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends keyof TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		view: TRef,
		property: TProp,
		value:
			| TSchema[ResolveViewKey<TSchema, TRef>][TProp]
			| ParameterizedPropertyValueV3
	): EqualsFilterV3 {
		return {
			equals: {
				property: this.helpers.getView(view).asPropertyRef(property),
				value: value as unknown as DMSFilterProperty,
			},
		};
	}

	public exists<
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends keyof TSchema[ResolveViewKey<TSchema, TRef>],
	>(view: TRef, property: TProp): DMSExistsFilter {
		return {
			exists: {
				property: this.helpers.getView(view).asPropertyRef(property),
			},
		};
	}

	public nested<
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends keyof TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		view: TRef,
		property: TProp,
		filter: FilterDefinition
	): DataModelsNestedFilter {
		return {
			nested: {
				scope: this.helpers.getView(view).asPropertyRef(property),
				filter,
			},
		};
	}

	public in<
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends keyof TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		view: TRef,
		property: TProp,
		values: (
			| TSchema[ResolveViewKey<TSchema, TRef>][TProp]
			| ParameterizedPropertyValueV3
		)[]
	): InFilterV3 {
		return {
			in: {
				property: this.helpers.getView(view).asPropertyRef(property),
				values: values as FilterValueList,
			},
		};
	}

	public hasData(
		view: UnambiguousViewReference<TSchema>,
		...views: UnambiguousViewReference<TSchema>[]
	): HasExistingDataFilterV3 {
		return {
			hasData: [view, ...views].map((v) => this.helpers.getView(v).asRef()),
		};
	}

	public not(not: FilterDefinition): FilterDefinition {
		return { not };
	}

	public or(
		filter: FilterDefinition,
		...filters: FilterDefinition[]
	): FilterDefinition {
		return {
			or: [filter, ...filters],
		};
	}

	public and(
		filter: FilterDefinition,
		...filters: FilterDefinition[]
	): FilterDefinition {
		return {
			and: [filter, ...filters],
		};
	}
}
