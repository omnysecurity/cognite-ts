import type {
	DirectRelationReference,
	EdgeOrNodeData,
	EdgeWrite,
	NodeDefinition,
	NodeOrEdgeCreate,
	NodeWrite,
	ViewReference,
	ReverseDirectRelationConnection,
	ViewDefinitionProperty,
	EdgeDefinition,
	ViewDefinition,
} from '@cognite/sdk';

// =============================================================================
// Types
// =============================================================================

// -- Primitive type mapping --

type MaybeList<T, TList extends boolean | undefined> = TList extends true
	? T[]
	: T;

type PrimitiveTypeMap = {
	text: string;
	boolean: boolean;
	float32: number;
	float64: number;
	int32: number;
	int64: number;
	timestamp: number;
	date: string;
	json: object;
	timeseries: string;
	file: string;
	sequence: string;
	direct: DirectRelationReference;
};

type PropertyValue<TProp> = TProp extends {
	type: { type: 'enum'; values: infer TValues };
}
	? keyof TValues & string
	: TProp extends { type: { type: infer TType; list?: infer TList } }
		? TType extends keyof PrimitiveTypeMap
			? MaybeList<
					PrimitiveTypeMap[TType],
					TList extends boolean ? TList : false
				>
			: never
		: never;

// -- Property key extraction --

type DirectPropertyKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends { container: unknown } ? K : never;
}[keyof TProps];

type RequiredPropertyKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends { container: unknown }
		? TProps[K] extends { nullable: true }
			? never
			: TProps[K] extends { defaultValue: unknown }
				? never
				: K
		: never;
}[keyof TProps];

type OptionalPropertyKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends { container: unknown }
		? TProps[K] extends { nullable: true }
			? K
			: TProps[K] extends { defaultValue: unknown }
				? K
				: never
		: never;
}[keyof TProps];

type UpdateProperties<TProps> = {
	[K in DirectPropertyKeys<TProps>]?: PropertyValue<TProps[K]>;
};

type UpsertProperties<TProps> = {
	[K in RequiredPropertyKeys<TProps>]: PropertyValue<TProps[K]>;
} & {
	[K in OptionalPropertyKeys<TProps>]?: PropertyValue<TProps[K]>;
};

type EdgeConnectionKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends {
		connectionType: 'single_edge_connection' | 'multi_edge_connection';
	}
		? K
		: never;
}[keyof TProps];

type ReverseConnectionKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends {
		connectionType:
			| 'single_reverse_direct_relation'
			| 'multi_reverse_direct_relation';
	}
		? K
		: never;
}[keyof TProps];

// -- View resolution --

type ViewReferenceFormats<
	TSpace extends string,
	TExternalId extends string,
	TVersion extends string,
> =
	| TExternalId
	| `${TSpace}__${TExternalId}`
	| `${TSpace}__${TExternalId}__${TVersion}`;

type AllViewReferences<TViews> = TViews extends readonly [
	infer First,
	...infer Rest,
]
	? First extends {
			space: infer S extends string;
			externalId: infer E extends string;
			version: infer V extends string;
		}
		? ViewReferenceFormats<S, E, V> | AllViewReferences<Rest>
		: AllViewReferences<Rest>
	: never;

type ViewsMatchingRef<TViews, TRef extends string> = TViews extends readonly [
	infer First,
	...infer Rest,
]
	? First extends {
			space: infer S extends string;
			externalId: infer E extends string;
			version: infer V extends string;
		}
		? TRef extends ViewReferenceFormats<S, E, V>
			? First | ViewsMatchingRef<Rest, TRef>
			: ViewsMatchingRef<Rest, TRef>
		: ViewsMatchingRef<Rest, TRef>
	: never;

type IsUnion<T, U = T> = T extends unknown
	? [U] extends [T]
		? false
		: true
	: false;

type IsUnambiguous<TViews, TRef extends string> =
	IsUnion<ViewsMatchingRef<TViews, TRef>> extends true ? false : true;

type UnambiguousViewReference<TViews> =
	AllViewReferences<TViews> extends infer TRef
		? TRef extends string
			? IsUnambiguous<TViews, TRef> extends true
				? TRef
				: never
			: never
		: never;

type ViewByRef<TViews, TRef extends string> = ViewsMatchingRef<TViews, TRef>;

