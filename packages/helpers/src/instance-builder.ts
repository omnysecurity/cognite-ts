import type {
	DirectRelationReference,
	EdgeOrNodeData,
	EdgeWrite,
	NodeOrEdgeCreate,
	NodeWrite,
	ViewReference,
} from '@cognite/sdk';

// =============================================================================
// Helper Types
// =============================================================================

// Helper to wrap type in array if list is true
type MaybeList<T, TList extends boolean | undefined> = TList extends true
	? T[]
	: T;

// Map primitive type strings to their TypeScript equivalents
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

// =============================================================================
// Property Value Resolution
// =============================================================================

// Resolve value type for a property definition
type PropertyValue<TProp> =
	// Handle enum type: { type: 'enum', values: { Draft: {...}, Final: {...} } } -> 'Draft' | 'Final'
	TProp extends { type: { type: 'enum'; values: infer TValues } }
		? keyof TValues & string
		: // Handle primitive types with optional list
			TProp extends { type: { type: infer TType; list?: infer TList } }
			? TType extends keyof PrimitiveTypeMap
				? MaybeList<
						PrimitiveTypeMap[TType],
						TList extends boolean ? TList : false
					>
				: never
			: never;

// =============================================================================
// Property Category Discriminators
// =============================================================================

// Extract keys of properties that have a `container` field (direct properties on the node)
type DirectPropertyKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends { container: unknown } ? K : never;
}[keyof TProps];

// Extract keys of required direct properties (nullable: false and no defaultValue)
type RequiredPropertyKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends { container: unknown }
		? TProps[K] extends { nullable: true }
			? never
			: TProps[K] extends { defaultValue: unknown }
				? never
				: K
		: never;
}[keyof TProps];

// Extract keys of optional direct properties (nullable: true or has defaultValue)
type OptionalPropertyKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends { container: unknown }
		? TProps[K] extends { nullable: true }
			? K
			: TProps[K] extends { defaultValue: unknown }
				? K
				: never
		: never;
}[keyof TProps];

// Build the properties object type for partial updates - all properties optional
type UpdateProperties<TProps> = {
	[K in DirectPropertyKeys<TProps>]?: PropertyValue<TProps[K]>;
};

// Build the properties object type for upsert - required props mandatory, optional props optional
type UpsertProperties<TProps> = {
	[K in RequiredPropertyKeys<TProps>]: PropertyValue<TProps[K]>;
} & {
	[K in OptionalPropertyKeys<TProps>]?: PropertyValue<TProps[K]>;
};

// Extract keys of edge connection properties
type EdgeConnectionKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends {
		connectionType: `${string}edge${string}`;
	}
		? K
		: never;
}[keyof TProps];

// Extract keys of reverse direct relation properties
type ReverseConnectionKeys<TProps> = {
	[K in keyof TProps]: TProps[K] extends {
		connectionType: `${string}reverse${string}`;
	}
		? K
		: never;
}[keyof TProps];

// =============================================================================
// View Resolution from Views Tuple (with Ambiguity Detection)
// =============================================================================

// Generate all possible reference formats for a view
type ViewReferenceFormats<
	TSpace extends string,
	TExternalId extends string,
	TVersion extends string,
> =
	| TExternalId
	| `${TSpace}__${TExternalId}`
	| `${TSpace}__${TExternalId}__${TVersion}`;

// Get all reference formats from a views tuple
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

// Find all views that match a given reference
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

// Check if a type is a union (more than one member)
type IsUnion<T, U = T> = T extends unknown
	? [U] extends [T]
		? false
		: true
	: false;

// Check if a reference resolves to exactly one view (unambiguous)
type IsUnambiguous<TViews, TRef extends string> =
	IsUnion<ViewsMatchingRef<TViews, TRef>> extends true ? false : true;

// Filter to only unambiguous references
type UnambiguousViewReference<TViews> =
	AllViewReferences<TViews> extends infer TRef
		? TRef extends string
			? IsUnambiguous<TViews, TRef> extends true
				? TRef
				: never
			: never
		: never;

// Get the view that matches an unambiguous reference
type ViewByRef<TViews, TRef extends string> = ViewsMatchingRef<TViews, TRef>;

// =============================================================================
// Edge Property Resolution
// =============================================================================

// Get the edge property view for a connection (if edgeSource exists)
// Note: edgeSource contains full view reference, so we match by space/externalId/version
type EdgePropertyView<TViews, TConn> = TConn extends {
	edgeSource: {
		space: infer S extends string;
		externalId: infer E extends string;
		version: infer V extends string;
	};
}
	? ViewByRef<TViews, `${S}__${E}__${V}`>
	: never;

