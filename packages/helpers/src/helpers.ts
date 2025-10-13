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

export function createHelpers<TSchema>(
	views: ViewDefinition[]
): SchemaHelpers<TSchema> {
	const getViewId = (view: {
		space: string;
		externalId: string;
		version: string;
	}) => {
		return `${view.space}_${view.externalId}_${view.version}`;
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
				[getViewId({ space, externalId, version })]: value, // full
			};
		},
		{} as Record<keyof TSchema, ViewReference>
	);

	const getView = <TView extends keyof TSchema>(externalId: TView) => {
		const view = viewRefByExternalId[externalId];
		return {
			asDefinition: () =>
				views.find(
					(x) =>
						x.space === view.space &&
						x.externalId === externalId &&
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
	): name is keyof TSchema => {
		return name in viewRefByExternalId;
	};

	const isEdge = (nodeOrEdge: NodeOrEdge): nodeOrEdge is EdgeDefinition =>
		nodeOrEdge.instanceType === 'edge';

	const isNode = (nodeOrEdge: NodeOrEdge): nodeOrEdge is NodeDefinition =>
		nodeOrEdge.instanceType === 'node';

	const getNodeProps = <TView extends keyof TSchema>(
		instance: NodeOrEdge,
		viewExternalId: TView
	): null | (NodeDefinition & TSchema[TView]) => {
		const props = getView(viewExternalId).getProps(instance);
		return isNode(instance) && props
			? {
					...instance,
					...props,
				}
			: null;
	};

	const createNodeWrite = <
		TView extends keyof TSchema,
		TProp extends TSchema[TView],
	>(
		externalId: TView,
		options: NodeWriteOptions<TSchema, TView, TProp>
	) => {
		const view = getView(externalId);
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
		TView extends keyof TSchema,
		TProp extends TSchema[TView],
	>(
		externalId: TView,
		options: EdgeWriteOptions<TSchema, TView, TProp>
	) => {
		const view = getView(externalId);
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

	const getEdgeProps = <TView extends keyof TSchema>(
		instance: NodeOrEdge,
		viewExternalId: TView
	): null | (EdgeDefinition & TSchema[TView]) => {
		const props = getView(viewExternalId).getProps(instance);
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
	getView: <TView extends keyof TSchema>(
		externalId: TView
	) => ViewHelpers<TSchema, TView>;
	getViewId: (view: { space: string, externalId: string, version: string}) => string;
	isKnownView: (viewId: string | number | symbol) => viewId is keyof TSchema;
	createNodeWrite: <TView extends keyof TSchema, TProp extends TSchema[TView]>(
		externalId: TView,
		options: NodeWriteOptions<TSchema, TView, TProp>
	) => NodeWrite;
	createEdgeWrite: <TView extends keyof TSchema, TProp extends TSchema[TView]>(
		externalId: TView,
		options: EdgeWriteOptions<TSchema, TView, TProp>
	) => EdgeWrite;
	getNodeProps: <TView extends keyof TSchema>(
		instance: NodeOrEdge,
		viewExternalId: TView
	) => (NodeDefinition & TSchema[TView]) | null;
	getEdgeProps: <TView extends keyof TSchema>(
		instance: NodeOrEdge,
		viewExternalId: TView
	) => (EdgeDefinition & TSchema[TView]) | null;
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
