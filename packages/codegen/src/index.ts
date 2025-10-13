import {
	type ViewDefinition,
	type ViewPropertyDefinition,
	type ViewDefinitionProperty,
	type DataModel,
} from '@cognite/sdk';
import ts from 'typescript';
import { type ExtendedViewCorePropertyDefinition } from './types.js';

export type ViewReferenceStyle = 'simple' | 'full';

function getViewIdentifier(
	view: ViewDefinition | { space: string; externalId: string; version: string },
	style: ViewReferenceStyle
): string {
	switch (style) {
		case 'simple':
			return view.externalId;
		case 'full':
			return `${view.space}__${view.externalId}__${view.version}`;
	}
}

function resolveTypeNode(
	propSpec: ExtendedViewCorePropertyDefinition,
	style: ViewReferenceStyle
): ts.TypeNode {
	if ('list' in propSpec.type) {
		if (propSpec.type.list) {
			const typeNode = resolveTypeNode(
				{
					...propSpec,
					type: { ...propSpec.type, list: false },
				},
				style
			);
			return ts.factory.createArrayTypeNode(typeNode);
		}
	}
	switch (propSpec.type.type) {
		case 'boolean':
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
		case 'float32':
		case 'float64':
		case 'int32':
		case 'int64':
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
		case 'timestamp':
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
		case 'date':
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
		case 'text':
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
		case 'json':
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
		case 'direct':
			const targetIdentifier = propSpec.type.source
				? getViewIdentifier(propSpec.type.source, style)
				: 'unknown';
			return ts.factory.createTypeReferenceNode(
				`DirectReference<${targetIdentifier}>`
			);
		case 'enum':
			if (propSpec.type.values) {
				const enumKeys = Object.keys(propSpec.type.values);

				// Create a union type from the enum keys
				const unionTypeNodes = enumKeys.map((key) =>
					ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(key))
				);

				return ts.factory.createUnionTypeNode(unionTypeNodes);
			}
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
		case 'file':
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
		case 'sequence':
		case 'timeseries':
		default:
			return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
	}
}

function isPropertyDefinition(
	prop: ViewDefinitionProperty
): prop is ViewPropertyDefinition {
	return 'container' in prop;
}

function createType(
	name: string,
	props: ts.TypeLiteralNode | ts.IntersectionTypeNode,
	generics: string[] = []
) {
	return ts.factory.createTypeAliasDeclaration(
		ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
		ts.factory.createIdentifier(name),
		generics.map((T) =>
			ts.factory.createTypeParameterDeclaration(
				undefined,
				T,
				undefined,
				undefined
			)
		),
		props
	);
}

function createProperty(name: string, type: ts.TypeNode) {
	return ts.factory.createPropertySignature(undefined, name, undefined, type);
}

function generateTypesForBuiltInViews() {
	const stringType = ts.factory.createKeywordTypeNode(
		ts.SyntaxKind.StringKeyword
	);
	const numberType = ts.factory.createKeywordTypeNode(
		ts.SyntaxKind.NumberKeyword
	);

	const directReference = createType(
		'DirectReference',
		ts.factory.createIntersectionTypeNode([
			ts.factory.createTypeReferenceNode('Omit<T, keyof T>', undefined),
			ts.factory.createTypeLiteralNode([
				createProperty('space', stringType),
				createProperty('externalId', stringType),
			]),
		]),
		['T extends __Schema[keyof __Schema] | unknown = unknown']
	);

	const directReferenceType = ts.factory.createTypeReferenceNode(
		'DirectReference',
		undefined
	);

	const node = createType(
		'Node',
		ts.factory.createTypeLiteralNode([
			createProperty('space', stringType),
			createProperty('externalId', stringType),
			createProperty('createdTime', numberType),
			createProperty('lastUpdatedTime', numberType),
		])
	);

	const edge = createType(
		'Edge',
		ts.factory.createTypeLiteralNode([
			createProperty('space', stringType),
			createProperty('externalId', stringType),
			createProperty('type', directReferenceType),
			createProperty('startNode', directReferenceType),
			createProperty('endNode', directReferenceType),
		])
	);

	// TODO: Add build-in types File, Sequence and Timeseries
	return [node, edge, directReference];
}