// Get properties type for edge (from edgeSource view)
type EdgeProperties<TViews, TConn> =
	EdgePropertyView<TViews, TConn> extends { properties: infer P }
		? UpdateProperties<P>
		: never;

// Check if a connection has edge properties
type HasEdgeProperties<TConn> = TConn extends { edgeSource: unknown }
	? true
	: false;

// =============================================================================
// Write Result Types
// =============================================================================

/**
 * Interface for objects that can produce write operations for the SDK
 */
interface WriteResult {
	/** Convert to NodeOrEdgeCreate array for SDK */
	asWrite(): NodeOrEdgeCreate[];
}

// =============================================================================
// Builder Classes
// =============================================================================

/**
 * Resolve start/end nodes based on edge direction.
 * - 'outwards': current node is startNode, target is endNode
 * - 'inwards': current node is endNode, target is startNode
 */
function resolveEdgeNodes(
	currentNodeRef: DirectRelationReference,
	targetRef: DirectRelationReference,
	direction: 'outwards' | 'inwards'
): { startNode: DirectRelationReference; endNode: DirectRelationReference } {
	if (direction === 'outwards') {
		return { startNode: currentNodeRef, endNode: targetRef };
	}
	return { startNode: targetRef, endNode: currentNodeRef };
}

/**
 * Hash function for generating deterministic edge IDs.
 * Uses FNV-1a algorithm with 64-bit output for reasonable collision resistance.
 * Note: This is not cryptographically secure, but provides good distribution
 * for the use case of generating unique edge identifiers.
 */
function hashString(str: string): string {
	// FNV-1a 64-bit hash
	const FNV_PRIME = BigInt('0x100000001b3');
	const FNV_OFFSET = BigInt('0xcbf29ce484222325');

	let hash = FNV_OFFSET;
	for (let i = 0; i < str.length; i++) {
		hash ^= BigInt(str.charCodeAt(i));
		hash = (hash * FNV_PRIME) & BigInt('0xffffffffffffffff');
	}

	return hash.toString(16).padStart(16, '0');
}

/**
 * Generate a deterministic edge externalId based on edge type and node references.
 * Uses a hash of all identifying information to ensure uniqueness and fixed length.
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
	return hashString(input);
}

/**
 * Optional edge identification - override the default space and/or externalId
 */
interface EdgeOptions {
	/** Edge space (defaults to startNode.space) */
	space?: string;
	/** Edge externalId (defaults to deterministic hash) */
	externalId?: string;
}

/**
 * Builder for edge connections with properties - supports optional withProperties()
 */
class EdgeBuilderWithProps<TViews, TConn> {
	constructor(
		private connection: TConn,
		private currentNodeRef: DirectRelationReference
	) {}

	to(
		targetRef: DirectRelationReference,
		edge?: EdgeOptions
	): EdgeBuilderWithPropsTarget<TViews, TConn> {
		return new EdgeBuilderWithPropsTarget(
			this.connection,
			this.currentNodeRef,
			targetRef,
			edge
		);
	}
}

/**
 * Result of building a node - provides ref and asWrite()
 */
class NodeInstance {
	constructor(private readonly nodeWrite: NodeWrite) {}

	/** The node reference (space and externalId) */
	get ref(): DirectRelationReference {
		return {
			space: this.nodeWrite.space,
			externalId: this.nodeWrite.externalId,
		};
	}

	/** Convert to NodeOrEdgeCreate array for SDK */
	asWrite(): NodeOrEdgeCreate[] {
		return [this.nodeWrite];
	}
}

/**
 * Result of building an edge - provides ref and asWrite()
 */
class EdgeInstance {
	constructor(private readonly edgeWrite: EdgeWrite) {}

	/** The edge reference (space and externalId) */
	get ref(): DirectRelationReference {
		return {
			space: this.edgeWrite.space,
			externalId: this.edgeWrite.externalId,
		};
	}

	/** Convert to NodeOrEdgeCreate array for SDK */
	asWrite(): NodeOrEdgeCreate[] {
		return [this.edgeWrite];
	}
}

class EdgeBuilderWithPropsTarget<TViews, TConn> {
	private readonly edgeRef: DirectRelationReference;
	private readonly conn: {
		type: { space: string; externalId: string };
		edgeSource: ViewReference;
		direction: 'outwards' | 'inwards';
	};
	private readonly startNode: DirectRelationReference;
	private readonly endNode: DirectRelationReference;

