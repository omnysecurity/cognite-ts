import type {
	DirectRelationReference,
	EdgeDefinition,
	EdgeWrite,
	NodeDefinition,
	NodeOrEdge,
	NodeWrite,
	PropertyValueGroupV3,
	SourceSelectorV3,
	SourceSelectorWithoutPropertiesV3,
	ViewDefinition,
	ViewPropertyReference,
	ViewReference,
} from '@cognite/sdk';

// Extract all possible view reference candidates from schema (including ambiguous ones)
type ViewReferenceCandidate<TSchema> = keyof TSchema extends infer K
	? K extends `${infer S}__${infer E}__${infer V}` // full
		? `${S}__${E}__${V}` | `${S}__${E}` | E
		: K extends `${infer S}__${infer E}` // versioned
			? `${S}__${E}` | E
			: K // simple
	: never;

// Helper to collect all matching values
type CollectMatches<
	TSchema,
	TRef extends ViewReferenceCandidate<TSchema>,
> = keyof TSchema extends infer K
	? K extends keyof TSchema
		? K extends `${infer S}__${infer E}__${infer V}`
			? TRef extends `${S}__${E}__${V}` | `${S}__${E}` | E
				? TSchema[K]
				: never
			: K extends `${infer S}__${infer E}`
				? TRef extends `${S}__${E}` | E
					? TSchema[K]
					: never
				: TRef extends K
					? TSchema[K]
					: never
		: never
	: never;

// Helper to check if a union is a single value
// This works by checking if T distributes into multiple branches
type IsUnion<T, U = T> = T extends any
	? [U] extends [T]
		? false
		: true
	: false;

type IsSingleValue<T> = [T] extends [never]
	? unknown
	: IsUnion<T> extends true
		? unknown
		: T;

// Helper to resolve a view reference to the actual schema key(s)
export type ResolveViewKey<
	TSchema,
	TRef extends ViewReferenceCandidate<TSchema>,
> = keyof TSchema extends infer K
	? K extends keyof TSchema
		? K extends `${infer S}__${infer E}__${infer V}`
			? TRef extends `${S}__${E}__${V}` | `${S}__${E}` | E
				? K
				: never
			: K extends `${infer S}__${infer E}`
				? TRef extends `${S}__${E}` | E
					? K
					: never
				: K extends TRef
					? K
					: never
		: never
	: never;

// Resolves to the value if unique, undefined otherwise
export type ResolveView<
	TSchema,
	TRef extends ViewReferenceCandidate<TSchema>,
> = IsSingleValue<CollectMatches<TSchema, TRef>>;

// Extract only non-ambiguous view references (those that resolve to a single value)
export type UnambiguousViewReference<TSchema> =
	Extract<ViewReferenceCandidate<TSchema>, string> extends infer TRef extends
		string
		? TRef extends ViewReferenceCandidate<TSchema>
			? unknown extends ResolveView<TSchema, TRef>
				? never
				: TRef
			: never
		: never;

