import type { DirectRelationReference, ViewDefinition } from '@cognite/sdk';

export type TestView1 = {
	a: string;
	b: number;
	c: DirectRelationReference;
	d: string[];
};
export type TestView2 = { a: string; b: number };
export type __Schema = {
	test__TestView1__1: TestView1;
	TestView2: TestView2;
};

const space = 'test';

type MockViewDefinition = Pick<
	ViewDefinition,
	'space' | 'externalId' | 'version'
>;
const mockViews: MockViewDefinition[] = [
	{
		space,
		externalId: 'TestView1',
		version: '1',
	},
	{
		space,
		externalId: 'TestView2',
		version: '1',
	},
];
export const __VIEWS = mockViews as ViewDefinition[];
