import {
	type ViewDefinition,
	type ViewPropertyDefinition,
	type ViewDefinitionProperty,
	type DataModel,
} from '@cognite/sdk';
import ts from 'typescript';
import { type ExtendedViewCorePropertyDefinition } from './types.js';

type ViewRef = { space: string; externalId: string; version: string };
const getViewId = (view: ViewRef) =>
	`${view.space}__${view.externalId}__${view.version}`;

function resolveTypeNode(
	propSpec: ExtendedViewCorePropertyDefinition
): ts.TypeNode {
	if ('list' in propSpec.type) {
		if (propSpec.type.list) {
			const typeNode = resolveTypeNode({
				...propSpec,
				type: { ...propSpec.type, list: false },
			});
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
			return ts.factory.createTypeReferenceNode(
				`DirectReference<${propSpec.type.source ? getViewId(propSpec.type.source) : 'unknown'}>`
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

	// TODO: Add build-in types File, Sequence and Timeseries
	return [directReference];
}

function nullishFilter<T>(element: T | null | undefined): element is T {
	return element !== undefined && element !== null;
}

function generateTypesForViews(views: ViewDefinition[]) {
	return views.flatMap(generateTypeForView);
}

// Function to generate TypeScript AST from the spec
function generateTypeForView(spec: ViewDefinition) {
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
					resolveTypeNode(propSpec)
				);
			} else {
				// TODO: Direct relation-types are not exported in the SDK :shrug:
			}
			return undefined;
		})
		.filter(nullishFilter);

	const typeLiteral = ts.factory.createTypeLiteralNode(members);
	const typeExtends = (spec.implements ?? []).map((view) =>
		ts.factory.createTypeReferenceNode(getViewId(view), undefined)
	);
	const typeNode = ts.factory.createIntersectionTypeNode([
		typeLiteral,
		...typeExtends,
	]);

	return [
		ts.factory.createJSDocComment(spec.description),
		ts.factory.createTypeAliasDeclaration(
			ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
			ts.factory.createIdentifier(getViewId(spec)),
			undefined,
			typeNode // ts.factory.createTypeLiteralNode(members.filter(Boolean))
		),

		// generate a string literal const value `as const` for the type
	];
}

function generateTypeForSchema(views: ViewDefinition[]) {
	return createType(
		'__Schema',
		ts.factory.createTypeLiteralNode(
			views.map((view) => {
				const value = ts.factory.createTypeReferenceNode(getViewId(view));
				const ref = getViewId(view);
				return createProperty(ref, value);
			})
		)
	);
}

export function generateTypescriptFile(
	model: DataModel,
	views: ViewDefinition[]
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
		generateTypeForSchema(views),
		...generateTypesForBuiltInViews(),
		...generateTypesForViews(views),
		createViewPropertyMap(views),
		createDataModelConstant(model),
	]);

	// Generate TypeScript code from the AST
	const printer = ts.createPrinter({
		newLine: ts.NewLineKind.LineFeed,
		removeComments: false,
	});
	const tsCode = printer.printList(
		ts.ListFormat.MultiLine,
		sourceNodes,
		sourceFile
	);
	return tsCode;
}

function createViewPropertyMap(views: ViewDefinition[]) {
	const viewNameToPropertyNames = views.map((view) => {
		const propertyNameLiterals = ts.factory.createArrayLiteralExpression(
			Object.entries(view.properties).map(([propName, _propSpec]) =>
				ts.factory.createStringLiteral(propName)
			)
		);
		const ref = getViewId(view);
		return ts.factory.createPropertyAssignment(ref, propertyNameLiterals);
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
};

export const generate = (options: GenerateFileOptions) => {
	const typescriptFileContents = generateTypescriptFile(
		options.dataModel,
		[...options.views].sort((a, b) => a.externalId.localeCompare(b.externalId))
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

type _ViewReferenceCandidate<TSchema> = keyof TSchema extends infer K
	? K extends \`\${infer S}__\${infer E}__\${infer V}\` // full
		? \`\${S}__\${E}__\${V}\` | \`\${S}__\${E}\` | E
		: K extends \`\${infer S}__\${infer E}\` // versioned
			? \`\${S}__\${E}\` | E
			: K // simple
	: never;
type _CollectMatches<
	TSchema,
	TRef extends _ViewReferenceCandidate<TSchema>,
> = keyof TSchema extends infer K
	? K extends keyof TSchema
		? K extends \`\${infer S}__\${infer E}__\${infer V}\`
			? TRef extends \`\${S}__\${E}__\${V}\` | \`\${S}__\${E}\` | E
				? TSchema[K]
				: never
			: K extends \`\${infer S}__\${infer E}\`
				? TRef extends \`\${S}__\${E}\` | E
					? TSchema[K]
					: never
				: TRef extends K
					? TSchema[K]
					: never
		: never
	: never;
type _IsUnion<T, U = T> = T extends any
	? [U] extends [T]
		? false
		: true
	: false;
type _IsSingleValue<T> = [T] extends [never]
	? unknown
	: _IsUnion<T> extends true
		? unknown
		: T;
type ResolveView<
	TSchema,
	TRef extends _ViewReferenceCandidate<TSchema>,
> = _IsSingleValue<_CollectMatches<TSchema, TRef>>;
type _UnambiguousViewReference<TSchema> =
	Extract<_ViewReferenceCandidate<TSchema>, string> extends infer TRef extends
		string
		? TRef extends _ViewReferenceCandidate<TSchema>
			? unknown extends ResolveView<TSchema, TRef>
				? never
				: TRef
			: never
		: never;

export type Schema = {
	[K in _UnambiguousViewReference<__Schema>]: _Expand<ResolveView<__Schema, K>>;
};
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