	constructor(
		connection: TConn,
		currentNodeRef: DirectRelationReference,
		targetRef: DirectRelationReference,
		edge?: EdgeOptions
	) {
		this.conn = connection as unknown as {
			type: { space: string; externalId: string };
			edgeSource: ViewReference;
			direction: 'outwards' | 'inwards';
		};

		const { startNode, endNode } = resolveEdgeNodes(
			currentNodeRef,
			targetRef,
			this.conn.direction ?? 'outwards'
		);
		this.startNode = startNode;
		this.endNode = endNode;

		this.edgeRef = {
			space: edge?.space ?? startNode.space,
			externalId:
				edge?.externalId ??
				generateEdgeExternalId(startNode, endNode, this.conn.type),
		};
	}

	private buildEdge(props?: EdgeProperties<TViews, TConn>): EdgeWrite {
		const edgeWrite: EdgeWrite = {
			instanceType: 'edge',
			space: this.edgeRef.space,
			externalId: this.edgeRef.externalId,
			type: { space: this.conn.type.space, externalId: this.conn.type.externalId },
			startNode: this.startNode,
			endNode: this.endNode,
		};

		if (props && Object.keys(props).length > 0) {
			edgeWrite.sources = [
				{
					source: this.conn.edgeSource,
					properties: props as NonNullable<EdgeOrNodeData['properties']>,
				},
			];
		}

		return edgeWrite;
	}

	/** The edge reference (space and externalId) */
	get ref(): DirectRelationReference {
		return this.edgeRef;
	}

	/** Convert to NodeOrEdgeCreate array for SDK */
	asWrite(): NodeOrEdgeCreate[] {
		return [this.buildEdge()];
	}

	/** Add properties to the edge */
	withProperties(props: EdgeProperties<TViews, TConn>): EdgeInstance {
		return new EdgeInstance(this.buildEdge(props));
	}
}

/**
 * Builder for edge connections without properties
 */
class EdgeBuilderNoProps<TConn> {
	constructor(
		private connection: TConn,
		private currentNodeRef: DirectRelationReference
	) {}

	to(targetRef: DirectRelationReference, edge?: EdgeOptions): EdgeInstance {
		const conn = this.connection as {
			type: { space: string; externalId: string };
			direction?: 'outwards' | 'inwards';
		};

		const { startNode, endNode } = resolveEdgeNodes(
			this.currentNodeRef,
			targetRef,
			conn.direction ?? 'outwards'
		);

		const edgeWrite: EdgeWrite = {
			instanceType: 'edge',
			space: edge?.space ?? startNode.space,
			externalId:
				edge?.externalId ??
				generateEdgeExternalId(startNode, endNode, conn.type),
			type: { space: conn.type.space, externalId: conn.type.externalId },
			startNode,
			endNode,
		};

		return new EdgeInstance(edgeWrite);
	}
}

/**
 * Builder for reverse direct relations - returns NodeInstance for the other node
 */
class ReverseBuilder<TConn> {
	constructor(
		private connection: TConn,
		private targetRef: DirectRelationReference
	) {}

	from(sourceRef: DirectRelationReference): NodeInstance {
		const conn = this.connection as {
			through: {
				source: ViewReference;
				identifier: string;
			};
		};

		// Update the source node's direct relation property to point to targetRef
		const node: NodeWrite = {
			instanceType: 'node',
			space: sourceRef.space,
			externalId: sourceRef.externalId,
			sources: [
				{
					source: conn.through.source,
					properties: {
						[conn.through.identifier]: this.targetRef,
					},
				},
			],
		};

		return new NodeInstance(node);
	}
}

/**
 * Accumulated source for a view
 */
interface AccumulatedSource {
	source: ViewReference;
	properties: Record<string, unknown>;
}

/**
 * Node builder - provides methods to update properties and connections
 * Implements WriteResult for chaining and final output
 * Supports multiple views via chained .view() calls
 */