export function nullishFilter<T>(element: T | null | undefined): element is T {
	return element !== undefined && element !== null;
}

function generateTypesForViews(
	views: ViewDefinition[],
	style: ViewReferenceStyle
) {
	return views.flatMap((view) => generateTypeForView(view, style));
}

// Function to generate TypeScript AST from the spec
function generateTypeForView(spec: ViewDefinition, style: ViewReferenceStyle) {
	const members = Object.entries(spec.properties)
		.map(([propName, propSpec]) => {
			if (
				isPropertyDefinition(propSpec) &&
				propSpec.container.space == spec.space &&
				propSpec.container.externalId == spec.externalId
			) {
				return ts.factory.createPropertySignature(
					undefined,
					propName,
					(propSpec as unknown as Record<string, boolean>)['nullable']
						? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
						: undefined,
					resolveTypeNode(propSpec, style)
				);
			} else {
				// TODO: Direct relation-types are not exported in the SDK :shrug:
			}
			return undefined;
		})
		.filter(nullishFilter);

	const typeLiteral = ts.factory.createTypeLiteralNode(members);
	const typeExtends = (spec.implements ?? []).map((view) =>
		ts.factory.createTypeReferenceNode(
			getViewIdentifier(view, style),
			undefined
		)
	);
	const typeNode = ts.factory.createIntersectionTypeNode([
		typeLiteral,
		...typeExtends,
	]);

	const viewIdentifier = getViewIdentifier(spec, style);

	return [
		ts.factory.createJSDocComment(spec.description),
		ts.factory.createTypeAliasDeclaration(
			ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
			ts.factory.createIdentifier(viewIdentifier),
			undefined,
			typeNode // ts.factory.createTypeLiteralNode(members.filter(Boolean))
		),

		// generate a string literal const value `as const` for the type
	];
}

function generateTypeForSchema(
	views: ViewDefinition[],
	style: ViewReferenceStyle
) {
	return createType(
		'__Schema',
		ts.factory.createTypeLiteralNode(
			views.map((view) => {
				const identifier = getViewIdentifier(view, style);
				return createProperty(
					identifier,
					ts.factory.createTypeReferenceNode(identifier)
				);
			})
		)
	);
}

export function generateTypescriptFile(
	model: DataModel,
	views: ViewDefinition[],
	style: ViewReferenceStyle = 'simple'
) {
	// Generate TypeScript AST for each spec
	const sourceFile = ts.createSourceFile(
		'temp.ts',
		'',
		ts.ScriptTarget.Latest,
		false,
		ts.ScriptKind.TS
	);

	const sourceNodes = ts.factory.createNodeArray([
		generateTypeForSchema(views, style),
		...generateTypesForBuiltInViews(),
		...generateTypesForViews(views, style),
		createViewPropertyMap(views, style),
		createConnectionsMetadata(views, style),
		createEdgeTypesConstant(views),
		createDataModelConstant(model),
	]);

	// Generate TypeScript code from the AST
	const printer = ts.createPrinter();
	const tsCode = printer.printList(
		ts.ListFormat.MultiLine,
		sourceNodes,
		sourceFile
	);
	return tsCode;
}

function createViewPropertyMap(
	views: ViewDefinition[],
	style: ViewReferenceStyle
) {
	const viewNameToPropertyNames = views.map((view) => {
		const propertyNameLiterals = ts.factory.createArrayLiteralExpression(
			Object.entries(view.properties).map(([propName, _propSpec]) =>
				ts.factory.createStringLiteral(propName)
			)
		);
		const viewIdentifier = getViewIdentifier(view, style);
		return ts.factory.createPropertyAssignment(
			viewIdentifier,
			propertyNameLiterals
		);
	});

	const objectLiteral = ts.factory.createObjectLiteralExpression(
		viewNameToPropertyNames,
		true
	);
	const declaration = ts.factory.createVariableDeclaration(
		'__VIEWS',
		undefined,
		undefined,
		ts.factory.createAsExpression(
			objectLiteral,
			ts.factory.createTypeReferenceNode('const')
		)
	);
	const declarationList = ts.factory.createVariableDeclarationList(
		[declaration],
		ts.NodeFlags.Const
	);

	const statement = ts.factory.createVariableStatement(
		ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
		declarationList
	);
	return statement;
}