// -- Edge properties --

type EdgePropertyView<TViews, TConn> = TConn extends {
	edgeSource: {
		space: infer S extends string;
		externalId: infer E extends string;
		version: infer V extends string;
	};
}
	? ViewByRef<TViews, `${S}__${E}__${V}`>
	: never;

type EdgeProperties<TViews extends readonly BuilderView[], TConnection> =
	EdgePropertyView<TViews, TConnection> extends { properties: infer P }
		? UpsertProperties<P>
		: never;

type HasEdgeProperties<TConn> = TConn extends { edgeSource: ViewReference }
	? true
	: false;

// -- Builder types --

type BuilderView = {
	readonly space: string;
	readonly externalId: string;
	readonly version: string;
	readonly properties: Record<string, unknown>;
};

type BuilderNode = Omit<
	NodeDefinition,
	'createdTime' | 'lastUpdatedTime' | 'deletedTime'
>;

type BuilderEdge = Omit<
	EdgeDefinition,
	'createdTime' | 'lastUpdatedTime' | 'deletedTime'
>;

type BuilderEdgeOptions = {
	space?: string;
	externalId?: string;
};

type EdgeConnectionBuilder<
	TViews extends readonly BuilderView[],
	TView extends BuilderView,
	K extends string & EdgeConnectionKeys<TView['properties']>,
> =
	HasEdgeProperties<TView['properties'][K]> extends true
		? EdgeConnectionBuilderWithProperties<TViews, TView, K>
		: EdgeConnectionBuilderWithoutProperties<TViews, TView>;

type EdgeConnectionBuilderWithoutProperties<
	TViews extends readonly BuilderView[],
	TView extends BuilderView,
> = {
	to: (
		node: DirectRelationReference,
		options?: BuilderEdgeOptions
	) => NodeViewBuilder<TViews, TView>;
};

type EdgeConnectionBuilderWithProperties<
	TViews extends readonly BuilderView[],
	TView extends BuilderView,
	K extends string & EdgeConnectionKeys<TView['properties']>,
> = {
	to: (
		node: DirectRelationReference,
		options?: BuilderEdgeOptions
	) => {
		withoutProperties: () => NodeViewBuilder<TViews, TView>;
		withProperties: (
			props: EdgeProperties<TViews, TView['properties'][K]>
		) => NodeViewBuilder<TViews, TView>;
	};
};

// =============================================================================
// Utility Functions
// =============================================================================

function getViewId(view: {
	space: string;
	externalId: string;
	version: string;
}) {
	return `${view.space}__${view.externalId}__${view.version}`;
}

function getId(ref: { space: string; externalId: string }) {
	return `${ref.space}__${ref.externalId}`;
}

/**
 * Resolve the view property name for a reverse direct relation connection.
 *
 * When through.source.type is "container", the through.identifier references a container
 * property, not a view property. View properties can be aliases of container properties,
 * so we need to find the view property that maps to the container property.
 */
function resolveReverseRelationPropertyName(
	connection: ReverseDirectRelationConnection,
	views: readonly BuilderView[]
): string {
	const { through, source } = connection;

	// If the through source is a view, the identifier is already the view property name
	if (through.source.type === 'view') {
		return through.identifier;
	}

	// For container sources, find the view property that maps to this container property
	const viewId = getViewId(source);
	const view = views.find((v) => getViewId(v) === viewId) as
		| ViewDefinition
		| undefined;

	if (!view) {
		// Fall back to the container property identifier if view not found
		return through.identifier;
	}

	const containerId = getId(through.source);
	const viewPropertyName = Object.entries(view.properties).find(
		([, prop]) =>
			'container' in prop &&
			getId(prop.container) === containerId &&
			prop.containerPropertyIdentifier === through.identifier
	)?.[0];

	return viewPropertyName ?? through.identifier;
}

/**
 * FNV-1a hash with 128-bit output for better collision resistance.
 * Uses two different FNV offset bases to produce independent 64-bit hashes.
 */
