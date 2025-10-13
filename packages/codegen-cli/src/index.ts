#!/usr/bin/env node
import { writeFile } from 'fs/promises';
import { CogniteClient } from '@cognite/sdk';
import {
	generate,
	type ViewReferenceStyle,
} from '@omnysecurity/cognite-codegen';
import { config } from 'dotenv';
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
		...(options.viewReferenceStyle && {
			viewReferenceStyle: options.viewReferenceStyle,
		}),
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
	viewReferenceStyle?: ViewReferenceStyle;
};

config();

const cli = meow(
	`
	Usage
	  $ node .

	Options (Can also be provided through a .env file)
    --cluster,   -c  CDF Cluster (default: https://westeurope-1.cognitedata.com or COGNITE_CLUSTER env var)
    --project,   -p  CDF Project (or COGNITE_PROJECT env var)
    --space,     -s  CDF Model Space (or COGNITE_SPACE env var)
    --model      -m  CDF Data model externalId (or COGNITE_MODEL env var)
    --version    -v  CDF Data model version (or COGNITE_VERSION env var)
    --output,    -o  Output file (default: <externalId>@<version>.ts)
    --token,     -t  CDF Access token (or COGNITE_TOKEN env var)
    --reference-style    View reference style: simple or full (default: simple or COGNITE_REFERENCE_STYLE env var)

	Examples
	  $ node . --model my-model --version 1_4 --output schema.ts
	  $ node . --model my-model --version 1_4 --reference-style full
`,
	{
		importMeta: import.meta, // This is required
		flags: {
			cluster: {
				shortFlag: 'c',
				type: 'string',
				default:
					process.env.COGNITE_CLUSTER ?? 'https://westeurope-1.cognitedata.com',
			},
			output: {
				shortFlag: 'o',
				type: 'string',
			},
			project: {
				shortFlag: 'p',
				type: 'string',
				...(process.env.COGNITE_PROJECT && {
					default: process.env.COGNITE_PROJECT,
				}),
			},
			space: {
				shortFlag: 's',
				type: 'string',
				...(process.env.COGNITE_SPACE && {
					default: process.env.COGNITE_SPACE,
				}),
			},
			model: {
				type: 'string',
				...(process.env.COGNITE_MODEL && {
					default: process.env.COGNITE_MODEL,
				}),
			},
			version: {
				type: 'string',
				...(process.env.COGNITE_VERSION && {
					default: process.env.COGNITE_VERSION,
				}),
			},
			token: {
				type: 'string',
				...(process.env.COGNITE_TOKEN && {
					default: process.env.COGNITE_TOKEN,
				}),
			},
			referenceStyle: {
				type: 'string',
				default: process.env.COGNITE_REFERENCE_STYLE ?? 'simple',
			},
		},
	}
);

// Validate required options are present (either from CLI or env)
const requiredFields = [
	'project',
	'space',
	'model',
	'version',
	'token',
] as const;
const missingFields = requiredFields.filter((field) => !cli.flags[field]);

if (missingFields.length > 0) {
	console.error(
		`Missing required options: ${missingFields.join(', ')}\nProvide them via CLI flags or .env file`
	);
	process.exit(1);
}

// Validate reference style
const validStyles: ViewReferenceStyle[] = ['simple', 'full'];
const referenceStyle = cli.flags.referenceStyle as
	| ViewReferenceStyle
	| undefined;
if (referenceStyle && !validStyles.includes(referenceStyle)) {
	console.error(
		`Invalid reference style: ${referenceStyle}\nMust be one of: ${validStyles.join(', ')}`
	);
	process.exit(1);
}

const options: Options = {
	token: cli.flags.token!,
	cluster: cli.flags.cluster!,
	project: cli.flags.project!,
	space: cli.flags.space!,
	model: cli.flags.model!,
	version: cli.flags.version!,
	...(cli.flags.output && { output: cli.flags.output }),
	...(referenceStyle && { viewReferenceStyle: referenceStyle }),
};

main(options)
	.then((res) => console.log('Success', res))
	.catch((err) => console.error(err))
	.finally(() => console.info('fin.'));