function createConnectionsMetadata(
	views: ViewDefinition[],
	style: ViewReferenceStyle
) {
	const viewConnections = views
		.map((view) => {
			const connectionProperties = Object.entries(view.properties)
				.map(([propName, propSpec]) => {
					if (!('connectionType' in propSpec)) return undefined;

					const metadata: ts.ObjectLiteralElementLike[] = [
						ts.factory.createPropertyAssignment(
							'connectionType',
							ts.factory.createStringLiteral(propSpec.connectionType)
						),
						ts.factory.createPropertyAssignment(
							'source',
							ts.factory.createStringLiteral(getViewIdentifier(view, style))
						),
						ts.factory.createPropertyAssignment(
							'target',
							ts.factory.createStringLiteral(
								getViewIdentifier(propSpec.source, style)
							)
						),
						...(propSpec.connectionType === 'multi_edge_connection' ||
						propSpec.connectionType === 'single_edge_connection'
							? [
									ts.factory.createPropertyAssignment(
										'edgeType',
										ts.factory.createObjectLiteralExpression(
											[
												ts.factory.createPropertyAssignment(
													'space',
													ts.factory.createStringLiteral(propSpec.type.space)
												),
												ts.factory.createPropertyAssignment(
													'externalId',
													ts.factory.createStringLiteral(
														propSpec.type.externalId
													)
												),
											],
											false
										)
									),
									ts.factory.createPropertyAssignment(
										'direction',
										ts.factory.createStringLiteral(
											propSpec.direction ?? 'outwards'
										)
									),
									propSpec.edgeSource !== undefined
										? ts.factory.createPropertyAssignment(
												'edgeSource',
												ts.factory.createStringLiteral(
													getViewIdentifier(propSpec.edgeSource, style)
												)
											)
										: undefined,
								].filter(nullishFilter)
							: propSpec.connectionType === 'multi_reverse_direct_relation' ||
								  propSpec.connectionType === 'single_reverse_direct_relation'
								? [
										ts.factory.createPropertyAssignment(
											'through',
											ts.factory.createObjectLiteralExpression(
												[
													ts.factory.createPropertyAssignment(
														'source',
														ts.factory.createObjectLiteralExpression(
															[
																ts.factory.createPropertyAssignment(
																	'space',
																	ts.factory.createStringLiteral(
																		propSpec.through.source.space
																	)
																),
																ts.factory.createPropertyAssignment(
																	'externalId',
																	ts.factory.createStringLiteral(
																		propSpec.through.source.externalId
																	)
																),
															],
															false
														)
													),
													ts.factory.createPropertyAssignment(
														'identifier',
														ts.factory.createStringLiteral(
															propSpec.through.identifier
														)
													),
												],
												true
											)
										),
									]
								: []),
					];

					return ts.factory.createPropertyAssignment(
						propName,
						ts.factory.createObjectLiteralExpression(metadata, true)
					);
				})
				.filter(nullishFilter);

			if (connectionProperties.length === 0) {
				return undefined;
			}

			return ts.factory.createPropertyAssignment(
				getViewIdentifier(view, style),
				ts.factory.createObjectLiteralExpression(connectionProperties, true)
			);
		})
		.filter(nullishFilter);

	const objectLiteral = ts.factory.createObjectLiteralExpression(
		viewConnections,
		true
	);
	const declaration = ts.factory.createVariableDeclaration(
		'__CONNECTIONS',
		undefined,
		undefined,
		ts.factory.createAsExpression(
			objectLiteral,
			ts.factory.createTypeReferenceNode('const')
		)
	);
	const declarationList = ts.factory.createVariableDeclarationList(
		[declaration],
		ts.NodeFlags.Const
	);

	const statement = ts.factory.createVariableStatement(
		ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
		declarationList
	);
	return statement;
}