function hash128(str: string): string {
	const FNV_PRIME = BigInt('0x100000001b3');
	const FNV_OFFSET_1 = BigInt('0xcbf29ce484222325');
	const FNV_OFFSET_2 = BigInt('0x84222325cbf29ce4');

	let hash1 = FNV_OFFSET_1;
	let hash2 = FNV_OFFSET_2;
	const mask = BigInt('0xffffffffffffffff');

	for (let i = 0; i < str.length; i++) {
		const char = BigInt(str.charCodeAt(i));
		hash1 = ((hash1 ^ char) * FNV_PRIME) & mask;
		hash2 = ((hash2 ^ char) * FNV_PRIME) & mask;
	}

	return (
		hash1.toString(16).padStart(16, '0') + hash2.toString(16).padStart(16, '0')
	);
}

/**
 * Generate a deterministic edge externalId.
 * Uses 128-bit FNV-1a hash for good collision resistance.
 */
function generateEdgeExternalId(
	startNode: DirectRelationReference,
	endNode: DirectRelationReference,
	edgeType: { space: string; externalId: string }
): string {
	const input = [
		startNode.space,
		startNode.externalId,
		edgeType.space,
		edgeType.externalId,
		endNode.space,
		endNode.externalId,
	].join(':');

	return hash128(input);
}

function generateUUID(): string {
	return crypto.randomUUID();
}

function parseViewRef(ref: string): {
	space?: string;
	externalId: string;
	version?: string;
} {
	const parts = ref.split('__');
	if (parts.length === 3) {
		return { space: parts[0]!, externalId: parts[1]!, version: parts[2]! };
	} else if (parts.length === 2) {
		return { space: parts[0]!, externalId: parts[1]! };
	}
	return { externalId: parts[0]! };
}

function findViewByRef(
	views: readonly BuilderView[],
	ref: string
): BuilderView | undefined {
	const parsed = parseViewRef(ref);
	return views.find((v) => {
		if (parsed.version && v.version !== parsed.version) return false;
		if (parsed.space && v.space !== parsed.space) return false;
		return v.externalId === parsed.externalId;
	});
}

// =============================================================================
// Classes
// =============================================================================

class InstanceBuilder<TViews extends readonly BuilderView[]> {
	constructor(private views: TViews) {}

	node(
		node: BuilderNode | DirectRelationReference | { space: string }
	): NodeInstanceBuilder<TViews> {
		const space = node.space;
		const externalId =
			'externalId' in node && node.externalId
				? node.externalId
				: generateUUID();
		const version = 'version' in node ? node.version : -1;
		const properties = 'properties' in node ? node.properties : {};
		return new NodeInstanceBuilder(this.views, {
			...node,
			instanceType: 'node',
			space,
			externalId,
			version,
			properties,
		});
	}

	edge(
		edge:
			| BuilderEdge
			| Pick<
					BuilderEdge,
					'space' | 'externalId' | 'startNode' | 'endNode' | 'type'
			  >
			| Pick<BuilderEdge, 'space' | 'startNode' | 'endNode' | 'type'>
			| Pick<BuilderEdge, 'startNode' | 'endNode' | 'type'>
	): EdgeInstanceBuilder<TViews> {
		const space =
			'space' in edge && edge.space ? edge.space : edge.startNode.space;
		const externalId =
			'externalId' in edge && edge.externalId
				? edge.externalId
				: generateEdgeExternalId(edge.startNode, edge.endNode, edge.type);
		const version = 'version' in edge ? edge.version : -1;
		const properties = 'properties' in edge ? edge.properties : {};
		return new EdgeInstanceBuilder(this.views, {
			instanceType: 'edge',
			space,
			externalId,
			startNode: edge.startNode,
			endNode: edge.endNode,
			type: edge.type,
			version,
			properties,
		});
	}
}

class NodeInstanceBuilder<TViews extends readonly BuilderView[]> {
	protected _peers: Record<string, NodeInstanceBuilder<TViews>> = {};
	protected _edges: Record<string, EdgeInstanceBuilder<TViews>> = {};
	protected _touch: boolean = false;

	constructor(
		protected _views: TViews,
		protected _instance: BuilderNode
	) {}

	get ref(): DirectRelationReference {
		return {
			space: this._instance.space,
			externalId: this._instance.externalId,
		};
	}

	get instance(): BuilderNode {
		return this._instance;
	}

	touch(): this {
		this._touch = true;
		return this;
	}

