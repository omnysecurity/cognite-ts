import type { ViewCorePropertyDefinition } from '@cognite/sdk';

export interface EnumType {
	type: 'enum';
	values: Record<string, unknown>;
}

/**
 * This type extends the existing `ViewCorePropertyDefinition` by adding support for an additional
 * `EnumType` in the `type` property. The original library does not account for custom enum types,
 * which is a shortcoming when working with certain data models that require more specific types like `EnumType`.
 *
 * We address this limitation by using the `Omit` utility to remove the `type` property from the
 * original `ViewCorePropertyDefinition` and redefine it as a union of the existing types
 * (e.g., `TextProperty`, `PrimitiveProperty`, etc.) plus the custom `EnumType`.
 *
 * This ensures that future updates to `ViewCorePropertyDefinition` are still compatible, while
 * allowing for the necessary flexibility to define enums in the `type` field.
 */
export type ExtendedViewCorePropertyDefinition = Omit<
	ViewCorePropertyDefinition,
	'type'
> & {
	type: ViewCorePropertyDefinition['type'] | EnumType;
};
