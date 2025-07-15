#!/usr/bin/env node
import { writeFile } from 'fs/promises';
import { CogniteClient } from '@cognite/sdk';
import { generate } from '@omnysecurity/cognite-codegen';
import meow from 'meow';

export const main = async (options: Options) => {
	const client = new CogniteClient({
		appId: '@omnysec/cognite-codegen',
		project: options.project,
		baseUrl: options.cluster,
		oidcTokenProvider: () => Promise.resolve(options.token),
	});

	const dataModel = await client.dataModels
		.retrieve([
			{
				externalId: options.model,
				space: options.space,
				version: options.version,
			},
		])
		.then((res) => res.items.at(0));

	if (!dataModel) throw new Error('Data model not found');

	const viewIds = dataModel.views?.map((x) => ({
		space: x.space,
		externalId: x.externalId,
		version: x.version,
	}));
	if (!viewIds) throw new Error('No views found for data model');

	const views = await client.views.retrieve(viewIds);
	views.items.sort((a, b) => a.externalId.localeCompare(b.externalId));

	const output = generate({
		dataModel,
		views: views.items,
	});

	await writeFile(options.output ?? output.fileName, output.fileContent);
};

type Options = {
	token: string;
	cluster: string;
	project: string;
	space: string;
	model: string;
	version: string;
	output?: string;
};

const cli = meow(
	`
	Usage
	  $ cognite-codegen

	Options
    --cluster,   -c  CDF Cluster
    --project,   -p  CDF Project
    --space,     -s  CDF Model Space
		--model      -m  CDF Data model externalId
		--version    -v  CDF Data model version
    --output,    -o  Output file (default: schema.ts)
    --token,     -t  CDF Access token

	Examples
	  $ cognite-codegen --model omny_cpdo --version 1_4 --output schema.ts
`,
	{
		importMeta: import.meta, // This is required
		flags: {
			cluster: {
				shortFlag: 'c',
				type: 'string',
				isRequired: true,
			},
			output: {
				shortFlag: 'o',
				type: 'string',
			},
			project: {
				shortFlag: 'p',
				type: 'string',
				isRequired: true,
			},
			space: {
				shortFlag: 's',
				type: 'string',
				isRequired: true,
			},
			model: {
				type: 'string',
				isRequired: true,
			},
			version: {
				type: 'string',
				isRequired: true,
			},
			token: {
				type: 'string',
				isRequired: true,
			},
		},
	}
);
main(cli.flags as Options)
	.then((res) => console.log('Success', res))
	.catch((err) => console.error(err))
	.finally(() => console.info('fin.'));