	asWrite(): NodeOrEdgeCreate[] {
		const instanceWrite: NodeWrite = {
			externalId: this.instance.externalId,
			instanceType: 'node',
			space: this.instance.space,
			sources: Object.entries(this.instance.properties ?? {}).flatMap(
				([space, viewOrContainer]) =>
					Object.entries(viewOrContainer).map(([ref, properties]) => {
						const [externalId, version] = ref.split('/');
						return {
							source: {
								space,
								externalId: externalId!,
								version: version!,
								type: 'view',
							},
							properties,
						} satisfies EdgeOrNodeData;
					})
			),
		} satisfies NodeOrEdgeCreate;

		if (this.instance.type) instanceWrite.type = this.instance.type;
		if (this.instance.version >= 0)
			instanceWrite.existingVersion = this.instance.version;
		return [
			...(this._touch ? [instanceWrite] : []),
			...Object.values(this._peers).flatMap((x) => x.asWrite()),
			...Object.values(this._edges).flatMap((x) => x.asWrite()),
		];
	}

	view<TRef extends UnambiguousViewReference<TViews>>(
		viewRef: TRef
	): NodeViewBuilder<TViews, ViewByRef<TViews, TRef>> {
		const view = findViewByRef(this._views, viewRef);
		if (!view) throw new Error(`Unknown view: '${viewRef}'`);

		const viewBuilder = new NodeViewBuilder(
			this._views,
			this._instance,
			view as ViewByRef<TViews, TRef>
		);
		if (this._touch) viewBuilder.touch();
		return viewBuilder;
	}
}

class EdgeInstanceBuilder<TViews extends readonly BuilderView[]> {
	constructor(
		protected _views: TViews,
		protected _instance: BuilderEdge
	) {}

	get ref(): DirectRelationReference {
		return {
			space: this._instance.space,
			externalId: this._instance.externalId,
		};
	}

	get instance(): BuilderEdge {
		return this._instance;
	}

	asWrite(): NodeOrEdgeCreate {
		const instanceWrite: EdgeWrite = {
			instanceType: 'edge',
			space: this.instance.space,
			externalId: this.instance.externalId,
			type: this.instance.type,
			startNode: this.instance.startNode,
			endNode: this.instance.endNode,
			sources: Object.entries(this.instance.properties ?? {}).flatMap(
				([space, viewOrContainer]) =>
					Object.entries(viewOrContainer).map(([ref, properties]) => {
						const [externalId, version] = ref.split('/');
						return {
							source: {
								space,
								externalId: externalId!,
								version: version!,
								type: 'view',
							},
							properties,
						} satisfies EdgeOrNodeData;
					})
			),
		} satisfies NodeOrEdgeCreate;

		if (this.instance.version >= 0)
			instanceWrite.existingVersion = this.instance.version;
		return instanceWrite;
	}

	view<TRef extends UnambiguousViewReference<TViews>>(
		viewRef: TRef
	): EdgeViewBuilder<TViews, ViewByRef<TViews, TRef>> {
		const view = findViewByRef(this._views, viewRef);
		if (!view) throw new Error(`Unknown view: '${viewRef}'`);

		return new EdgeViewBuilder(
			this._views,
			this._instance,
			view as ViewByRef<TViews, TRef>
		);
	}
}

class EdgeViewBuilder<
	TViews extends readonly BuilderView[],
	TView extends BuilderView,
> extends EdgeInstanceBuilder<TViews> {
	constructor(
		_views: TViews,
		_instance: BuilderEdge,
		protected _view: TView
	) {
		super(_views, _instance);
	}

	update(properties: UpdateProperties<TView['properties']>): this {
		let acc = this._instance.properties ?? {};
		acc[this._view.space] = {
			...acc[this._view.space],
			[`${this._view.externalId}/${this._view.version}`]: {
				...acc[this._view.space]?.[
					`${this._view.externalId}/${this._view.version}`
				],
				...properties,
			},
		};
		this._instance.properties = acc;
		return this;
	}

	upsert(properties: UpsertProperties<TView['properties']>): this {
		let acc = this._instance.properties ?? {};
		acc[this._view.space] = {
			...acc[this._view.space],
			[`${this._view.externalId}/${this._view.version}`]: properties,
		};
		this._instance.properties = acc;
		return this;
	}
}

class NodeViewBuilder<
	TViews extends readonly BuilderView[],
	TView extends BuilderView,