function createEdgeTypesConstant(views: ViewDefinition[]) {
	const edgeTypes = new Map<string, { space: string; externalId: string }>();

	views.forEach((view) => {
		Object.entries(view.properties).forEach(([_, propSpec]) => {
			if ('connectionType' in propSpec) {
				// Only process edge connections (not reverse direct relations)
				if (
					propSpec.connectionType === 'multi_edge_connection' ||
					propSpec.connectionType === 'single_edge_connection'
				) {
					const key = `${propSpec.type.space}:${propSpec.type.externalId}`;
					if (!edgeTypes.has(key)) {
						edgeTypes.set(key, {
							space: propSpec.type.space,
							externalId: propSpec.type.externalId,
						});
					}
				}
			}
		});
	});

	const edgeTypeProperties = Array.from(edgeTypes.values()).map((edgeType) =>
		ts.factory.createPropertyAssignment(
			// TODO: allow fully quallified ID reference
			edgeType.externalId,
			ts.factory.createObjectLiteralExpression(
				[
					ts.factory.createPropertyAssignment(
						'space',
						ts.factory.createStringLiteral(edgeType.space)
					),
					ts.factory.createPropertyAssignment(
						'externalId',
						ts.factory.createStringLiteral(edgeType.externalId)
					),
				],
				false
			)
		)
	);

	const objectLiteral = ts.factory.createObjectLiteralExpression(
		edgeTypeProperties,
		true
	);
	const declaration = ts.factory.createVariableDeclaration(
		'__EDGE_TYPES',
		undefined,
		undefined,
		ts.factory.createAsExpression(
			objectLiteral,
			ts.factory.createTypeReferenceNode('const')
		)
	);
	const declarationList = ts.factory.createVariableDeclarationList(
		[declaration],
		ts.NodeFlags.Const
	);

	const statement = ts.factory.createVariableStatement(
		ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
		declarationList
	);
	return statement;
}

function createDataModelConstant(model: DataModel) {
	const properties = ts.factory.createObjectLiteralExpression(
		[
			ts.factory.createPropertyAssignment(
				'space',
				ts.factory.createStringLiteral(model.space)
			),
			ts.factory.createPropertyAssignment(
				'externalId',
				ts.factory.createStringLiteral(model.externalId)
			),
			ts.factory.createPropertyAssignment(
				'version',
				ts.factory.createStringLiteral(model.version)
			),
		],
		true
	);

	const declaration = ts.factory.createVariableDeclaration(
		'__DATA_MODEL',
		undefined,
		undefined,
		ts.factory.createAsExpression(
			properties,
			ts.factory.createTypeReferenceNode('const')
		)
	);
	const declarationList = ts.factory.createVariableDeclarationList(
		[declaration],
		ts.NodeFlags.Const
	);

	const statement = ts.factory.createVariableStatement(
		ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
		declarationList
	);
	return statement;
}

type GenerateFileOptions = {
	dataModel: DataModel;
	views: ViewDefinition[];
	viewReferenceStyle?: ViewReferenceStyle;
};

export const generate = (options: GenerateFileOptions) => {
	const style = options.viewReferenceStyle ?? 'simple';
	const typescriptFileContents = generateTypescriptFile(
		options.dataModel,
		[...options.views].sort((a, b) => a.externalId.localeCompare(b.externalId)),
		style
	);
	const disclaimer = `/*
 * This file was generated by @omnysec/cognite-codegen.
 * It is based on the data model '${options.dataModel.externalId}' version '${options.dataModel.version}.'
 */`;

	const viewDefinitions = `
const _VIEW_DEFINITIONS = ${JSON.stringify(
		[...options.views].sort((a, b) => a.externalId.localeCompare(b.externalId)),
		null,
		2
	)} as const;

type _Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type _Mutable<T> = _Expand<{ -readonly [K in keyof T]: _Mutable<T[K]> }>;
export const VIEW_DEFINITIONS = _VIEW_DEFINITIONS as _Mutable<
	typeof _VIEW_DEFINITIONS
>;	
`;

	return {
		fileName: `${options.dataModel.externalId}@${options.dataModel.version}.ts`,
		fileContent: [disclaimer, typescriptFileContents, viewDefinitions].join(
			'\n'
		),
	};
};