export function createHelpers<TSchema>(
	views: ViewDefinition[]
): SchemaHelpers<TSchema> {
	const getViewId = (view: {
		space: string;
		externalId: string;
		version: string;
	}) => {
		return `${view.space}__${view.externalId}__${view.version}`;
	};

	const viewRefByExternalId = views.reduce(
		(acc, { externalId, space, version }) => {
			const value = {
				externalId,
				space,
				version,
				type: 'view',
			} satisfies ViewReference;
			return {
				...acc,
				[externalId]: value, // simple
				[`${space}__${externalId}`]: value, // versioned
				[getViewId({ space, externalId, version })]: value, // full
			};
		},
		{} as Record<keyof TSchema, ViewReference>
	);

	const getView = <TRef extends UnambiguousViewReference<TSchema>>(
		viewRef: TRef
	) => {
		const view = viewRefByExternalId[viewRef as keyof TSchema];
		type TView = ResolveViewKey<TSchema, TRef>;
		return {
			asDefinition: () =>
				views.find(
					(x) =>
						x.space === view.space &&
						x.externalId === view.externalId &&
						x.version === view.version
				)! as ViewDefinition,
			asId: () => getViewId(view) as unknown as TView,
			asRef: (): ViewReference => view,
			asPropertyName: (property: keyof TSchema[TView]) => String(property),
			asPropertyRef: (property: keyof TSchema[TView]) => [
				view.space,
				`${view.externalId}/${view.version}`,
				String(property),
			],
			asViewPropertyRef: (
				property: keyof TSchema[TView]
			): ViewPropertyReference => ({
				view,
				identifier: property as string,
			}),
			asSource: (): SourceSelectorWithoutPropertiesV3[number] => ({
				source: view,
			}),
			asSourceSelector: <TProps extends keyof TSchema[TView]>(
				properties: TProps[] | ['*']
			): SourceSelectorV3[number] => ({
				source: view as ViewReference,
				properties: properties as string[],
			}),
			getProps: (instance: NodeOrEdge) => {
				const properties = instance.properties || {};
				const viewProperties = (properties[view.space] || {})[
					`${view.externalId}/${view.version}`
				];
				return viewProperties as unknown as TSchema[TView] | null;
			},
			getPartialProps: (instance: NodeOrEdge) => {
				const properties = instance.properties || {};
				const viewProperties = (properties[view.space] || {})[
					`${view.externalId}/${view.version}`
				];
				return viewProperties as unknown as null | Partial<TSchema[TView]>;
			},
			getSelectProps: <TProps extends keyof TSchema[TView]>(
				instance: NodeOrEdge
			) => {
				const properties = instance.properties || {};
				const viewProperties = (properties[view.space] || {})[
					`${view.externalId}/${view.version}`
				];
				return viewProperties as unknown as null | Pick<TSchema[TView], TProps>;
			},
		} satisfies ViewHelpers<TSchema, TView>;
	};

	const isKnownView = (
		name: string | number | symbol
	): name is UnambiguousViewReference<TSchema> => {
		return name in viewRefByExternalId;
	};

	const isEdge = (nodeOrEdge: NodeOrEdge): nodeOrEdge is EdgeDefinition =>
		nodeOrEdge.instanceType === 'edge';

	const isNode = (nodeOrEdge: NodeOrEdge): nodeOrEdge is NodeDefinition =>
		nodeOrEdge.instanceType === 'node';

	const getNodeProps = <TRef extends UnambiguousViewReference<TSchema>>(
		instance: NodeOrEdge,
		viewRef: TRef
	): null | (NodeDefinition & TSchema[ResolveViewKey<TSchema, TRef>]) => {
		const props = getView(viewRef).getProps(instance);
		return isNode(instance) && props
			? {
					...instance,
					...props,
				}
			: null;
	};

	const createNodeWrite = <
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		viewRef: TRef,
		options: NodeWriteOptions<TSchema, ResolveViewKey<TSchema, TRef>, TProp>
	) => {
		const view = getView(viewRef);
		const { properties, ...node } = options;
		return {
			...node,
			instanceType: 'node',
			sources: [
				{
					source: view.asSource().source,
					properties: properties as PropertyValueGroupV3,
				},
			],
		} satisfies NodeWrite;
	};

	const createEdgeWrite = <
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		viewRef: TRef,
		options: EdgeWriteOptions<TSchema, ResolveViewKey<TSchema, TRef>, TProp>
	) => {
		const view = getView(viewRef);
		const { properties, ...edge } = options;
		return {
			...edge,
			instanceType: 'edge',
			sources: [
				{
					source: view.asSource().source,
					properties: properties as PropertyValueGroupV3,
				},
			],
		} satisfies EdgeWrite;
	};

	const getEdgeProps = <TRef extends UnambiguousViewReference<TSchema>>(
		instance: NodeOrEdge,
		viewRef: TRef
	): null | (EdgeDefinition & TSchema[ResolveViewKey<TSchema, TRef>]) => {
		const props = getView(viewRef).getProps(instance);
		return isEdge(instance) && props
			? {
					...instance,
					...props,
				}
			: null;
	};

	return {
		createNodeWrite,
		createEdgeWrite,
		getView,
		getViewId,
		getNodeProps,
		getEdgeProps,
		isNode,
		isEdge,
		isKnownView,
		__views: views,
	};
}