class NodeBuilder<TViews, TView extends { properties: unknown }>
	implements WriteResult
{
	private _currentProperties: Record<string, unknown> = {};
	private _edges: EdgeWrite[] = [];

	constructor(
		private views: TViews,
		private currentView: TView,
		private _nodeRef: DirectRelationReference,
		private nodeType?: DirectRelationReference,
		private _accumulatedSources: AccumulatedSource[] = []
	) {}

	/** The node reference (space and externalId) */
	get ref(): DirectRelationReference {
		return this._nodeRef;
	}

	private getViewSource(): ViewReference {
		const viewDef = this.currentView as unknown as {
			space: string;
			externalId: string;
			version: string;
		};
		return {
			type: 'view',
			space: viewDef.space,
			externalId: viewDef.externalId,
			version: viewDef.version,
		};
	}

	private viewSourceKey(source: ViewReference): string {
		return `${source.space}__${source.externalId}__${source.version}`;
	}

	private finalizeCurrentView(): AccumulatedSource[] {
		const hasCurrentProperties =
			Object.keys(this._currentProperties).length > 0;
		if (!hasCurrentProperties) {
			return this._accumulatedSources;
		}

		const currentSource = this.getViewSource();
		const currentKey = this.viewSourceKey(currentSource);

		// Check if this view already exists in accumulated sources
		const existingIndex = this._accumulatedSources.findIndex(
			(s) => this.viewSourceKey(s.source) === currentKey
		);

		if (existingIndex >= 0) {
			// Merge properties into existing source
			const result = [...this._accumulatedSources];
			result[existingIndex] = {
				source: currentSource,
				properties: {
					...result[existingIndex]!.properties,
					...this._currentProperties,
				},
			};
			return result;
		}

		// Add as new source
		return [
			...this._accumulatedSources,
			{
				source: currentSource,
				properties: { ...this._currentProperties },
			},
		];
	}

	/**
	 * Update individual properties on the node - returns this for chaining
	 * All properties are optional, only provided properties will be updated
	 */
	update(properties: UpdateProperties<TView['properties']>): this {
		Object.assign(this._currentProperties, properties);
		return this;
	}

	/**
	 * Upsert the node with all required properties - returns this for chaining
	 * Required properties must be provided, optional properties can be omitted
	 * Use this when creating a new node or doing a full update
	 */
	upsert(properties: UpsertProperties<TView['properties']>): this {
		Object.assign(this._currentProperties, properties);
		return this;
	}

	/**
	 * Switch to a different view for this node.
	 * Finalizes properties from the current view and starts accumulating for the new view.
	 * Accepts unambiguous references: 'ExternalId', 'space__ExternalId', or 'space__ExternalId__version'
	 */
	view<TRef extends UnambiguousViewReference<TViews>>(
		viewRef: TRef
	): NodeBuilder<TViews, ViewByRef<TViews, TRef>> {
		const newView = findViewByRef(
			this.views as readonly {
				space: string;
				externalId: string;
				version: string;
			}[],
			viewRef
		);
		return new NodeBuilder(
			this.views,
			newView as ViewByRef<TViews, TRef>,
			this._nodeRef,
			this.nodeType,
			this.finalizeCurrentView()
		);
	}

	/** Convert to NodeOrEdgeCreate array for SDK */
	asWrite(): NodeOrEdgeCreate[] {
		const nodes: NodeWrite[] = [];
		const allSources = this.finalizeCurrentView();

		if (allSources.length > 0 || this.nodeType) {
			const node: NodeWrite = {
				instanceType: 'node',
				space: this._nodeRef.space,
				externalId: this._nodeRef.externalId,
			};

			if (this.nodeType) {
				node.type = this.nodeType;
			}

			if (allSources.length > 0) {
				node.sources = allSources.map((s) => ({
					source: s.source,
					properties: s.properties as NonNullable<EdgeOrNodeData['properties']>,
				}));
			}

			nodes.push(node);
		}

		return [...nodes, ...this._edges];
	}

	/**
	 * Create/update an edge connection - returns EdgeBuilder
	 */
	connect<K extends EdgeConnectionKeys<TView['properties']>>(
		connection: K
	): HasEdgeProperties<TView['properties'][K]> extends true
		? EdgeBuilderWithProps<TViews, TView['properties'][K]>
		: EdgeBuilderNoProps<TView['properties'][K]> {
		const props = (
			this.currentView as unknown as { properties: Record<string, unknown> }
		).properties;
		const connDef = props[connection as string] as TView['properties'][K];

		if ((connDef as { edgeSource?: unknown })?.edgeSource) {
			return new EdgeBuilderWithProps<TViews, TView['properties'][K]>(
				connDef,
				this._nodeRef
			) as HasEdgeProperties<TView['properties'][K]> extends true
				? EdgeBuilderWithProps<TViews, TView['properties'][K]>
				: EdgeBuilderNoProps<TView['properties'][K]>;
		}
		return new EdgeBuilderNoProps<TView['properties'][K]>(
			connDef,
			this._nodeRef
		) as HasEdgeProperties<TView['properties'][K]> extends true
			? EdgeBuilderWithProps<TViews, TView['properties'][K]>
			: EdgeBuilderNoProps<TView['properties'][K]>;
	}

	/**
	 * Add a reverse direct relation - returns ReverseBuilder
	 * This updates the OTHER node's direct relation property to point to this node
	 */
	addReverse<K extends ReverseConnectionKeys<TView['properties']>>(
		connection: K
	): ReverseBuilder<TView['properties'][K]> {
		const props = (
			this.currentView as unknown as { properties: Record<string, unknown> }
		).properties;
		const connDef = props[connection as string] as TView['properties'][K];
		return new ReverseBuilder<TView['properties'][K]>(connDef, this._nodeRef);
	}
}

