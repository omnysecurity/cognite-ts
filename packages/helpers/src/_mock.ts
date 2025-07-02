import type { DirectRelationReference, ViewDefinition } from '@cognite/sdk';

export type __Dummy = {
	a: string;
	b: number;
	c: DirectRelationReference;
	d: string[];
};
export type __Stub = { a: string; b: number };
export type __Schema = { __Dummy: __Dummy; __Stub: __Stub };

const space = 'test';

type MockViewDefinition = Pick<
	ViewDefinition,
	'space' | 'externalId' | 'version'
>;
const mockViews: MockViewDefinition[] = [
	{
		space,
		externalId: '__Dummy',
		version: '1',
	},
	{
		space,
		externalId: '__Stub',
		version: '1',
	},
];
export const __VIEWS = mockViews as ViewDefinition[];