type NodeWriteOptions<
	TSchema,
	TView extends keyof TSchema,
	TProp extends TSchema[TView],
> = {
	space: string;
	externalId: string;
	existingVersion?: number;
	type?: DirectRelationReference;
	properties: TProp;
};

type EdgeWriteOptions<
	TSchema,
	TView extends keyof TSchema,
	TProp extends TSchema[TView],
> = NodeWriteOptions<TSchema, TView, TProp> & {
	startNode: DirectRelationReference;
	endNode: DirectRelationReference;
	type: DirectRelationReference;
};

export type SchemaHelpers<TSchema> = {
	getView: <TRef extends UnambiguousViewReference<TSchema>>(
		viewRef: TRef
	) => ViewHelpers<TSchema, ResolveViewKey<TSchema, TRef>>;
	getViewId: (view: {
		space: string;
		externalId: string;
		version: string;
	}) => string;
	isKnownView: (
		viewId: string | number | symbol
	) => viewId is UnambiguousViewReference<TSchema>;
	createNodeWrite: <
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		viewRef: TRef,
		options: NodeWriteOptions<TSchema, ResolveViewKey<TSchema, TRef>, TProp>
	) => NodeWrite;
	createEdgeWrite: <
		TRef extends UnambiguousViewReference<TSchema>,
		TProp extends TSchema[ResolveViewKey<TSchema, TRef>],
	>(
		viewRef: TRef,
		options: EdgeWriteOptions<TSchema, ResolveViewKey<TSchema, TRef>, TProp>
	) => EdgeWrite;
	getNodeProps: <TRef extends UnambiguousViewReference<TSchema>>(
		instance: NodeOrEdge,
		viewRef: TRef
	) => (NodeDefinition & TSchema[ResolveViewKey<TSchema, TRef>]) | null;
	getEdgeProps: <TRef extends UnambiguousViewReference<TSchema>>(
		instance: NodeOrEdge,
		viewRef: TRef
	) => (EdgeDefinition & TSchema[ResolveViewKey<TSchema, TRef>]) | null;
	isNode: (nodeOrEdge: NodeOrEdge) => nodeOrEdge is NodeDefinition;
	isEdge: (nodeOrEdge: NodeOrEdge) => nodeOrEdge is EdgeDefinition;
	__views: ViewDefinition[];
};

export type ViewHelpers<TSchema, TView extends keyof TSchema> = {
	asDefinition: () => ViewDefinition;
	asId: () => TView;
	asRef: () => ViewReference;
	asPropertyName: (property: keyof TSchema[TView]) => string;
	asPropertyRef: (property: keyof TSchema[TView]) => string[];
	asViewPropertyRef: (property: keyof TSchema[TView]) => ViewPropertyReference;
	asSource: () => SourceSelectorWithoutPropertiesV3[number];
	asSourceSelector: <TProps extends keyof TSchema[TView]>(
		properties: TProps[] | ['*']
	) => SourceSelectorV3[number];
	getProps: (instance: NodeOrEdge) => TSchema[TView] | null;
	getPartialProps: (instance: NodeOrEdge) => Partial<TSchema[TView]> | null;
	getSelectProps: <TProps extends keyof TSchema[TView]>(
		instance: NodeOrEdge
	) => Pick<TSchema[TView], TProps> | null;
};