> extends NodeInstanceBuilder<TViews> {
	constructor(
		_views: TViews,
		_instance: BuilderNode,
		protected _view: TView
	) {
		super(_views, _instance);
	}

	update(properties: UpdateProperties<TView['properties']>): this {
		this._touch = true;
		let acc = this._instance.properties ?? {};
		acc[this._view.space] = {
			...acc[this._view.space],
			[`${this._view.externalId}/${this._view.version}`]: {
				...acc[this._view.space]?.[
					`${this._view.externalId}/${this._view.version}`
				],
				...properties,
			},
		};
		this._instance.properties = acc;
		return this;
	}

	upsert(properties: UpsertProperties<TView['properties']>): this {
		this._touch = true;
		let acc = this._instance.properties ?? {};
		acc[this._view.space] = {
			...acc[this._view.space],
			[`${this._view.externalId}/${this._view.version}`]: properties,
		};
		this._instance.properties = acc;
		return this;
	}

	reference<K extends string & ReverseConnectionKeys<TView['properties']>>(
		connection: K
	): {
		from: (ref: DirectRelationReference) => NodeViewBuilder<TViews, TView>;
	} {
		const def = this._view.properties[
			connection as string
		] as ReverseDirectRelationConnection;
		return {
			from: (ref: DirectRelationReference) => {
				const id = getId(ref);
				const viewId = getViewId(
					def.source
				) as UnambiguousViewReference<TViews>;
				const propertyName = resolveReverseRelationPropertyName(
					def,
					this._views
				);

				const peer =
					this._peers[id] ??
					(createInstanceBuilder(this._views) as InstanceBuilder<TViews>).node(
						ref
					);

				this._peers[id] = peer.view(viewId).update({
					[propertyName]: this.ref,
				} as UpdateProperties<unknown>);
				return this;
			},
		};
	}

	connect<K extends string & EdgeConnectionKeys<TView['properties']>>(
		connection: K
	): EdgeConnectionBuilder<TViews, TView, K> {
		const def = this._view.properties[connection] as ViewDefinitionProperty;
		if (
			!(
				'connectionType' in def &&
				(def.connectionType === 'single_edge_connection' ||
					def.connectionType === 'multi_edge_connection')
			)
		) {
			throw new Error(`Invalid edge property key: '${connection}'`);
		}

		const getEdgeBuilder = (
			other: DirectRelationReference,
			options?: BuilderEdgeOptions
		) => {
			const startNode = def.direction === 'inwards' ? other : this.ref;
			const endNode = def.direction === 'inwards' ? this.ref : other;

			return new EdgeInstanceBuilder(this._views, {
				instanceType: 'edge',
				space: options?.space ?? startNode.space,
				externalId:
					options?.externalId ??
					generateEdgeExternalId(startNode, endNode, def.type),
				startNode,
				endNode,
				type: def.type,
				version: -1,
				properties: {},
			});
		};

		const result = def.edgeSource
			? ({
					to: (
						other: DirectRelationReference,
						options?: BuilderEdgeOptions
					) => {
						const builder = getEdgeBuilder(other, options);
						const id = getId(builder.ref);
						const viewId = getViewId(
							def.edgeSource!
						) as UnambiguousViewReference<TViews>;
						this._edges[id] = this._edges[id] ?? builder;

						return {
							withoutProperties: () => this,
							withProperties: (
								properties: EdgeProperties<TViews, TView['properties'][K]>
							) => {
								builder
									.view(viewId)
									.upsert(properties as UpsertProperties<TView['properties']>);
								return this;
							},
						};
					},
				} satisfies EdgeConnectionBuilderWithProperties<TViews, TView, K>)
			: ({
					to: (
						other: DirectRelationReference,
						options?: BuilderEdgeOptions
					) => {
						const builder = getEdgeBuilder(other, options);
						const id = getId(builder.ref);
						this._edges[id] = this._edges[id] ?? builder;
						return this;
					},
				} satisfies EdgeConnectionBuilderWithoutProperties<TViews, TView>);
		return result as unknown as EdgeConnectionBuilder<TViews, TView, K>;
	}
}

// =============================================================================
// Export
// =============================================================================

export function createInstanceBuilder<
	const TViews extends readonly BuilderView[],
>(views: TViews): InstanceBuilder<TViews> {
	return new InstanceBuilder(views);
}