/**
 * Node selector - provides method to select a view for the node
 * Implements WriteResult to allow writing a node with just a type (no view properties)
 */
class NodeSelector<TViews> implements WriteResult {
	constructor(
		private views: TViews,
		private _nodeRef: DirectRelationReference,
		private nodeType?: DirectRelationReference
	) {}

	/**
	 * Get the node reference (useful when auto-generating externalId)
	 */
	get ref(): DirectRelationReference {
		return this._nodeRef;
	}

	/**
	 * Convert to NodeOrEdgeCreate array for SDK.
	 * Can produce output even without selecting a view, as long as a type is set.
	 */
	asWrite(): NodeOrEdgeCreate[] {
		if (!this.nodeType) {
			return [];
		}
		const node: NodeWrite = {
			instanceType: 'node',
			space: this._nodeRef.space,
			externalId: this._nodeRef.externalId,
			type: this.nodeType,
		};
		return [node];
	}

	/**
	 * Select a view to work with for this node.
	 * Accepts unambiguous references: 'ExternalId', 'space__ExternalId', or 'space__ExternalId__version'
	 */
	view<TRef extends UnambiguousViewReference<TViews>>(
		viewRef: TRef
	): NodeBuilder<TViews, ViewByRef<TViews, TRef>> {
		const view = findViewByRef(
			this.views as readonly {
				space: string;
				externalId: string;
				version: string;
			}[],
			viewRef
		);
		return new NodeBuilder(
			this.views,
			view as ViewByRef<TViews, TRef>,
			this._nodeRef,
			this.nodeType
		);
	}
}

/**
 * Node options - externalId is optional; when omitted, a UUID will be auto-generated
 */
interface NodeOptions {
	/** The space where the node exists */
	space: string;
	/** The externalId of the node. If omitted, a UUID v4 will be auto-generated. */
	externalId?: string;
	/** Optional node type (DirectRelationReference) */
	type?: DirectRelationReference;
}

/**
 * Generate a UUID v4 using Node.js built-in crypto
 */
function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * Parse a view reference string into its components
 */
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

/**
 * Find a view by reference string (externalId, space__externalId, or space__externalId__version)
 */
function findViewByRef(
	views: readonly { space: string; externalId: string; version: string }[],
	ref: string
): { space: string; externalId: string; version: string } | undefined {
	const parsed = parseViewRef(ref);
	return views.find((v) => {
		if (parsed.version && v.version !== parsed.version) return false;
		if (parsed.space && v.space !== parsed.space) return false;
		return v.externalId === parsed.externalId;
	});
}

/**
 * Main instance builder class - entry point
 */
class InstanceBuilder<TViews> {
	constructor(private views: TViews) {}

	/**
	 * Select a node to work with
	 * @param options - Node options with space, optional externalId, and optional type
	 */
	node(options: NodeOptions): NodeSelector<TViews> {
		const nodeRef: DirectRelationReference = {
			space: options.space,
			externalId: options.externalId ?? generateUUID(),
		};
		return new NodeSelector(this.views, nodeRef, options.type);
	}
}

/**
 * Create an InstanceBuilder from a views tuple
 */
export function createInstanceBuilder<const TViews extends readonly unknown[]>(
	views: TViews
): InstanceBuilder<TViews> {
	return new InstanceBuilder(views);
}

// Export types for external use
export type {
	PropertyValue,
	DirectPropertyKeys,
	RequiredPropertyKeys,
	OptionalPropertyKeys,
	UpdateProperties,
	UpsertProperties,
	EdgeConnectionKeys,
	ReverseConnectionKeys,
	AllViewReferences,
	UnambiguousViewReference,
	ViewByRef,
	EdgeProperties,
	HasEdgeProperties,
};
